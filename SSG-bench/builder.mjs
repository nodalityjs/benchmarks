// Build-time Nodality builder (runs in jsdom via prerender()).
// Exports render(n): build n copies of the shared content into #mount.
import { Text, Link } from "nodality";
import { blocks, linkText, linkHref } from "./content.mjs";
import { buildPage } from "./render-page.mjs";

export function render(n = 1) {
  buildPage(Text, Link, blocks, linkText, linkHref, n);
}
