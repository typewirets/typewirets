// Release helpers for .github/workflows/publish.yml. Package versions stay at
// 0.0.0 in git; the release version is written into each publishable package
// (every package under packages/ that isn't "private") at release time, in CI
// only, and never committed.
//
// Usage, from the repository root:
//   node scripts/release.mjs prepare <version> <outDir>
//     Checks the version against the changelogs, npm and the git tags, sets
//     package versions, and writes <outDir>/plan.json. Prints the latest
//     version on npm and the next patch, minor and major numbers either way.
//   node scripts/release.mjs pack <version> <outDir>
//     Packs each package and checks the tarball. Writes <outDir>/publish-order.txt
//     with one "<name> <tarball>" line per package still to stage, dependencies
//     first.
//   node scripts/release.mjs notes <version>
//     Prints GitHub release notes built from each package's changelog section.
//   node scripts/release.mjs verify <version>
//     Warns about any package whose npm provenance doesn't name this commit.
//
// The pure functions are exported for scripts/release.test.mjs.
import { execFileSync } from "node:child_process";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { workspacePackages } from "./workspace-packages.mjs";

const dependencyFields = [
  "dependencies",
  "peerDependencies",
  "optionalDependencies",
];

// Plain X.Y.Z, or a pre-release such as 0.2.0-rc.1. No build metadata.
const versionPattern =
  /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;

export function parseVersion(version) {
  const match = versionPattern.exec(version);
  if (!match) return undefined;
  return {
    core: [Number(match[1]), Number(match[2]), Number(match[3])],
    pre: match[4] ? match[4].split(".") : [],
  };
}

// Semver precedence: negative when a < b, 0 when equal, positive when a > b.
// Positional on purpose: it is an Array.prototype.sort comparator.
export function compareVersions(a, b) {
  const x = parseVersion(a);
  const y = parseVersion(b);
  for (let i = 0; i < 3; i++) {
    if (x.core[i] !== y.core[i]) return x.core[i] - y.core[i];
  }
  // A pre-release sorts before the release it leads up to.
  if (x.pre.length === 0 || y.pre.length === 0) {
    return y.pre.length - x.pre.length;
  }
  for (let i = 0; i < Math.min(x.pre.length, y.pre.length); i++) {
    const p = x.pre[i];
    const q = y.pre[i];
    if (p === q) continue;
    const pNum = /^\d+$/.test(p);
    const qNum = /^\d+$/.test(q);
    if (pNum && qNum) return Number(p) - Number(q);
    if (pNum !== qNum) return pNum ? -1 : 1;
    return p < q ? -1 : 1;
  }
  return x.pre.length - y.pre.length;
}

function highest(versions) {
  return versions
    .filter((v) => parseVersion(v))
    .reduce((max, v) => (!max || compareVersions(v, max) > 0 ? v : max), "");
}

export function nextVersions(latest) {
  const [major, minor, patch] = parseVersion(latest ?? "0.0.0").core;
  return {
    patch: `${major}.${minor}.${patch + 1}`,
    minor: `${major}.${minor + 1}.0`,
    major: `${major + 1}.0.0`,
  };
}

// The git commit a published version was built from, read from its npm
// provenance (the response of its dist.attestations.url), or undefined.
export function provenanceCommit(attestations) {
  for (const attestation of attestations?.attestations ?? []) {
    if (attestation.predicateType !== "https://slsa.dev/provenance/v1")
      continue;
    try {
      const statement = JSON.parse(
        Buffer.from(
          attestation.bundle.dsseEnvelope.payload,
          "base64",
        ).toString(),
      );
      const commit =
        statement.predicate.buildDefinition.resolvedDependencies?.[0]?.digest
          ?.gitCommit;
      if (commit) return commit;
    } catch {}
  }
  return undefined;
}

// Decides what a release of `version` does, from what npm, git and the
// changelogs hold. Each package is { name, versions, hasChangelog, liveCommit },
// where versions is null when the package isn't on npm at all, and liveCommit
// is the commit a package already live at `version` was built from. Those
// packages are skipped, so a partly approved release can be finished at its
// own version, but only from the commit it was built from.
export function planRelease({ version, packages, tagExists, commit }) {
  const allVersions = packages.flatMap((p) => p.versions ?? []);
  const latest =
    highest(allVersions.filter((v) => parseVersion(v)?.pre.length === 0)) ||
    undefined;
  const plan = {
    version,
    distTag: "latest",
    latest,
    next: nextVersions(latest),
    packages: packages.map((p) => p.name),
    live: [],
    toStage: [],
    problems: [],
  };

  const parsed = parseVersion(version);
  if (!parsed) {
    plan.problems.push(
      `Invalid version: ${version} (expected X.Y.Z or X.Y.Z-pre.N)`,
    );
    return plan;
  }
  if (parsed.pre.length > 0) plan.distTag = "next";

  for (const pkg of packages) {
    if (!pkg.hasChangelog) {
      plan.problems.push(
        `${pkg.name}: CHANGELOG.md has no "## ${version}" section`,
      );
    }
    // Trusted publishing can only be set up for a package that already
    // exists, so a new package needs its first version published by hand.
    if (pkg.versions === null) {
      plan.problems.push(
        `${pkg.name}: not on npm yet; publish its first version by hand`,
      );
      continue;
    }
    const max = highest(pkg.versions);
    if (pkg.versions.includes(version) && version === max) {
      plan.live.push(pkg.name);
      if (pkg.liveCommit !== commit) {
        plan.problems.push(
          `${pkg.name}: ${version} was built from commit ${pkg.liveCommit ?? "(unknown)"}, not ${commit}. Finish it from that commit (approve its pending stages and re-run the original run), or release a new version`,
        );
      }
      continue;
    }
    if (max && compareVersions(version, max) <= 0) {
      plan.problems.push(
        `${pkg.name}: ${version} isn't higher than ${max}, already on npm`,
      );
    }
    plan.toStage.push(pkg.name);
  }

  if (tagExists) {
    plan.problems.push(`Tag v${version} already exists`);
  }
  return plan;
}

export function withVersion({ manifestText, version }) {
  return manifestText.replace(
    /"version":\s*"[^"]*"/,
    `"version": "${version}"`,
  );
}

// Problems with a packed package.json: it must carry the release version, and
// workspace siblings must be pinned to that same version, not "workspace:*".
export function checkPackedManifest({ manifest, version, siblings }) {
  const problems = [];
  if (manifest.version !== version) {
    problems.push(`version is ${manifest.version}, expected ${version}`);
  }
  for (const field of dependencyFields) {
    for (const [dep, range] of Object.entries(manifest[field] ?? {})) {
      if (range.startsWith("workspace:")) {
        problems.push(`${field}.${dep} is still "${range}"`);
      } else if (siblings.includes(dep) && range !== version) {
        problems.push(`${field}.${dep} is "${range}", expected "${version}"`);
      }
    }
  }
  return problems;
}

export function changelogSection({ changelog, version }) {
  const lines = changelog.split("\n");
  const start = lines.findIndex((line) => line.trim() === `## ${version}`);
  if (start === -1) return undefined;
  const end = lines.findIndex((line, i) => i > start && line.startsWith("## "));
  const section = lines
    .slice(start + 1, end === -1 ? undefined : end)
    .join("\n")
    .trim();
  return section || undefined;
}

export function releaseNotes({ version, sections }) {
  const parts = sections.map(({ name, section }) => `## ${name}\n\n${section}`);
  return `# v${version}\n\n${parts.join("\n\n")}\n`;
}

// Orders manifests so each comes after the workspace packages it depends on.
export function publishOrder(manifests) {
  const names = new Set(manifests.map((m) => m.name));
  const ordered = [];
  const placed = new Set();
  while (ordered.length < manifests.length) {
    const ready = manifests.filter(
      (m) =>
        !placed.has(m.name) &&
        dependencyFields
          .flatMap((field) => Object.keys(m[field] ?? {}))
          .every((dep) => !names.has(dep) || placed.has(dep)),
    );
    if (ready.length === 0) {
      throw new Error("Workspace packages depend on each other in a cycle");
    }
    for (const m of ready) {
      ordered.push(m);
      placed.add(m.name);
    }
  }
  return ordered;
}

// ---- Command line ----

function fail(message) {
  console.error(message);
  process.exit(1);
}

function publishablePackages() {
  const packages = workspacePackages().filter((p) => !p.manifest.private);
  const order = publishOrder(packages.map((p) => p.manifest));
  return order.map((m) => packages.find((p) => p.manifest === m));
}

function readChangelog(pkg) {
  const path = join(pkg.dir, "CHANGELOG.md");
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

async function npmVersions(name) {
  // The abbreviated metadata lists every version without their manifests.
  const res = await fetch(
    `https://registry.npmjs.org/${name.replace("/", "%2f")}`,
    { headers: { Accept: "application/vnd.npm.install-v1+json" } },
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${name}: npm registry returned ${res.status}`);
  return Object.keys((await res.json()).versions ?? {});
}

async function publishedCommit(name, version) {
  const res = await fetch(
    `https://registry.npmjs.org/${name.replace("/", "%2f")}/${version}`,
  );
  if (!res.ok) return undefined;
  const url = (await res.json()).dist?.attestations?.url;
  if (!url) return undefined;
  const attestations = await fetch(url);
  return attestations.ok
    ? provenanceCommit(await attestations.json())
    : undefined;
}

function headCommit() {
  return execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
}

function tagExists(version) {
  let out;
  try {
    out = execFileSync(
      "git",
      ["ls-remote", "--tags", "origin", `refs/tags/v${version}`],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
  } catch (err) {
    throw new Error(
      `Couldn't check the git tags on origin: ${err.stderr?.trim() || err.message}`,
    );
  }
  return out.trim() !== "";
}

function planSummary(plan) {
  const lines = [
    `## Release v${plan.version}`,
    "",
    `- Latest version on npm: ${plan.latest ?? "none"}`,
    `- Next: patch ${plan.next.patch}, minor ${plan.next.minor}, major ${plan.next.major}`,
    `- npm dist-tag: ${plan.distTag}`,
  ];
  if (plan.live.length > 0) {
    lines.push(`- Already live at ${plan.version}: ${plan.live.join(", ")}`);
  }
  lines.push(`- To stage: ${plan.toStage.join(", ") || "none"}`);
  if (plan.problems.length > 0) {
    lines.push("", "### Refused", "", ...plan.problems.map((p) => `- ${p}`));
  }
  return `${lines.join("\n")}\n`;
}

async function prepare(version, outDir) {
  const packages = publishablePackages();
  const valid = Boolean(parseVersion(version));
  let plan;
  try {
    plan = planRelease({
      version,
      packages: await Promise.all(
        packages.map(async (pkg) => {
          const { name } = pkg.manifest;
          const versions = await npmVersions(name);
          return {
            name,
            versions,
            hasChangelog: Boolean(
              changelogSection({ changelog: readChangelog(pkg), version }),
            ),
            liveCommit:
              valid && versions?.includes(version)
                ? await publishedCommit(name, version)
                : undefined,
          };
        }),
      ),
      tagExists: valid ? tagExists(version) : false,
      commit: headCommit(),
    });
  } catch (err) {
    fail(`Refused: ${err.message}`);
  }

  const summary = planSummary(plan);
  console.log(summary);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
  }
  if (plan.problems.length > 0) process.exit(1);

  const out = resolve(outDir);
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "plan.json"), `${JSON.stringify(plan, null, 2)}\n`);
  for (const pkg of packages) {
    writeFileSync(
      pkg.manifestPath,
      withVersion({
        manifestText: readFileSync(pkg.manifestPath, "utf8"),
        version,
      }),
    );
  }
}

function pack(version, outDir) {
  const out = resolve(outDir);
  const plan = JSON.parse(readFileSync(join(out, "plan.json"), "utf8"));
  const packages = publishablePackages();
  const siblings = packages.map((p) => p.manifest.name);
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

    const manifest = JSON.parse(
      execFileSync("tar", ["-xzOf", tarball, "package/package.json"], {
        encoding: "utf8",
      }),
    );
    const problems = checkPackedManifest({ manifest, version, siblings });
    if (problems.length > 0) {
      fail(problems.map((p) => `${name}: ${p}`).join("\n"));
    }

    const staged = plan.toStage.includes(name);
    console.log(`ok   ${name} ${tarball}${staged ? "" : " (already live)"}`);
    if (staged) order.push(`${name} ${tarball}`);
  }
  writeFileSync(
    join(out, "publish-order.txt"),
    order.length ? `${order.join("\n")}\n` : "",
  );
}

// Reports each package's provenance commit. Warns, never fails: by now the
// packages are live, and the tag and release should still follow.
async function verify(version) {
  const commit = headCommit();
  for (const pkg of publishablePackages()) {
    const { name } = pkg.manifest;
    const built = await publishedCommit(name, version);
    if (built === commit) {
      console.log(`ok   ${name}@${version} has provenance for ${commit}`);
    } else {
      console.log(
        `::warning::${name}@${version} provenance names commit ${built ?? "(none)"}, expected ${commit}`,
      );
    }
  }
}

function notes(version) {
  const sections = publishablePackages().map((pkg) => {
    const section = changelogSection({
      changelog: readChangelog(pkg),
      version,
    });
    if (!section)
      fail(`${pkg.manifest.name}: CHANGELOG.md has no "## ${version}" section`);
    return { name: pkg.manifest.name, section };
  });
  process.stdout.write(releaseNotes({ version, sections }));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const usage =
    "Usage: node scripts/release.mjs <prepare|pack|notes|verify> <version> [outDir]";
  const [command, version, outDir] = process.argv.slice(2);
  if (!version) fail(usage);

  if (command === "prepare" && outDir) {
    await prepare(version, outDir);
  } else if (command === "pack" && outDir) {
    pack(version, outDir);
  } else if (command === "notes") {
    notes(version);
  } else if (command === "verify") {
    await verify(version);
  } else {
    fail(usage);
  }
}
