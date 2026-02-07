/**
 * Agent invocation queue. Enqueue only; no agent execution in Next.js.
 * Uses QStash when configured; in dev may POST to worker URL directly (no long-lived in-memory queue).
 * Agent execution is async and non-blocking; runs in external worker (AGENT_WORKER_URL).
 */

import { logger } from "@/lib/logger";

export interface InvokePayload {
  invocationId: string;
  externalId: string;
  tenantId: string;
  agentId: string;
  inputPayload: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export async function enqueueInvocation(payload: InvokePayload): Promise<void> {
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const url = baseUrl ? `${baseUrl}/api/worker/invoke` : "";

  if (process.env.QSTASH_TOKEN && url) {
    const { Client } = await import("@upstash/qstash");
    const qstash = new Client({ token: process.env.QSTASH_TOKEN });
    await qstash.publishJSON({
      url,
      body: payload,
      retries: 3,
    });
    logger.info("Invocation enqueued via QStash", {
      tenant_id: payload.tenantId,
      invocation_id: payload.invocationId,
      external_id: payload.externalId,
    });
    return;
  }

  if (process.env.NODE_ENV === "development" && url) {
    logger.info("QStash not configured; simulating enqueue", { external_id: payload.externalId });
    try {
      const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      await fetch(`${base}/api/worker/invoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      logger.warn("Dev: worker URL not reachable; invocation created but not executed");
    }
    return;
  }

  logger.warn("No queue configured; invocation created but not executed", {
    external_id: payload.externalId,
  });
}
