# Nodality SSG benchmark (paper Section 7, "Evaluation")

Two reproducible measurements on the published `nodality` npm package:

1. **Crawlability** — what a JavaScript-free crawler extracts from the
   prerendered output vs. the client-only shell, using the real `prerender()`.
2. **First paint / flicker** — first-paint timing of the prerendered page vs.
   the client-only shell in a real browser (Chromium via Playwright).

Both use the same content (`content.mjs`) at build time and runtime, so the
prerendered HTML and the runtime rebuild render the same page. Nothing outside
this directory is required or modified.

## Setup

    npm install        # nodality + jsdom + playwright (pinned 1.59.1)

Playwright reuses an already-installed Chromium; if none is present run
`npx playwright install chromium`.

## Run

    node run.mjs       # crawlability: writes out.prerendered.html, prints the table
    node timing.mjs    # first-paint/flicker: serves the files, drives Chromium
    node sweep.mjs     # page-size sweep: finds the flicker threshold

## Files
- `content.mjs`    — shared page content (8 text blocks + 1 link)
- `render-page.mjs`— shared renderer used at build time and runtime
- `template.html`  — the HTML shell served before any JS runs (empty `#mount`)
- `builder.mjs`    — build-time builder (`nodality/ssg` `prerender()`, in jsdom)
- `app.js`         — runtime builder (browser; imports the `nodality` ESM bundle)
- `run.mjs`        — crawlability measurement
- `timing.mjs`     — first-paint / flicker measurement (Playwright)
- `sweep.mjs`      — page-size sweep for the flicker threshold (Playwright)
- `out.prerendered.html` — generated output (the file a crawler receives)

## Results (this machine: Node 25, jsdom, Chromium 1217)

**Crawlability — what a no-JS crawler sees**

| View | indexable words | `#mount` children | links | bytes |
|---|---:|---:|---:|---:|
| client-only shell    |   0 | 0 | 0 |  219 |
| Nodality prerendered | 128 | 9 | 1 | 1824 |

Clear-mount handoff script present in output, **before** the deferred
`type="module"` runtime script.

**First paint / flicker — median of 15 Chromium loads**

Two runs, on different machines. The 2026-08-19 run is the one the
dissertation reports.

| Metric | Prerendered | Client-only | Prerendered | Client-only |
|---|---:|---:|---:|---:|
| | *(earlier run)* | | *(2026-08-19)* | |
| First Contentful Paint     | 40 ms | 44 ms | 36–40 ms | 36 ms |
| Runtime rebuild complete   | 28 ms | 27 ms | 26 ms | 26 ms |
| Content painted before app.js ran | no | no | no | no |
| Flicker window             | ≈ 0 ms | ≈ 0 ms | ≈ 0 ms | ≈ 0 ms |

The prerendered/client-only difference moves between runs — 4 ms in favour of
prerendering on the earlier machine, 0 to 4 ms *against* it on 2026-08-19 —
so it is run-to-run noise, not an effect. **Prerendering buys no first-paint
advantage.** What it buys is the crawler-facing content the `crawl/` benchmark
measures. Reported as a null result rather than quietly dropped.

**Page-size sweep (Chromium, 7 loads per size)** — does a contentful paint of
the prerendered mount occur before the clear-mount script runs?

| Page size | Words | Earlier run | 2026-08-19 |
|---|---:|---:|---:|
| ≤ ~380 KB |  ≤ 33k |   0% |   0% |
| ~0.75 MB  |   65k  |  17% |   0% |
| ~1.5 MB   |  131k  | 100% |   0% |
| ~3 MB     |  262k  | 100% | 100% |

Flicker window at the threshold: ~940 ms on the earlier machine, 777–792 ms on
2026-08-19 (three runs).

**The threshold is hardware-dependent, and that is the finding.** It moved by
roughly 4× between the two machines — from ~1.5 MB to ~3 MB — because the race
being measured is between the parser reaching an inline script and the
compositor deciding to paint, and a faster machine reaches the script sooner.
Any single number for "the page size at which a flicker appears" is a property
of the machine as much as of the page, so both runs are kept here rather than
one being overwritten. What survives across both: no flicker anywhere near the
sizes real content pages occupy.

**Interpretation.** The clear-mount script is a *classic* inline script at
end-of-body, so it runs synchronously during parsing. Up to ~0.4 MB of
prerendered HTML the browser reaches and runs it before any first paint, so the
prerendered content is cleared before it is ever painted: a JavaScript user sees
only the rebuilt content, with no flicker and no first-paint change vs. the
client-only build. The prerendering's measured benefit is **crawler-facing**
(SEO). A flicker appears only once the document is large enough (~1.5 MB on the
slower machine, ~3 MB on the faster) that the browser paints the prerendered
mount mid-parse before reaching the clear script; beyond that the flicker
window grows with rebuild cost. Realistic content pages sit well inside the
no-flicker regime on either machine: the largest deployed page measured by the
`crawl/` benchmark is 22 KB, some two orders of magnitude below the nearer
threshold.
