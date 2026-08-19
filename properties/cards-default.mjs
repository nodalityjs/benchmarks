import { prerender } from "nodality/ssg";
let html=null;
await prerender({
  template:"./template.html", output:"/tmp/cards.html", mount:"#mount", origin:"https://example.com",
  build: async ({ window }) => {
    const { Des } = await import("nodality");
    const elements = [{
      type: "cards",
      items: [
        { img: "https://upload.wikimedia.org/wikipedia/commons/3/3a/Starship_S20.jpg", title: "Starship", link: "#ship" },
        { img: "https://upload.wikimedia.org/wikipedia/commons/1/16/Apollo_11_Launch_-_GPN-2000-000630.jpg", title: "Saturn V", link: "#saturn" },
        { img: "https://upload.wikimedia.org/wikipedia/commons/d/d6/STS120LaunchHiRes-edit1.jpg", title: "Shuttle", link: "#shuttle" }
      ]
    }];
    new Des().nodes([]).add(elements).set({ mount:"#mount", code:false });
    html = window.document.querySelector("#mount").innerHTML;
  },
});
// what the defaults actually produce
const want = { "300px":"card width", "0.7rem":"card radius", "0.8rem":"card margin",
               "0.4rem":"link radius", "3498db":"link background", "orange":"title colour",
               "700px":"card height", "gap":"grid gap" };
console.log("Nodality `cards` defaults vs the values react.txt hard-codes:\n");
for (const [needle,label] of Object.entries(want)) {
  const hit = html.toLowerCase().includes(needle.toLowerCase());
  console.log(`  ${hit ? "MATCH  " : "absent "} ${needle.padEnd(9)} ${label}`);
}
const m = html.match(/<div[^>]*style="([^"]{0,220})"/);
console.log("\n  first emitted container style:\n   ", m ? m[1].slice(0,200) : "(none)");
