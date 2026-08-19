import { prerender } from "nodality/ssg";
let html=null;
await prerender({
  template: "./template.html", output: "/tmp/idrepro.html", mount: "#mount", origin: "https://example.com",
  build: async ({ window }) => {
    const { Des } = await import("nodality");
    const E = [{ type:"wrap", children:[
      { type:"h1", text:"Heading with no id" },
      { type:"p",  text:"Paragraph with no id" },
    ]}];
    new Des().nodes([]).add(E).set({ mount:"#mount", code:false });
    html = window.document.querySelector("#mount").innerHTML;
  },
});
const n=(html.match(/id="undefined"/g)||[]).length;
console.log('id="undefined" occurrences:', n);
console.log(html.replace(/></g,">\n<").split("\n").filter(l=>l.includes("undefined")).slice(0,8).join("\n"));
