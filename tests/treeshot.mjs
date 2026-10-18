import { open } from "./stepsharness.mjs";
const out = "shots";
for (const mode of ["worldcup", "quarters"]) {
  const { page, browser } = await open({ seed: { 0: 3000 } });
  page.on("dialog", d => d.accept());
  await page.goto("http://localhost:4174/?preview=" + mode, { waitUntil: "networkidle" }); await page.waitForSelector(".hero");
  await page.click("[data-tab=rivals]"); await page.waitForSelector(".ban.camp"); await page.waitForTimeout(400);
  await page.click("[data-act=joincamp][data-side=a]"); await page.waitForTimeout(3200);
  await page.click(".ban.camp", { position: { x: 30, y: 24 } }); await page.waitForSelector("[data-act=cupback]"); await page.waitForTimeout(400);
  const card = page.locator(".card:has(.tree)"); await card.scrollIntoViewIfNeeded();
  await card.screenshot({ path: out + "/" + mode + "-tree.png" });
  await page.locator(".card:has(.tl)").screenshot({ path: out + "/" + mode + "-sched.png" });
  await browser.close();
}
