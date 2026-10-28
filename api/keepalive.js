// Called once a day by a Vercel cron (see vercel.json). A small read keeps the free Supabase project
// from being paused for inactivity. Uses the same public settings as the app.
const URL_ = "https://zzkpdkarrgsvibkxeuor.supabase.co";
const KEY = "sb_publishable_3Zu0UcLxjDClveMQbDb-Og_IcLsWZPe";

export default async function handler(req, res) {
  try {
    const r = await fetch(URL_ + "/rest/v1/dogs?select=id&limit=1", { headers: { apikey: KEY, Authorization: "Bearer " + KEY } });
    res.status(r.ok ? 200 : 502).json({ ok: r.ok, status: r.status, at: new Date().toISOString() });
  } catch (e) {
    res.status(502).json({ ok: false, error: String(e) });
  }
}
