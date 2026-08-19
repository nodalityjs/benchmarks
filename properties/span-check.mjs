import { prerender } from "nodality/ssg";
async function run(label) {
  let html=null;
  await prerender({
    template: "./template.html", output: "/tmp/sp.html", mount: "#mount", origin: "https://example.com",
    build: async ({ window }) => {
      const { Des } = await import("nodality");
      const E = [{ id:"hero", type:"wrap", children:[
        { id:"h", type:"h1", text:"A gradient word inside a plain heading" },
      ]}];
      // the production shape: split the heading, style one part, leave the rest plain.
      // Neither the plain leading span nor the trailing span carries an id.
      const N = [{ op:{ name:"span", parts:[
        { text:"gradient", style:{ color:"rgb(15,83,168)", italic:true } },
      ]}, target:["h"] }];
      new Des().nodes(N).add(E).set({ mount:"#mount", code:false });
      html = window.document.querySelector("#mount").innerHTML;
    },
  });
  const spans=(html.match(/<span/g)||[]).length, bad=(html.match(/id="undefined"/g)||[]).length;
  console.log(`${label}: spans=${spans}  id="undefined"=${bad}`);
  return bad;
}
process.exit(await run(process.argv[2] || "run") ? 1 : 0);
