import { typeWireOf } from "@typewirets/core";
import { createUserRouter } from "./user.router";
import { TrpcWire } from "@typewirets/react-fastify/tier10/trpc.wire";
import { UserStoreWire } from "@typewirets/react-fastify/tier50/users/user.store.wire";

export const UserRouterWire = typeWireOf({
  token: "UserRouter",
  imports: {
    trpc: TrpcWire,
    userStore: UserStoreWire,
  },
  createWith({ trpc, userStore }) {
    return createUserRouter({
      trpc,
      userStore,
    });
  },
});
