import { open } from "./stepsharness.mjs";
const r = []; const check = (n, ok, d = "") => { r.push(ok); console.log((ok ? "PASS " : "FAIL ") + n + (d ? "  [" + d + "]" : "")); };
{ const { page, db, browser, errors } = await open({ firstRun: true });
  check("first visit goes straight to Meet a dog", /Meet a dog/.test(await page.textContent("h1")), (await page.textContent("h1")));
  await page.click("[data-pickdog=d2]"); await page.waitForTimeout(500);
  check("choosing a dog lands on Today", !!(await page.$(".hero")) && /Walking for Mabel/.test(await page.textContent(".dogcard")));
  await page.reload({ waitUntil: "networkidle" }); await page.waitForSelector(".hero");
  check("next visit goes to Today, no repeat prompt", !!(await page.$(".hero")));
  await page.click("[data-tab=me]"); await page.waitForTimeout(300);
  check("Me shows the version", /version abc1234/.test(await page.textContent("body")), (await page.textContent("body")).match(/version \S+/)?.[0]);
  check("no page errors", errors.length === 0, errors.join(";")); await browser.close(); }
{ const { page, browser } = await open({ firstRun: true });
  await page.click("[data-act=dogback]"); await page.waitForSelector(".hero");
  await page.reload({ waitUntil: "networkidle" }); await page.waitForSelector(".hero");
  check("skipping the picker once is remembered", !!(await page.$(".hero")) && /Walking for the Walkies pool/.test(await page.textContent(".dogcard")));
  await browser.close(); }
console.log(r.filter(Boolean).length + " of " + r.length + " passed");
