// Conformance of the deployed pages to the WHATWG HTML standard.
//
// The protocol is the one fixed in the dissertation (Chapter 8): submit the
// SERVED markup of each production deployment to an off-the-shelf checker
// implementing the WHATWG standard, and record a page as passing only if the
// checker reports zero errors. The instrument is the W3C Nu validator, which
// the author neither wrote nor controls; warnings are counted but reported
// separately, since they flag style rather than violation.
//
//   node run.mjs            # all four deployments
//   node run.mjs relays.app # one of them
//
// Errors are grouped by cause, because the verdict alone does not say whose
// defect it is: markup the library emits, markup the site author wrote, or
// markup the prerendering toolchain corrupted on the way out.

const ENDPOINT = "https://validator.w3.org/nu/?out=json";

const SITES = [
  { url: "https://blue70.cz/",  note: "wetsuit e-shop" },
  { url: "https://sls3.cz/",    note: "compression-sock e-shop" },
  { url: "http://gesos.cz/",    note: "manufacturer; host refuses HTTPS to this client" },
  { url: "https://relays.app/", note: "race-relay landing page; raster extension, live backend" },
];

/** Attribute an error to the party that can fix it. */
function cause(message) {
  if (/Duplicate ID .undefined./.test(message))        return "library (id=undefined, fixed in 1.2.4)";
  if (/^CSS: /.test(message))                          return "toolchain (jsdom mangles min()/clamp())";
  if (/must have an .alt. attribute/.test(message))    return "author content (missing alt text)";
  if (/without seeing a doctype/.test(message))        return "site template (no doctype)";
  // Not the author's markup and not the library's: the host appends a
  // traffic-analytics beacon after </body>. The served bytes differ from the
  // deployed build by exactly that script, which is how it was identified.
  if (/Stray start tag .script./.test(message))        return "hosting provider (analytics injected after </body>)";
  return "other";
}

async function check({ url, note }) {
  // gesos refuses HTTPS to this client, so its document is fetched and posted
  // rather than validated by URL. The bytes are the served bytes either way.
  let res;
  if (url.startsWith("http://")) {
    const doc = await (await fetch(url)).text();
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/html; charset=utf-8", "User-Agent": "nodality-benchmarks" },
      body: doc,
    });
  } else {
    res = await fetch(`${ENDPOINT}&doc=${encodeURIComponent(url)}`,
      { headers: { "User-Agent": "nodality-benchmarks" } });
  }
  const { messages = [] } = await res.json();
  const errors = messages.filter((m) => m.type === "error");
  const others = messages.length - errors.length;
  const byCause = {};
  for (const m of errors) {
    const c = cause(m.message || "");
    byCause[c] = (byCause[c] || 0) + 1;
  }
  return { url, note, errors: errors.length, others, byCause };
}

const only = process.argv[2];
const targets = only ? SITES.filter((s) => s.url.includes(only)) : SITES;
if (!targets.length) { console.error(`no deployment matching "${only}"`); process.exit(2); }

const results = [];
for (const site of targets) {
  results.push(await check(site));
  await new Promise((r) => setTimeout(r, 1500)); // the public validator is a shared service
}

console.log("WHATWG conformance of the served markup\n");
console.log("SITE".padEnd(22), "ERRORS".padStart(7), "OTHER".padStart(6));
for (const r of results) {
  console.log(r.url.padEnd(22), String(r.errors).padStart(7), String(r.others).padStart(6));
  for (const [c, n] of Object.entries(r.byCause).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(3)}x  ${c}`);
  }
}
const clean = results.filter((r) => r.errors === 0).length;
console.log(`\n${clean} of ${results.length} deployments pass with zero errors`);
