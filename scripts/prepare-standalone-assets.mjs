// next build with output: "standalone" does not copy `public` or
// `.next/static` into `.next/standalone` (see Next.js standalone output
// docs). The Docker runtime copies them manually; this mirrors that step so
// `node .next/standalone/server.js` also works locally (used by Playwright).
import { cpSync, existsSync } from "node:fs";
import { join } from "node:path";

const projectRoot = join(import.meta.dirname, "..");
const standaloneDir = join(projectRoot, ".next", "standalone");

if (!existsSync(standaloneDir)) {
  throw new Error(
    `${standaloneDir} does not exist. Run "next build" with output: "standalone" first.`,
  );
}

cpSync(join(projectRoot, "public"), join(standaloneDir, "public"), {
  recursive: true,
});

cpSync(
  join(projectRoot, ".next", "static"),
  join(standaloneDir, ".next", "static"),
  { recursive: true },
);
