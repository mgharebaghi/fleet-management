import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { changedPullRequestPaths, isBaseImageRegistryOnly, selectTestPlan } from "./select-test-plan.mjs";

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

test("scopes the meter spec and a registry-only hotfix, not application or unrelated CI edits", () => {
  const spec = "e2e/vehicle-meter-readings.e2e.ts";
  const workflow = ".github/workflows/ci.yml";
  const focused = { integration: "skip", e2e: "vehicle-meter" };
  const files = [spec, "Dockerfile", workflow, "scripts/select-test-plan.mjs", "scripts/select-test-plan.node-test.mjs"];
  assert.deepEqual(selectTestPlan([spec]), focused);
  assert.deepEqual(selectTestPlan(files, { registryOnly: true }), focused);
  assert.deepEqual(selectTestPlan(files), full);
  assert.deepEqual(selectTestPlan([spec, workflow]), full);
  assert.deepEqual(selectTestPlan([...files, stock], { registryOnly: true }), full);
  assert.deepEqual(selectTestPlan([...files, "e2e/support/e2e-database.ts"], { registryOnly: true }), full);
});

test("compares the complete Dockerfile when recognizing a registry-only change", () => {
  const original = "FROM node:24-bookworm-slim AS base\nRUN npm ci\n";
  const mirror = original.replace("FROM node:", "FROM public.ecr.aws/docker/library/node:");
  assert.equal(isBaseImageRegistryOnly(original, mirror), true);
  assert.equal(isBaseImageRegistryOnly(original, mirror.replace("24-", "22-")), false);
  assert.equal(isBaseImageRegistryOnly(original, mirror + "RUN npm run build\n"), false);
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
