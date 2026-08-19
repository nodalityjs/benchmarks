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
    title colour             249,115,22           249,115,22   match
    grid gap                         16                   16   match
    link padding y                   16                   16   match
    link padding x                    8                    8   match

    9 of 9 comparable design properties match.

Every property that determines **layout and structure** is identical: the card
box, its radius, the grid gap, the link's shape and padding, and the link's
background colour. The declarative input states none of them and inherits all
of them, which is what makes the token comparison a like-for-like one.

## The divergence this check found, and how it was closed

On its first run against `nodality` 1.2.4 this check reported **8 of 9**. The
title colour differed: `react.txt` writes `text-orange-500`, which Tailwind
defines as `rgb(249, 115, 22)`, while the library's default resolved to the CSS
keyword `orange`, `rgb(255, 165, 0)`. Two shades of orange, visibly close and
not the same value.

It was closed by changing **the library**, in release 1.2.5, and not the
benchmark input. Which side moved matters, so it is stated rather than left for
a reader to work out:

- `react.txt` and `nod_real.txt` are byte-for-byte what they were. Neither
  measured token count moves, because neither input changed: the scaffold row
  is still 27 against 220 and the specific-UI row still 149 against 312.
- The library's card-title default changed from the CSS keyword `orange` to
  `#f97316`. That is defensible on its own terms — the keyword is a legacy
  named colour that reads yellow beside modern palettes — and it is the change
  a reader should scrutinise, since the alternative reading is that the
  artefact was adjusted to fit the comparison.
- Editing `react.txt` to name the library's colour would have turned the row
  green in seconds. That was declined: changing a benchmark's input so its
  check passes is how a benchmark stops being evidence.

The check remains live and exits non-zero if any property diverges again, so a
future change to either side that breaks the equivalence will be caught rather
than assumed away.
