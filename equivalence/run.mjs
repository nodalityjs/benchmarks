// Do the two token-benchmark inputs actually render the same component?
//
//   node run.mjs
//
// Section 8.6 compares how many tokens a model must emit for "the same
// rendered component" in the declarative form and in React with Tailwind.
// That comparison is only fair if the two really do render the same thing,
// and the obvious attack on it is that they do not: react.txt spells out a
// design in class names, while nod_real.txt spells out none at all.
//
// The answer is that the design is not missing from the declarative side, it
// lives in the library's defaults. This script checks that claim rather than
// asserting it: it renders the declarative input through the real library,
// reads the design values the library actually emitted, converts the Tailwind
// classes in react.txt into the same properties, and compares them.
//
// Divergence is a finding, not a crash: every property is reported either way
// and the exit status is non-zero if any material property differs.
import { prerender } from "nodality/ssg";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const REACT = fs.readFileSync(path.join(ROOT, "..", "react.txt"), "utf8");

const REM = 16;                                  // 1rem, at the browser default
const px = (v) => {
  if (v == null) return null;
  const s = String(v).trim();
  let m = s.match(/^(-?[\d.]+)rem$/);   if (m) return Math.round(parseFloat(m[1]) * REM);
  m = s.match(/^(-?[\d.]+)px$/);        if (m) return Math.round(parseFloat(m[1]));
  return null;
};
const rgb = (v) => {
  if (!v) return null;
  let m = String(v).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (m) return `${m[1]},${m[2]},${m[3]}`;
  m = String(v).match(/^#([0-9a-f]{6})$/i);
  if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)).join(",");
  const named = { orange: "255,165,0", white: "255,255,255" };
  return named[String(v).trim().toLowerCase()] ?? null;
};

// ── the design react.txt states, read out of its class names ────────────
const cls = (re) => (REACT.match(re) || [])[1] ?? null;
const TAILWIND_COLORS = { "orange-500": "249,115,22" };   // as published by Tailwind
const reactSide = {
  "card width":       px(cls(/w-\[([^\]]+)\]/)),
  "card height":      px(cls(/h-\[([^\]]+)\]/)),
  "card radius":      px(cls(/rounded-\[([^\]]+)\]/)),
  "link radius":      px((REACT.match(/rounded-\[([^\]]+)\]/g) || [])[1]?.match(/\[([^\]]+)\]/)?.[1]),
  "link background":  rgb(cls(/bg-\[([^\]]+)\]/)),
  "title colour":     TAILWIND_COLORS[cls(/text-(orange-\d+)/)] ?? null,
  "grid gap":         px(cls(/gap-(\d+)/) ? `${cls(/gap-(\d+)/) * 0.25}rem` : null),
  "link padding y":   px(cls(/py-(\d+)/) ? `${cls(/py-(\d+)/) * 0.25}rem` : null),
  "link padding x":   px(cls(/px-(\d+)/) ? `${cls(/px-(\d+)/) * 0.25}rem` : null),
};

// ── the design the library emits from the declarative input ─────────────
let html = null;
await prerender({
  template: path.join(ROOT, "..", "properties", "template.html"),
  output: path.join(ROOT, "tmp.out.html"), mount: "#mount", origin: "https://example.com",
  build: async ({ window }) => {
    const { Des } = await import("nodality");
    // the content of nod_real.txt, verbatim
    const elements = [{
      type: "cards",
      items: [
        { img: "https://upload.wikimedia.org/wikipedia/commons/3/3a/Starship_S20.jpg", title: "Starship", link: "#ship" },
        { img: "https://upload.wikimedia.org/wikipedia/commons/1/16/Apollo_11_Launch_-_GPN-2000-000630.jpg", title: "Saturn V", link: "#saturn" },
        { img: "https://upload.wikimedia.org/wikipedia/commons/d/d6/STS120LaunchHiRes-edit1.jpg", title: "Shuttle", link: "#shuttle" },
      ],
    }];
    new Des().nodes([]).add(elements).set({ mount: "#mount", code: false });
    html = window.document.querySelector("#mount").innerHTML;
  },
});
fs.rmSync(path.join(ROOT, "tmp.out.html"), { force: true });

const styleOf = (re) => (html.match(re) || [])[1] ?? "";
const prop = (style, name) => (style.match(new RegExp(`(?:^|;)\\s*${name}:\\s*([^;]+)`)) || [])[1]?.trim() ?? null;

const container = styleOf(/<div[^>]*style="([^"]*)"/);
const cardStyle = (html.match(/<div[^>]*style="([^"]*width:\s*300px[^"]*)"/) || [])[1] ?? "";
const linkStyle = styleOf(/<a[^>]*style="([^"]*)"/);
const titleStyle = styleOf(/<h[1-6][^>]*style="([^"]*)"/);

const nodalitySide = {
  "card width":      px(prop(cardStyle, "width")),
  "card height":     px(prop(cardStyle, "height")),
  "card radius":     px(prop(cardStyle, "border-radius")),
  "link radius":     px(prop(linkStyle, "border-radius")),
  "link background": rgb(prop(linkStyle, "background") || prop(linkStyle, "background-color")),
  "title colour":    rgb(prop(titleStyle, "color")),
  "grid gap":        px(prop(container, "gap")),
  "link padding y":  px((prop(linkStyle, "padding") || "").split(/\s+/)[0]),
  "link padding x":  px((prop(linkStyle, "padding") || "").split(/\s+/)[1]),
};

console.log("Do the two token-benchmark inputs render the same component?\n");
console.log("  PROPERTY".padEnd(20), "REACT (stated)".padStart(16), "NODALITY (default)".padStart(20), "  ");
let differ = 0, compared = 0;
for (const k of Object.keys(reactSide)) {
  const a = reactSide[k], b = nodalitySide[k];
  if (a == null || b == null) {
    console.log(`  ${k.padEnd(18)} ${String(a ?? "–").padStart(16)} ${String(b ?? "–").padStart(20)}   not comparable`);
    continue;
  }
  compared++;
  const same = String(a) === String(b);
  if (!same) differ++;
  console.log(`  ${k.padEnd(18)} ${String(a).padStart(16)} ${String(b).padStart(20)}   ${same ? "match" : "DIFFERS"}`);
}
console.log(`\n  ${compared - differ} of ${compared} comparable design properties match.`);
if (differ) {
  console.log(`  ${differ} differ — the inputs do not render the same component in every respect,`);
  console.log(`  and Section 8.6's comparison is entitled only to what remains equivalent.`);
} else {
  console.log(`  The declarative input states none of these and inherits all of them,`);
  console.log(`  which is what makes the token comparison a like-for-like one.`);
}
process.exit(differ ? 1 : 0);
