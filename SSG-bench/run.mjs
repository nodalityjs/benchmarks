// Crawlability benchmark: run the real Nodality prerender() on a content
// page, then measure what a no-JavaScript crawler sees in the prerendered
// output versus the client-only shell.
//
//   npm install     # installs nodality + jsdom
//   node run.mjs
//
import fs from "node:fs";
import { JSDOM } from "jsdom";
import { prerender } from "nodality/ssg";

const TEMPLATE = "./template.html";
const OUTPUT = "./out.prerendered.html";

// What a crawler that does NOT execute JS extracts from an HTML file:
// visible text and structural anchors, with scripts/styles ignored.
function crawlerView(html) {
  const { document } = new JSDOM(html).window;
  for (const el of document.querySelectorAll("script,style,noscript")) el.remove();
  const mount = document.querySelector("#mount");
  const bodyText = (document.body.textContent || "").replace(/\s+/g, " ").trim();
  const mountText = (mount?.textContent || "").replace(/\s+/g, " ").trim();
  const words = (s) => (s ? s.split(/\s+/).filter(Boolean).length : 0);
  return {
    bytes: Buffer.byteLength(html, "utf8"),
    bodyWords: words(bodyText),
    mountWords: words(mountText),
    mountChildren: mount ? mount.children.length : 0,
    links: document.querySelectorAll("a[href]").length,
  };
}

// 1. Client-only baseline = the shell as served before any JS runs.
const shellHtml = fs.readFileSync(TEMPLATE, "utf8");
const baseline = crawlerView(shellHtml);

// 2. Prerendered = the real prerender() output.
const res = await prerender({
  template: TEMPLATE,
  output: OUTPUT,
  mount: "#mount",
  build: () => import("./builder.mjs").then((m) => m.render(1)),
});
const prerendered = crawlerView(fs.readFileSync(OUTPUT, "utf8"));

// 3. Verify the hydration handoff: a synchronous clear-mount script must be
//    present in the output, injected before the deferred module script.
const out = fs.readFileSync(OUTPUT, "utf8");
const hasClearMount = /querySelector\((["'])#mount\1\);if\(m\)m\.innerHTML=''/.test(out);

const pct = (a, b) => (b === 0 ? "infinite" : (a / b).toFixed(1) + "x");
console.log("\n=== Crawlability: what a no-JS crawler sees ===");
console.table({
  "client-only shell": baseline,
  "Nodality prerendered": prerendered,
});
console.log(`indexable words  : ${baseline.bodyWords}  ->  ${prerendered.bodyWords}  (${pct(prerendered.bodyWords, baseline.bodyWords)})`);
console.log(`#mount children  : ${baseline.mountChildren}  ->  ${prerendered.mountChildren}`);
console.log(`output bytes     : ${baseline.bytes}  ->  ${prerendered.bytes}`);
console.log(`clear-mount handoff script present: ${hasClearMount}`);
