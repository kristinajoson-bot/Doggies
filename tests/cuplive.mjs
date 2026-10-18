import { open } from "./stepsharness.mjs";
const out = process.argv[2] || "shots";
const r = []; const check = (n, ok, d = "") => { r.push(ok); console.log((ok ? "PASS " : "FAIL ") + n + (d ? "  [" + d + "]" : "")); };
const J = o => ({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(o) });
let joined = null, calls = [];
const names = { a: "Sydney", b: "Melbourne", c: "Brisbane", d: "Perth", e: "Adelaide", f: "Hobart", g: "Darwin", h: "Canberra" };
const overview = () => ({ id: "w1", slug: "city-world-cup", title: "City World Cup", tagline: "", days_left: 15, my_side: joined, my_steps: 0, sides: Object.keys(names).map(k => ({ key: k, label: names[k], walkers: 3, total: 90000 })) });
const sched = [{ round: "G1", starts_on: "2026-10-16", ends_on: "2026-10-18" }, { round: "SF", starts_on: "2026-10-25", ends_on: "2026-10-28" }, { round: "F", starts_on: "2026-10-29", ends_on: "2026-10-31" }];
const cup = { stage: "Group stage · Matchday 1", round: "G1", champion: null,
  current: [{ a: "a", b: "c", as: 4200, bs: 3100, state: "live", grp: "A" }, { a: "e", b: "g", as: 0, bs: 0, state: "live", grp: "A" }, { a: "b", b: "d", as: 5000, bs: 5000, state: "live", grp: "B" }, { a: "f", b: "h", as: 800, bs: 9100, state: "live", grp: "B" }],
  groups: [{ name: "Group A", rows: ["a", "c", "e", "g"].map(k => ({ key: k, p: 0, w: 0, d: 0, l: 0, pts: 0 })) }, { name: "Group B", rows: ["b", "d", "f", "h"].map(k => ({ key: k, p: 0, w: 0, d: 0, l: 0, pts: 0 })) }],
  semis: [{ a: null, b: null, as: 0, bs: 0, state: "upcoming", ta: "Winner Group A", tb: "Runner-up Group B" }, { a: null, b: null, as: 0, bs: 0, state: "upcoming", ta: "Winner Group B", tb: "Runner-up Group A" }],
  final: { a: null, b: null, as: 0, bs: 0, state: "upcoming", ta: "Winner semi-final 1", tb: "Winner semi-final 2" } };
const setup = async page => {
  await page.route("**/rpc/campaign_overview", r => r.fulfill(J([overview()])));
  await page.route("**/rpc/campaign_cup", r => r.fulfill(J(cup)));
  await page.route("**/rpc/campaign_cup_schedule", r => r.fulfill(J(sched)));
  await page.route("**/rpc/campaign_cup_fixtures", r => r.fulfill(J([])));
  await page.route("**/rpc/campaign_people", r => r.fulfill(J([{ display_name: "Ana", side: "h", steps: 9100, dog_id: null, is_me: false, rank: 1 }, { display_name: "Kristina", side: "a", steps: 4200, dog_id: null, is_me: true, rank: 2 }])));
  await page.route("**/rpc/join_campaign", r => { calls.push(r.request().postData()); joined = JSON.parse(r.request().postData()).p_side; r.fulfill(J(null)); });
  await page.route("**/rpc/pack_leaderboard", r => r.fulfill(J([])));
};
const { page, browser, errors } = await open({ seed: { 0: 3000 }, setup });
page.on("dialog", d => d.accept());
await page.click("[data-tab=rivals]"); await page.waitForSelector(".ban.camp"); await page.waitForTimeout(500);
let t = await page.innerText(".ban.camp");
check("front before joining: group stage matchday and all four live matches", /Group stage · Matchday 1/i.test(t) && (await page.locator(".ban.camp .mcard").count()) === 4 && (await page.locator(".ban.camp button.citypill").count()) === 8);
await page.screenshot({ path: out + "/cl-front.png", fullPage: true });
await page.click("[data-act=joincamp][data-side=a]"); await page.waitForTimeout(700);
t = await page.innerText(".ban.camp");
check("after joining: just my match and You are on Team Sydney", (await page.locator(".ban.camp .mcard").count()) === 1 && /Sydney/.test(t) && /Brisbane/.test(t) && /You are on Team Sydney/.test(t), t.replace(/\n/g, " | "));
await page.click(".ban.camp", { position: { x: 30, y: 24 } }); await page.waitForSelector("[data-act=cupback]"); await page.waitForTimeout(500);
t = await page.innerText("body");
check("page: schedule with dates, tree placeholders, groups and fixtures", /Matchday 1/.test(t) && /Winner Group A/.test(t) && /Runner-up Group B/.test(t) && /Winner semi-final 1/.test(t) && (await page.locator(".gtab:not(.h)").count()) === 8 && /Matches/.test(t));
await page.screenshot({ path: out + "/cl-page.png", fullPage: true });
check("no page errors", errors.length === 0, errors.join("|"));
console.log(r.filter(Boolean).length + " of " + r.length + " passed");
await browser.close();
