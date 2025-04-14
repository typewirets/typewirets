import { typeWireOf, type InferWireType } from "@typewirets/core";
import { TrpcWire } from "@typewirets/react-fastify/tier10/trpc.wire";
import { UserRouterWire } from "../tier100/routers/user.router.wire";

export const AppRouterWire = typeWireOf({
  token: "AppRouter",
  imports: {
    trpc: TrpcWire,
    userRouter: UserRouterWire,
  },
  createWith({ trpc, userRouter }) {
    return trpc.mergeRouters(userRouter);
  },
});

export type AppRouter = InferWireType<typeof AppRouterWire>;
