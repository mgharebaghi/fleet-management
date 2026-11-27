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

export function selectTestPlan(paths) {
  if (paths.length === 0) return FULL;

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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let plan = FULL;
  if (process.env.GITHUB_EVENT_NAME === "pull_request") {
    try {
      plan = selectTestPlan(
        changedPullRequestPaths(process.env.PR_BASE_SHA, process.env.PR_HEAD_SHA),
      );
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
