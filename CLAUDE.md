# Beta Log

Personal climbing training log + AI workout generator. Standalone static PWA: `index.html` + `app.js` (+ `icon.png`). No backend, no build step.

- Storage: localStorage. The Anthropic API is called directly from the browser with the user's own key (entered in Settings; never commit a key).
- Layout: Home / Ask / Plan / Log tabs, plus a gear-icon Settings overlay.
- Copy principle: reads like a coach, not a cheerleader — functional, not warm/encouraging for its own sake.
- Established app in maintenance mode, not an early prototype.

## Repo and deploy

- This folder (iCloud "climing app") IS the git repo. Remote: `origin` = github.com/6m7cvk2vj5-del/beta-log, branch `main`.
- GitHub Pages publishes from `main` at `/` (legacy build). Pushing to `main` auto-deploys to https://6m7cvk2vj5-del.github.io/beta-log/. Do not change the Pages config.
- Ask before pushing. Commit locally freely.
- `node_modules` is a symlink to `node_modules.nosync` so iCloud doesn't sync it. Don't replace it with a real directory.

## Git on this machine

Apple's Command Line Tools are unavailable for this macOS version, so `/usr/bin/git` is a non-working stub. Use the portable git at `~/.local/bin/git` (wraps dugite's git in `~/.local/git-portable`). Put it on PATH first:

```
export PATH=~/.local/bin:$PATH
```

Repo-local git config already sets the identity (GitHub noreply address) and `gh auth git-credential` as the credential helper.

## Testing

Dev dependencies: jsdom (fast logic tests) and Playwright + Chromium (real-browser screenshots). `tests/load-app.js` exports `loadApp()`, which boots index.html + app.js in jsdom with a non-opaque origin so localStorage works.

Conventions — each came from a real bug:

- Seed test data through the app's public functions (`submitLog`, `setLogType`, ...), never by mutating `App.entries` directly — that bypasses `saveEntries()`'s memoization cache invalidation and gives stale results.
- Re-fetch DOM element references after every `App.render()` — innerHTML replacement detaches old nodes.
- Simulate timer time by setting `App.ui.timer.endTime`. Never reassign `Date.now` — it hangs jsdom irrecoverably here.
- Always pass `pretendToBeVisual: true` to jsdom (loadApp already does).
- Keep test scripts small and single-purpose, run as separate `node -e` invocations with an explicit timeout. Combined scripts have hung in sandboxed environments. macOS has no `timeout`; use `perl -e 'alarm 60; exec @ARGV' node ...`.
- Before telling the user a change is done: run jsdom checks, then take real Playwright screenshots (mobile viewport, e.g. 390x844, saved to `screenshots/`, which is gitignored) and look at them.
