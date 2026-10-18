import { open } from "./stepsharness.mjs";
const r = []; const check = (n, ok, d = "") => { r.push(ok); console.log((ok ? "PASS " : "FAIL ") + n + (d ? "  [" + d + "]" : "")); };
const nums = async p => ({ today: (await p.locator(".hero .stat-n.today").textContent()).trim(), chal: (await p.locator(".hero .stat-n.month").textContent()).trim() });
async function add(p, t, keep = false) { await p.click("[data-act=sheet]"); await p.waitForSelector("#steps"); await p.focus("#steps"); await p.keyboard.press("End"); await p.keyboard.type(t); await p.keyboard.press("Enter"); await p.waitForTimeout(500); if (!keep && await p.$(".celebrate")) { await p.click(".cel-done"); await p.waitForTimeout(200); } }
const { page, db, browser, day, errors } = await open({ seed: { "-1": 6000 } });
let n = await nums(page); check("start: today 0, challenge 6,000", n.today === "0" && n.chal === "6,000", JSON.stringify(n));
await add(page, "3,000"); n = await nums(page); check("add 3,000", n.today === "3,000" && n.chal === "9,000" && db.steps.get(day(0)) === 3000, JSON.stringify(n));
await add(page, "2500"); n = await nums(page); check("add 2,500 more adds on top", n.today === "5,500" && n.chal === "11,500" && db.steps.get(day(0)) === 5500, JSON.stringify(n));
await page.click("[data-act=sheet]"); await page.waitForSelector("#steps"); check("only one save button, no set-total", (await page.locator("form[data-form=saveSteps] button.btn.coral").count()) === 1 && !(await page.textContent(".sheet")).includes("Set today"));
check("box starts empty", (await page.inputValue("#steps")) === "");
await page.fill("#steps", "1000"); await page.waitForTimeout(100); check("preview", /Today will be 6,500, challenge 12,500/.test(await page.textContent("#steps-prev")), (await page.textContent("#steps-prev")));
await page.fill("#steps", "abc"); await page.keyboard.press("Enter"); await page.waitForTimeout(300); check("bad input refused", !!(await page.$(".sheet .err")) && db.steps.get(day(0)) === 5500);
await page.fill("#steps", "60000"); await page.keyboard.press("Enter"); await page.waitForTimeout(300); check("over the daily limit refused", !!(await page.$(".sheet .err")) && db.steps.get(day(0)) === 5500, await page.textContent(".sheet .err"));
await page.fill("#steps", "10.000"); await page.keyboard.press("Enter"); await page.waitForTimeout(500); check("10.000 means ten thousand", db.steps.get(day(0)) === 15500, "db=" + db.steps.get(day(0)));
check("no page errors", errors.length === 0, errors.join(";"));
console.log(r.filter(Boolean).length + " of " + r.length + " passed"); await browser.close();
