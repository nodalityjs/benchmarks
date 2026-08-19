# Equivalence

Do the two inputs of the token benchmark actually render the same component?

    node run.mjs

Section 8.6 compares how many tokens a model must emit for "the same rendered
component" in the declarative form and in React with Tailwind. That comparison
is only fair if the two really do render the same thing, and the obvious attack
on it is that they do not: `react.txt` spells out a design in class names,
while `nod_real.txt` spells out none at all.

The answer is that the design is not missing from the declarative side. It
lives in the library's defaults. This script checks that rather than asserting
it: it renders the declarative input through the real library, reads the design
values the library actually emitted, converts the Tailwind classes in
`react.txt` into the same properties, and compares them.

## Result (2026-08-19, nodality 1.2.4)

    PROPERTY             REACT (stated)   NODALITY (default)
    card width                      300                  300   match
    card height                     700                  700   match
    card radius                      11                   11   match
    link radius                       6                    6   match
    link background          52,152,219           52,152,219   match
    title colour             249,115,22            255,165,0   DIFFERS
    grid gap                         16                   16   match
    link padding y                   16                   16   match
    link padding x                    8                    8   match

    8 of 9 comparable design properties match.

Every property that determines **layout and structure** is identical: the card
box, its radius, the grid gap, the link's shape and padding, and the link's
background colour. The declarative input states none of them and inherits all
of them, which is what makes the token comparison a like-for-like one.

## The one divergence, stated rather than tuned away

The title colour differs. `react.txt` writes `text-orange-500`, which Tailwind
defines as `rgb(249, 115, 22)`; the library's default resolves to the CSS
keyword `orange`, `rgb(255, 165, 0)`. Two shades of orange, visibly close and
not the same value.

It would have been easy to make this row pass by editing `react.txt` to name
the library's colour. That is not done, for two reasons. Changing a benchmark's
input so its check goes green is how a benchmark stops being evidence. And the
divergence is worth knowing: it is the precise sense in which "the same
rendered component" is an approximation, and a reader is entitled to see the
size of the approximation rather than take the phrase on trust.

So the honest reading is: the two inputs render the same component up to one
colour value. The token claim rests on structure, which is identical, and the
gap costs the declarative side nothing it does not already report — a caller
who wanted Tailwind's exact shade would add one colour to the pair, which is
a handful of tokens against the 163 the React form spends on structure.

The script exits non-zero while any property differs, so this stays visible.
