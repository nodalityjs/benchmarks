// Per-site build determinism: does building the same site twice from the same
// source produce byte-identical output?
//
//   node run.mjs /path/to/site [/path/to/another ...]
//
// The property is the reproducible-build one, at site scale rather than page
// scale: a single differing byte in a single route fails the site. A site
// build has more opportunities to leak non-determinism than a page build —
// iteration over a directory listing, a locale map, a set of collected
// routes, the sitemap and manifest written after the routes — and any of them
// surfaces here as a digest mismatch.
//
// Each project needs its dependencies installed and a `nodality prerender`
// script; the sites measured in the dissertation are private, so this takes
// project paths rather than hard-coding them. Point it at your own.
//
// The check is deliberately blunt and therefore hard to fake: hash, rebuild,
// hash, compare. There is no tolerance and no human inspection.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const PROJECTS = process.argv.slice(2);
if (!PROJECTS.length) {
  console.error("usage: node run.mjs /path/to/site [...]");
  process.exit(2);
}

const ARTEFACT = /\.(html|xml)$|agent-manifest\.json$/;

function digests(uploadDir) {
  const out = new Map();
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (ARTEFACT.test(entry.name)) {
        out.set(path.relative(uploadDir, full),
          createHash("sha256").update(fs.readFileSync(full)).digest("hex"));
      }
    }
  };
  walk(uploadDir);
  return out;
}

const build = (cwd) => execFileSync("npx", ["nodality", "prerender"], { cwd, stdio: "ignore" });

let failed = 0, total = 0;
for (const project of PROJECTS) {
  const uploadDir = path.join(project, "upload");
  if (!fs.existsSync(uploadDir)) { console.log(`${project}: no upload/ — skipped`); continue; }

  build(project);
  const first = digests(uploadDir);
  build(project);
  const second = digests(uploadDir);

  const differing = [...first.keys()].filter((k) => first.get(k) !== second.get(k));
  const appeared = [...second.keys()].filter((k) => !first.has(k));
  const vanished = [...first.keys()].filter((k) => !second.has(k));
  total += first.size;

  const name = path.basename(project);
  if (differing.length || appeared.length || vanished.length) {
    failed++;
    console.log(`${name}: ${first.size} artefacts — NOT deterministic`);
    for (const k of differing.slice(0, 5)) console.log(`    differs: ${k}`);
    for (const k of appeared.slice(0, 3)) console.log(`    appeared only on the second build: ${k}`);
    for (const k of vanished.slice(0, 3)) console.log(`    vanished on the second build: ${k}`);
  } else {
    console.log(`${name}: ${first.size} artefacts — byte-identical`);
  }
}

console.log(`\n${total} artefacts compared across ${PROJECTS.length} project(s); ${failed ? `${failed} FAILED` : "all byte-identical"}`);
process.exit(failed ? 1 : 0);
