// Writes {"type":"commonjs"} into a CommonJS build directory so Node loads
// its .js files as CommonJS, even though each package is "type": "module".
//
// Usage, from a package directory:
//   node ../../scripts/write-cjs-package-json.mjs [outDir]   (default: dist/cjs)
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const outDir = process.argv[2] ?? "dist/cjs";

mkdirSync(outDir, { recursive: true });
writeFileSync(
  join(outDir, "package.json"),
  `${JSON.stringify({ type: "commonjs" })}\n`,
);
