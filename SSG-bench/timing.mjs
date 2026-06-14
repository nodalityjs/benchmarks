// First-paint and flicker-window measurement (real browser, Playwright).
//
//   node run.mjs        # (re)generate out.prerendered.html first
//   NODE_PATH=/path/to/node_modules/with/playwright node timing.mjs
//
// Measures, for two variants of the SAME page and SAME runtime app.js:
//   - prerendered : out.prerendered.html (prerendered #mount + clear-mount + app.js)
//   - client-only : template.html        (empty #mount + app.js)
// Metrics per load: First Contentful Paint (FCP), and the runtime marks
// nodality-start / -rendered / -painted. The flicker window is the gap
// between FCP and the rebuilt paint.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".txt": "text/plain" };

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  const file = path.join(ROOT, url === "/" ? "/index.html" : url);
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); res.end("404"); return; }
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream" });
    res.end(buf);
  });
});

const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

async function measure(browser, url, runs) {
  const fcp = [], start = [], rendered = [], painted = [];
  for (let i = 0; i < runs; i++) {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "load" });
    await page.waitForFunction("window.__done === true", { timeout: 5000 }).catch(() => {});
    const m = await page.evaluate(() => {
      const paint = performance.getEntriesByName("first-contentful-paint")[0];
      const mark = (n) => { const e = performance.getEntriesByName(n)[0]; return e ? e.startTime : null; };
      return { fcp: paint ? paint.startTime : null, start: mark("nodality-start"), rendered: mark("nodality-rendered"), painted: mark("nodality-painted") };
    });
    if (m.fcp != null) fcp.push(m.fcp);
    if (m.start != null) start.push(m.start);
    if (m.rendered != null) rendered.push(m.rendered);
    if (m.painted != null) painted.push(m.painted);
    await page.close();
  }
  return {
    FCP: median(fcp), appStart: median(start), appRendered: median(rendered), appPainted: median(painted),
    fcpBeforeApp: median(fcp) < median(start), // did something paint before app.js ran?
  };
}

const PORT = 8753;
await new Promise((r) => server.listen(PORT, r));
const base = `http://127.0.0.1:${PORT}`;
const browser = await chromium.launch();
const RUNS = 15;

const pre = await measure(browser, `${base}/out.prerendered.html`, RUNS);
const cli = await measure(browser, `${base}/template.html`, RUNS);

await browser.close();
server.close();

const ms = (x) => (x == null ? "n/a" : x.toFixed(1) + " ms");
console.log(`\n=== First paint & flicker window (chromium, median of ${RUNS} loads) ===`);
console.log(`                         prerendered     client-only`);
console.log(`FCP (first paint)        ${ms(pre.FCP).padEnd(15)} ${ms(cli.FCP)}`);
console.log(`app.js start             ${ms(pre.appStart).padEnd(15)} ${ms(cli.appStart)}`);
console.log(`app.js rebuilt           ${ms(pre.appRendered).padEnd(15)} ${ms(cli.appRendered)}`);
console.log(`paint after rebuild      ${ms(pre.appPainted).padEnd(15)} ${ms(cli.appPainted)}`);
console.log(`content painted before app.js ran?  prerendered=${pre.fcpBeforeApp}  client-only=${cli.fcpBeforeApp}`);
const flicker = pre.fcpBeforeApp ? (pre.appPainted - pre.FCP) : 0;
console.log(`\nInterpretation:`);
console.log(`  first-paint advantage of prerender = ${ms(cli.FCP - pre.FCP)} earlier`);
console.log(`  flicker window (prerendered) ~= ${pre.fcpBeforeApp ? ms(flicker) : "0 ms (clear ran before any paint)"}`);
