import { typeWireOf } from "@typewirets/core";
import { JsoncConfigRecordWire } from "./config-record.jsonc.wire";
import { ConfigService } from "./config-service";

export const ConfigServiceWire = typeWireOf({
  token: "ConfigService",
  imports: {
    jsoncConfigRecord: JsoncConfigRecordWire,
  },
  createWith({ jsoncConfigRecord }) {
    return new ConfigService(jsoncConfigRecord);
  },
});
