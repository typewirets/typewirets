"use client";

import { typeWireOf } from "@typewirets/core";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@typewirets/react-fastify/tier110/app-router.wire";

function create() {
  const client = createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: "/trpc",
      }),
    ],
  });
  return client;
}

export const TRPCClientWire = typeWireOf<ReturnType<typeof create>>({
  token: "TRPCClient",
  creator() {
    const client = create();
    return client;
  },
});
