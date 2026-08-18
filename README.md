# Nodality benchmarks

Raw data and harnesses for the quantitative measurements reported in the
Nodality papers. Two independent benchmarks live here.

Everything in this repository is released under [CC0 1.0](LICENSE): no rights
reserved, no attribution required.

## 1. Authoring cost in tokens

Counts the **output tokens a language model must emit** to generate the same
rendered 3-card grid in Nodality vs raw React + Tailwind, using the
`o200k_base` tokenizer (GPT-4o family).

Files:

- `nod_stub.txt` — Nodality scaffold spec the model emits (placeholder data supplied locally by the compiler)
- `react_scaffold.txt` — React + Tailwind placeholder scaffold the model must emit (no local-expansion layer)
- `nod_real.txt` — Nodality spec when the model supplies real content
- `react.txt` — React + Tailwind with the same real content
- `nod_full.txt` — the working JS the Nodality compiler produces locally (0 model tokens)
- `measure.py` — counts tokens for all of the above

Run:

    pip install tiktoken
    python measure.py

Result (`o200k_base`):

| Task                        | Nodality | React+Tailwind | Ratio |
|-----------------------------|---------:|---------------:|------:|
| Scaffold (placeholder data) |       27 |            220 |  8.1x |
| Specific UI (model content) |      149 |            312 |  2.1x |

Boilerplate alone (content held out, 128 shared tokens): ~21 vs ~184, about 9x.

## 2. Compiler scaling

Times the compile-and-serialise cycle as the number of declared elements grows
from 10 to 1 000, using the library's own build path — the single builder
executed inside a `jsdom` document — and taking the median of seven repetitions
per point.

Files:

- `compile_scaling/compile_scaling.mjs` — the harness
- `compile_scaling/compile_scaling.json` — raw measurements, one record per element count

Run (needs a local checkout of the library and `jsdom`):

    node compile_scaling/compile_scaling.mjs

Result (Node.js v25.6.0, `nodality` 1.0.187):

| Elements | Compile + serialise (ms) | Output (bytes) | Per element (µs) |
|---------:|-------------------------:|---------------:|-----------------:|
|       10 |                     27.0 |          2 339 |            2 702 |
|       25 |                     32.1 |          5 684 |            1 284 |
|       50 |                     42.1 |         11 259 |              841 |
|      100 |                     73.9 |         22 409 |              739 |
|      250 |                    185.1 |         56 009 |              740 |
|      500 |                    402.5 |        112 009 |              805 |
|    1 000 |                    926.4 |        224 009 |              926 |

Output size is exactly linear in element count at 224 bytes per element,
constant to the byte across two orders of magnitude. Compile time is
approximately linear once the fixed `jsdom` set-up cost is amortised; the
decline in the per-element column across the first three rows is that fixed
cost being spread over more work, not the compiler getting faster.

## 3. Crawlability, first paint and page-size sweep

What a JavaScript-free crawler extracts from prerendered output versus the
client-only shell, using the real `prerender()`; the first-paint timing of both
in a real browser; and a page-size sweep that locates the flicker threshold.

Files: `SSG-bench/` (`run.mjs`, `timing.mjs`, `sweep.mjs`).

Run (see `SSG-bench/README.md` for detail):

    cd SSG-bench && npm install && node run.mjs

## 4. Model properties

An executable check of the properties the model claims: order-independence for
nodes whose targets are disjoint, first-declared-wins where two nodes contend
for the same property, and byte-identical output on a repeated build. Each case
is compiled through the published compiler in a `jsdom` document and compared on
the rendered output rather than on the library's internals.

Files: `properties/` (`run.mjs`, `template.html`).

Run:

    cd properties && npm install && node run.mjs

Result (`nodality` 1.2.2):

    PASS  order-independence: [A,B] === [B,A] when targets are disjoint
    PASS  order-dependence: [C,D] !== [D,C] when both write the same property
    PASS  first-declared-wins: the earlier declaration survives in each ordering
    PASS  determinism: the same pair compiles to a byte-identical artefact
    4/4 properties confirmed

`properties/` and `SSG-bench/` pin `nodality` to an exact version rather than a
range, so a fresh install reproduces the figures against the artefact that
produced them rather than against the newest release.

## Citing

These data support the Nodality papers. If you use them, cite the paper rather
than this repository; the repository is deposited so that the measurements can
be reproduced and checked.
