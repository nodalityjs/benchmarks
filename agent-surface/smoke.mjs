import { chromium } from "playwright";
const SITES = ["https://blue70.cz/","https://sls3.cz/","http://gesos.cz/","https://relays.app/"];
const browser = await chromium.launch();
for (const url of SITES) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [], failed = [];
  page.on("console", m => { if (m.type() === "error") errors.push(m.text().slice(0,110)); });
  page.on("pageerror", e => errors.push("PAGEERROR " + String(e.message).slice(0,110)));
  page.on("requestfailed", r => failed.push(r.url().slice(-60)));
  await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(1500);
  // what a user actually sees after the runtime has rebuilt the page
  const seen = await page.evaluate(() => ({
    text: document.body.innerText.replace(/\s+/g," ").trim().length,
    imgs: [...document.images].length,
    brokenImgs: [...document.images].filter(i => i.complete && i.naturalWidth === 0).length,
    links: document.querySelectorAll("a[href]").length,
    mountKids: (document.querySelector("#mount") || document.body).children.length,
  }));
  console.log(`\n${url}`);
  console.log(`  rendered text: ${seen.text} chars | images ${seen.imgs} (broken ${seen.brokenImgs}) | links ${seen.links} | mount children ${seen.mountKids}`);
  console.log(`  console errors: ${errors.length ? errors.slice(0,3).join(" | ") : "none"}`);
  console.log(`  failed requests: ${failed.length ? failed.slice(0,3).join(" | ") : "none"}`);
  await ctx.close();
}
await browser.close();
