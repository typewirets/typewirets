import { typeWireGroupOf } from "@typewirets/core";

import { ConfigLoaderWire } from "@typewirets/react-fastify/config/tier0/config-loader.wire";
import { FastifyWire } from "./fastify-app.wire";
import { AppRouterWire } from "./tier110/app-router.wire";

export const SeverMainWires = typeWireGroupOf([
  ConfigLoaderWire,
  FastifyWire,
  AppRouterWire,
]);
