import { typeWireOf } from "@typewirets/core";
import { JsoncConfigRecordWire } from "./config-record.jsonc.wire";
import { ConfigService } from "./config-service";

export const ConfigServiceWire = typeWireOf({
  token: "ConfigService",
  async creator(ctx) {
    // if you change your mind to use YAML or TOML... etc
    // come here and swap the wire
    const record = await JsoncConfigRecordWire.getInstance(ctx);
    return new ConfigService(record);
  },
});
