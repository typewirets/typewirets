// Tests for the release rules in scripts/release.mjs and the guarantees of
// .github/workflows/publish.yml. IDs in test names (B3, …) are behaviour lines
// in docs/projects/2026-11-07-npm-release/product.html.
//
// Run with: pnpm test:scripts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import {
  changelogSection,
  changelogStatus,
  changelogVersions,
  checkPackedManifest,
  commitImpact,
  compareVersions,
  latestStable,
  nextVersions,
  planRelease,
  provenanceCommit,
  publishOrder,
  releaseNotes,
  suggestVersion,
  withVersion,
} from "./release.mjs";

const names = [
  "@typewirets/core",
  "@typewirets/inversify",
  "@typewirets/react",
];

function onNpm(versions, { hasChangelog = true } = {}) {
  return names.map((name) => ({ name, versions, hasChangelog }));
}

describe("compareVersions", () => {
  test("orders by semver precedence, pre-releases before their release", () => {
    const sorted = [
      "1.0.0",
      "0.2.0",
      "0.2.0-rc.10",
      "0.2.0-rc.2",
      "0.2.0-beta",
      "0.10.0",
      "0.2.0-rc.2.1",
    ].sort(compareVersions);
    assert.deepEqual(sorted, [
      "0.2.0-beta",
      "0.2.0-rc.2",
      "0.2.0-rc.2.1",
      "0.2.0-rc.10",
      "0.2.0",
      "0.10.0",
      "1.0.0",
    ]);
  });
});

describe("nextVersions", () => {
  test("B2: with nothing stable on npm yet, counts up from 0.0.0", () => {
    assert.deepEqual(nextVersions(undefined), {
      patch: "0.0.1",
      minor: "0.1.0",
      major: "1.0.0",
    });
  });
});

describe("suggesting the next version (release skill)", () => {
  const commit = (subject, body = "") => ({ subject, body });

  test("rates commits by Conventional Commits", () => {
    assert.equal(commitImpact(commit("feat: add preload")), "feature");
    assert.equal(
      commitImpact(commit("feat(react): add usePreload")),
      "feature",
    );
    assert.equal(
      commitImpact(commit("fix(core)!: drop getAllAsync")),
      "breaking",
    );
    assert.equal(commitImpact(commit("feat!: rename apply")), "breaking");
    assert.equal(
      commitImpact(
        commit("refactor: tidy", "Text.\n\nBREAKING CHANGE: bind is async"),
      ),
      "breaking",
    );
    for (const subject of [
      "fix(core): keep cache",
      "docs: list ports",
      "chore(ci): bump",
      "Update GitHub Actions to latest versions (#14)",
      "feature: not the convention",
    ]) {
      assert.equal(commitImpact(commit(subject)), "patch", subject);
    }
  });

  test("the strongest commit decides the bump", () => {
    const fixes = [commit("fix: a"), commit("docs: b")];
    assert.deepEqual(
      [suggestVersion({ latest: "1.2.3", commits: fixes })].map((s) => [
        s.bump,
        s.version,
      ]),
      [["patch", "1.2.4"]],
    );
    const withFeature = [...fixes, commit("feat: c")];
    assert.equal(
      suggestVersion({ latest: "1.2.3", commits: withFeature }).version,
      "1.3.0",
    );
    const withBreaking = [...withFeature, commit("feat!: d")];
    assert.equal(
      suggestVersion({ latest: "1.2.3", commits: withBreaking }).version,
      "2.0.0",
    );
  });

  test("below 1.0.0 a breaking change bumps the minor version", () => {
    const s = suggestVersion({ latest: "0.1.0", commits: [commit("fix!: e")] });
    assert.equal(s.bump, "minor");
    assert.equal(s.version, "0.2.0");
  });

  test("no commits since the latest version means nothing to release", () => {
    assert.deepEqual(suggestVersion({ latest: "0.1.0", commits: [] }), {
      bump: null,
      version: null,
      commits: [],
    });
  });

  test("the latest version ignores pre-releases", () => {
    assert.equal(latestStable(["0.1.0", "0.2.0-rc.1", "0.1.1"]), "0.1.1");
    assert.equal(latestStable(["0.2.0-rc.1"]), undefined);
  });

  test("reports whether a changelog is ready for the suggested version", () => {
    const status = (changelog, version = "0.2.0") =>
      changelogStatus({
        changelog,
        version,
        published: ["0.1.0", "0.2.0-rc.1"],
      });
    assert.deepEqual(status("## 0.2.0\n\n- New.\n\n## 0.1.0\n\n- Initial."), {
      state: 'has "## 0.2.0"',
      neverPublished: [],
    });
    assert.deepEqual(
      status("## Unreleased\n\n- New.\n\n## 0.1.1\n\n- Fix.\n\n## 0.1.0\n"),
      {
        state: 'entries under "## Unreleased"',
        neverPublished: ["0.1.1"],
      },
    );
    assert.deepEqual(status("## 0.2.0-rc.1\n\n- New.\n\n## 0.1.0\n"), {
      state: 'newest section is "## 0.2.0-rc.1"',
      neverPublished: [],
    });
    assert.deepEqual(status(""), { state: "no entries", neverPublished: [] });
    assert.deepEqual(status("## 0.1.0\n\n- Initial.", null), {
      state: 'newest section is "## 0.1.0"',
      neverPublished: [],
    });
  });

  test("finds every version heading in a changelog", () => {
    assert.deepEqual(
      changelogVersions(
        "# Changelog\n\n## Unreleased\n\n## 0.1.1\n\n- x\n\n## 0.1.0\n",
      ),
      ["0.1.1", "0.1.0"],
    );
  });
});

describe("planning a release", () => {
  test("B1: a new version stages every package", () => {
    const plan = planRelease({
      version: "0.2.0",
      packages: onNpm(["0.1.0"]),
      tagExists: false,
    });
    assert.deepEqual(plan.problems, []);
    assert.deepEqual(plan.toStage, names);
  });

  test("B2: reports the latest stable version on npm and the next numbers", () => {
    const plan = planRelease({
      version: "0.1.1",
      packages: onNpm(["0.1.0", "0.2.0-rc.1"]),
      tagExists: false,
    });
    assert.equal(plan.latest, "0.1.0");
    assert.deepEqual(plan.next, {
      patch: "0.1.1",
      minor: "0.2.0",
      major: "1.0.0",
    });
  });

  test("B3: refuses an invalid version", () => {
    for (const version of ["1.0", "v1.0.0", "1.0.0;rm -rf", "1.0.0+build"]) {
      const plan = planRelease({
        version,
        packages: onNpm(["0.1.0"]),
        tagExists: false,
      });
      assert.match(plan.problems.join("\n"), /Invalid version/, version);
    }
  });

  test("B3: refuses a version that isn't higher than npm's", () => {
    for (const version of ["0.1.0", "0.0.9", "0.2.0-rc.1"]) {
      const plan = planRelease({
        version,
        packages: [
          {
            name: "@typewirets/core",
            versions: ["0.1.0", "0.2.0-rc.2"],
            hasChangelog: true,
          },
        ],
        tagExists: false,
      });
      assert.match(plan.problems.join("\n"), /isn't higher than/, version);
    }
  });

  test("B3: refuses a version without a changelog section", () => {
    const plan = planRelease({
      version: "0.2.0",
      packages: onNpm(["0.1.0"], { hasChangelog: false }),
      tagExists: false,
    });
    assert.equal(plan.problems.length, 3);
    assert.match(plan.problems[0], /CHANGELOG.md has no "## 0.2.0" section/);
  });

  test("B3: refuses a version whose tag already exists", () => {
    const plan = planRelease({
      version: "0.2.0",
      packages: onNpm(["0.1.0"]),
      tagExists: true,
    });
    assert.deepEqual(plan.problems, ["Tag v0.2.0 already exists"]);
  });

  test("B3: refuses a package that isn't on npm yet", () => {
    const plan = planRelease({
      version: "0.2.0",
      packages: [
        { name: "@typewirets/new", versions: null, hasChangelog: true },
      ],
      tagExists: false,
    });
    assert.match(plan.problems[0], /not on npm yet/);
  });

  test("B9: a pre-release goes to the next dist-tag, a release to latest", () => {
    const pre = planRelease({
      version: "0.2.0-rc.1",
      packages: onNpm(["0.1.0"]),
      tagExists: false,
    });
    const release = planRelease({
      version: "0.2.0",
      packages: onNpm(["0.1.0"]),
      tagExists: false,
    });
    assert.equal(pre.distTag, "next");
    assert.equal(release.distTag, "latest");
  });

  test("B14: a version that was staged but never approved can be released again", () => {
    // A rejected or abandoned stage never becomes a published version.
    const plan = planRelease({
      version: "0.2.0",
      packages: onNpm(["0.1.0"]),
      tagExists: false,
    });
    assert.deepEqual(plan.problems, []);
    assert.deepEqual(plan.toStage, names);
  });

  test("B15: a partly approved release is finished by staging only what's missing", () => {
    const plan = planRelease({
      version: "0.2.0",
      packages: [
        {
          name: "@typewirets/core",
          versions: ["0.1.0", "0.2.0"],
          hasChangelog: true,
          liveCommit: "abc123",
        },
        {
          name: "@typewirets/inversify",
          versions: ["0.1.0"],
          hasChangelog: true,
        },
        { name: "@typewirets/react", versions: ["0.1.0"], hasChangelog: true },
      ],
      tagExists: false,
      commit: "abc123",
    });
    assert.deepEqual(plan.problems, []);
    assert.deepEqual(plan.live, ["@typewirets/core"]);
    assert.deepEqual(plan.toStage, [
      "@typewirets/inversify",
      "@typewirets/react",
    ]);
  });

  test("B13/B15: a release that is live everywhere but untagged stages nothing and goes on to tag", () => {
    const plan = planRelease({
      version: "0.2.0",
      packages: onNpm(["0.1.0", "0.2.0"]).map((p) => ({
        ...p,
        liveCommit: "abc123",
      })),
      tagExists: false,
      commit: "abc123",
    });
    assert.deepEqual(plan.problems, []);
    assert.deepEqual(plan.toStage, []);
  });

  test("B10/B15: a release can only be finished from the commit it was built from", () => {
    for (const liveCommit of ["def456", undefined]) {
      const plan = planRelease({
        version: "0.2.0",
        packages: [
          {
            name: "@typewirets/core",
            versions: ["0.1.0", "0.2.0"],
            hasChangelog: true,
            liveCommit,
          },
          {
            name: "@typewirets/react",
            versions: ["0.1.0"],
            hasChangelog: true,
          },
        ],
        tagExists: false,
        commit: "abc123",
      });
      assert.equal(plan.problems.length, 1);
      assert.match(
        plan.problems[0],
        /^@typewirets\/core: 0\.2\.0 was built from commit/,
      );
    }
  });

  test("B15: a finished release (live and tagged) is refused", () => {
    const plan = planRelease({
      version: "0.2.0",
      packages: onNpm(["0.1.0", "0.2.0"]),
      tagExists: true,
    });
    assert.deepEqual(plan.problems, ["Tag v0.2.0 already exists"]);
  });
});

describe("provenance", () => {
  function attestations(statement) {
    return {
      attestations: [
        {
          predicateType:
            "https://github.com/npm/attestation/tree/main/specs/publish/v0.1",
          bundle: { dsseEnvelope: { payload: "" } },
        },
        {
          predicateType: "https://slsa.dev/provenance/v1",
          bundle: {
            dsseEnvelope: {
              payload: Buffer.from(JSON.stringify(statement)).toString(
                "base64",
              ),
            },
          },
        },
      ],
    };
  }

  test("B12: reads the commit a version was built from", () => {
    const commit = provenanceCommit(
      attestations({
        predicate: {
          buildDefinition: {
            resolvedDependencies: [
              {
                uri: "git+https://github.com/typewirets/typewirets@refs/heads/main",
                digest: {
                  gitCommit: "0fd9a29f57d49d496f39c952f44c1b5fc3e90769",
                },
              },
            ],
          },
        },
      }),
    );
    assert.equal(commit, "0fd9a29f57d49d496f39c952f44c1b5fc3e90769");
  });

  test("B12: no provenance, or one without a commit, gives no commit", () => {
    assert.equal(provenanceCommit(undefined), undefined);
    assert.equal(provenanceCommit({ attestations: [] }), undefined);
    assert.equal(provenanceCommit(attestations({ predicate: {} })), undefined);
  });
});

describe("packages as shipped", () => {
  test("B1: the release version replaces the placeholder and nothing else", () => {
    const text =
      '{\n  "name": "@typewirets/core",\n  "version": "0.0.0",\n  "files": ["dist"]\n}\n';
    assert.equal(
      withVersion({ manifestText: text, version: "0.2.0" }),
      '{\n  "name": "@typewirets/core",\n  "version": "0.2.0",\n  "files": ["dist"]\n}\n',
    );
  });

  test("B4: a packed adapter pinned to core at the release version passes", () => {
    const problems = checkPackedManifest({
      manifest: {
        version: "0.2.0",
        dependencies: { "@typewirets/core": "0.2.0" },
        peerDependencies: { inversify: "^7.0.0" },
      },
      version: "0.2.0",
      siblings: names,
    });
    assert.deepEqual(problems, []);
  });

  test("B4: a wrong version, a workspace range or a loose pin on core fails", () => {
    const problems = checkPackedManifest({
      manifest: {
        version: "0.0.0",
        dependencies: { "@typewirets/core": "workspace:*" },
        peerDependencies: { "@typewirets/react": "^0.2.0" },
      },
      version: "0.2.0",
      siblings: names,
    });
    assert.deepEqual(problems, [
      "version is 0.0.0, expected 0.2.0",
      'dependencies.@typewirets/core is still "workspace:*"',
      'peerDependencies.@typewirets/react is "^0.2.0", expected "0.2.0"',
    ]);
  });

  test("B6: core comes before the packages that depend on it", () => {
    const order = publishOrder([
      {
        name: "@typewirets/react",
        dependencies: { "@typewirets/core": "workspace:*" },
      },
      { name: "@typewirets/core" },
      {
        name: "@typewirets/inversify",
        dependencies: { "@typewirets/core": "workspace:*" },
      },
    ]).map((m) => m.name);
    assert.equal(order[0], "@typewirets/core");
    assert.equal(order.length, 3);
  });
});

describe("release notes", () => {
  const changelog = [
    "# Changelog",
    "",
    "## Unreleased",
    "",
    "- Not shipped yet.",
    "",
    "## 0.2.0",
    "",
    "- **New:** `preload`.",
    "",
    "### Notes",
    "",
    "- Detail.",
    "",
    "## 0.1.0",
    "",
    "- Initial release.",
  ].join("\n");

  test("B11: the notes are each package's section for that version", () => {
    const section = changelogSection({ changelog, version: "0.2.0" });
    assert.equal(section, "- **New:** `preload`.\n\n### Notes\n\n- Detail.");
    assert.equal(
      releaseNotes({
        version: "0.2.0",
        sections: [{ name: "@typewirets/core", section }],
      }),
      "# v0.2.0\n\n## @typewirets/core\n\n- **New:** `preload`.\n\n### Notes\n\n- Detail.\n",
    );
  });

  test("B3/B11: an Unreleased-only or empty section doesn't count as a section", () => {
    assert.equal(changelogSection({ changelog, version: "0.3.0" }), undefined);
    assert.equal(
      changelogSection({
        changelog: "## 0.3.0\n\n## 0.2.0\n- x",
        version: "0.3.0",
      }),
      undefined,
    );
  });
});

describe("the publish workflow", () => {
  const workflow = readFileSync(
    new URL("../.github/workflows/publish.yml", import.meta.url),
    "utf8",
  );
  const steps = workflow.split("\n");

  // Each job's text, keyed by its id: the lines under `jobs:` from one
  // two-space-indented key to the next.
  const jobs = {};
  let current;
  for (const line of workflow
    .slice(workflow.indexOf("\njobs:\n"))
    .split("\n")) {
    const header = /^ {2}([a-z-]+):$/.exec(line);
    if (header) {
      current = header[1];
      jobs[current] = "";
    } else if (current) {
      jobs[current] += `${line}\n`;
    }
  }

  test("V2: only a job that runs no repository or dependency code can get the npm token", () => {
    const withToken = Object.entries(jobs).filter(([, text]) =>
      /id-token: write/.test(text),
    );
    assert.deepEqual(
      withToken.map(([id]) => id),
      ["stage"],
    );
    const [, stage] = withToken[0];
    assert.doesNotMatch(stage, /actions\/checkout|pnpm|scripts\//);
  });

  test("B10: the tag is checked again right before the release creates it", () => {
    const release = jobs.release;
    const check = release.indexOf("git/ref/tags/v$VERSION");
    assert.ok(check > 0);
    assert.ok(check < release.indexOf("gh release create"));
  });

  test("B7: no npm token or other secret is used", () => {
    assert.doesNotMatch(workflow, /secrets\./);
    assert.doesNotMatch(workflow, /NODE_AUTH_TOKEN|NPM_TOKEN/);
  });

  test("B16: a release never commits or pushes to the repository", () => {
    assert.doesNotMatch(workflow, /git (commit|push)/);
  });

  test("AGENTS.md: actions are pinned to commit SHAs and checkouts don't keep credentials", () => {
    // Local reusable workflows (uses: ./…) aren't third-party actions.
    const uses = steps.filter((line) => /^\s*-?\s*uses: (?!\.\/)/.test(line));
    assert.ok(uses.length > 0);
    for (const line of uses) {
      assert.match(line, /@[0-9a-f]{40} # v\d/, line.trim());
    }
    const checkouts = workflow.match(/uses: actions\/checkout@/g) ?? [];
    const noCredentials = workflow.match(/persist-credentials: false/g) ?? [];
    assert.equal(noCredentials.length, checkouts.length);
  });

  test("AGENTS.md: workflow permissions start from contents: read", () => {
    assert.match(workflow, /^permissions:\n {2}contents: read$/m);
  });
});
