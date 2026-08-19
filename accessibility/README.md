# Accessibility

What assistive technology actually receives from canvas-hosted content.

    node run.mjs

Chapter 6 restores pointer interaction over a GPU-transformed surface and
states plainly that it demonstrates no equivalence for assistive technology.
Chapter 10 names the first step toward closing that gap: measure what the
platform exposes for canvas **fallback content**, and decide whether the
accessibility tree is sufficient for navigation. This is that measurement.

It is deliberately narrow. It reads the browser's own accessibility tree
through the DevTools protocol — the tree the platform hands to a screen
reader — on one engine. It does not run a screen reader, and it does not
speak for engines it did not run on.

Two pages, identical in markup, differing only in whether the content is
hosted inside a `<canvas>` as its fallback content:

    baseline   <div>    heading, paragraph, link, button, input  </div>
    hosted     <canvas> heading, paragraph, link, button, input  </canvas>

## Result (2026-08-19, Chromium 151)

    BASELINE — content in a <div>
      accessibility tree: RootWebArea, heading "Section heading", paragraph,
                          link "A link to somewhere", button "A button",
                          LabelText, textbox "A field"
      keyboard-reachable: lnk, btn, fld
      reported geometry : lnk=133x18  btn=65x21  fld=153x21

    HOSTED — the same content as <canvas> fallback
      accessibility tree: RootWebArea, Canvas, heading "Section heading",
                          paragraph, link "A link to somewhere",
                          button "A button", LabelText, textbox "A field"
      keyboard-reachable: lnk, btn, fld
      reported geometry : lnk=0x0  btn=0x0  fld=0x0

## What this establishes

**Semantics and keyboard navigation survive.** The accessibility tree of the
hosted page is complete: every role and every accessible name is present, and
the tree gains only the `Canvas` node itself. Every control the keyboard
reaches in the baseline is reached when hosted, in the same order. A screen
reader that navigates by tree traversal or by Tab reaches the whole interface.

**Geometry does not survive.** Every hosted control reports a zero-size box.
That is the same loss the pointer suffered, and it is why Chapter 6 needed a
retargeting mechanism at all — but it cannot be repaired the same way. Pointer
input *arrives* as a coordinate, so it can be inverted through the compiled
transform on the way in. Geometry is *reported* to the client on the way out,
and nothing asks the page to correct it first.

So the boundary is now measured rather than open. What breaks is any assistive
technology that needs to know where a thing is: explore-by-touch, a magnifier
that follows focus, a focus highlight drawn by the client, or a rotor that
points. What works is everything that needs to know what a thing is and how to
reach it in sequence.

This is a narrower and more useful statement than "accessibility is an open
question", and it is also worse news than it might read as: the surviving half
is the half that was never at risk, and the lost half is the one the chapter's
own contribution exists to restore for a different input device.
