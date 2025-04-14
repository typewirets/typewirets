import { typeWireOf } from "@typewirets/core";
import { ConfigLoaderWire } from "@typewirets/react-fastify/config/tier0/config-loader.wire";
import { ConfigService } from "./config-service";

export const ConfigServiceWire = typeWireOf({
  token: "ConfigService",
  imports: {
    loader: ConfigLoaderWire,
  },
  async createWith({ loader }) {
    const record = await loader.load();
    return new ConfigService(record);
  },
});
