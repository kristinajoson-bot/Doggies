// A stateful fake of the Walkies backend so the real front-end code can be exercised end to end.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "/opt/node22/lib/node_modules/playwright/index.mjs");
export async function open(opts = {}) {
  const ref = "zzkpdkarrgsvibkxeuor";
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const b64 = o => Buffer.from(JSON.stringify(o)).toString("base64url");
  const jwt = b64({ alg: "HS256", typ: "JWT" }) + "." + b64({ sub: "u1", aud: "authenticated", role: "authenticated", exp, email: "me@example.com" }) + ".sig";
  const user = { id: "u1", aud: "authenticated", role: "authenticated", email: "me@example.com", app_metadata: {}, user_metadata: {}, created_at: "2026-10-01T00:00:00Z" };
  const session = { access_token: jwt, refresh_token: "r", token_type: "bearer", expires_in: 3600, expires_at: exp, user };
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, ...(opts.tz ? { timezoneId: opts.tz } : {}) });
  await ctx.addInitScript((fr) => { if (fr) window.__firstRun = true; }, !!opts.firstRun);
  if (!opts.noSession) await ctx.addInitScript(([k, v]) => { localStorage.setItem(k, v); localStorage.setItem("walkies-onboarded-u1", "1"); if (!window.__firstRun) localStorage.setItem("walkies-dog-seen-u1", "1"); if (!window.__keepDogSeen) { try { if (!localStorage.getItem("walkies-first-run-test")) {} } catch (e) {} } }, [`sb-${ref}-auth-token`, JSON.stringify(session)]);
  const page = await ctx.newPage();
  const errors = []; page.on("pageerror", e => errors.push(e.message));
  const day = n => new Date(Date.now() + n * 864e5).toLocaleDateString("en-CA");
  const dogs = [{ id: "d1", shelter_id: "sh1", name: "Biscuit", age: "3 years", breed: "Kelpie cross", story: "Biscuit loves tennis balls. (Sample dog.)", coat: "#C98B4B", ear: "#8A5A2B", goal_bowls: 40, is_demo: true, active: true }, { id: "d2", shelter_id: "sh1", name: "Mabel", age: "6 years", breed: "Staffy cross", story: "Mabel loves a warm blanket. (Sample dog.)", coat: "#E3C9A0", ear: "#B58A52", goal_bowls: 40, is_demo: true, active: true }, { id: "d3", shelter_id: "sh1", name: "Rocky", age: "1 year", breed: "Border collie mix", story: "Rocky is full of beans. (Sample dog.)", coat: "#2f2d3a", ear: "#14131a", goal_bowls: 40, is_demo: true, active: true }, { id: "d4", shelter_id: "sh1", name: "Pip", age: "9 months", breed: "Terrier cross", story: "Pip is small and fearless. (Sample dog.)", coat: "#B9B2A5", ear: "#7C766B", goal_bowls: 40, is_demo: true, active: true }];
  const profile = { user_id: "u1", display_name: "Kristina", buddy_name: "Biscuit", workplace_id: null, state: null, city: null, open_to_rivals: false, rival_code: "K3P9XZ", dog_id: opts.dogId || null };
  const db = { profile, patches: [], challenge: { id: 1, name: "Founders Cup", starts_on: opts.start ?? day(-3), ends_on: opts.end ?? day(7) }, steps: new Map(), saves: [], rejected: [] };
  for (const [d, n] of Object.entries(opts.seed || {})) db.steps.set(day(Number(d)), n);
  await page.route(`https://${ref}.supabase.co/**`, async route => {
    const req = route.request(), u = new URL(req.url()), method = req.method();
    const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" };
    const j = (o, status = 200) => route.fulfill({ status, contentType: "application/json", headers: cors, body: JSON.stringify(o) });
    if (method === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    const path = u.pathname;
    if (path.endsWith("/rest/v1/challenge")) return j(db.challenge);
    if (path.endsWith("/rest/v1/profiles")) { if (method === "PATCH") { const body = JSON.parse(req.postData()); db.patches.push(body); if (body.dog_id && !dogs.some(d => d.id === body.dog_id)) return j({ message: "fk" }, 409); Object.assign(db.profile, body); return route.fulfill({ status: 204, headers: cors, body: "" }); } return j(db.profile); }
    if (path.endsWith("/rest/v1/dogs")) return j(dogs);
    if (path.endsWith("/rest/v1/shelters")) return j([{ id: "sh1", name: "Walkies Rescue", city: "Sydney", state: "NSW", is_demo: true }]);
    if (path.endsWith("/rest/v1/dog_notes")) return j([{ id: "n1", dog_id: "d1", body: "Thank you for every step! (Sample note.)", created_at: new Date().toISOString() }]);
    if (path.includes("/rpc/my_dog_bowls")) { const mine = db.profile.dog_id; return j([{ dog_id: mine, walkers: 1, bowls: Math.floor([5000,15000,30000,45000,65000,85000,100000,120000,135000,150000].filter(m => m <= [...db.steps.values()].reduce((a, b) => a + b, 0)).length) }]); }
    if (path.endsWith("/rest/v1/step_days")) {
      if (method === "POST") {
        const row = JSON.parse(req.postData());
        // the same rules the real database enforces
        if (!(row.steps >= 0 && row.steps <= 60000)) { db.rejected.push(row); return j({ message: "check constraint" }, 400); }
        if (row.day > day(1) || row.day < day(-7)) { db.rejected.push(row); return j({ message: "outside window" }, 400); }
        db.steps.set(row.day, row.steps); db.saves.push(row); return route.fulfill({ status: 201, headers: cors, body: "" });
      }
      const gte = (u.searchParams.getAll("day").find(x => x.startsWith("gte.")) || "").slice(4), lte = (u.searchParams.getAll("day").find(x => x.startsWith("lte.")) || "").slice(4);
      return j([...db.steps].filter(([d]) => d >= gte && d <= lte).map(([d, steps]) => ({ day: d, steps })));
    }
    if (path.includes("/rpc/impact")) return j([{ my_steps: 0, my_bowls: 0, team_name: null, team_join_code: null, team_members: 0, team_bowls: 0, community_walkers: 1, community_bowls: 0 }]);
    if (path.includes("/rpc/")) return j([]);
    return j({});
  });
  if (opts.setup) await opts.setup(page, db);
  await page.goto("http://localhost:4174" + (opts.path || "/"), { waitUntil: "networkidle" });
  await page.waitForSelector(opts.noSession ? "form[data-form=auth] >> visible=true" : (opts.firstRun || opts.path ? "h1" : ".hero"));
  return { page, db, browser, errors, day };
}
