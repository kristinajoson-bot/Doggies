import { open } from "./stepsharness.mjs";
const r = []; const check = (n, ok, d = "") => { r.push(ok); console.log((ok ? "PASS " : "FAIL ") + n + (d ? "  [" + d + "]" : "")); };
const out = process.argv[2], REF = "https://zzkpdkarrgsvibkxeuor.supabase.co";
const duel = (i, status = "active", extra = {}) => ({ id: "d" + i, kind: i % 2 ? "person" : "team", status, incoming: false, my_label: "You", rival_label: "R" + i, my_members: 1, rival_members: 1, my_total: 0, rival_total: 0, days_left: 7, finished: false, is_random: false, ...extra });
const cup = (i, extra = {}) => ({ id: "c" + i, name: "Cup " + i, kind: "team", size: 8, round_days: 3, status: "running", entries: 8, i_am_in: true, is_mine: false, champion: null, ...extra });
async function scenario(label, duels, cups, expectN, expectFull) {
  const setup = async page => { await page.route(REF + "/rest/v1/rpc/*", async route => { const req = route.request(), name = new URL(req.url()).pathname.split("/").pop(); if (req.method() === "OPTIONS") return route.fallback(); const j = o => route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(o) }); if (name === "my_duels") return j(duels); if (name === "list_tournaments") return j(cups); return route.fallback(); }); };
  const { page, browser, errors } = await open({ setup });
  await page.click("[data-tab=rivals]"); await page.waitForTimeout(400);
  const t = await page.textContent("body"), full = (await page.locator("[data-act=wiz]").count()) === 0;
  check(`${label}: shows "${expectN} of 3"`, new RegExp(`${expectN} of 3 going`, "i").test(t));
  check(`${label}: button ${expectFull ? "is stopped" : "is available"}`, full === expectFull && (!expectFull || /You have 3 challenges/.test(t)));
  if (label === "full") await page.screenshot({ path: out + "/lm-full.png", fullPage: true });
  check(`${label}: no page errors`, errors.length === 0, errors.join(";")); await browser.close();
}
await scenario("none", [], [], 0, false);
await scenario("two", [duel(1), duel(2)], [], 2, false);
await scenario("full", [duel(1), duel(2), duel(3)], [], 3, true);
await scenario("waiting requests and finished ones do not count", [duel(1, "pending", { incoming: true }), duel(2, "active", { finished: true }), duel(3, "pending", { incoming: true }), duel(4)], [cup(2, { status: "finished" }), cup(3, { i_am_in: false })], 1, false);
await scenario("my own waiting invite counts", [duel(1, "pending"), duel(2, "pending"), duel(3, "active")], [], 3, true);
console.log(r.filter(Boolean).length + " of " + r.length + " passed");
