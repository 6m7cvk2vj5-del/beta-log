# Beta Log

Personal climbing training log + AI workout generator. Standalone static PWA: `index.html` + `app.js` (+ `icon.png`). No backend, no build step.

- Storage: localStorage. The Anthropic API is called directly from the browser with the user's own key (entered in Settings; never commit a key).
- Layout: Home / Ask / Plan / Log tabs, plus a gear-icon Settings overlay.
- Copy principle: reads like a coach, not a cheerleader — functional, not warm/encouraging for its own sake.
- Established app in maintenance mode, not an early prototype.

## Repo and deploy

- This folder (iCloud "climing app") IS the git repo. Remote: `origin` = github.com/6m7cvk2vj5-del/beta-log, branch `main`.
- GitHub Pages publishes from `main` at `/` (legacy build). Pushing to `main` auto-deploys to https://6m7cvk2vj5-del.github.io/beta-log/. Do not change the Pages config.
- Ask before pushing to `main` (it deploys). Commit locally freely. See Sync rules below.
- Mac only: `node_modules` is a symlink to `node_modules.nosync` so iCloud doesn't sync it. Don't replace it with a real directory.

## Sync rules (GitHub is the source of truth)

Work happens from two places: Mac sessions (this iCloud folder) and phone/cloud sessions (a fresh clone of the repo). Neither sees the other's changes until they go through GitHub.

- Start of every Mac session: `git fetch`, and if `origin/main` has commits this checkout lacks, `git pull --ff-only` before doing anything. Tell the user what came in. If the pull can't fast-forward or the tree is dirty, stop and report — don't force anything.
- End of every Mac session (work verified per Testing below): commit, then offer to push. Pushing `main` deploys the live site, so ask first.
- Phone/cloud sessions: work on a branch (never `main`), push the branch, open a pull request. The user merges it after checking; the merge is what deploys. After a merge, the next Mac session picks it up via the start-of-session pull.

## Reviewing a change before it reaches main

Whenever asking the user to review a change before it goes to `main`, include a temporary link they can tap to look at it — don't just describe the change or offer a push.

- Build the preview with `python3 tools/make-preview.py <scratchpad dir>`. It strips the page wrappers the Artifact host adds itself, retitles the page "Beta Log Preview", and loads `tools/preview-seed.js` (labelled sample entries, only when the preview's storage is empty). Publish the built `index.html` as a private Artifact with the built `app.js` and `seed.js` passed through `files`. Re-publish the same file path on each revision so the link stays the same during a review.
- Put the link directly in the review request, with what changed in a sentence or two and the commit it reflects.
- Read `index.html` and `app.js` in full before publishing (they are the whole app). Never include an API key.
- The preview runs on a different origin from the live site, so it never has the real log or API key, and the Artifact sandbox blocks calls to api.anthropic.com. Plan generation, adjust and add-to-log (which calls the API) can't be exercised there; say so and verify those with jsdom instead.
- The link is for review only. Pushing `main` is still a separate, explicit ask.

## Docs

`docs/` holds generated documents of the exercise library, the coach deck and the training structure (markdown, SVG illustrations, a PDF). After changing exercises, drills, illustrations or the session model, regenerate with `node tools/export-library.js` (needs jsdom), then re-make the PDF. The `docs-library` branch carries a documents-only copy for viewing on GitHub.

## Two sessions in one folder

If another Claude session may be working in this same iCloud folder, don't switch branches here. Do the work in a separate worktree on its own branch (`git worktree add <dir> -b <branch> main`) and merge when finished.

## Git on this machine (Mac only)

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
- Keep test scripts small and single-purpose, run as separate `node -e` invocations with an explicit timeout. Combined scripts have hung in sandboxed environments. On macOS there is no `timeout`; use `perl -e 'alarm 60; exec @ARGV' node ...`.
- Before telling the user a change is done: run jsdom checks, then take real Playwright screenshots (mobile viewport, e.g. 390x844, saved to `screenshots/`, which is gitignored) and look at them.
- `node_modules` in this folder can contain iCloud-evicted ("dataless") files, which makes `require('jsdom')` block indefinitely. If a test hangs on load, install the dev dependencies outside iCloud (copy `package.json` and `package-lock.json` to a scratch dir, `npm ci`, point the loader at that jsdom) instead of touching `node_modules` here.

## Stash (Casey's workflow library: repo `6m7cvk2vj5-del/stash`)
Before you do any of these, check stash `INDEX.md` for a playbook, and read only the matching row:
starting a project or restructuring this CLAUDE.md · launching more than one session, worker or scheduled task · setting up a
branch/merge workflow · asking Casey questions (survey page) · verifying numbers a second way · giving Casey a preview link ·
hitting or planning around a usage limit · filing uploads/reference docs.
If stash is not attached, call `add_repo` (owner `6m7cvk2vj5-del`, repo `stash`, `access: "push"`) and then read it.
If stash has no row for what you need, follow its CLAUDE.md gap rule (log a `REQUESTED` row), tell Casey, and carry on.
When you learn something a future project would want, add one line to stash `LESSONS.md`.
