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

## Result (2026-08-19)

    SITE                    ERRORS  OTHER
    https://blue70.cz/           0      0
    https://sls3.cz/             1      0
        1x  author content (missing alt text)
    http://gesos.cz/            22     16
       14x  library (id=undefined, fixed in 1.2.4)
        7x  author content (missing alt text)
        1x  site template (no doctype)
    https://relays.app/          4      2
        2x  toolchain (jsdom mangles min()/clamp())
        1x  library (id=undefined, fixed in 1.2.4)
        1x  site template (script after </body>)

    1 of 4 deployments pass with zero errors

Three distinct causes, and only one of them is the library:

- **library** — several components wrote `setAttribute("id", x)` without
  checking `x`, so a missing id shipped as the literal `id="undefined"`. One
  is legal; two collide, and duplicate ids are a conformance error. Fixed in
  `nodality` 1.2.4; the sites clear these errors when rebuilt against it.
- **toolchain** — prerendering runs the page in jsdom, whose CSS parser drops
  `min()` and `clamp()` declarations outright and corrupts them inside
  `calc()`. This costs validity, and it silently loses styling, which is the
  worse of the two. Not fixed; see the limitation recorded in Chapter 8.
- **author content and site template** — missing `alt` attributes, a missing
  doctype, and a `<script>` after `</script>`. These belong to the sites, not
  to the library, and the checker cannot tell the difference on its own.

The figures are a snapshot of live third-party deployments and will move as
those sites are rebuilt and redeployed. Re-running the script re-measures.
