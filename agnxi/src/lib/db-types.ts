/**
 * Generated from Supabase: npm run db:generate
 * Stub for development; replace with actual generated types.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type AgentRuntime = "cloudflare_worker" | "fly_io";
export type AgentStatus = "draft" | "active" | "paused" | "archived";
export type InvocationStatus = "queued" | "running" | "succeeded" | "failed" | "canceled" | "timeout";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
  settings: Json;
}

export interface TenantMember {
  id: string;
  tenant_id: string;
  user_id: string;
  role: "owner" | "admin" | "member" | "viewer";
  created_at: string;
}

export interface ApiKey {
  id: string;
  tenant_id: string;
  name: string;
  key_prefix: string;
  key_hash: string;
  last_used_at: string | null;
  created_at: string;
  revoked_at: string | null;
}

export interface Agent {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  description: string | null;
  status: AgentStatus;
  runtime: AgentRuntime;
  config: Json;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface AgentInvocation {
  id: string;
  tenant_id: string;
  agent_id: string;
  external_id: string;
  status: InvocationStatus;
  input_payload: Json;
  output_payload: Json | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  created_by_type: "user" | "api_key";
  created_by_id: string | null;
  metadata: Json;
}

/** Insert type: required fields + optional nullable (for defaults) */
export type AgentInvocationInsert = Pick<
  AgentInvocation,
  "tenant_id" | "agent_id" | "external_id" | "status" | "input_payload" | "created_by_type" | "metadata"
> & Partial<Pick<AgentInvocation, "output_payload" | "error_message" | "started_at" | "completed_at" | "created_by_id">>;

export interface AgentInvocationLog {
  id: string;
  tenant_id: string;
  invocation_id: string;
  seq: number;
  level: "debug" | "info" | "warn" | "error";
  message: string;
  payload: Json | null;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      tenants: { Row: Tenant; Insert: Omit<Tenant, "id" | "created_at" | "updated_at">; Update: Partial<Tenant> };
      tenant_members: { Row: TenantMember; Insert: Omit<TenantMember, "id" | "created_at">; Update: Partial<TenantMember> };
      api_keys: { Row: ApiKey; Insert: Omit<ApiKey, "id" | "created_at">; Update: Partial<ApiKey> };
      agents: { Row: Agent; Insert: Omit<Agent, "id" | "created_at" | "updated_at">; Update: Partial<Agent> };
      agent_invocations: { Row: AgentInvocation; Insert: AgentInvocationInsert; Update: Partial<AgentInvocation> };
      agent_invocation_logs: { Row: AgentInvocationLog; Insert: Omit<AgentInvocationLog, "id" | "created_at">; Update: Partial<AgentInvocationLog> };
    };
  };
}
