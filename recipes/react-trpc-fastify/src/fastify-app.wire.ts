import Fastify from "fastify";
import { typeWireOf } from "@typewirets/core";
import { ServerConfigType } from "@typewirets/react-fastify/config/tier0/server-config";
import { ConfigServiceWire } from "@typewirets/react-fastify/config/tier1/config-service.wire";

export const FastifyWire = typeWireOf({
  token: "Fastify",
  imports: {
    configService: ConfigServiceWire,
  },
  async createWith({ configService }) {
    const serverConfig = configService.get("server", ServerConfigType);

    const fastify = Fastify({
      logger: serverConfig.enableLogging ?? false,
    });

    return fastify;
  },
});
