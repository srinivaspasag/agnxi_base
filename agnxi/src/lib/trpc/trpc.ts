import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { Context } from "./context";

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const enforceTenant = t.middleware(({ ctx, next }) => {
  if (!ctx.tenantId) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Tenant context required" });
  }
  return next({ ctx: { ...ctx, tenantId: ctx.tenantId } });
});

export const tenantProcedure = t.procedure.use(enforceTenant);
