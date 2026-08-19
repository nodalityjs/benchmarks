// What does assistive technology actually receive from canvas-hosted content?
//
//   node run.mjs
//
// Chapter 6 restores pointer interaction over a transformed surface and states
// plainly that it demonstrates no equivalence for assistive technology.
// Chapter 10 names the first step of closing that gap: measure what the
// platform exposes for canvas FALLBACK content, and decide whether the
// accessibility tree is sufficient for navigation.
//
// This is that measurement. It is deliberately narrow: it asks what the
// browser's own accessibility tree contains, which is what a screen reader
// consumes on that engine. It does not run a screen reader, and it does not
// speak for engines other than the one it ran on.
//
// Two pages, identical in markup and differing only in whether the content is
// hosted inside a <canvas> as its fallback content:
//
//   baseline : <div>   heading, paragraph, link, button, input
//   hosted   : <canvas> heading, paragraph, link, button, input </canvas>
//
// For each we record: the accessibility tree, whether each control is
// reachable by keyboard, and whether it reports geometry.
import http from "node:http";
import { chromium } from "playwright";

const CONTENT = `
  <h2>Section heading</h2>
  <p>A paragraph of body text that a reader should be able to reach.</p>
  <a href="#target" id="lnk">A link to somewhere</a>
  <button id="btn">A button</button>
  <label for="fld">A field</label><input id="fld" name="fld">
`;

const page = (hosted) => `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<title>${hosted ? "hosted" : "baseline"}</title></head><body>
${hosted ? `<canvas id="c" width="400" height="300">${CONTENT}</canvas>` : `<div id="c">${CONTENT}</div>`}
</body></html>`;

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(page(req.url.includes("hosted")));
}).listen(0);
const PORT = server.address().port;

const browser = await chromium.launch();
console.log(`engine: Chromium ${browser.version()}`);

async function probe(kind) {
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  await p.goto(`http://127.0.0.1:${PORT}/${kind}`, { waitUntil: "load" });

  // the browser's own accessibility tree, read through the DevTools protocol —
  // this is the tree the platform hands to a screen reader, not a library's
  // idea of one
  const cdp = await ctx.newCDPSession(p);
  await cdp.send("Accessibility.enable");
  const { nodes } = await cdp.send("Accessibility.getFullAXTree");
  const IGNORED = new Set(["generic", "none", "InlineTextBox", "StaticText"]);
  const flat = nodes
    .filter((n) => !n.ignored && n.role && !IGNORED.has(n.role.value))
    .map((n) => `${n.role.value}${n.name && n.name.value ? ` "${String(n.name.value).slice(0, 34)}"` : ""}`);

  // can the keyboard reach the controls at all?
  const reachable = [];
  for (let i = 0; i < 8; i++) {
    await p.keyboard.press("Tab");
    const id = await p.evaluate(() => document.activeElement && document.activeElement.id);
    if (id && !reachable.includes(id)) reachable.push(id);
  }

  // does the platform report geometry for the hosted controls?
  const boxes = await p.evaluate(() =>
    ["lnk", "btn", "fld"].map((id) => {
      const el = document.getElementById(id);
      if (!el) return [id, "absent"];
      const r = el.getBoundingClientRect();
      return [id, `${Math.round(r.width)}x${Math.round(r.height)}`];
    }));

  await ctx.close();
  return { flat, reachable, boxes };
}

const base = await probe("baseline");
const host = await probe("hosted");
await browser.close(); server.close();

const show = (label, r) => {
  console.log(`\n${label}`);
  console.log(`  accessibility tree (${r.flat.length} nodes):`);
  for (const n of r.flat) console.log(`     ${n}`);
  console.log(`  keyboard-reachable: ${r.reachable.length ? r.reachable.join(", ") : "(none)"}`);
  console.log(`  reported geometry : ${r.boxes.map(([i, b]) => `${i}=${b}`).join("  ")}`);
};
show("BASELINE — content in a <div>", base);
show("HOSTED — the same content as <canvas> fallback", host);

console.log(`\nDIFFERENCE`);
const missing = base.flat.filter((n) => !host.flat.includes(n));
console.log(`  a11y nodes present in baseline and absent when hosted: ${missing.length ? missing.join(" | ") : "none"}`);
const lostKeys = base.reachable.filter((k) => !host.reachable.includes(k));
console.log(`  controls the keyboard reaches in baseline but not hosted: ${lostKeys.length ? lostKeys.join(", ") : "none"}`);
const flat0 = host.boxes.filter(([, b]) => b.startsWith("0x")).map(([i]) => i);
console.log(`  hosted controls reporting zero geometry: ${flat0.length ? flat0.join(", ") : "none"}`);
