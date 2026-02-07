import { router } from "@/lib/trpc/trpc";
import { agentsRouter } from "./routers/agents";
import { invocationsRouter } from "./routers/invocations";
import { tenantRouter } from "./routers/tenant";

export const appRouter = router({
  agents: agentsRouter,
  invocations: invocationsRouter,
  tenant: tenantRouter,
});

export type AppRouter = typeof appRouter;
