// Checks that every package with a CommonJS build loads with require(), the
// way a consumer resolves it: by package name, through the "require"
// condition of its "exports". Packages without one (e.g. typescript-config)
// are skipped.
//
// Usage, after `pnpm build`:
//   node scripts/check-cjs-entry-points.mjs
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packagesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../packages",
);

let checked = 0;
const failures = [];

for (const dir of readdirSync(packagesDir, { withFileTypes: true })) {
  if (!dir.isDirectory()) continue;

  const manifestPath = join(packagesDir, dir.name, "package.json");
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch {
    continue;
  }

  if (typeof manifest.exports?.["."]?.require !== "string") continue;

  checked += 1;
  try {
    const loaded = createRequire(manifestPath)(manifest.name);
    if (Object.keys(loaded).length === 0) {
      throw new Error("require() returned no exports");
    }
    console.log(`ok   ${manifest.name}`);
  } catch (err) {
    failures.push(manifest.name);
    console.error(`FAIL ${manifest.name}: ${err.message.split("\n")[0]}`);
  }
}

if (checked === 0) {
  console.error("No packages with a CommonJS export found");
  process.exit(1);
}

if (failures.length > 0) {
  process.exit(1);
}
