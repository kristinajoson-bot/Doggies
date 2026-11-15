export const config = { matcher: '/((?!privacy|terms|fonts/|img/|robots.txt).*)' };

// Password-only preview lock. Shows a FurSteps password page (no username box).
// The password lives only in the Vercel env var SITE_PASSWORD.
const COOKIE = 'fs_preview';

async function tokenFor(pass) {
  const data = new TextEncoder().encode('fursteps-preview:' + pass);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function getCookie(request, name) {
  const raw = request.headers.get('cookie') || '';
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i > -1 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return '';
}

function safeNext(n) {
  return typeof n === 'string' && n.startsWith('/') && !n.startsWith('//') ? n : '/';
}

function page(next, wrong) {
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>FurSteps preview</title>
<style>@font-face{font-family:'Fredoka';font-weight:600;font-display:block;src:url(/fonts/fredoka-600.woff2) format('woff2')}@font-face{font-family:'Nunito';font-weight:400;font-display:block;src:url(/fonts/nunito-400.woff2) format('woff2')}@font-face{font-family:'Nunito';font-weight:700;font-display:block;src:url(/fonts/nunito-700.woff2) format('woff2')}
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#faf6f5;background-image:radial-gradient(circle at 85% 10%,#e6d6f3 0,transparent 40%),radial-gradient(circle at 5% 90%,#f6dbe6 0,transparent 40%);font-family:'Nunito',system-ui,sans-serif;color:#2a1a2e}
.card{background:#fff;border-radius:24px;padding:36px 32px;width:min(380px,90vw);box-shadow:0 12px 40px rgba(110,90,168,.15);text-align:center}
h1{font-family:'Fredoka',sans-serif;font-weight:600;font-size:30px;margin:0 0 6px}h1 span{color:#9b3a63}p{color:#5d5162;margin:0 0 20px}
input{width:100%;box-sizing:border-box;font:inherit;font-size:17px;padding:13px 16px;border:2px solid #eadfee;border-radius:14px;margin-bottom:14px;outline:none}input:focus{border-color:#9b3a63}
button{width:100%;font-family:'Fredoka',sans-serif;font-weight:600;font-size:17px;color:#fff;background:#9b3a63;border:0;border-radius:999px;padding:13px;cursor:pointer}
.err{color:#b3261e;font-weight:700;margin:-4px 0 12px}</style></head><body>
<form class="card" method="post" action="/__unlock"><h1>Fur<span>Steps</span></h1><p>This preview is private. Enter the password to continue.</p>
${wrong ? '<div class="err">That password didn\'t work. Try again.</div>' : ''}
<input type="password" name="password" placeholder="Password" autocomplete="current-password" autofocus required>
<input type="hidden" name="next" value="${next.replace(/[^A-Za-z0-9/_\-.#?=&%]/g, '')}">
<button type="submit">Enter</button></form></body></html>`;
  return new Response(html, { status: 401, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } });
}

export default async function middleware(request) {
  const pass = process.env.SITE_PASSWORD;
  if (!pass) { return new Response('Site locked', { status: 503, headers: { 'X-Robots-Tag': 'noindex, nofollow' } }); }
  const url = new URL(request.url);
  const good = await tokenFor(pass);

  if (url.pathname === '/__unlock') {
    if (request.method !== 'POST') return Response.redirect(new URL('/', url), 303);
    let form; try { form = await request.formData(); } catch (e) { form = new FormData(); }
    const next = safeNext(form.get('next'));
    if (String(form.get('password') || '') === pass) {
      return new Response(null, { status: 303, headers: {
        'Location': next,
        'Set-Cookie': `${COOKIE}=${good}; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax`,
        'Cache-Control': 'no-store' } });
    }
    return page(next, true);
  }

  if (getCookie(request, COOKIE) === good) return;

  // Old browser prompt still works if someone has it saved (username ignored).
  const auth = request.headers.get('authorization') || '';
  if (auth.startsWith('Basic ')) {
    let d = ''; try { d = atob(auth.slice(6)); } catch (e) {}
    const i = d.indexOf(':');
    if ((i >= 0 ? d.slice(i + 1) : d) === pass) return;
  }
  return page(url.pathname + url.search, false);
}
