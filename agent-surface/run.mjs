// The two checks Chapter 8 reports for the derived agent surface, run against
// the deployed site rather than against a local copy.
//
//   node run.mjs                      # http://gesos.cz
//   node run.mjs http://example.com   # another deployment
//
// CHECK 1 (static). The manifest is retrievable with an ordinary HTTP request,
// so a consumer that executes no JavaScript can read what the site can do.
// That is what separates this from registration schemes which publish their
// tools by running script inside a live page.
//
// CHECK 2 (operable). A client that knows nothing about this site drives it:
// it reads the published tool list, takes the destinations from the
// enumeration the site itself declares, invokes the traversal tool for each,
// and reads the resulting view back through the site's own readback tool.
// It never inspects the page's source, its node list, or the library.
//
// The client supplies the model-context host the page registers against,
// because an ordinary automation browser does not implement the origin-trial
// API. That is the agent's side of the contract, not knowledge of the site:
// the tools, their arguments and their destinations all come from the page.
import { chromium } from "playwright";

const ORIGIN = (process.argv[2] || "http://gesos.cz").replace(/\/$/, "");

let failures = 0;
const check = (ok, label, detail = "") => {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
};

// ── check 1: the manifest is a static file ────────────────────────────
console.log("\nCHECK 1 — the manifest is readable without executing anything\n");
const res = await fetch(`${ORIGIN}/agent-manifest.json`,
  { headers: { "User-Agent": "nodality-benchmarks" } });
check(res.ok, `GET ${ORIGIN}/agent-manifest.json`, `HTTP ${res.status}`);
const manifest = await res.json();

const pages = Object.entries(manifest.pages || {});
check(pages.length > 0, "manifest declares pages", pages.map(([p]) => p).join(", "));

// take the first page that declares a traversal; the client picks by shape,
// not by knowing which page of this site is the interesting one
const entry = pages.find(([, p]) => (p.tools || []).some((t) => /navigate/.test(t.name)));
check(!!entry, "a page declares a traversal tool", entry && entry[0]);
const [pagePath, decl] = entry;

check(!!decl.spec, "the page records the specification draft it was derived against", decl.spec);
const names = (decl.tools || []).map((t) => t.name);
check(names.length >= 3, "the page declares a tool set", names.join(", "));

const navigate = decl.tools.find((t) => /navigate/.test(t.name));
const readView = decl.tools.find((t) => /read/.test(t.name));
const argName = Object.keys(navigate.inputSchema.properties)[0];
const destinations = navigate.inputSchema.properties[argName].enum || [];
check(destinations.length > 0, "the traversal enumerates its destinations", destinations.join(", "));

// ── check 2: the surface is operable through the declared interface ───
console.log("\nCHECK 2 — a client that knows nothing about the site drives it\n");
const browser = await chromium.launch();
const context = await browser.newContext();

// the agent supplies the host half of the API; the page supplies the tools
await context.addInitScript(() => {
  const tools = new Map();
  const mc = {
    registerTool(tool) { tools.set(tool.name, tool); return { unregister() { tools.delete(tool.name); } }; },
    provideContext() {},
    get __names() { return [...tools.keys()]; },
    async __call(name, args) { return tools.get(name)?.execute(args ?? {}); },
  };
  Object.defineProperty(document, "modelContext", { value: mc, configurable: true });
  Object.defineProperty(navigator, "modelContext", { value: mc, configurable: true });
});

const page = await context.newPage();
const url = `${ORIGIN}/${pagePath}`;
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(1200);

const registered = await page.evaluate(() => document.modelContext.__names);
check(registered.length > 0, `the page registered its tools at ${url}`, registered.join(", "));
check(names.every((n) => registered.includes(n)),
  "the registered tools are the ones the manifest declared");

// The declared route graph has edges only FROM the root, so an agent that
// reads it knows it must unwind before taking the next one. Asserting the
// view it LANDED on — rather than merely that something came back — is what
// makes this a test: a traversal that silently stayed put would otherwise
// still return readable text and still look like a pass.
for (const destination of destinations) {
  const landed = await page.evaluate(async ([nav, read, arg, to]) => {
    await document.modelContext.__call(nav, { [arg]: to });
    await new Promise((r) => setTimeout(r, 1000));
    const view = await document.modelContext.__call(read, {});
    return typeof view === "string" ? { text: view } : view;
  }, [navigate.name, readView.name, argName, destination]);

  const heading = String(landed.text || "").split("\n")[0].replace(/^#+\s*/, "");
  check(landed.view === destination,
    `traversed to "${destination}"`,
    `landed on "${landed.view}"${heading ? `, heading "${heading}"` : ""}`);

  // unwind to the root before the next destination, as the graph requires
  const back = (decl.tools.find((t) => /back/.test(t.name)) || {}).name;
  if (back) {
    await page.evaluate(async (n) => {
      await document.modelContext.__call(n, {});
      await new Promise((r) => setTimeout(r, 900));
    }, back);
  }
}

await browser.close();
console.log(`\n${failures ? `${failures} check(s) failed` : "all checks passed"}`);
process.exit(failures ? 1 : 0);
