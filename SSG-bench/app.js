// Runtime builder (browser). Rebuilds the same content into #mount,
// reading the size multiplier window.__N (default 1), and marks timing.
import { Text, Link } from "/node_modules/nodality/dist/index.esm.js";
import { blocks, linkText, linkHref } from "/content.mjs";
import { buildPage } from "/render-page.mjs";

performance.mark("nodality-start");
buildPage(Text, Link, blocks, linkText, linkHref, window.__N || 1);
performance.mark("nodality-rendered");

requestAnimationFrame(() => requestAnimationFrame(() => {
  performance.mark("nodality-painted");
  window.__done = true;
}));
