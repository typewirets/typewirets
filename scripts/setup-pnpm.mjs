// Installs the pnpm version that package.json pins, without Corepack, and
// checks it against the hashes in pnpm-lock.yaml before any of its code runs.
// Used by .github/workflows/ci.yml and publish.yml; contributors get pnpm from
// the dev shell (flake.nix) or any pnpm, which switches to the pinned version.
//
// Usage, from the repository root:
//   node scripts/setup-pnpm.mjs <prefix>
//     Installs pnpm into <prefix> with npm, lifecycle scripts off. Fails unless
//     every package npm installed has the integrity pnpm-lock.yaml records under
//     packageManagerDependencies. Then lets pnpm link its native binary, checks
//     `pnpm --version`, and prints the bin directory (for $GITHUB_PATH). npm's
//     own output goes to stderr.
//
// The pure functions are exported for scripts/setup-pnpm.test.mjs.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

// "pnpm@12.18.0" (a "+sha512.…" suffix is allowed) → "12.18.0".
export function pinnedPnpmVersion({ packageManager }) {
  const match = /^pnpm@(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)(?:\+.*)?$/.exec(
    packageManager ?? "",
  );
  if (!match) {
    throw new Error(
      `package.json "packageManager" must pin an exact pnpm version, got ${JSON.stringify(packageManager)}`,
    );
  }
  return match[1];
}

// The `packages:` integrities of pnpm-lock.yaml's first document, the one pnpm
// writes for packageManagerDependencies, keyed by "name@version".
export function lockedIntegrities({ lockfile }) {
  const documents = lockfile.split(/^---$/m);
  const managerDocument = documents.find((doc) =>
    /^\s{4}packageManagerDependencies:/m.test(doc),
  );
  const integrities = new Map();
  if (!managerDocument) return integrities;
  const entry =
    /^ {2}'?([^'\s][^']*?)'?:\n {4}resolution: \{integrity: ([^,}\s]+)/gm;
  for (const [, key, integrity] of managerDocument.matchAll(entry)) {
    integrities.set(key, integrity);
  }
  return integrities;
}

// Compares what npm installed (its package-lock.json) with what pnpm-lock.yaml
// pins. Returns the problems; an empty list means the install can be trusted.
export function checkInstall({ npmLock, locked, version }) {
  const problems = [];
  const installed = Object.entries(npmLock.packages ?? {}).filter(
    ([path]) => path !== "",
  );
  if (!installed.some(([path]) => path === "node_modules/pnpm")) {
    problems.push("npm did not install pnpm");
  }
  if (!locked.has(`pnpm@${version}`)) {
    problems.push(
      `pnpm-lock.yaml does not pin pnpm@${version}; run pnpm install to record it`,
    );
  }
  for (const [path, entry] of installed) {
    const name = path.replace(/^.*node_modules\//, "");
    const key = `${name}@${entry.version}`;
    const want = locked.get(key);
    if (!want) {
      problems.push(`${key} is not pinned in pnpm-lock.yaml`);
    } else if (entry.integrity !== want) {
      problems.push(
        `${key}: npm installed ${entry.integrity}, pnpm-lock.yaml pins ${want}`,
      );
    }
  }
  return problems;
}

function fail(message) {
  console.error(`::error::${message}`);
  process.exit(1);
}

function setup(prefix) {
  const root = resolve(prefix);
  const manifest = JSON.parse(
    readFileSync(join(repoRoot, "package.json"), "utf8"),
  );
  let version;
  try {
    version = pinnedPnpmVersion({ packageManager: manifest.packageManager });
  } catch (err) {
    fail(err.message);
  }
  const locked = lockedIntegrities({
    lockfile: readFileSync(join(repoRoot, "pnpm-lock.yaml"), "utf8"),
  });

  mkdirSync(root, { recursive: true });
  writeFileSync(join(root, "package.json"), '{ "private": true }\n');
  const npm = (args) =>
    execFileSync("npm", args, { cwd: root, stdio: ["ignore", 2, 2] });
  npm([
    "install",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    "--save-exact",
    `pnpm@${version}`,
  ]);

  const npmLock = JSON.parse(
    readFileSync(join(root, "package-lock.json"), "utf8"),
  );
  const problems = checkInstall({ npmLock, locked, version });
  if (problems.length > 0) fail(problems.join("\n"));

  // Checked, so pnpm's install script may now link its native binary.
  npm(["rebuild", "pnpm"]);

  const bin = join(root, "node_modules", ".bin");
  const running = execFileSync(join(bin, "pnpm"), ["--version"], {
    cwd: repoRoot,
    encoding: "utf8",
  }).trim();
  if (running !== version) {
    fail(`expected pnpm ${version}, but ${bin}/pnpm reports ${running}`);
  }
  console.error(`pnpm ${version} installed and checked against pnpm-lock.yaml`);
  console.log(bin);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const [prefix] = process.argv.slice(2);
  if (!prefix) fail("Usage: node scripts/setup-pnpm.mjs <prefix>");
  setup(prefix);
}
