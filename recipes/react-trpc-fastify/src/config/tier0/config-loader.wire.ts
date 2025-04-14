import { typeWireOf } from "@typewirets/core";

export interface ConfigLoader {
  load(): Promise<Record<string, unknown>>;
}

export const ConfigLoaderWire = typeWireOf<ConfigLoader>({
  token: "ConfigLoader",
});
