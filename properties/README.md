# Model-property benchmark (Section 8.2, "Verification of the formal properties")

Reproduces the three properties argued in Chapter 3 of the dissertation, by
compiling each case through the published `nodality` compiler in a simulated
DOM and comparing the rendered output:

1. **Order-independence** — two nodes whose targets are disjoint compile to
   identical output under both orderings.
2. **Order-dependence with first-declared-wins** — two nodes that write the
   same property of the same element compile to *different* output under the
   two orderings, and in each ordering the earlier declaration survives.
3. **Determinism** — the same pair `(E, N)` compiles to a byte-identical
   artefact on repeated runs.

Two nodes is the smallest input on which ordering can matter, so any
difference observed cannot be attributed to incidental interaction among many
nodes.

## Files
- `run.mjs`        — the four checks; exits non-zero if any fails
- `template.html`  — the mount shell both cases are compiled into

## Run

    npm install
    node run.mjs

`nodality` is pinned to the exact version the dissertation reports
(`1.0.178`), not a range, so the check runs against the artefact that
produced the reported results.

## Result

    PASS  order-independence: [A,B] === [B,A] when targets are disjoint
    PASS  order-dependence: [C,D] !== [D,C] when both write the same property
    PASS  first-declared-wins: the earlier declaration survives in each ordering
    PASS  determinism: the same pair compiles to a byte-identical artefact
    4/4 properties confirmed against nodality@1.0.178

## A note on the fixture

The contended property is a `shadow` node on a wrapper, because its value
lands in an inline `box-shadow` and the surviving declaration is therefore
directly observable in the output. Design-node options belong *inside* `op`
(`{ op: { name: "shadow", colors, movements, radius }, target: [...] }`),
which is where the element mapper reads them. Some other node families were
unsuitable for this check rather than incorrect: a gradient's colours are
carried in a value that the simulated DOM's CSS parser discards, so a
difference between two contending gradients would not be visible in the
rendered output even though the compiler resolved it.
