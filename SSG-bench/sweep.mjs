// Page-size sweep: find the threshold at which the browser paints the
// prerendered mount *before* the synchronous clear-mount script runs —
// i.e. where a real flicker (paint-then-clear-then-rebuild) appears.
//
//   node sweep.mjs
//
// For each multiplier N the script prerenders an N-times-larger page, serves
// it, and loads it in Chromium. The flicker signal is "a contentful paint
// occurred before app.js ran": since the clear-mount script runs during
// parsing and app.js is deferred, an FCP earlier than app.js-start means the
// prerendered content was painted and is about to be cleared and rebuilt.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prerender } from "nodality/ssg";
import { chromium } from "playwright";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SIZES = [1, 8, 64, 256, 512, 1024, 2048];
const RUNS = 7;
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript" };

function template(n) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>n=${n}</title>` +
    `<script>window.__N=${n}</script></head><body>` +
    `<div id="mount"></div><script type="module" src="./app.js"></script></body></html>`;
}

const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };

// 1. Generate one prerendered file per size.
const meta = {};
for (const n of SIZES) {
  const tmpl = path.join(ROOT, `tmp.tmpl.${n}.html`);
  const out = path.join(ROOT, `tmp.out.${n}.html`);
  fs.writeFileSync(tmpl, template(n));
  await prerender({ template: tmpl, output: out, mount: "#mount", build: () => import("./builder.mjs").then((m) => m.render(n)) });
  meta[n] = { bytes: fs.statSync(out).size, words: 128 * n };
  fs.rmSync(tmpl);
}

// 2. Serve and measure.
const server = http.createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(req.url.split("?")[0]));
  fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); res.end(); } else { res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }); res.end(b); } });
});
const PORT = 8754;
await new Promise((r) => server.listen(PORT, r));
const browser = await chromium.launch();

const rows = [];
for (const n of SIZES) {
  const earlyFlags = [], flickers = [];
  for (let i = 0; i < RUNS; i++) {
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${PORT}/tmp.out.${n}.html`, { waitUntil: "load" });
    await page.waitForFunction("window.__done === true", { timeout: 15000 }).catch(() => {});
    const m = await page.evaluate(() => {
      const fcp = performance.getEntriesByName("first-contentful-paint")[0];
      const mk = (x) => { const e = performance.getEntriesByName(x)[0]; return e ? e.startTime : null; };
      return { fcp: fcp ? fcp.startTime : null, start: mk("nodality-start"), painted: mk("nodality-painted") };
    });
    await page.close();
    if (m.fcp != null && m.start != null) {
      const early = m.fcp < m.start;          // painted before app.js ran => flicker
      earlyFlags.push(early ? 1 : 0);
      if (early && m.painted != null) flickers.push(m.painted - m.fcp);
    }
  }
  const earlyRate = earlyFlags.reduce((a, b) => a + b, 0) / earlyFlags.length;
  rows.push({ n, words: meta[n].words, kb: (meta[n].bytes / 1024).toFixed(0), earlyRate, flickerMs: flickers.length ? median(flickers).toFixed(0) : "-" });
}

await browser.close();
server.close();
for (const n of SIZES) fs.rmSync(path.join(ROOT, `tmp.out.${n}.html`), { force: true });

console.log(`\n=== Page-size sweep (Chromium, ${RUNS} loads each) ===`);
console.log(`  N    words   KB     flicker?(paint-before-clear rate)   flicker window`);
for (const r of rows) {
  const flag = r.earlyRate >= 0.5 ? "FLICKER" : "no";
  console.log(`  ${String(r.n).padStart(3)}  ${String(r.words).padStart(6)}  ${String(r.kb).padStart(4)}   ${(r.earlyRate * 100).toFixed(0).padStart(3)}%  ${flag.padEnd(8)}  ${r.flickerMs === "-" ? "-" : r.flickerMs + " ms"}`);
}
const firstFlicker = rows.find((r) => r.earlyRate >= 0.5);
console.log(`\nThreshold: flicker first appears at N=${firstFlicker ? firstFlicker.n + ` (~${firstFlicker.words} words, ~${firstFlicker.kb} KB)` : "not within tested range"}.`);
