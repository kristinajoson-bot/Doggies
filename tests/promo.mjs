import { open } from "./stepsharness.mjs";
const out = process.argv[2] || ".";
const r = []; const check = (n, ok, d = "") => { r.push(ok); console.log((ok ? "PASS " : "FAIL ") + n + (d ? "  [" + d + "]" : "")); };
const J = o => ({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(o) });
const mode = process.argv[3] || "both"; let calls = [];
const duel = { id: "u1", kind: "person", status: "active", incoming: false, my_label: "You", rival_label: "Ana", my_members: 1, rival_members: 1, my_total: 12400, rival_total: 15800, starts_on: "2026-10-14", ends_on: "2026-10-20", days_left: 4, finished: false, is_random: false };
const pack = { id: "p1", name: "Friday Dash", join_code: "X", starts_on: "2026-10-16", ends_on: "2026-10-22", days_left: 6, finished: false, members: 5, my_steps: 4200, my_rank: 2, is_owner: true };
const ppl = [["Ana", 5000, "d2"], ["Kristina", 4200, "d1"], ["Ben", 3900, null], ["Cy", 2100, "d3"], ["Dee", 900, null]].map((x, i) => ({ display_name: x[0], steps: x[1], bowls: 0, is_me: x[0] === "Kristina", dog_id: x[2], rank: i + 1 }));
const setup = async page => {
  if (mode === "both") {
    await page.route("**/rpc/my_duels", r => r.fulfill(J([duel])));
    await page.route("**/rpc/duel_faces", r => r.fulfill(J([{ id: "u1", my_dog: "d1", rival_dog: "d2" }])));
    await page.route("**/rpc/my_packs", r => r.fulfill(J([pack])));
    await page.route("**/rpc/pack_people", r => r.fulfill(J(ppl)));
  }
  await page.route("**/rpc/pack_leaderboard", r => r.fulfill(J([])));
};
const { page, browser, errors } = await open({ seed: { 0: 3000 }, setup });
await page.click(".dogcard"); await page.click("[data-pickdog=d1]"); await page.waitForTimeout(500);
await page.click("[data-tab=rivals]"); await page.waitForSelector(".promo-title"); await page.waitForTimeout(600);
let t = await page.innerText("body");
check("title is Challenges of the month in the app font", /challenges/i.test(await page.innerText(".promo-title")) && /of the month/i.test(await page.innerText(".promo-title")) && !/Bungee/.test(await page.evaluate(() => getComputedStyle(document.querySelector(".promo-title")).fontFamily)));
const nBan = await page.locator(".fwrap").count();
check("three banners", nBan === 3, String(nBan));
await page.screenshot({ path: out + "/promo-front.png", fullPage: true });
if (mode === "both") {
  check("tug front: you vs rival with dog and breed", /You/.test(await page.innerText(".ban:not(.pk)")) && /Ana/.test(t) && /Biscuit/.test(t) && /Kelpie/.test(t), "");
  check("pack front shows avatars on both sides of a VS", (await page.locator(".ban.pk .vsbadge").count()) === 1 && (await page.locator(".ban.pk .cluster > *").count()) >= 4);
  check("third banner is a promo", (await page.locator(".promo-b").count()) === 1);
  check("no steps ranking visible on front", !/5,000/.test(await page.innerText(".ban.pk")));
  await page.click(".ban.pk[data-flip]"); await page.waitForTimeout(700);
  const back = await page.innerText(".ban-back");
  check("pack back lists the top three with a Show all 5 button", /Ana/.test(back) && /5,000/.test(back) && /Kristina/.test(back) && !/Dee/.test(back) && (await page.locator(".ban-back .lb").count()) === 3 && /Show all 5/.test(back));
  await page.screenshot({ path: out + "/promo-packback.png", fullPage: true });
  check("no Back button on the flipped tile", (await page.locator(".ban-back button.chip-s").count()) === 0 && !/Back/.test(await page.innerText(".ban-back")));
  await page.click(".ban-back .num >> nth=0"); await page.waitForTimeout(700);
  check("tapping a row flips it back too", (await page.locator(".ban-back").count()) === 0);
  await page.click(".ban.pk[data-flip]"); await page.waitForTimeout(700); await page.click(".ban-back"); await page.waitForTimeout(700);
  check("flip back returns to the front", (await page.locator(".ban-back").count()) === 0);
  await page.click(".ban[data-flip='u1']"); await page.waitForTimeout(700);
  check("tug back shows steps and the rope", /12,400/.test(await page.innerText(".ban-back")) && /15,800/.test(await page.innerText(".ban-back")) && (await page.locator(".ban-back .tug-bar").count()) === 1);
  await page.screenshot({ path: out + "/promo-tugback.png", fullPage: true });
} else {
  check("all three are promos", (await page.locator(".promo-b").count()) === 3);
  await page.click(".promo-b >> nth=0"); await page.waitForSelector(".sheet");
  check("promo opens the wizard", /Start a challenge/.test(await page.innerText(".sheet")));
}
check("no page errors", errors.length === 0, errors.join("|"));
console.log(r.filter(Boolean).length + " of " + r.length + " passed");
await browser.close();
