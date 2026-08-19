import { prerender } from "nodality/ssg";
const TYPES = ["h1","h2","h3","p","img","a","cards","free","nav","sideNav","row","dropdown",
  "radio","input","labelInput","filePicker","picker","video","audio","wrap","form","button",
  "grid","circle","polygon","center","link","switcher","zoom","carousel","list","table"];
const results = [];
for (const type of TYPES) {
  let out = null, err = null;
  try {
    await prerender({
      template: "./template.html", output: `/tmp/sw.html`, mount: "#mount", origin: "https://example.com",
      build: async ({ window }) => {
        const { Des } = await import("nodality");
        const el = { type, text: "Sample text", src: "/a.png", alt: "a",
                     href: "/x", items: ["one","two"], children: [{ type:"p", text:"child" }] };
        new Des().nodes([]).add([el]).set({ mount:"#mount", code:false });
        out = window.document.querySelector("#mount").innerHTML;
      },
    });
  } catch (e) { err = String(e.message || e).slice(0, 60); }
  if (err) { results.push([type, "skip", err]); continue; }
  const n = (out.match(/id="undefined"/g) || []).length;
  results.push([type, n, ""]);
}
console.log("TYPE            id=undefined");
for (const [t, n, e] of results) {
  if (n === "skip") continue;
  console.log(`${t.padEnd(15)} ${n}${n ? "   <-- BUG" : ""}`);
}
console.log("\nskipped (not a valid type here):", results.filter(r=>r[1]==="skip").map(r=>r[0]).join(", "));
