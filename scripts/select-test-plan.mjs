import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const FULL = { integration: "full", e2e: "full" };
const SCOPED = "inventory-maintenance";

// Include both modules: maintenance can consume stock and write the inventory ledger.
// Shared and unrecognized paths intentionally retain the full suite.
const scopedPath = /^(?:src\/features\/(?:inventory|maintenance)\/|src\/app\/\(admin\)\/(?:inventory|maintenance)\/).+\.tsx?$/;
const documentationPath = /^(?:README\.md|docs\/.+\.md)$/;
const unitTestPath = /^src\/(?:features|components)\/.+\.test\.tsx?$/;
const integrationTestPath = /\.integration\.test\.tsx?$/;
const stylesheet = "src/app/globals.css";
const meterSpec = "e2e/vehicle-meter-readings.e2e.ts";
const selectionPaths = new Set([
  ".github/workflows/ci.yml",
  "scripts/select-test-plan.mjs",
  "scripts/select-test-plan.node-test.mjs",
]);

export function selectTestPlan(paths, { registryOnly = false } = {}) {
  if (paths.length === 0) return FULL;

  // Target the meter spec only when its test changes without app changes.
  // A Dockerfile edit is allowed here only when it retains the base image tag
  // and changes nothing but the registry. Routing changes alone still run full.
  if (paths.includes(meterSpec) && paths.every(path =>
    path === meterSpec || documentationPath.test(path) ||
    (registryOnly && (path === "Dockerfile" || selectionPaths.has(path)))
  )) return { integration: "skip", e2e: "vehicle-meter" };

  let hasScopedChange = false;
  let hasGlobalStyles = false;
  for (const path of paths) {
    if (documentationPath.test(path) ||
        (unitTestPath.test(path) && !integrationTestPath.test(path))) continue;
    if (path === stylesheet) {
      hasGlobalStyles = true;
    } else if (scopedPath.test(path)) {
      hasScopedChange = true;
    } else {
      return FULL;
    }
  }

  if (!hasScopedChange) return { integration: "skip", e2e: "skip" };
  return { integration: SCOPED, e2e: hasGlobalStyles ? "full" : SCOPED };
}

export function changedPullRequestPaths(base, head, cwd) {
  const sha = /^[a-f0-9]{40}$/;
  if (!sha.test(base ?? "") || !sha.test(head ?? "")) {
    throw new Error("Missing or invalid pull request commit IDs");
  }

  // Compare the entire PR. Treat a rename as deletion + addition so that
  // moving code to a low-risk path cannot hide the original path.
  return execFileSync("git", [
    "diff", "--no-renames", "--name-only", "-z", `${base}...${head}`, "--",
  ], { cwd, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 })
    .split("\0")
    .filter(Boolean);
}

export function isBaseImageRegistryOnly(before, after) {
  const from = /^FROM node:(\S+) AS base$/m;
  return from.test(before) &&
    before.replace(from, "FROM public.ecr.aws/docker/library/node:$1 AS base") === after;
}

function hasRegistryOnlyDockerChange(base, head) {
  const git = (...args) => execFileSync("git", args, { encoding: "utf8" });
  const ancestor = git("merge-base", base, head).trim();
  return isBaseImageRegistryOnly(git("show", ancestor + ":Dockerfile"), git("show", head + ":Dockerfile"));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let plan = FULL;
  if (process.env.GITHUB_EVENT_NAME === "pull_request") {
    try {
      const { PR_BASE_SHA: base, PR_HEAD_SHA: head } = process.env;
      const paths = changedPullRequestPaths(base, head);
      const registryOnly = paths.includes("Dockerfile") && hasRegistryOnlyDockerChange(base, head);
      plan = selectTestPlan(paths, { registryOnly });
    } catch {
      console.warn("Could not determine the complete PR diff; running the full suites.");
    }
  }

  const summary = `Integration: ${plan.integration}; E2E: ${plan.e2e}`;
  console.log(summary);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Test selection\n${summary}\n`);
  }
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    `integration=${plan.integration}\ne2e=${plan.e2e}\n`,
  );
}
