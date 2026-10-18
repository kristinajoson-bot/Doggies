# Walkies front-end tests

These drive the real `app/index.html` in headless Chromium against a stateful fake of the backend (`stepsharness.mjs`). They do not touch the real Supabase project.

```
# 1. serve the app
cd app && python3 -m http.server 4174 &

# 2. run a test (the argument is a folder for screenshots; it must exist)
cd tests && mkdir -p shots && node packwar.mjs shots
```

Each test prints `PASS` / `FAIL` lines and `N of M passed`. Run them all with `for t in *.mjs; do [ $t = stepsharness.mjs ] || node $t shots; done` (a few are screenshot helpers: `treeshot`, `hit`, `limadog`).

Environment: Playwright is expected at `/opt/node22/lib/node_modules/playwright` and Chromium at `/opt/pw-browsers/chromium`. Override with `PLAYWRIGHT_MODULE` and `CHROMIUM_PATH`.

How the harness works: `open({ seed, setup, ... })` starts a phone-sized page with a fake signed-in user, serves canned REST/RPC responses, and lets a test add or override routes with `setup(page, db)` (`page.route("**/rpc/<name>", ...)`). Any RPC a test does not mock returns `[]`. Demo views (`?preview=capitals|worldcup|quarters`) need no mocks.

Known: `scopetest` was never ported here (it needed an environment variable that is not available).
