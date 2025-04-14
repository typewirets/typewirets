import { initTRPC } from "@trpc/server";
import type { Context } from "./trpc.context.ts";

export function createTrpc() {
  return initTRPC.context<Context>().create();
}

export type TRPC = ReturnType<typeof createTrpc>;
