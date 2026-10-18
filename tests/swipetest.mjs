import { open } from "./stepsharness.mjs";
const r = []; const check = (n, ok, d = "") => { r.push(ok); console.log((ok ? "PASS " : "FAIL ") + n + (d ? "  [" + d + "]" : "")); };
const { page, browser, errors } = await open({ seed: { 0: 3000 } });
const swipe = (sel, dist, ms = 300) => page.evaluate(async ([sel, dist, ms]) => {
  const el = document.querySelector(sel); const b = el.getBoundingClientRect(); const x = b.left + b.width / 2, y = b.top + 30;
  const mk = (yy) => new Touch({ identifier: 1, target: el, clientX: x, clientY: yy });
  const fire = (type, yy) => el.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, touches: type === "touchend" ? [] : [mk(yy)], changedTouches: [mk(yy)] }));
  fire("touchstart", y);
  for (let i = 1; i <= 5; i++) { await new Promise(r => setTimeout(r, ms / 5)); fire("touchmove", y + dist * i / 5); }
  fire("touchend", y + dist);
}, [sel, dist, ms]);
await page.click("[data-act=sheet], .btn.coral >> text=Add today's steps"); await page.waitForSelector(".sheet");
await swipe(".sheet .h2", 30, 400); await page.waitForTimeout(400);
check("a small drag does not close the sheet", (await page.locator(".sheet").count()) === 1);
check("sheet snaps back after a small drag", !(await page.getAttribute(".sheet", "style") || "").includes("translateY(") || /translateY\(0|^$/.test((await page.getAttribute(".sheet", "style") || "").replace(/.*transform:\s*/, "")));
await swipe(".sheet .h2", 220, 250); await page.waitForTimeout(600);
check("swiping down closes the add-steps sheet", (await page.locator(".sheet").count()) === 0);
await page.click("[data-tab=rivals]"); await page.click("[data-act=wiz]"); await page.waitForSelector(".sheet");
await swipe(".sheet .h2", 200, 250); await page.waitForTimeout(600);
check("swiping down closes the challenge sheet", (await page.locator(".sheet").count()) === 0);
check("grab handle is drawn", await page.evaluate(() => { document.body.insertAdjacentHTML("beforeend", '<div class="sheet" id="tmp"></div>'); const w = getComputedStyle(document.getElementById("tmp"), "::before").width; document.getElementById("tmp").remove(); return w === "44px"; }));
check("no page errors", errors.length === 0, errors.join("|"));
console.log(r.filter(Boolean).length + " of " + r.length + " passed");
await browser.close();
