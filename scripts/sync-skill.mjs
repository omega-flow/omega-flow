#!/usr/bin/env node
// Copies the doc package's guide/api markdown into the omega-flow skill's
// references folder, so the skill stays in sync with packages/doc.

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const docDir = join(rootDir, "packages/doc");
const skillReferencesDir = join(
  rootDir,
  ".claude/skills/omega-flow/references",
);

const sections = ["guide", "api"];

function copyMarkdown(sourceDir, targetDir) {
  mkdirSync(targetDir, { recursive: true });
  for (const entry of readdirSync(sourceDir)) {
    if (entry.endsWith(".md")) {
      cpSync(join(sourceDir, entry), join(targetDir, entry));
    }
  }
}

rmSync(skillReferencesDir, { recursive: true, force: true });

for (const section of sections) {
  const sourceDir = join(docDir, section);
  if (!existsSync(sourceDir)) continue;
  copyMarkdown(sourceDir, join(skillReferencesDir, section));
}

console.log(`Synced doc markdown into ${skillReferencesDir}`);
