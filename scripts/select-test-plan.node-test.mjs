import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { changedPullRequestPaths, selectTestPlan } from "./select-test-plan.mjs";

const full = { integration: "full", e2e: "full" };
const skipped = { integration: "skip", e2e: "skip" };
const scope = "inventory-maintenance";
const scoped = { integration: scope, e2e: scope };
const css = "src/app/globals.css";
const stock = "src/features/inventory/application/list-stock.ts";
const maintenance = "src/app/(admin)/maintenance/plans/page.tsx";

test("keeps only quality checks for documentation and standalone global CSS", () => {
  assert.deepEqual(selectTestPlan(["README.md", "docs/trips.md"]), skipped);
  assert.deepEqual(selectTestPlan([css, "docs/trips.md"]), skipped);
});

test("skips heavy jobs for unit-only changes, not integration tests", () => {
  assert.deepEqual(selectTestPlan(["src/components/ui/button.test.tsx"]), skipped);
  assert.deepEqual(selectTestPlan(["src/features/inventory/application/stock.test.ts"]), skipped);
  assert.deepEqual(selectTestPlan(["src/features/inventory/infrastructure/stock.integration.test.ts"]), scoped);
});

test("scopes inventory and maintenance together without losing a changed route", () => {
  assert.deepEqual(selectTestPlan([stock]), scoped);
  assert.deepEqual(selectTestPlan([maintenance, "docs/maintenance.md"]), scoped);
  assert.deepEqual(selectTestPlan([maintenance, stock]), scoped);
});

test("runs the full browser suite for global CSS mixed with feature changes", () => {
  assert.deepEqual(selectTestPlan([css, maintenance]), { ...scoped, e2e: "full" });
});

test("retains full coverage for shared, unknown and cross-module changes", () => {
  for (const path of [
    "src/components/ui/button.tsx", "src/app/(admin)/layout.tsx",
    "prisma/schema.prisma", ".github/workflows/ci.yml", "package-lock.json",
    "e2e/support/e2e-database.ts", "playwright.config.ts", "docs/test-config.ts",
    "src/features/inventory-other/presentation/page.tsx",
    "src/features/trip/application/create-trip.ts", "src/app/global.css",
  ]) {
    assert.deepEqual(selectTestPlan([stock, path]), full, path);
  }
  assert.deepEqual(selectTestPlan([]), full);
});

test("compares from the merge base, across all PR commits and both rename paths", () => {
  const cwd = mkdtempSync(join(tmpdir(), "test-plan-"));
  const git = (...args) => execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
  try {
    git("init", "-q");
    git("config", "user.name", "CI test");
    git("config", "user.email", "test@example.invalid");
    writeFileSync(join(cwd, "shared.ts"), "export const shared = true;\n");
    git("add", ".");
    git("commit", "-qm", "Base");
    const ancestor = git("rev-parse", "HEAD");
    git("switch", "-qc", "pr");
    mkdirSync(join(cwd, "docs"));
    renameSync(join(cwd, "shared.ts"), join(cwd, "docs", "rename.md"));
    git("add", "-A");
    git("commit", "-qm", "Rename across scopes");
    writeFileSync(join(cwd, "README.md"), "# Example\n");
    git("add", "README.md");
    git("commit", "-qm", "Documentation follow-up");
    const head = git("rev-parse", "HEAD");
    git("switch", "-qc", "base", ancestor);
    writeFileSync(join(cwd, "base-only.ts"), "export {};\n");
    git("add", "base-only.ts");
    git("commit", "-qm", "Base advanced");

    const paths = changedPullRequestPaths(git("rev-parse", "HEAD"), head, cwd);
    assert.deepEqual(paths.sort(), ["README.md", "docs/rename.md", "shared.ts"]);
    assert.deepEqual(selectTestPlan(paths), full);
    assert.throws(() => changedPullRequestPaths("not-a-sha", head));
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
