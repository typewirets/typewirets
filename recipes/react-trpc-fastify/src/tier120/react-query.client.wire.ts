"use client";

import { QueryClient } from "@tanstack/react-query";
import { typeWireOf } from "@typewirets/core";

export function createQueryClient(): QueryClient {
  return new QueryClient();
}

export const QueryClientWire = typeWireOf({
  token: "QueryClient",
  creator() {
    return createQueryClient();
  },
});
