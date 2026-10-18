import { open } from "./stepsharness.mjs";
const J = o => ({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(o) });
const { page, browser } = await open({ seed: { 0: 3000 } });
page.on("dialog", d => d.accept());
async function hit(label) {
  const bad = await page.evaluate(() => { const out = []; document.querySelectorAll(".nav .tab").forEach(t => { const r = t.getBoundingClientRect(); for (const [fx, fy] of [[.5,.5],[.2,.3],[.8,.7]]) { const e = document.elementFromPoint(r.left + r.width * fx, r.top + r.height * fy); if (!e || !t.contains(e)) out.push(t.dataset.tab + " covered by " + (e ? e.tagName + "." + e.className : "null")); } }); return out; });
  console.log((bad.length ? "COVERED " : "ok ") + label + " " + bad.join("; "));
}
await page.goto("http://localhost:4174/?preview=worldcup", { waitUntil: "networkidle" }); await page.waitForSelector(".hero");
for (const tab of ["today", "rivals", "packs", "impact", "me"]) {
  await page.click("[data-tab=" + tab + "]"); await page.waitForTimeout(500);
  await page.evaluate(() => window.scrollTo(0, 0)); await hit(tab + " top");
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await hit(tab + " bottom");
  await page.evaluate(() => window.scrollTo(0, 400)); await hit(tab + " mid");
}
await page.click("[data-tab=rivals]"); await page.waitForTimeout(300);
await page.click(".ban.camp", { position: { x: 30, y: 24 } }); await page.waitForTimeout(500); await hit("cup page top");
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await hit("cup page bottom");
await page.click("[data-act=cupback]"); await page.click("[data-tab=packs]"); await page.click("[data-bview=race]"); await page.waitForTimeout(1500); await hit("race view");
await page.evaluate(() => window.scrollTo(0, 300)); await hit("race view scrolled");
await browser.close();
