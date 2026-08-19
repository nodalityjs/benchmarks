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
- `run.mjs`        — the four checks on two minimal fixtures; exits non-zero if any fails
- `random.mjs`     — the same three claims over SEEDED RANDOM pages, every permutation per page
- `template.html`  — the mount shell both cases are compiled into

## Run

    npm install
    node run.mjs

`nodality` is pinned to an exact version, not a range, so the check runs against the artefact that
produced the reported results.

## Result

    PASS  order-independence: [A,B] === [B,A] when targets are disjoint
    PASS  order-dependence: [C,D] !== [D,C] when both write the same property
    PASS  first-declared-wins: the earlier declaration survives in each ordering
    PASS  determinism: the same pair compiles to a byte-identical artefact
    4/4 properties confirmed against nodality@1.2.2

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

## Randomised check

`run.mjs` checks the smallest inputs on which ordering can matter. `random.mjs`
complements it by manufacturing pages the author did not choose and holding each
to the same claims — for every permutation of its node array, not a sampled one.

    node random.mjs              # seed 20260819, 60 pages
    node random.mjs 12345 200    # explicit seed and page count

Generation is seeded, so a reported run reproduces exactly.

Result (`nodality` 1.2.2, seed 20260819, 60 pages):

    seed 20260819, 60 generated pages (30 disjoint, 30 conflicting), all permutations per page
      order-independence  : 30 pages checked
      first-declared-wins : 30 pages checked
      determinism         : 60 pages checked

    no counter-example found

The pages are generated within the class the formal claim covers: nodes whose
contribution is fixed at declaration (Chapter 3's constant-on-write restriction).
A generator that produced value-dependent nodes would be testing a claim the
model does not make.
