import { JSDOM } from "jsdom";
const d = new JSDOM(`<!doctype html><div id="x"></div>`);
const el = d.window.document.querySelector("#x");
const cases = [
  ["min(1180px, calc(100vw - 2 * 16px))", "width"],
  ["clamp(16px, 5vw, 72px)", "padding"],
  ["calc(100vw - 2 * clamp(16px, 5vw, 72px))", "width"],
  ["min(620px, 70vh)", "height"],
];
console.log("jsdom", JSON.parse(await import("node:fs").then(f=>f.promises.readFile("./node_modules/jsdom/package.json","utf8"))).version, "inline-style round-trip:\n");
for (const [val, prop] of cases) {
  el.setAttribute("style", "");
  el.style[prop] = val;
  const out = el.getAttribute("style") || "(dropped)";
  const ok = out.includes(val);
  console.log(`  in : ${prop}: ${val}`);
  console.log(`  out: ${out}   ${ok ? "OK" : "<-- MANGLED"}\n`);
}
