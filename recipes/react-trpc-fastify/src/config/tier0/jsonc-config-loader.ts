import * as path from "node:path";
import * as fs from "node:fs/promises";
import * as JSONC from "jsonc-parser";

export type ConfigLoaderOpts = {
  rootDir: string;
  configName: string;
};

export async function loadJsoncConfig(
  opts?: ConfigLoaderOpts,
): Promise<Record<string, unknown>> {
  const rootDir = opts?.rootDir ?? process.cwd();
  const configName = opts?.configName ?? "config.jsonc";
  const configPath = path.join(rootDir, configName);
  const configContent = await fs.readFile(configPath, "utf-8");
  const parsed = JSONC.parse(configContent);
  return parsed;
}
