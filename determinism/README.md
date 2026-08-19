# Determinism

Per-site build determinism: does building the same site twice from unchanged
source produce byte-identical output?

    node run.mjs /path/to/site [/path/to/another ...]

This is the reproducible-build property at site scale rather than page scale.
A site build has more opportunities to leak non-determinism than a page build —
iteration over a directory listing, a locale map, a collected route set, and
the sitemap and manifest written after the routes — and any of them surfaces
here as a digest mismatch. A single differing byte in a single route fails the
site.

The check is deliberately blunt and therefore hard to fake: hash every emitted
artefact, rebuild, hash again, compare. No tolerance, no human inspection.

The sites measured in the dissertation are private, so the script takes project
paths rather than hard-coding them. Point it at your own; each project needs
its dependencies installed and a `nodality prerender` script.

## Result (2026-08-19, nodality 1.2.4)

    blue70.cz      49 artefacts — byte-identical
    sls3.cz        32 artefacts — byte-identical
    gesos.cz       15 artefacts — byte-identical
    relays.app      6 artefacts — byte-identical

    102 artefacts compared across 4 projects; all byte-identical

## What this does not establish

It compares two builds on one machine from one source tree. That is
determinism, not reproducibility in the stricter cross-machine sense, which
would additionally require a different machine with a different toolchain to
arrive at the same digests. That stronger property is not claimed.
