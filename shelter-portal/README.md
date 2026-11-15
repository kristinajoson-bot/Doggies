# Shelter portal (fursteps.com/shelter)

Phone-friendly page where partner shelter staff add dogs, stories and photos, and the FurSteps admin approves them. Approved dogs and photos show in the app.

- Backend: `supabase-b2b/013_shelter_dog_photos.sql` (tables `shelters`, `portal_users`, `dog_photos`; private bucket `dog-photos`; `portal_*` functions).
- Deploy: copy `shelter.html` to the website root and `shelter-portal.js` + `supabase-2.119.0.js` (vendored, no CDN) to `/js/`. Fonts come from the website's `/fonts/`.
- Sign-in: emailed code. Only emails in `portal_users` get in (admin: kristina@fursteps.com; shelter staff added on the Shelters tab).
- Privacy: photos are re-drawn on a canvas (max 1600 px JPEG), which drops EXIF/GPS. Uploader confirms no identifiable people. Shelter records written photo permission once. Rejected photos are deleted. Nothing shows in the app until approved.

## Demo
`demo/` is a click-through copy with a sample shelter and dogs (in-browser only, nothing sent). Published privately: https://claude.ai/artifact/8zNPbsTE3x3mmyknheckzk. Uses `../shelter-portal.js` + `demo/demo-backend.js` + `demo/demo-bar.js`; sample dog images in `demo/img/`.
