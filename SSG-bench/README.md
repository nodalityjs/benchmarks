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

| Metric | Prerendered | Client-only |
|---|---:|---:|
| First Contentful Paint     | 40 ms | 44 ms |
| Runtime rebuild complete   | 28 ms | 27 ms |
| Content painted before app.js ran | no | no |
| Flicker window             | ≈ 0 ms | ≈ 0 ms |

**Page-size sweep (Chromium, 7 loads per size)** — does a contentful paint of
the prerendered mount occur before the clear-mount script runs?

| Page size | Words | Flicker rate | Flicker window |
|---|---:|---:|---:|
| ≤ ~380 KB |  ≤ 33k |   0% | — |
| ~0.75 MB  |   65k  |  17% | ~450 ms |
| ~1.5 MB   |  131k  | 100% | ~940 ms |
| ~3 MB     |  262k  | 100% | ~2.6 s |

**Interpretation.** The clear-mount script is a *classic* inline script at
end-of-body, so it runs synchronously during parsing. Up to ~0.4 MB of
prerendered HTML the browser reaches and runs it before any first paint, so the
prerendered content is cleared before it is ever painted: a JavaScript user sees
only the rebuilt content, with no flicker and no first-paint change vs. the
client-only build. The prerendering's measured benefit is **crawler-facing**
(SEO). A flicker appears only once the document is large enough (~1.5 MB+) that
the browser paints the prerendered mount mid-parse before reaching the clear
script; beyond that the flicker window grows with rebuild cost (to seconds at
multi-MB). Realistic content pages sit well inside the no-flicker regime.
