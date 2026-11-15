// Temporary password lock for the coming-soon site (remove at launch).
// Username/password come from Vercel environment variables SITE_USER and SITE_PASSWORD.
// Privacy and terms stay public (needed for the App Store and TestFlight).
export const config = { matcher: '/((?!privacy|terms|fonts/|img/|robots.txt).*)' };

export default function middleware(request) {
  const user = process.env.SITE_USER;
  const pass = process.env.SITE_PASSWORD;
  if (!user || !pass) {
    return new Response('Site locked', { status: 503, headers: { 'X-Robots-Tag': 'noindex, nofollow' } });
  }
  const auth = request.headers.get('authorization') || '';
  if (auth.startsWith('Basic ')) {
    const d = atob(auth.slice(6)); const i = d.indexOf(':');
    const u = d.slice(0, i), p = d.slice(i + 1);
    if (u === user && p === pass) { return; }
  }
  return new Response('Password required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="FurSteps preview"', 'X-Robots-Tag': 'noindex, nofollow' }
  });
}
