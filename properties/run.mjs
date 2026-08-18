// Executable check of the three model properties argued in Chapter 3 of the
// dissertation and reported in Section 8.2:
//
//   1. order-independence for nodes whose targets are DISJOINT
//   2. order-dependence where two nodes contend for the same property,
//      resolved by first-declared-wins
//   3. determinism: the same pair (E, N) compiles to the same artefact
//
// Each case is compiled through the real published compiler in a simulated
// DOM, and the comparison is made on the RENDERED OUTPUT rather than on the
// library's internals: the properties are claims about what the pipeline
// produces, so they are checked on the product.
//
// Two nodes is the smallest input on which ordering can matter, so a
// difference observed here cannot be attributed to incidental interaction
// among many nodes.
//
//   npm install
//   node run.mjs        # exits non-zero if any property fails
//
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { prerender } from "nodality/ssg";

const TEMPLATE = "./template.html";
const digest = (s) => createHash("sha256").update(s).digest("hex").slice(0, 16);

/**
 * Compile one (E, N) pair and return both the DOM as the compiler left it
 * and the serialised file.
 *
 * The DOM snapshot is taken inside the build callback, before serialisation.
 * That matters: a design node's value reaches the element's inline style,
 * and comparing only the written file would miss it.
 */
async function compile(elements, nodes) {
  let mount = null;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nod-prop-"));
  const out = path.join(dir, "out.html");
  await prerender({
    template: TEMPLATE,
    output: out,
    mount: "#mount",
    origin: "https://example.com",
    build: async ({ window }) => {
      const { Des } = await import("nodality");
      new Des().nodes(nodes).add(elements).set({ mount: "#mount", code: false });
      mount = window.document.querySelector("#mount").innerHTML;
    },
  });
  const html = fs.readFileSync(out, "utf8");
  fs.rmSync(dir, { recursive: true, force: true });
  return { mount, html };
}

// ── fixtures ────────────────────────────────────────────────────────
//
// A shadow node on a wrapper is used because its value lands in an inline
// `box-shadow`, which makes the surviving declaration directly observable.
// Options belong INSIDE `op`, which is where the mapper reads them.
const GREEN = "rgb(10, 125, 50)";
const RED = "rgb(179, 38, 30)";
const shadow = (colour, offset) =>
  ({ name: "shadow", colors: [colour], movements: [offset, offset], radius: "0px" });

// CONFLICT-FREE: A and B touch different elements, so neither can overwrite
// the other.
const E_FREE = [
  { id: "alpha", type: "wrap", children: [{ id: "a-t", type: "h1", text: "Alpha" }] },
  { id: "beta",  type: "wrap", children: [{ id: "b-t", type: "h1", text: "Beta" }] },
];
const A = { op: shadow(GREEN, "4px"), target: ["alpha"] };
const B = { op: shadow(RED, "9px"),   target: ["beta"] };

// CONFLICT: C and D set the same property of the same element, so exactly
// one value can survive.
const E_CONFLICT = [
  { id: "hero", type: "wrap", children: [{ id: "h-t", type: "h1", text: "Hero" }] },
];
const C = { op: shadow(GREEN, "4px"), target: ["hero"] };
const D = { op: shadow(RED, "9px"),   target: ["hero"] };

const results = [];
const check = (name, pass, detail) => {
  results.push({ name, pass });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}\n      ${detail}`);
};
const boxShadow = (s) => (String(s).match(/box-shadow: [^;"]*/) || ["(none)"])[0];

// ── 1. order-independence where targets are disjoint ────────────────
{
  const ab = await compile(E_FREE, [A, B]);
  const ba = await compile(E_FREE, [B, A]);
  check("order-independence: [A,B] === [B,A] when targets are disjoint",
    ab.mount === ba.mount,
    `mount digest [A,B]=${digest(ab.mount)}  [B,A]=${digest(ba.mount)}`);
}

// ── 2. order matters where two nodes contend ────────────────────────
{
  const cd = await compile(E_CONFLICT, [C, D]);
  const dc = await compile(E_CONFLICT, [D, C]);

  check("order-dependence: [C,D] !== [D,C] when both write the same property",
    cd.mount !== dc.mount,
    `mount digest [C,D]=${digest(cd.mount)}  [D,C]=${digest(dc.mount)}`);

  // ── 3. and the earlier declaration is the one that survives ───────
  const keptCD = boxShadow(cd.mount), keptDC = boxShadow(dc.mount);
  check("first-declared-wins: the earlier declaration survives in each ordering",
    keptCD.includes(GREEN) && !keptCD.includes(RED) &&
    keptDC.includes(RED) && !keptDC.includes(GREEN),
    `[C,D] kept "${keptCD}"\n      [D,C] kept "${keptDC}"`);
}

// ── 4. determinism of the emitted artefact ──────────────────────────
{
  const one = await compile(E_FREE, [A, B]);
  const two = await compile(E_FREE, [A, B]);
  check("determinism: the same pair compiles to a byte-identical artefact",
    one.html === two.html,
    `file digest ${digest(one.html)} vs ${digest(two.html)}`);
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} properties confirmed against ` +
  `nodality@${JSON.parse(fs.readFileSync("./package.json")).dependencies.nodality}` +
  (failed.length ? `\nFAILED: ${failed.map((f) => f.name).join("; ")}` : ""));
process.exit(failed.length ? 1 : 0);
