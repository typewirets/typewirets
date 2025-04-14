import { typeWireOf } from "@typewirets/core";
import { loadJsoncConfig } from "./jsonc-config-loader";

export const JsonsConfigLoaderWire = typeWireOf({
  token: "JsoncConfigLoader",
  creator() {
    return {
      async load() {
        return loadJsoncConfig();
      },
    };
  },
});
