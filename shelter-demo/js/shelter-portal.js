// FurSteps shelter portal. Plain browser JavaScript, no build step.
// Talks only to Supabase project fursteps-b2b through the portal_* functions (see
// supabase-b2b/013_shelter_dog_photos.sql). Photos are re-drawn on a canvas before upload,
// which shrinks them and drops all hidden data (EXIF: GPS location, camera, date).
(function () {
  'use strict';
  var SB_URL = 'https://eadynnzljcijueshxsgg.supabase.co';
  var SB_KEY = 'sb_publishable_NsNTh1EYRq_5fM8VQt18kA_7PLbzIuv';
  var BUCKET = 'dog-photos';
  var MAX_EDGE = 1600, MAX_BYTES = 2.8 * 1024 * 1024;
  var PERMISSION_TEXT =
    'Our shelter owns these photos (or has permission to share them) and allows FurSteps to show them, ' +
    'with the dog\'s name and story, in the FurSteps app, on fursteps.com, in reports to the companies that ' +
    'fund food for our dogs, and on FurSteps social media. Photos will not show identifiable people. ' +
    'We can ask FurSteps to remove any photo at any time by emailing hey@fursteps.com.';

  var sb = window.supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
  var me = null, dogs = [], shelters = [], tab = 'review', editing = null, pendingFiles = {};

  function $(id) { return document.getElementById(id); }
  function show(id, on) { $(id).classList.toggle('hidden', !on); }
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') n.textContent = attrs[k];
      else if (k === 'class') n.className = attrs[k];
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), attrs[k]);
      else n.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  function flash(text, kind) {
    var f = $('flash'); f.innerHTML = '';
    if (text) f.appendChild(el('div', { class: 'msg ' + (kind || 'err'), text: text }));
    if (text) window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function nice(e) {
    var m = (e && (e.message || e.error_description)) || String(e);
    if (/rate limit/i.test(m)) return 'Too many tries. Please wait a minute and try again.';
    if (/expired|invalid/i.test(m) && /otp|token|code/i.test(m)) return 'That code didn\'t work or has expired. Please ask for a new one.';
    return m;
  }
  async function rpc(name, args) {
    var r = await sb.rpc(name, args || {});
    if (r.error) throw r.error;
    return r.data;
  }
  function busy(btn, on, label) {
    if (!btn) return;
    if (on) { btn.dataset.label = btn.textContent; btn.textContent = label || 'Working…'; btn.disabled = true; }
    else { btn.textContent = btn.dataset.label || btn.textContent; btn.disabled = false; }
  }

  // ---------- Sign in ----------
  $('send').addEventListener('click', async function () {
    var email = $('email').value.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return flash('Please enter your email address.');
    busy(this, true, 'Sending…');
    var r = await sb.auth.signInWithOtp({ email: email, options: { shouldCreateUser: true } });
    busy(this, false);
    if (r.error) return flash(nice(r.error));
    flash('We emailed a code to ' + email + '. It can take a minute. Check spam too.', 'info');
    show('step-email', false); show('step-code', true); $('code').focus();
  });
  $('back').addEventListener('click', function () { show('step-code', false); show('step-email', true); flash(''); });
  $('verify').addEventListener('click', async function () {
    var token = $('code').value.replace(/\D/g, '');
    if (token.length < 6) return flash('Please type the code from the email.');
    busy(this, true, 'Signing in…');
    var r = await sb.auth.verifyOtp({ email: $('email').value.trim().toLowerCase(), token: token, type: 'email' });
    busy(this, false);
    if (r.error) return flash(nice(r.error));
    flash(''); boot();
  });
  $('code').addEventListener('keydown', function (e) { if (e.key === 'Enter') $('verify').click(); });
  $('email').addEventListener('keydown', function (e) { if (e.key === 'Enter') $('send').click(); });
  $('signout').addEventListener('click', async function () { await sb.auth.signOut(); location.reload(); });

  // ---------- Photo permission ----------
  $('perm-text').textContent = PERMISSION_TEXT;
  $('perm-ok').addEventListener('change', function () { $('perm-save').disabled = !this.checked; });
  $('perm-save').addEventListener('click', async function () {
    busy(this, true);
    try { await rpc('portal_give_photo_permission', { p_text: PERMISSION_TEXT }); flash('Thank you. You can now add photos.', 'info'); await boot(); }
    catch (e) { flash(nice(e)); }
    busy(this, false);
  });

  // ---------- Boot ----------
  async function boot() {
    ['v-signin', 'v-noaccess', 'v-perm', 'v-main'].forEach(function (v) { show(v, false); });
    var s = (await sb.auth.getSession()).data.session;
    show('signout', !!s);
    if (!s) { show('v-signin', true); return; }
    var rows = await rpc('portal_me').catch(function (e) { flash(nice(e)); return []; });
    me = rows && rows[0];
    if (!me) { show('v-noaccess', true); return; }
    if (me.role === 'shelter' && !me.photo_permission_at) {
      $('perm-shelter').textContent = me.shelter_name; show('v-perm', true); return;
    }
    show('v-main', true);
    show('admin-tabs', me.role === 'admin');
    $('hello').textContent = me.role === 'admin' ? 'FurSteps admin' : me.shelter_name;
    $('sub').textContent = me.role === 'admin'
      ? 'Approve what shelters send, add dogs yourself, and set up shelters.'
      : 'New dogs and photos are checked by FurSteps, usually within 2 working days, then appear in the app.';
    if (me.role !== 'admin') tab = 'dogs';
    await load();
  }

  async function load() {
    try {
      dogs = await rpc('portal_list_dogs');
      if (me.role === 'admin') shelters = await rpc('portal_list_shelters');
    } catch (e) { return flash(nice(e)); }
    var paths = [];
    dogs.forEach(function (d) { (d.photos || []).forEach(function (p) { paths.push(p.path); }); });
    var urls = {};
    if (paths.length) {
      var r = await sb.storage.from(BUCKET).createSignedUrls(paths, 3600);
      (r.data || []).forEach(function (x) { if (x.signedUrl) urls[x.path] = x.signedUrl; });
    }
    dogs.forEach(function (d) { (d.photos || []).forEach(function (p) { p.url = urls[p.path]; }); });
    render();
  }

  // ---------- Render ----------
  document.querySelectorAll('#admin-tabs button').forEach(function (b) {
    b.addEventListener('click', function () {
      tab = b.dataset.tab;
      document.querySelectorAll('#admin-tabs button').forEach(function (x) { x.classList.toggle('on', x === b); });
      render();
    });
  });

  function pendingCount() {
    var n = 0;
    dogs.forEach(function (d) { if (d.review_status === 'pending') n++; (d.photos || []).forEach(function (p) { if (p.status === 'pending') n++; }); });
    return n;
  }

  function statusBadge(d) {
    if (d.review_status === 'pending') return el('span', { class: 'badge b-pending', text: 'Waiting for approval' });
    if (!d.active) return el('span', { class: 'badge b-hidden', text: 'Hidden from app' });
    return el('span', { class: 'badge b-approved', text: 'Live in app' });
  }

  function render() {
    var admin = me.role === 'admin';
    var n = pendingCount();
    $('pend-n').textContent = n ? '(' + n + ')' : '';
    show('shelters', admin && tab === 'shelters');
    show('list', !(admin && tab === 'shelters'));
    show('add-dog', !(admin && tab === 'shelters'));
    if (admin && tab === 'shelters') return renderShelters();

    var list = $('list'); list.innerHTML = '';
    var shown = dogs.filter(function (d) {
      if (!(admin && tab === 'review')) return true;
      return d.review_status === 'pending' || (d.photos || []).some(function (p) { return p.status === 'pending'; });
    });
    if (!shown.length) {
      list.appendChild(el('div', { class: 'card' }, [el('p', { class: 'muted', text: admin && tab === 'review' ? 'Nothing waiting for approval. 🎉' : 'No dogs yet. Tap "Add a dog" to start.' })]));
      return;
    }
    shown.forEach(function (d) { list.appendChild(dogCard(d, admin)); });
  }

  function dogCard(d, admin) {
    var facts = [d.age, d.breed].filter(Boolean).join(' · ');
    var canEdit = admin || d.review_status === 'pending';
    var head = el('div', { class: 'row', style: 'justify-content:space-between' }, [
      el('div', {}, [el('h3', { text: d.name }), el('div', { class: 'muted', text: [facts, admin ? d.shelter : ''].filter(Boolean).join(' · ') })]),
      statusBadge(d)
    ]);
    var story = d.story ? el('p', { text: d.story, style: 'white-space:pre-wrap;margin:10px 0 0' }) : el('p', { class: 'muted', text: 'No story yet.' });

    var grid = el('div', { class: 'photos' });
    (d.photos || []).forEach(function (p) { grid.appendChild(photoTile(d, p, admin)); });

    var acts = el('div', { class: 'row' });
    if (admin && d.review_status === 'pending') {
      acts.appendChild(el('button', { class: 'btn ok sm', type: 'button', text: '✓ Approve dog', onclick: function () { review('dog', d.id, 'approved', this); } }));
      acts.appendChild(el('button', { class: 'btn no sm', type: 'button', text: 'Reject', onclick: function () { review('dog', d.id, 'rejected', this); } }));
    }
    acts.appendChild(el('button', { class: 'btn light sm', type: 'button', text: '+ Add photos', onclick: function () { pickFor(d.id); } }));
    if (canEdit) acts.appendChild(el('button', { class: 'btn ghost sm', type: 'button', text: 'Edit details', onclick: function () { openForm(d); } }));
    if (admin && d.review_status === 'approved') {
      acts.appendChild(el('button', { class: 'btn ghost sm', type: 'button', text: d.active ? 'Hide from app (adopted)' : 'Show in app again',
        onclick: async function () { busy(this, true); try { await rpc('portal_set_dog_active', { p_id: d.id, p_active: !d.active }); await load(); } catch (e) { flash(nice(e)); busy(this, false); } } }));
    }
    if (!admin && !canEdit) acts.appendChild(el('span', { class: 'muted', text: 'To change a live dog\'s details, email hey@fursteps.com.' }));

    var upload = el('div', { id: 'up-' + d.id });
    return el('div', { class: 'card' }, [head, story, (d.photos || []).length ? grid : null, upload, acts]);
  }

  function photoTile(d, p, admin) {
    var kids = [p.url ? el('img', { src: p.url, alt: d.name + (p.caption ? ': ' + p.caption : ''), loading: 'lazy' }) : null];
    if (p.status === 'pending') kids.push(el('span', { class: 'badge b-pending', text: 'Waiting' }));
    if (admin && p.status === 'pending') {
      kids.push(el('div', { class: 'acts' }, [
        el('button', { type: 'button', text: '✓ Approve', style: 'background:#e6f4ec;color:#2f855a', onclick: function () { review('photo', p.id, 'approved', this); } }),
        el('button', { type: 'button', text: 'Reject', style: 'background:#fff;color:#a12b2b', onclick: function () { review('photo', p.id, 'rejected', this); } })
      ]));
    } else if (admin) {
      kids.push(el('div', { class: 'acts' }, [
        el('button', { type: 'button', text: 'Remove', style: 'background:#fff;color:#a12b2b', onclick: function () { if (confirmRemove()) review('photo', p.id, 'rejected', this); } })
      ]));
    }
    var tile = el('div', { class: 'ph', title: p.caption || '' }, kids);
    return tile;
  }
  function confirmRemove() { return window.confirm('Remove this photo from the app and delete the file?'); }

  async function review(kind, id, decision, btn) {
    busy(btn, true, '…');
    try {
      var path = await rpc('portal_review', { p_kind: kind, p_id: id, p_decision: decision });
      // Rejected photo files are deleted straight away (we keep only what we use).
      if (kind === 'photo' && decision === 'rejected' && path) await sb.storage.from(BUCKET).remove([path]);
      await load();
    } catch (e) { flash(nice(e)); busy(btn, false); }
  }

  // ---------- Add / edit a dog ----------
  $('add-dog').addEventListener('click', function () { openForm(null); });
  $('d-cancel').addEventListener('click', function () { show('dog-form', false); });
  $('d-story').addEventListener('input', function () { $('d-count').textContent = this.value.length + ' / 600'; });
  function openForm(d) {
    editing = d;
    $('dog-form-title').textContent = d ? 'Edit ' + d.name : 'Add a dog';
    $('d-name').value = d ? d.name : ''; $('d-age').value = d && d.age || ''; $('d-breed').value = d && d.breed || '';
    $('d-story').value = d && d.story || ''; $('d-count').textContent = $('d-story').value.length + ' / 600';
    var admin = me.role === 'admin';
    show('d-shelter-wrap', admin);
    if (admin) {
      var sel = $('d-shelter'); sel.innerHTML = '';
      sel.appendChild(el('option', { value: '', text: 'No shelter yet (test dog)' }));
      shelters.forEach(function (s) { var o = el('option', { value: s.id, text: s.name }); if (d && d.shelter_id === s.id) o.selected = true; sel.appendChild(o); });
    }
    show('dog-form', true); $('d-name').focus();
    $('dog-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  $('dog-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    var btn = $('d-save'); busy(btn, true, 'Saving…');
    try {
      var id = await rpc('portal_save_dog', {
        p_id: editing ? editing.id : null, p_name: $('d-name').value, p_age: $('d-age').value, p_breed: $('d-breed').value,
        p_story: $('d-story').value, p_shelter: me.role === 'admin' ? ($('d-shelter').value || null) : null
      });
      show('dog-form', false);
      flash(me.role === 'admin' ? 'Saved.' : 'Saved. FurSteps will check it before it appears in the app. Now add a photo.', 'info');
      if (me.role === 'admin' && tab === 'review') tab = 'dogs';
      await load();
      if (!editing) pickFor(id);
    } catch (err) { flash(nice(err)); }
    busy(btn, false);
  });

  // ---------- Photos: choose, shrink, strip hidden data, upload ----------
  var pickDog = null;
  function pickFor(dogId) { pickDog = dogId; $('file').value = ''; $('file').click(); }
  $('file').addEventListener('change', async function () {
    var files = Array.prototype.slice.call(this.files || [], 0, 10);
    if (!files.length || !pickDog) return;
    var box = $('up-' + pickDog); if (!box) return;
    box.innerHTML = ''; box.appendChild(el('p', { class: 'muted', text: 'Preparing photos…' }));
    var ready = [];
    for (var i = 0; i < files.length; i++) {
      try { ready.push(await shrink(files[i])); }
      catch (e) { flash('One photo could not be read. Please use JPG or PNG (on iPhone, "Most Compatible" camera format).'); }
    }
    pendingFiles[pickDog] = ready;
    renderUpload(pickDog);
  });

  function renderUpload(dogId) {
    var box = $('up-' + dogId), ready = pendingFiles[dogId] || [];
    box.innerHTML = '';
    if (!ready.length) return;
    var prev = el('div', { class: 'preview' });
    ready.forEach(function (r) { prev.appendChild(el('img', { src: r.url, alt: '' })); });
    var cap = el('input', { type: 'text', maxlength: '200', placeholder: 'Caption (optional), e.g. "Lima after her morning walk"' });
    var ok = el('input', { type: 'checkbox' });
    var go = el('button', { class: 'btn sm', type: 'button', text: 'Upload ' + ready.length + (ready.length > 1 ? ' photos' : ' photo'), disabled: 'disabled' });
    ok.addEventListener('change', function () { go.disabled = !ok.checked; });
    go.addEventListener('click', async function () {
      busy(go, true, 'Uploading…');
      try {
        for (var i = 0; i < ready.length; i++) {
          var path = 'dogs/' + dogId + '/' + crypto.randomUUID() + '.jpg';
          var up = await sb.storage.from(BUCKET).upload(path, ready[i].blob, { contentType: 'image/jpeg', upsert: false, cacheControl: '3600' });
          if (up.error) throw up.error;
          await rpc('portal_add_photo', { p_path: path, p_caption: cap.value, p_no_people: true });
        }
        pendingFiles[dogId] = [];
        flash(me.role === 'admin' ? 'Photos added and live.' : 'Thank you! FurSteps will check the photos before they appear in the app.', 'info');
        await load();
      } catch (e) { flash(nice(e)); busy(go, false); }
    });
    box.appendChild(el('div', { class: 'card', style: 'background:var(--bg)' }, [
      el('h3', { text: 'New photos' }), prev,
      el('p', { class: 'muted', text: 'Location and camera details have been removed from these copies.' }),
      cap,
      el('label', { class: 'check' }, [ok, el('span', { text: 'No identifiable people (faces, name tags, car number plates) are in these photos.' })]),
      el('div', { class: 'row' }, [go, el('button', { class: 'btn ghost sm', type: 'button', text: 'Cancel', onclick: function () { pendingFiles[dogId] = []; renderUpload(dogId); } })])
    ]));
  }

  // Draw the photo on a canvas and save a fresh JPEG: max 1600 px, no EXIF/GPS.
  function shrink(file) {
    return new Promise(function (resolve, reject) {
      var src = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var s = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
        var w = Math.round(img.naturalWidth * s), h = Math.round(img.naturalHeight * s);
        var c = document.createElement('canvas'); c.width = w; c.height = h;
        var ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(src);
        var q = 0.85;
        (function save() {
          c.toBlob(function (blob) {
            if (!blob) return reject(new Error('Could not process photo'));
            if (blob.size > MAX_BYTES && q > 0.5) { q -= 0.15; return save(); }
            resolve({ blob: blob, url: URL.createObjectURL(blob) });
          }, 'image/jpeg', q);
        })();
      };
      img.onerror = function () { URL.revokeObjectURL(src); reject(new Error('Unreadable image')); };
      img.src = src;
    });
  }

  // ---------- Admin: shelters ----------
  function renderShelters() {
    var box = $('shelters'); box.innerHTML = '';
    var name = el('input', { type: 'text', maxlength: '80', placeholder: 'e.g. Happy Paws Rescue' });
    var email = el('input', { type: 'email', placeholder: 'staff@happypaws.org.au' });
    var go = el('button', { class: 'btn', type: 'button', text: 'Save shelter' });
    go.addEventListener('click', async function () {
      busy(go, true, 'Saving…');
      try { await rpc('portal_save_shelter', { p_name: name.value, p_staff_email: email.value }); flash('Shelter saved. Staff can now sign in at fursteps.com/shelter with that email.', 'info'); await load(); }
      catch (e) { flash(nice(e)); busy(go, false); }
    });
    box.appendChild(el('div', { class: 'card' }, [
      el('h2', { text: 'Add a shelter or a staff member' }),
      el('p', { class: 'muted', text: 'Same shelter name again adds another staff email to it.' }),
      el('label', { text: 'Shelter name' }), name, el('label', { text: 'Staff email' }), email, el('p', {}, [go])
    ]));
    shelters.forEach(function (s) {
      box.appendChild(el('div', { class: 'card' }, [
        el('div', { class: 'row', style: 'justify-content:space-between' }, [
          el('h3', { text: s.name }),
          s.photo_permission_at ? el('span', { class: 'badge b-approved', text: 'Photo permission ✓ ' + new Date(s.photo_permission_at).toLocaleDateString('en-AU') })
                                : el('span', { class: 'badge b-pending', text: 'No photo permission yet' })
        ]),
        el('p', { class: 'muted', text: 'Staff: ' + ((s.staff || []).join(', ') || 'none') })
      ]));
    });
  }

  sb.auth.onAuthStateChange(function (ev) { if (ev === 'SIGNED_OUT') { me = null; } });
  boot();
})();
