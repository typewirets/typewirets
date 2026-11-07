// Lists the workspace packages: every folder under packages/ with a
// package.json. Shared by the scripts that need to find packages, so they all
// see the same set.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packagesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../packages",
);

// Returns [{ dir, manifestPath, manifest }], in folder-name order.
export function workspacePackages() {
  const packages = [];
  for (const entry of readdirSync(packagesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dir = join(packagesDir, entry.name);
    const manifestPath = join(dir, "package.json");
    if (!existsSync(manifestPath)) continue;
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    packages.push({ dir, manifestPath, manifest });
  }
  return packages.sort((a, b) => a.dir.localeCompare(b.dir));
}
