// Tests that the GitHub Actions workflows follow the supply-chain rules in
// AGENTS.md: only listed actions, each pinned to a commit, and pnpm installed
// by the pinned pnpm/action-setup with its version checked, never Corepack.
//
// Run with: pnpm test:scripts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

const workflows = Object.fromEntries(
  ["ci.yml", "publish.yml"].map((name) => [
    name,
    read(`../.github/workflows/${name}`),
  ]),
);

// The actions AGENTS.md accepts: the first column of its table.
const allowed = new Set(
  [...read("../AGENTS.md").matchAll(/^\| `([\w.-]+\/[\w.-]+)` \|/gm)].map(
    ([, action]) => action,
  ),
);

// Third-party `uses:` lines; local reusable workflows (./…) aren't actions.
const uses = (workflow) =>
  [...workflow.matchAll(/^\s*-?\s*uses: (?!\.\/)(\S+)(.*)$/gm)].map(
    ([, ref, rest]) => ({ ref, rest }),
  );

describe("the workflows", () => {
  test("AGENTS.md lists pnpm/action-setup as an exception", () => {
    assert.ok(allowed.has("pnpm/action-setup"));
    assert.ok(allowed.has("actions/checkout"));
  });

  for (const [name, workflow] of Object.entries(workflows)) {
    test(`${name}: only uses actions listed in AGENTS.md, each pinned to a commit`, () => {
      const found = uses(workflow);
      assert.ok(found.length > 0);
      for (const { ref, rest } of found) {
        const [action, sha] = ref.split("@");
        assert.ok(allowed.has(action), `${action} is not listed in AGENTS.md`);
        assert.match(sha ?? "", /^[0-9a-f]{40}$/, ref);
        assert.match(rest, /^ # v\d/, `${ref} needs a "# vX.Y.Z" comment`);
      }
    });

    test(`${name}: pnpm comes from pnpm/action-setup, and its version is checked, never Corepack`, () => {
      assert.doesNotMatch(
        workflow,
        /corepack (enable|use|prepare|install)|install (-g )?corepack/,
      );
      const setup = workflow.indexOf("uses: pnpm/action-setup@");
      assert.ok(setup > 0, "pnpm/action-setup is not used");
      const check = workflow.indexOf('test "$(pnpm --version)" =', setup);
      assert.ok(check > setup, "no pnpm --version check after the setup");
      const firstPnpmCommand = workflow.search(/run: pnpm /);
      assert.ok(
        check < firstPnpmCommand,
        "pnpm runs before its version is checked",
      );
    });

    test(`${name}: checkouts don't keep credentials`, () => {
      const checkouts = workflow.match(/uses: actions\/checkout@/g) ?? [];
      const noCredentials = workflow.match(/persist-credentials: false/g) ?? [];
      assert.equal(noCredentials.length, checkouts.length);
    });
  }
});
