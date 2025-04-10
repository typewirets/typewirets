import { type ResolutionContext, TypeWireContainer } from "@typewirets/core";
import {
  fastifyTRPCPlugin,
  type FastifyTRPCPluginOptions,
} from "@trpc/server/adapters/fastify";
import cookie from "@fastify/cookie";
import session from "@fastify/session";

import { FastifyWire } from "./fastify-app.wire";
import { SeverMainWires } from "./server-main.wires";
import { ConfigServiceWire } from "./config/tier1/config-service.wire";
import { ServerConfigType } from "./config/tier0/server-config";
import { ConfigLoaderWire } from "./config/tier0/config-loader.wire";
import { JsonsConfigLoaderWire } from "./config/tier0/jsonc-config-loader.wire";
import { type AppRouter, AppRouterWire } from "./tier110/app-router.wire";
import { createContext } from "./tier100/routers/router.context";

async function main() {
  const container = new TypeWireContainer();
  const mainWires = SeverMainWires.withExtraWires([
    JsonsConfigLoaderWire,
    ConfigLoaderWire.withCreator(async (ctx: ResolutionContext) => {
      return await JsonsConfigLoaderWire.getInstance(ctx);
    }),
  ]);

  await mainWires.apply(container);
  const server = await FastifyWire.getInstance(container);
  const configService = await ConfigServiceWire.getInstance(container);
  const appRouter = await AppRouterWire.getInstance(container);

  server.register(cookie);
  server.register(session, {
    secret: "example81728937120987318297312897312897392",
    cookieName: "ses",
  });

  server.register(fastifyTRPCPlugin, {
    prefix: "/trpc",
    trpcOptions: {
      router: appRouter,
      createContext,
      onError({ path, error }) {
        // report to error monitoring
        console.error(`Error in tRPC handler on path '${path}':`, error);
      },
    } satisfies FastifyTRPCPluginOptions<AppRouter>["trpcOptions"],
  });

  const serverConfig = configService.get("server", ServerConfigType);
  const port = serverConfig.port ?? 300;

  await server.listen({ port });
}

await main();
