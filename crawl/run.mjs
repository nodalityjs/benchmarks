// The no-JavaScript crawler view of the deployed sites.
//
// This reproduces the production table of Chapter 8: for each live URL, what
// a crawler that executes no JavaScript actually receives. It fetches public
// URLs and counts what is in the served bytes, so anyone can re-run it
// without the sites' sources.
//
//   node run.mjs                     # the four deployments
//   node run.mjs https://example.com # any other URL
//
// Counting rule, stated because word counts vary by method: script, style,
// noscript and template contents are removed, remaining tags are stripped,
// and what is left is split on whitespace. Redirects are followed, and the
// figures are those of the document served after the redirect.

const SITES = process.argv.length > 2 ? process.argv.slice(2) : [
  "https://blue70.cz/",
  "https://sls3.cz/",
  "http://gesos.cz/",   // this host refuses HTTPS to external clients
  "https://relays.app/",
];

const indexableWords = (html) => {
  const stripped = html
    .replace(/<(script|style|noscript|template)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  return stripped.split(/\s+/).filter(Boolean).length;
};

const rows = [];
for (const url of SITES) {
  try {
    const res = await fetch(url, { redirect: "follow",
      headers: { "User-Agent": "nodality-benchmarks (no-JS crawler view)" } });
    const html = await res.text();
    rows.push({
      url,
      final: res.url !== url ? res.url : "",
      status: res.status,
      bytes: Buffer.byteLength(html),
      words: indexableWords(html),
      jsonld: /application\/ld\+json/i.test(html),
      // the defect this benchmark first surfaced; kept as a regression guard
      undefinedIds: (html.match(/id="undefined"/g) || []).length,
    });
  } catch (err) {
    rows.push({ url, error: String(err.message || err).slice(0, 60) });
  }
}

console.log("No-JavaScript crawler view of the deployed sites\n");
console.log("SITE".padEnd(24), "WORDS".padStart(6), "BYTES".padStart(8), "JSON-LD".padStart(8), "id=undefined".padStart(13));
for (const r of rows) {
  if (r.error) { console.log(`${r.url.padEnd(24)} ERROR ${r.error}`); continue; }
  console.log(
    r.url.padEnd(24),
    String(r.words).padStart(6),
    String(r.bytes).padStart(8),
    (r.jsonld ? "yes" : "no").padStart(8),
    String(r.undefinedIds).padStart(13),
  );
  if (r.final) console.log(`  ↳ redirected to ${r.final}`);
}
const empty = rows.filter((r) => !r.error && r.words === 0);
console.log(`\n${rows.filter((r) => !r.error).length} sites fetched; ${empty.length} serve an empty shell to a non-executing crawler.`);
const stray = rows.filter((r) => r.undefinedIds > 0);
if (stray.length) console.log(`WARNING: ${stray.length} site(s) still emit id="undefined" — see the 1.2.4 release.`);
