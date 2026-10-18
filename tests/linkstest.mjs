import { open } from "./stepsharness.mjs";
const r = []; const check = (n, ok, d = "") => { r.push(ok); console.log((ok ? "PASS " : "FAIL ") + n + (d ? "  [" + d + "]" : "")); };
// Fake duel backend layered on top of the shared harness
function duelRoutes(page, state) {
  return page.route("https://zzkpdkarrgsvibkxeuor.supabase.co/rest/v1/rpc/*", async route => {
    const req = route.request(), name = new URL(req.url()).pathname.split("/").pop();
    if (req.method() === "OPTIONS") return route.fallback();
    const body = req.postData() ? JSON.parse(req.postData()) : {};
    const cors = { "access-control-allow-origin": "*" };
    const j = (o, status = 200) => route.fulfill({ status, contentType: "application/json", headers: cors, body: JSON.stringify(o) });
    state.calls.push(name + " " + JSON.stringify(body));
    if (name === "my_duels") return j(state.duels);
    if (name === "my_links") return j(state.duels.filter(d => d.status === "pending" && d.tok).map(d => ({ id: d.id, invite_token: d.tok })));
    if (name === "create_link_duel") { state.duels.push({ id: "L" + (state.duels.length + 1), tok: "tok" + state.duels.length + "abcdef", kind: "person", status: "pending", incoming: false, my_label: "Kristina", rival_label: null, my_members: 1, rival_members: 0, my_total: 0, rival_total: 0, days_left: body.p_days, finished: false, is_random: false }); return j(state.duels[state.duels.length - 1].tok); }
    if (name === "cancel_duel") { state.duels = state.duels.filter(d => d.id !== body.p_id); return j(null); }
    if (name === "link_duel_preview") return j(state.preview[body.p_token] ? [state.preview[body.p_token]] : []);
    if (name === "accept_link_duel") return state.acceptError ? j({ message: state.acceptError }, 400) : j("duel-1");
    return route.fallback();
  });
}
const out = process.argv[2];

// A. the sender creates a link challenge
{ const { page, browser, errors } = await open({}); const st = { duels: [], calls: [], preview: {} }; await duelRoutes(page, st);
  await page.click("[data-tab=rivals]"); await page.waitForSelector("[data-act=wiz]"); await page.click("[data-act=wiz]"); await page.waitForSelector(".sheet");
  await page.click("[data-wkind=person]"); await page.waitForTimeout(200);
  check("Person defaults to Send a link, no code box", (await page.locator("[data-wmode]").count()) === 0 && (await page.locator("input[name=opp]").count()) === 0 && /Create challenge link/.test(await page.textContent(".sheet .btn.coral")));
  await page.screenshot({ path: out + "/l-wiz.png" });
  check("no code anywhere in the wizard", !/code/i.test(await page.textContent(".sheet")));
  await page.click(".sheet .btn.coral"); await page.waitForTimeout(500);
  check("link challenge created for 7 days", st.calls.some(c => c === 'create_link_duel {"p_days":7}'), st.calls.filter(c => c.startsWith("create")).join());
  check("a waiting card with Share link and Cancel appears", /Waiting for someone to open your link/.test(await page.textContent("body")) && (await page.locator("[data-share]").count()) === 1);
  await page.click(".ban[data-flip]"); await page.waitForTimeout(500); check("flipped card offers Cancel", (await page.locator("[data-cancel]").count()) === 1);
  await page.screenshot({ path: out + "/l-waiting.png", fullPage: true });
  await page.evaluate(() => { navigator.share = d => { window.__shared = d; return Promise.resolve(); }; });
  await page.click("[data-share]"); await page.waitForTimeout(200);
  const sh = await page.evaluate(() => window.__shared);
  check("sharing sends a link with the challenge inside", !!sh && /^http:\/\/localhost:4174\/\?duel=tok\w+$/.test(sh.url) && !sh.text.includes("?duel="), JSON.stringify(sh));
  await page.click("[data-cancel]"); await page.waitForTimeout(400);
  check("cancel removes the waiting challenge", (await page.locator("[data-share]").count()) === 0 && st.calls.some(c => c.startsWith("cancel_duel")));
  check("no page errors (sender)", errors.length === 0, errors.join(";")); await browser.close(); }

// B. the recipient opens the link while signed in
{ const st = { duels: [], calls: [], preview: { abc123: { challenger: "Jordan", days: 7, mine: false, available: true } } };
  const { page, browser, errors } = await open({ path: "/?duel=abc123" }); await duelRoutes(page, st); await page.reload({ waitUntil: "networkidle" }).catch(() => {});
  await page.goto("http://localhost:4174/?duel=abc123", { waitUntil: "networkidle" }); await page.waitForSelector(".sheet");
  const t = await page.textContent(".sheet");
  check("recipient sees who challenged them", /Jordan/.test(t) && /7-day/.test(t) && /Accept the challenge/.test(t), t.slice(0, 90));
  check("the link parameter is removed from the address bar", !page.url().includes("duel="), page.url());
  await page.screenshot({ path: out + "/l-invite.png" });
  await page.click("[data-act=acceptinvite]"); await page.waitForTimeout(500);
  check("accepting calls the database with the token and closes", st.calls.some(c => c === 'accept_link_duel {"p_token":"abc123"}') && !(await page.$(".sheet")), st.calls.filter(c => c.startsWith("accept")).join());
  check("no page errors (recipient)", errors.length === 0, errors.join(";")); await browser.close(); }

// C. links that cannot be used
for (const [label, row, expect] of [["already used", { challenger: "Jordan", days: 7, mine: false, available: false }, /already been used/], ["own link", { challenger: "Kristina", days: 7, mine: true, available: true }, /your own challenge link/]]) {
  const st = { duels: [], calls: [], preview: { zzz999: row } };
  const { page, browser } = await open({ path: "/?duel=zzz999" }); await duelRoutes(page, st); await page.goto("http://localhost:4174/?duel=zzz999", { waitUntil: "networkidle" }); await page.waitForSelector(".sheet");
  check(`${label}: clear message, no accept button`, expect.test(await page.textContent(".sheet")) && (await page.locator("[data-act=acceptinvite]").count()) === 0);
  await browser.close(); }
{ const st = { duels: [], calls: [], preview: {} };
  const { page, browser } = await open({ path: "/?duel=nope" }); await duelRoutes(page, st); await page.goto("http://localhost:4174/?duel=nope", { waitUntil: "networkidle" }); await page.waitForSelector(".sheet");
  check("unknown link: clear message", /not valid/.test(await page.textContent(".sheet"))); await browser.close(); }
// accept fails on the server (someone got there first)
{ const st = { duels: [], calls: [], preview: { q1: { challenger: "Jordan", days: 3, mine: false, available: true } }, acceptError: "This challenge link has already been used or was cancelled" };
  const { page, browser } = await open({ path: "/?duel=q1" }); await duelRoutes(page, st); await page.goto("http://localhost:4174/?duel=q1", { waitUntil: "networkidle" }); await page.waitForSelector(".sheet");
  await page.click("[data-act=acceptinvite]"); await page.waitForTimeout(400);
  check("server refusal is shown, sheet stays open", /already been used/.test(await page.textContent(".sheet .err")) ); await browser.close(); }

// D. a visitor who is not signed in
{ const { page, browser } = await open({ noSession: true, path: "/?duel=abc123" });
  check("signed-out visitor sees the challenge banner", /You have been challenged/.test(await page.textContent("body")));
  check("the token is kept for after sign-in, address cleaned", (await page.evaluate(() => localStorage.getItem("walkies-pending-duel"))) === "abc123" && !page.url().includes("duel="), page.url());
  await page.screenshot({ path: out + "/l-signedout.png" }); await browser.close(); }
console.log(r.filter(Boolean).length + " of " + r.length + " passed");
