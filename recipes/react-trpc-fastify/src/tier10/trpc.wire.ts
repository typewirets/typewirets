import { typeWireOf } from "@typewirets/core";
import { createTrpc } from "./trpc";

export const TrpcWire = typeWireOf({
  token: "TRPC",
  creator(_ctx) {
    const trpc = createTrpc();
    return trpc;
  },
});
