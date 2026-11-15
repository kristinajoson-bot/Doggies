// DEMO ONLY: stands in for Supabase so the shelter portal can be shown on a call.
// Everything lives in this browser tab (sessionStorage). Nothing is sent anywhere.
(function () {
  'use strict';
  var KEY = 'fursteps-portal-demo';
  window.confirm = function () { return true; }; // the demo viewer blocks pop-ups
  function fresh() {
    return {
      role: 'shelter', signedIn: false, perm: null, n: 10,
      shelters: [{ id: 's1', name: 'Demo Paws Rescue', photo_permission_at: null, staff: ['you@demopawsrescue.org.au'] }],
      files: { 'p-lima': '/shelter-demo/img/lima-1.jpg', 'p-lima2': '/shelter-demo/img/lima-2.jpg', 'p-cusco': '/shelter-demo/img/cusco-1.jpg', 'p-pepper': '/shelter-demo/img/pepper-1.jpg' },
      dogs: [
        { id: 'd1', slug: 'lima', name: 'Lima', age: '5 years', breed: 'Maltese cross', story: 'Lima loves sunny spots, squeaky toys and a slow sniffy walk. She came to us after her owner moved into care.', shelter: 'Demo Paws Rescue', shelter_id: 's1', review_status: 'approved', active: true,
          photos: [{ id: 'ph1', path: 'p-lima', status: 'approved' }, { id: 'ph2', path: 'p-lima2', status: 'approved' }] },
        { id: 'd2', slug: 'cusco', name: 'Cusco', age: '1 year', breed: 'Pomeranian', story: 'Cusco is a fluffy ball of energy who thinks every visitor is here to play with him.', shelter: 'Demo Paws Rescue', shelter_id: 's1', review_status: 'approved', active: true,
          photos: [{ id: 'ph3', path: 'p-cusco', status: 'approved' }] },
        { id: 'd3', slug: 'pepper', name: 'Pepper', age: 'About 3 years', breed: 'Shih Tzu cross', story: 'Pepper was shy when she arrived. Now she greets every volunteer with a full-body wiggle.', shelter: 'Demo Paws Rescue', shelter_id: 's1', review_status: 'pending', active: true,
          photos: [{ id: 'ph4', path: 'p-pepper', status: 'pending' }] }
      ]
    };
  }
  var st;
  try { st = JSON.parse(sessionStorage.getItem(KEY)) || fresh(); } catch (e) { st = fresh(); }
  function save() { try { sessionStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* tab storage full: keep in memory */ } }
  function id() { st.n++; return 'x' + st.n; }
  function wait(v) { return new Promise(function (r) { setTimeout(function () { r(v); }, 250); }); }
  function err(m) { return wait({ data: null, error: { message: m } }); }
  function findDog(i) { return st.dogs.filter(function (d) { return d.id === i; })[0]; }
  function allPhotos() { var a = []; st.dogs.forEach(function (d) { d.photos.forEach(function (p) { a.push({ d: d, p: p }); }); }); return a; }

  window.DEMO = {
    view: function (role) { st.role = role; save(); location.reload(); },
    reset: function () { sessionStorage.removeItem(KEY); location.reload(); },
    role: function () { return st.role; }
  };

  var rpcs = {
    portal_me: function () {
      return st.role === 'admin'
        ? [{ email: 'kristina@fursteps.com', role: 'admin' }]
        : [{ email: 'you@demopawsrescue.org.au', role: 'shelter', shelter_id: 's1', shelter_name: 'Demo Paws Rescue', photo_permission_at: st.shelters[0].photo_permission_at }];
    },
    portal_list_shelters: function () { return st.shelters; },
    portal_list_dogs: function () {
      return st.dogs.map(function (d) { var c = JSON.parse(JSON.stringify(d)); c.photos = c.photos.filter(function (p) { return p.status !== 'rejected'; }); return c; })
        .sort(function (a, b) { return (b.review_status === 'pending') - (a.review_status === 'pending') || a.name.localeCompare(b.name); });
    },
    portal_save_shelter: function (a) {
      if (!a.p_name || !a.p_name.trim()) throw 'Shelter name must be 1 to 80 characters';
      var s = st.shelters.filter(function (x) { return x.name.toLowerCase() === a.p_name.trim().toLowerCase(); })[0];
      if (!s) { s = { id: id(), name: a.p_name.trim(), photo_permission_at: null, staff: [] }; st.shelters.push(s); }
      if (a.p_staff_email && a.p_staff_email.trim()) s.staff.push(a.p_staff_email.trim().toLowerCase());
      return s.id;
    },
    portal_give_photo_permission: function () { st.shelters[0].photo_permission_at = new Date().toISOString(); return null; },
    portal_save_dog: function (a) {
      var name = (a.p_name || '').trim();
      if (!name || name.length > 40) throw 'Name must be 1 to 40 characters';
      var admin = st.role === 'admin', status = admin ? 'approved' : 'pending';
      if (a.p_id) {
        var d = findDog(a.p_id);
        if (!admin && d.review_status === 'approved') throw 'This dog is live. Email hey@fursteps.com with changes';
        d.name = name; d.age = a.p_age || null; d.breed = a.p_breed || null; d.story = a.p_story || null; d.review_status = status;
        return d.id;
      }
      var nd = { id: id(), slug: name.toLowerCase(), name: name, age: a.p_age || null, breed: a.p_breed || null, story: a.p_story || null,
        shelter: 'Demo Paws Rescue', shelter_id: 's1', review_status: status, active: true, photos: [] };
      st.dogs.push(nd); return nd.id;
    },
    portal_add_photo: function (a) {
      var dogId = a.p_path.split('/')[1], d = findDog(dogId);
      if (st.role !== 'admin' && !st.shelters[0].photo_permission_at) throw 'Please give photo permission first';
      var p = { id: id(), path: a.p_path, caption: a.p_caption || null, status: st.role === 'admin' ? 'approved' : 'pending' };
      d.photos.push(p); return p.id;
    },
    portal_review: function (a) {
      if (st.role !== 'admin') throw 'Admins only';
      if (a.p_kind === 'dog') { findDog(a.p_id).review_status = a.p_decision; return null; }
      var hit = allPhotos().filter(function (x) { return x.p.id === a.p_id; })[0];
      hit.p.status = a.p_decision; return hit.p.path;
    },
    portal_set_dog_active: function (a) { findDog(a.p_id).active = a.p_active; return null; }
  };

  window.supabase = { createClient: function () {
    return {
      auth: {
        getSession: function () { return wait({ data: { session: st.signedIn ? { demo: true } : null } }); },
        signInWithOtp: function () { return wait({ data: {}, error: null }); },
        verifyOtp: function () { st.signedIn = true; save(); return wait({ data: {}, error: null }); },
        signOut: function () { st.signedIn = false; save(); return wait({}); },
        onAuthStateChange: function () {}
      },
      rpc: function (name, args) {
        try { var data = rpcs[name](args || {}); save(); return wait({ data: data, error: null }); }
        catch (e) { return err(String(e)); }
      },
      storage: { from: function () { return {
        upload: function (path, blob) {
          return new Promise(function (resolve) {
            var r = new FileReader();
            r.onload = function () { st.files[path] = r.result; save(); resolve({ data: { path: path }, error: null }); };
            r.readAsDataURL(blob);
          });
        },
        createSignedUrls: function (paths) { return wait({ data: paths.map(function (p) { return { path: p, signedUrl: st.files[p] }; }) }); },
        remove: function (paths) { paths.forEach(function (p) { delete st.files[p]; }); save(); return wait({ data: [] }); }
      }; } }
    };
  } };
})();
