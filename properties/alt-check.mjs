import { prerender } from "nodality/ssg";
let html=null;
await prerender({
  template:"./template.html", output:"/tmp/alt.html", mount:"#mount", origin:"https://example.com",
  build: async ({ window }) => {
    const { Des } = await import("nodality");
    const E=[{ id:"w", type:"wrap", children:[
      { id:"a", type:"img", src:"/a.png", alt:"a described image" },
      { id:"b", type:"img", src:"/b.png" },
    ]}];
    new Des().nodes([]).add(E).set({ mount:"#mount", code:false });
    html = window.document.querySelector("#mount").innerHTML;
  },
});
const imgs = html.match(/<img[^>]*>/g) || [];
console.log(`${imgs.length} img tags emitted:`);
for (const t of imgs) console.log("  ", t.replace(/style="[^"]*"/,'style="…"').slice(0,150));
