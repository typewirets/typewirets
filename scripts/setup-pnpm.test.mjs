// Tests for scripts/setup-pnpm.mjs, which installs pnpm in CI without
// Corepack and refuses a pnpm whose hashes differ from pnpm-lock.yaml.
//
// Run with: pnpm test:scripts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import {
  checkInstall,
  lockedIntegrities,
  pinnedPnpmVersion,
} from "./setup-pnpm.mjs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

const lockfile = `---
lockfileVersion: '9.0'

importers:

  .:
    configDependencies: {}
    packageManagerDependencies:
      pnpm:
        specifier: 12.18.0
        version: 12.18.0

packages:

  '@pnpm/exe.linux-x64@12.18.0':
    resolution: {integrity: sha512-linux==}
    cpu: [x64]
    os: [linux]

  pnpm@12.18.0:
    resolution: {integrity: sha512-pnpm==}
    engines: {node: '>=18'}
    hasBin: true

---
lockfileVersion: '9.0'

packages:

  typescript@5.8.2:
    resolution: {integrity: sha512-typescript==}
`;

const npmLock = (overrides = {}) => ({
  packages: {
    "": { dependencies: { pnpm: "12.18.0" } },
    "node_modules/pnpm": { version: "12.18.0", integrity: "sha512-pnpm==" },
    "node_modules/@pnpm/exe.linux-x64": {
      version: "12.18.0",
      integrity: "sha512-linux==",
      optional: true,
    },
    ...overrides,
  },
});

describe("pinnedPnpmVersion", () => {
  test("reads the exact version, with or without Corepack's hash suffix", () => {
    assert.equal(
      pinnedPnpmVersion({ packageManager: "pnpm@12.18.0" }),
      "12.18.0",
    );
    assert.equal(
      pinnedPnpmVersion({ packageManager: "pnpm@12.18.0+sha512.abc" }),
      "12.18.0",
    );
  });

  test("refuses a range, another package manager or no pin", () => {
    for (const packageManager of ["pnpm@^12", "yarn@4.18.0", "", undefined]) {
      assert.throws(() => pinnedPnpmVersion({ packageManager }), /exact pnpm/);
    }
  });
});

describe("lockedIntegrities", () => {
  test("reads only the package-manager document of the lockfile", () => {
    const locked = lockedIntegrities({ lockfile });
    assert.deepEqual(Object.fromEntries(locked), {
      "@pnpm/exe.linux-x64@12.18.0": "sha512-linux==",
      "pnpm@12.18.0": "sha512-pnpm==",
    });
  });

  test("a lockfile without a pinned pnpm pins nothing", () => {
    const locked = lockedIntegrities({
      lockfile: lockfile.split(/^---$/m)[2],
    });
    assert.equal(locked.size, 0);
  });
});

describe("checkInstall", () => {
  const locked = lockedIntegrities({ lockfile });

  test("accepts an install whose hashes match pnpm-lock.yaml", () => {
    assert.deepEqual(
      checkInstall({ npmLock: npmLock(), locked, version: "12.18.0" }),
      [],
    );
  });

  test("refuses a package whose bytes differ from the pinned hash", () => {
    const problems = checkInstall({
      npmLock: npmLock({
        "node_modules/@pnpm/exe.linux-x64": {
          version: "12.18.0",
          integrity: "sha512-tampered==",
        },
      }),
      locked,
      version: "12.18.0",
    });
    assert.equal(problems.length, 1);
    assert.match(problems[0], /exe\.linux-x64@12\.18\.0.*tampered/);
  });

  test("refuses a package that pnpm-lock.yaml doesn't pin", () => {
    const problems = checkInstall({
      npmLock: npmLock({
        "node_modules/left-pad": { version: "1.3.0", integrity: "sha512-x==" },
      }),
      locked,
      version: "12.18.0",
    });
    assert.deepEqual(problems, [
      "left-pad@1.3.0 is not pinned in pnpm-lock.yaml",
    ]);
  });

  test("refuses a pnpm version that was bumped without updating the lockfile", () => {
    const problems = checkInstall({
      npmLock: npmLock({
        "node_modules/pnpm": { version: "12.19.0", integrity: "sha512-new==" },
      }),
      locked,
      version: "12.19.0",
    });
    assert.ok(problems.some((p) => /does not pin pnpm@12\.19\.0/.test(p)));
  });
});

describe("this repository", () => {
  test("pnpm-lock.yaml pins the pnpm that package.json asks for", () => {
    const version = pinnedPnpmVersion(JSON.parse(read("../package.json")));
    const locked = lockedIntegrities({ lockfile: read("../pnpm-lock.yaml") });
    assert.match(locked.get(`pnpm@${version}`) ?? "", /^sha512-/);
    assert.match(
      locked.get(`@pnpm/exe.linux-x64@${version}`) ?? "",
      /^sha512-/,
    );
  });

  test("CI installs pnpm through setup-pnpm.mjs, never Corepack", () => {
    for (const path of [
      "../.github/workflows/ci.yml",
      "../.github/workflows/publish.yml",
    ]) {
      const workflow = read(path);
      assert.doesNotMatch(
        workflow,
        /corepack (enable|use|prepare|install)|install (-g )?corepack/,
        path,
      );
      assert.match(workflow, /node scripts\/setup-pnpm\.mjs /, path);
    }
  });
});
