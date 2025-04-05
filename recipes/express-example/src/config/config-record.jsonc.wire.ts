import { typeWireOf } from "@typewirets/core";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as JSONC from "jsonc-parser";

export const JsoncConfigRecordWire = typeWireOf({
  token: "JsoncConfigService",
  async creator() {
    const configPath = path.join(process.cwd(), "config.jsonc");
    const configContent = await fs.readFile(configPath, "utf-8");
    const parsed = JSONC.parse(configContent);
    // biome-ignore lint/suspicious/noExplicitAny: We don't know this in runtime
    return parsed as Record<string, any>;
  },
});
