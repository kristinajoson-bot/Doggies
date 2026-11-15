export const config = { matcher: '/((?!privacy|terms|fonts/|img/|robots.txt).*)' };
// Password-only lock: the username box can be left blank (or anything).
export default function middleware(request) {
  const pass = process.env.SITE_PASSWORD;
  if (!pass) { return new Response('Site locked', { status: 503, headers: { 'X-Robots-Tag': 'noindex, nofollow' } }); }
  const auth = request.headers.get('authorization') || '';
  if (auth.startsWith('Basic ')) {
    let d = ''; try { d = atob(auth.slice(6)); } catch (e) {}
    const i = d.indexOf(':');
    const p = i >= 0 ? d.slice(i + 1) : d;
    if (p === pass) { return; }
  }
  return new Response('Password required', { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="FurSteps preview - leave username blank"', 'X-Robots-Tag': 'noindex, nofollow' } });
}
