/**
 * Internal worker endpoint: processes queued invocations.
 * Called by QStash (or dev fetch). Must verify QStash signature or internal secret.
 *
 * Agent execution is NOT done inside Next.js: we only update DB and call AGENT_WORKER_URL
 * (Cloudflare Workers / Fly.io). No user agent code runs in this process.
 */

import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { getTenantLimits } from "@/lib/limits";
import type { InvokePayload } from "@/lib/queue";

export const maxDuration = 60;

export async function POST(req: Request) {
  const secret = process.env.AGENT_WORKER_SECRET ?? process.env.QSTASH_CURRENT_SIGNING_KEY;
  if (secret) {
    const auth = req.headers.get("authorization");
    const expected = `Bearer ${secret}`;
    if (auth !== expected) {
      const qstashSig = req.headers.get("upstash-signature");
      if (!qstashSig && auth !== expected) {
        logger.warn("Worker invoke: unauthorized");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }
  }

  let payload: InvokePayload;
  try {
    payload = (await req.json()) as InvokePayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { invocationId, externalId, tenantId, agentId, inputPayload } = payload;
  const supabase = createSupabaseServiceClient();

  const { data: agent } = await supabase
    .from("agents")
    .select("config, runtime")
    .eq("id", agentId)
    .eq("tenant_id", tenantId)
    .single();
  if (!agent) {
    logger.error("Worker: agent not found", { agentId, tenantId });
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  await supabase
    .from("agent_invocations")
    .update({ status: "running", started_at: new Date().toISOString() })
    .eq("id", invocationId)
    .eq("tenant_id", tenantId);

  logger.info("Invocation running", { tenant_id: tenantId, invocation_id: invocationId, external_id: externalId });

  const workerUrl = process.env.AGENT_WORKER_URL;
  let output: Record<string, unknown> | null = null;
  let errorMessage: string | null = null;
  let status: "succeeded" | "failed" | "timeout" = "succeeded";

  const limits = await getTenantLimits(tenantId);

  if (workerUrl) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), limits.invocation_timeout_sec * 1000);
      const res = await fetch(workerUrl, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "X-Agnxi-Invocation-Id": invocationId,
          "X-Agnxi-External-Id": externalId,
          ...(process.env.AGENT_WORKER_SECRET && {
            Authorization: `Bearer ${process.env.AGENT_WORKER_SECRET}`,
          }),
        },
        body: JSON.stringify({
          tenant_id: tenantId,
          agent_id: agentId,
          input: inputPayload,
          config: agent.config,
        }),
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        errorMessage = await res.text();
        status = "failed";
      } else {
        const json = await res.json().catch(() => ({}));
        output = typeof json === "object" && json !== null ? json : { result: json };
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        errorMessage = `Invocation timed out after ${limits.invocation_timeout_sec}s`;
        status = "timeout";
      } else {
        errorMessage = err instanceof Error ? err.message : String(err);
        status = "failed";
      }
      logger.error("Worker: execution failed", { tenant_id: tenantId, invocation_id: invocationId, error: errorMessage });
    }
  } else {
    output = { message: "No AGENT_WORKER_URL configured; invocation simulated.", input: inputPayload };
    logger.info("Worker: no AGENT_WORKER_URL; simulated success", { external_id: externalId });
  }

  await supabase
    .from("agent_invocations")
    .update({
      status,
      output_payload: output,
      error_message: errorMessage,
      completed_at: new Date().toISOString(),
    })
    .eq("id", invocationId)
    .eq("tenant_id", tenantId);

  return NextResponse.json({ ok: true, status, external_id: externalId });
}
