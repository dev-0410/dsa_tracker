import { cp, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const projectRoot = process.cwd();
const standaloneRoot = resolve(projectRoot, ".next/standalone");

await mkdir(resolve(standaloneRoot, ".next"), { recursive: true });
await Promise.all([
  cp(resolve(projectRoot, "public"), resolve(standaloneRoot, "public"), {
    recursive: true,
    force: true,
  }),
  cp(resolve(projectRoot, ".next/static"), resolve(standaloneRoot, ".next/static"), {
    recursive: true,
    force: true,
  }),
]);
