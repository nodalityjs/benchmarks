/**
 * Compiler scaling benchmark for Nodality.
 *
 * Measures how the deterministic compiler's wall-clock cost and output size
 * grow with the number of declared elements. This is a property of the
 * pipeline itself, not of prerendering or of authoring cost, so it is
 * measured here rather than in the companion papers.
 *
 * Method: for each element count N, run the library's own prerender() path
 * (jsdom document, single builder) and time the full compile-and-serialise
 * cycle. Each N is repeated `--reps` times; the median is reported.
 *
 * Usage:
 *   node compile_scaling.mjs [--reps 7] [--lib /path/to/nodality]
 */

import { performance } from "node:perf_hooks";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const args = process.argv.slice(2);
const argOf = (k, d) => {
  const i = args.indexOf(k);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};

const REPS = parseInt(argOf("--reps", "7"), 10);
const LIB = argOf("--lib", "/Users/filipvabrousek/launch");
const COUNTS = [10, 25, 50, 100, 250, 500, 1000];

const TEMPLATE = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>bench</title></head>
<body><div id="mount"></div></body></html>`;

function median(xs) {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

async function main() {
  const { prerender } = await import(
    pathToFileURL(path.join(LIB, "layout/prerender.js")).href
  );
  const libEsm = pathToFileURL(path.join(LIB, "dist/index.esm.js")).href;

  const work = await mkdtemp(path.join(tmpdir(), "nodality-bench-"));
  const template = path.join(work, "shell.html");
  await writeFile(template, TEMPLATE, "utf8");

  console.log(`Nodality compiler scaling — ${REPS} repetitions per point, median reported`);
  console.log(`library: ${LIB}\n`);
  console.log("elements   compile+serialise (ms)   output (bytes)   µs/element");
  console.log("--------   ----------------------   --------------   ----------");

  const rows = [];

  for (const n of COUNTS) {
    const times = [];
    let bytes = 0;

    for (let r = 0; r < REPS; r++) {
      const out = path.join(work, `out-${n}-${r}.html`);
      // The library logs diagnostics to stdout during a build. Mute them so
      // the console output stays readable and so logging does not enter the
      // measured interval.
      const realLog = console.log, realInfo = console.info, realWarn = console.warn;
      console.log = console.info = console.warn = () => {};
      const t0 = performance.now();
      await prerender({
        template,
        output: out,
        mount: "#mount",
        url: "http://localhost/",
        build: async () => {
          const { Des } = await import(libEsm);
          // N declared elements as plain data, which is the library's
          // authoring form. Content is identical per element so that the
          // independent variable is element count alone.
          const elements = Array.from({ length: n }, (_, i) => ({
            type: "h3", text: `Item ${i}`,
          }));
          new Des().nodes([{ op: "blast" }]).add(elements).set({ mount: "#mount" });
        },
      });
      const dt = performance.now() - t0;
      console.log = realLog; console.info = realInfo; console.warn = realWarn;
      times.push(dt);
      if (r === 0) bytes = (await readFile(out, "utf8")).length;
    }

    const med = median(times);
    const perEl = (med * 1000) / n;
    rows.push({ n, ms: +med.toFixed(2), bytes, us_per_element: +perEl.toFixed(1) });
    console.log(
      String(n).padStart(8),
      String(med.toFixed(2)).padStart(23),
      String(bytes).padStart(16),
      String(perEl.toFixed(1)).padStart(12)
    );
  }

  await writeFile(
    path.join(process.cwd(), "compile_scaling.json"),
    JSON.stringify({ library: LIB, reps: REPS, node: process.version, rows }, null, 2)
  );
  await rm(work, { recursive: true, force: true });

  const first = rows[0], last = rows[rows.length - 1];
  const growth = (last.ms / first.ms) / (last.n / first.n);
  console.log(
    `\nelement count ×${last.n / first.n}, time ×${(last.ms / first.ms).toFixed(1)} ` +
    `(${growth < 1.3 ? "approximately linear" : "super-linear"})`
  );
  console.log("written to compile_scaling.json");
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
