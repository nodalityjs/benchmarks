// Shared renderer used at build time (Node/jsdom) and runtime (browser).
// The element classes are passed in because the import path differs by
// environment (bare "nodality" in Node, the dist URL in the browser).
export function buildPage(Text, Link, blocks, linkText, linkHref, n = 1) {
  for (let i = 0; i < n; i++) {
    for (const text of blocks) {
      new Text(text).set({}).render("#mount");
    }
    try { new Link(linkText, linkHref).set({}).render("#mount"); } catch (e) {}
  }
}
