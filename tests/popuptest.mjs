import { open } from "./stepsharness.mjs";
const r = []; const check = (n, ok, d = "") => { r.push(ok); console.log((ok ? "PASS " : "FAIL ") + n + (d ? "  [" + d + "]" : "")); };
const out = process.argv[2], REF = "https://zzkpdkarrgsvibkxeuor.supabase.co";
const mkJwt = () => { const b = o => Buffer.from(JSON.stringify(o)).toString("base64url"); const exp = Math.floor(Date.now() / 1000) + 3600; return b({ alg: "HS256", typ: "JWT" }) + "." + b({ sub: "u9", aud: "authenticated", role: "authenticated", exp, email: "new@example.com" }) + ".sig"; };
const user = { id: "u9", aud: "authenticated", role: "authenticated", email: "new@example.com", app_metadata: {}, user_metadata: { display_name: "Sam" }, created_at: "2026-10-13T00:00:00Z" };
function backend(st) {
  return async page => {
    await page.route(REF + "/**", async route => {
      const req = route.request(), u = new URL(req.url()), cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" };
      const j = (o, status = 200) => route.fulfill({ status, contentType: "application/json", headers: cors, body: JSON.stringify(o) });
      if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
      if (u.pathname.endsWith("/auth/v1/signup")) { st.signups.push(JSON.parse(req.postData())); if (st.needsConfirm) return j(user); const exp = Math.floor(Date.now() / 1000) + 3600; return j({ access_token: mkJwt(), token_type: "bearer", expires_in: 3600, expires_at: exp, refresh_token: "r", user }); }
      const rpc = (u.pathname.match(/\/rpc\/(\w+)/) || [])[1]; if (rpc) st.calls.push(rpc + " " + (req.postData() || ""));
      if (rpc === "link_duel_public") return j(st.public[JSON.parse(req.postData()).p_token] ? [st.public[JSON.parse(req.postData()).p_token]] : []);
      if (rpc === "link_duel_preview") return j([{ challenger: "Jordan Smith", days: 7, mine: false, available: true }]);
      if (rpc === "accept_link_duel") return j("duel-1");
      return route.fallback();
    });
  };
}
// 1 + 2: sign up in the pop-up and accept in one step
{ const st = { signups: [], calls: [], public: { abc123: { challenger: "Jordan", days: 7, available: true } } };
  const { page, browser, errors } = await open({ noSession: true, path: "/?duel=abc123", setup: backend(st) });
  const t = await page.textContent(".sheet");
  check("pop-up names the challenger and length", /Jordan/.test(t) && /7-day/.test(t) && /Create account and accept/.test(t), t.slice(0, 80));
  check("the page form behind it is hidden, only one sign-up form", (await page.locator("form[data-form=auth]:visible").count()) === 1);
  check("nothing is accepted before signing up", !st.calls.some(c => c.startsWith("accept_link_duel")));
  await page.screenshot({ path: out + "/p-popup.png" });
  await page.click("[data-pmode=signin]"); check("switching to sign in changes the button", /Sign in and accept/.test(await page.textContent(".sheet .btn.coral")));
  await page.click("[data-pmode=signup]");
  await page.fill("#pn-name", "Sam"); await page.fill("#pn-email", "new@example.com"); await page.fill("#pn-pass", "supersecret1"); if (await page.locator(".sheet input[name=agree]").count()) await page.check(".sheet input[name=agree]");
  await page.click(".sheet .btn.coral"); await page.waitForTimeout(1200);
  check("sign-up sent with the display name", st.signups.length === 1 && st.signups[0].data && st.signups[0].data.display_name === "Sam", JSON.stringify(st.signups[0] && st.signups[0].data));
  check("challenge accepted automatically with the right token", st.calls.some(c => c === 'accept_link_duel {"p_token":"abc123"}'), st.calls.filter(c => c.includes("link_duel") || c.includes("accept")).join(" | "));
  check("pop-up gone, app shown on Challenges", !(await page.$(".sheet")) && /Challenges/.test(await page.textContent("h1")), (await page.textContent("h1")));
  check("nothing left stored", (await page.evaluate(() => [localStorage.getItem("walkies-pending-duel"), localStorage.getItem("walkies-auto-accept")])).every(x => !x));
  await page.screenshot({ path: out + "/p-after.png" });
  check("no page errors", errors.length === 0, errors.join(";")); await browser.close(); }

// 3: email confirmation needed first: the challenge survives until they sign in
{ const st = { signups: [], calls: [], needsConfirm: true, public: { abc123: { challenger: "Jordan", days: 7, available: true } } };
  const { page, browser } = await open({ noSession: true, path: "/?duel=abc123", setup: backend(st) });
  await page.fill("#pn-name", "Sam"); await page.fill("#pn-email", "new@example.com"); await page.fill("#pn-pass", "supersecret1"); if (await page.locator(".sheet input[name=agree]").count()) await page.check(".sheet input[name=agree]"); await page.click(".sheet .btn.coral"); await page.waitForTimeout(800);
  check("confirmation message shown in the pop-up", /Check your email/.test(await page.textContent(".sheet")), (await page.textContent(".sheet .err") || ""));
  check("challenge kept for after confirmation", (await page.evaluate(() => [localStorage.getItem("walkies-pending-duel"), localStorage.getItem("walkies-auto-accept")])).join() === "abc123,1");
  await browser.close(); }

// 4: link no longer available
{ const st = { signups: [], calls: [], public: { dead: { challenger: "Jordan", days: 7, available: false } } };
  const { page, browser } = await open({ noSession: true, path: "/?duel=dead", setup: backend(st) });
  check("used link: clear pop-up, no sign-up form inside it", /not available/.test(await page.textContent(".sheet")) && (await page.locator(".sheet input").count()) === 0);
  await page.click(".sheet .btn"); await page.waitForTimeout(200);
  check("Continue shows the normal sign-in page", (await page.locator("form[data-form=auth]:visible").count()) === 1 && !(await page.$(".sheet"))); await browser.close(); }

// 5: Not now
{ const st = { signups: [], calls: [], public: { abc123: { challenger: "Jordan", days: 7, available: true } } };
  const { page, browser } = await open({ noSession: true, path: "/?duel=abc123", setup: backend(st) });
  await page.click("[data-act=closepub]"); await page.waitForTimeout(200);
  check("Not now shows the normal page and keeps the challenge", !(await page.$(".sheet")) && (await page.evaluate(() => localStorage.getItem("walkies-pending-duel"))) === "abc123" && /You have been challenged/.test(await page.textContent("body"))); await browser.close(); }
console.log(r.filter(Boolean).length + " of " + r.length + " passed");
