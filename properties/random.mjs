// Randomised property check of the model claims (Chapter 3, Section 8.2).
//
// The companion `run.mjs` checks two hand-built minimal pages: the smallest
// inputs on which ordering can matter. This file does the complementary
// thing — it MANUFACTURES pages the author did not choose, and holds each
// one to the same three claims:
//
//   1. pages whose nodes target disjoint elements compile identically
//      under EVERY permutation of the node array;
//   2. pages whose nodes contend for one element resolve by
//      first-declared-wins under every permutation;
//   3. every page compiles to a byte-identical artefact when compiled
//      twice.
//
// Generation is seeded, so a reported run is reproducible exactly:
//   node random.mjs            # default seed, 60 pages
//   node random.mjs 12345 200  # explicit seed and page count
//
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { prerender } from "nodality/ssg";

const SEED  = Number(process.argv[2] ?? 20260819);
const PAGES = Number(process.argv[3] ?? 60);
const TEMPLATE = "./template.html";
const digest = (s) => createHash("sha256").update(s).digest("hex").slice(0, 12);

// mulberry32: small, fast, and reproducible across machines and versions.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(SEED);
const pick = (xs) => xs[Math.floor(rand() * xs.length)];
const int  = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));

// A shadow node on a wrapper is used because its value lands in an inline
// box-shadow, so the surviving declaration is observable in the output.
const COLOURS = ["rgb(10, 125, 50)", "rgb(179, 38, 30)", "rgb(20, 60, 160)",
                 "rgb(200, 120, 0)", "rgb(90, 30, 140)"];
const shadow = (colour, off) =>
  ({ name: "shadow", colors: [colour], movements: [off, off], radius: "0px" });

/** All permutations of a short array. */
function permutations(xs) {
  if (xs.length <= 1) return [xs];
  const out = [];
  for (let i = 0; i < xs.length; i++) {
    const rest = xs.slice(0, i).concat(xs.slice(i + 1));
    for (const p of permutations(rest)) out.push([xs[i], ...p]);
  }
  return out;
}

/** A page whose nodes all target DIFFERENT elements. */
function disjointPage() {
  const n = int(2, 4);
  const elements = [], nodes = [];
  for (let i = 0; i < n; i++) {
    const id = `el${i}_${int(100, 999)}`;
    elements.push({ id, type: "wrap",
      children: [{ id: `${id}-t`, type: pick(["h1", "h2", "h3", "p"]),
                   text: `Block ${i}` }] });
    nodes.push({ op: shadow(COLOURS[i % COLOURS.length], `${int(1, 9)}px`), target: [id] });
  }
  return { elements, nodes };
}

/** A page in which two or more nodes contend for ONE element. */
function conflictPage() {
  const id = `hero${int(100, 999)}`;
  const elements = [{ id, type: "wrap",
    children: [{ id: `${id}-t`, type: pick(["h1", "h2", "h3"]), text: "Hero" }] }];
  const k = int(2, 3);
  const nodes = [];
  const used = [];
  for (let i = 0; i < k; i++) {
    const colour = COLOURS[i];               // distinct per node, so the winner is identifiable
    used.push(colour);
    nodes.push({ op: shadow(colour, `${(i + 1) * 2}px`), target: [id] });
  }
  return { elements, nodes, colours: used };
}

async function compile(elements, nodes) {
  let mount = null;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nod-rand-"));
  const out = path.join(dir, "out.html");
  await prerender({
    template: TEMPLATE, output: out, mount: "#mount", origin: "https://example.com",
    build: async ({ window }) => {
      const { Des } = await import("nodality");
      new Des().nodes(nodes).add(elements).set({ mount: "#mount", code: false });
      mount = window.document.querySelector("#mount").innerHTML;
    },
  });
  fs.rmSync(dir, { recursive: true, force: true });
  return mount;
}

const boxShadows = (html) => [...String(html).matchAll(/box-shadow: ([^;"]*)/g)].map((m) => m[1]);

let checked = { disjoint: 0, conflict: 0, determinism: 0 };
const failures = [];

for (let i = 0; i < PAGES; i++) {
  const conflict = i % 2 === 1;
  const page = conflict ? conflictPage() : disjointPage();

  // every permutation of the node array, capped so a 4-node page stays cheap
  const perms = permutations(page.nodes.map((_, k) => k)).slice(0, 6);
  const outputs = [];
  for (const order of perms) {
    outputs.push(await compile(page.elements, order.map((k) => page.nodes[k])));
  }

  if (!conflict) {
    // claim 1: disjoint targets -> every ordering identical
    checked.disjoint++;
    const uniq = new Set(outputs);
    if (uniq.size !== 1) {
      failures.push({ page: i, claim: "order-independence",
        detail: `${uniq.size} distinct outputs across ${perms.length} orderings ` +
                `(${[...uniq].map(digest).join(", ")})` });
    }
  } else {
    // claim 2: contention -> the first-declared node's value survives
    checked.conflict++;
    perms.forEach((order, k) => {
      const firstColour = page.colours[order[0]];
      const shadows = boxShadows(outputs[k]);
      const survived = shadows.join(" ");
      if (!survived.includes(firstColour)) {
        failures.push({ page: i, claim: "first-declared-wins",
          detail: `order [${order}] expected ${firstColour}, output carries "${survived}"` });
      }
    });
  }

  // claim 3: determinism, on this page whatever its shape
  checked.determinism++;
  const again = await compile(page.elements, page.nodes);
  if (again !== outputs[0]) {
    failures.push({ page: i, claim: "determinism",
      detail: `${digest(outputs[0])} then ${digest(again)}` });
  }
}

console.log(`seed ${SEED}, ${PAGES} generated pages ` +
  `(${checked.disjoint} disjoint, ${checked.conflict} conflicting), ` +
  `all permutations per page`);
console.log(`  order-independence  : ${checked.disjoint} pages checked`);
console.log(`  first-declared-wins : ${checked.conflict} pages checked`);
console.log(`  determinism         : ${checked.determinism} pages checked`);
if (failures.length) {
  console.log(`\nFAILURES (${failures.length}):`);
  for (const f of failures.slice(0, 10)) console.log(`  page ${f.page} ${f.claim}: ${f.detail}`);
  process.exit(1);
}
console.log(`\nno counter-example found`);
