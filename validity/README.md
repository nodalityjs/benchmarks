# Validity

Conformance of the deployed pages to the WHATWG HTML standard, measured with
the W3C Nu validator — an instrument the author neither wrote nor controls.

    node run.mjs              # all four deployments
    node run.mjs relays.app   # one of them

A page passes only if the checker reports zero errors. Warnings are counted
but reported apart, since they flag style rather than violation. `gesos.cz`
refuses HTTPS to this client, so its served document is fetched and posted
instead of validated by URL; the bytes are the served bytes either way.

Errors are grouped by the party that can fix them, because a verdict alone
does not say whose defect it is.

## Result (2026-08-19, after the alt-text and doctype repairs)

    SITE                    ERRORS  OTHER
    https://blue70.cz/           0      0
    https://sls3.cz/             0      0
    http://gesos.cz/             0      2
    https://relays.app/          3      1
        2x  toolchain (jsdom mangles min()/clamp())
        1x  hosting provider (analytics injected after </body>)

    3 of 4 deployments pass with zero errors

Three runs, in order: **27 errors → 12 → 3.**

The first run found the sites as they stood. The second followed the 1.2.4
release, which removed the library's entire share — 15 duplicate
`id="undefined"` errors. The third followed repairs to the sites' own content:
every image across all four deployments now carries an `alt` (a description
where the image carries meaning, an empty one where it is decorative), and
gesos.cz's five authored pages gained the doctype they never had.

Not one remaining error is attributable to the library, to the pipeline, or to
the sites' authors. What is left is two CSS errors from the simulator used to
prerender, and one script the hosting provider appends to the served response
after `</body>` — identified by diffing the served bytes against the deployed
build, which differ by exactly that script and nothing else.

Three distinct causes, and only one of them is the library:

- **library** (resolved) — several components wrote `setAttribute("id", x)` without
  checking `x`, so a missing id shipped as the literal `id="undefined"`. One
  is legal; two collide, and duplicate ids are a conformance error. Fixed in `nodality` 1.2.4. All four sites were rebuilt against it and
  redeployed on 19 August 2026, and the errors are gone.
- **toolchain** — prerendering runs the page in jsdom, whose CSS parser drops
  `min()` and `clamp()` declarations outright and corrupts them inside
  `calc()`. This costs validity, and it silently loses styling, which is the
  worse of the two. Not fixed; see the limitation recorded in Chapter 8.
- **author content and site template** (resolved) — missing `alt` attributes
  and a missing doctype. These belonged to the sites rather than the library,
  and the checker cannot tell the difference on its own; both were repaired on
  19 August 2026.
- **hosting provider** — a traffic-analytics script appended after `</body>`
  by the host. Neither authored nor emitted: the served bytes differ from the
  deployed build by exactly that script.

The figures are a snapshot of live third-party deployments and will move as
those sites are rebuilt and redeployed. Re-running the script re-measures.
