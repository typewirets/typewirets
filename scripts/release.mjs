// Release helpers for .github/workflows/publish.yml. Package versions stay at
// 0.0.0 in git; the release version is written into each publishable package
// (every package under packages/ that isn't "private") at release time.
//
// Usage, from the repository root:
//   node scripts/release.mjs prepare <version>
//     Checks the version, the changelogs and npm, then sets package versions.
//   node scripts/release.mjs pack <version> <outDir>
//     Packs each package and checks the tarball. Writes <outDir>/publish-order.txt
//     with one "<name> <tarball>" line per package, dependencies first.
//   node scripts/release.mjs notes <version>
//     Prints GitHub release notes built from each package's changelog section.
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packagesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../packages",
);
const dependencyFields = [
  "dependencies",
  "peerDependencies",
  "optionalDependencies",
];

function fail(message) {
  console.error(message);
  process.exit(1);
}

// Publishable packages, each after the workspace packages it depends on.
function publishablePackages() {
  const packages = [];
  for (const dir of readdirSync(packagesDir, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    const manifestPath = join(packagesDir, dir.name, "package.json");
    if (!existsSync(manifestPath)) continue;
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    if (manifest.private) continue;
    packages.push({ dir: join(packagesDir, dir.name), manifestPath, manifest });
  }

  const names = new Set(packages.map((p) => p.manifest.name));
  const ordered = [];
  const placed = new Set();
  while (ordered.length < packages.length) {
    const ready = packages.filter(
      (p) =>
        !placed.has(p.manifest.name) &&
        dependencyFields
          .flatMap((field) => Object.keys(p.manifest[field] ?? {}))
          .every((dep) => !names.has(dep) || placed.has(dep)),
    );
    if (ready.length === 0)
      fail("Workspace packages depend on each other in a cycle");
    for (const p of ready) {
      ordered.push(p);
      placed.add(p.manifest.name);
    }
  }
  return ordered;
}

function changelogSection(pkg, version) {
  const changelogPath = join(pkg.dir, "CHANGELOG.md");
  if (!existsSync(changelogPath)) return undefined;
  const lines = readFileSync(changelogPath, "utf8").split("\n");
  const start = lines.findIndex((line) => line.trim() === `## ${version}`);
  if (start === -1) return undefined;
  const end = lines.findIndex((line, i) => i > start && line.startsWith("## "));
  return lines
    .slice(start + 1, end === -1 ? undefined : end)
    .join("\n")
    .trim();
}

async function prepare(version) {
  // Plain X.Y.Z, or a pre-release such as 0.2.0-rc.1. No build metadata.
  if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?$/.test(version)) {
    fail(`Invalid version: ${version} (expected X.Y.Z or X.Y.Z-pre.N)`);
  }

  const packages = publishablePackages();
  const problems = [];
  for (const pkg of packages) {
    const { name } = pkg.manifest;
    if (!changelogSection(pkg, version)) {
      problems.push(`${name}: CHANGELOG.md has no "## ${version}" section`);
    }

    // Trusted publishing can only be set up for a package that already
    // exists, so a new package needs its first version published by hand.
    const res = await fetch(
      `https://registry.npmjs.org/${name.replace("/", "%2f")}`,
    );
    if (res.status === 404) {
      problems.push(
        `${name}: not on npm yet; publish its first version by hand`,
      );
    } else if (!res.ok) {
      problems.push(`${name}: npm registry returned ${res.status}`);
    } else if ((await res.json()).versions?.[version]) {
      problems.push(`${name}: ${version} is already published`);
    }
  }
  if (problems.length > 0) fail(problems.join("\n"));

  for (const pkg of packages) {
    const text = readFileSync(pkg.manifestPath, "utf8");
    writeFileSync(
      pkg.manifestPath,
      text.replace(/"version":\s*"[^"]*"/, `"version": "${version}"`),
    );
    console.log(`${pkg.manifest.name} -> ${version}`);
  }
}

function pack(version, outDir) {
  const out = resolve(outDir);
  mkdirSync(out, { recursive: true });

  const packages = publishablePackages();
  const names = new Set(packages.map((p) => p.manifest.name));
  const order = [];
  for (const pkg of packages) {
    const { name } = pkg.manifest;
    execFileSync("pnpm", ["pack", "--pack-destination", out], {
      cwd: pkg.dir,
      stdio: ["ignore", "ignore", "inherit"],
    });
    const tarball = join(
      out,
      `${name.replace(/^@/, "").replace("/", "-")}-${version}.tgz`,
    );
    if (!existsSync(tarball))
      fail(`${name}: expected ${tarball} after pnpm pack`);

    // Check what consumers will get: the release version, and workspace
    // siblings pinned to that same version rather than "workspace:*".
    const packed = JSON.parse(
      execFileSync("tar", ["-xzOf", tarball, "package/package.json"], {
        encoding: "utf8",
      }),
    );
    if (packed.version !== version) {
      fail(
        `${name}: tarball has version ${packed.version}, expected ${version}`,
      );
    }
    for (const field of dependencyFields) {
      for (const [dep, range] of Object.entries(packed[field] ?? {})) {
        if (range.startsWith("workspace:")) {
          fail(`${name}: ${field}.${dep} is still "${range}"`);
        }
        if (names.has(dep) && range !== version) {
          fail(`${name}: ${field}.${dep} is "${range}", expected "${version}"`);
        }
      }
    }

    console.log(`ok   ${name} ${tarball}`);
    order.push(`${name} ${tarball}`);
  }
  writeFileSync(join(out, "publish-order.txt"), `${order.join("\n")}\n`);
}

function notes(version) {
  const sections = publishablePackages().map((pkg) => {
    const section = changelogSection(pkg, version);
    if (!section)
      fail(`${pkg.manifest.name}: CHANGELOG.md has no "## ${version}" section`);
    return `## ${pkg.manifest.name}\n\n${section}`;
  });
  console.log(`# v${version}\n\n${sections.join("\n\n")}`);
}

const usage =
  "Usage: node scripts/release.mjs <prepare|pack|notes> <version> [outDir]";
const [command, version, outDir] = process.argv.slice(2);
if (!version) fail(usage);

if (command === "prepare") {
  await prepare(version);
} else if (command === "pack" && outDir) {
  pack(version, outDir);
} else if (command === "notes") {
  notes(version);
} else {
  fail(usage);
}
