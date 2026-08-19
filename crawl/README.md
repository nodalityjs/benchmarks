# Crawl

The no-JavaScript crawler view of the deployed sites — what a crawler that
executes no JavaScript actually receives from each live URL.

    node run.mjs                      # the four deployments
    node run.mjs https://example.com  # any other URL

No sources needed: it fetches public URLs, so anyone can re-run it.

## Counting rule

Word counts vary by method, so the method is stated rather than assumed:
`script`, `style`, `noscript` and `template` contents are removed, remaining
tags are stripped, and what is left is split on whitespace. Redirects are
followed and the figures are those of the document served after the redirect —
`blue70.cz` redirects to its `www` host, and the figures are the `www` one's.

## Result (2026-08-19, after the 1.2.4 redeploy)

    SITE                      WORDS    BYTES  JSON-LD  id=undefined
    https://blue70.cz/           74     7363      yes             0
    https://sls3.cz/             63     7240      yes             0
    http://gesos.cz/            236    18807      yes             0
    https://relays.app/         226    22065       no             0

    4 sites fetched; 0 serve an empty shell to a non-executing crawler.

`gesos.cz` refuses HTTPS to external clients, so it is fetched over plain
HTTP. `relays.app` serves no JSON-LD; the other three do.

These are live sites and the figures drift as content changes, so the date is
part of the measurement. The qualitative result — nonzero indexable content on
every migrated site, against the zero a client-only shell serves — is what the
table is evidence for, and it is stable across re-measurement.

The `id=undefined` column is a regression guard rather than a crawler metric.
It counts the defect fixed in 1.2.4; it should stay at zero.
