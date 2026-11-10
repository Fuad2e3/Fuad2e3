# Profile README Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the content problems found in the scan of `ReadMe.md` and give the profile animated and 3D visuals that render on GitHub.

**Architecture:** Everything stays in this repo (`Fuad2e3/Fuad2e3`). A zero-dependency Node script (`scripts/check-readme.mjs`) checks the README's rules and works as the test for every task. Two GitHub Actions generate the 3D contribution graph and the snake animation on a daily schedule. A hand-made animated SVG adds a moving developer character to the header.

**Tech Stack:** Markdown/HTML (GitHub-flavoured), Node 22 (`node:test`, no npm deps), GitHub Actions (`yoshi389111/github-profile-3d-contrib@0.7.1`, `Platane/snk@v3`), SVG + CSS keyframes.

**Spec:** The scan findings and ideas in this session's conversation (items 1–12 and the README table of "3D Contribution Graph / Snake / Animated SVG / GIF").

## Global Constraints

- GitHub sanitises README HTML: no `<script>`, no `<style>`, no `style=` attributes. Motion only through images (SVG with inline CSS/SMIL, GIF).
- Animated SVGs must be referenced as `<img src="...">` (GitHub serves them via camo; inline `<svg>` is stripped).
- Project numbering stays continuous `1..N`, and the "Total_Repositories-N_Projects" badge and each section heading's "(N Projects)" must equal the row counts.
- **Default decision, confirm with user:** keep **Data Miner** (#9), so N = 40.
- **Default decision, confirm with user:** use `1.jpg` as the round avatar at the top of the README.
- Every `<img>` in the README has a non-empty `alt`.
- No dependency on `github-readme-stats.vercel.app` (public instance is rate-limited).
- Commit messages follow `type: summary` (feat/fix/docs/chore/ci); never a bare `.`.

## Review Focus

1. **Dark vs light GitHub theme**: the animated SVG and 3D graph must be readable on both. Use `<picture>` with `prefers-color-scheme` sources where the Action provides both variants.
2. **First Action run before the images exist**: README points at `profile-3d-contrib/*.svg` and the `output` branch, which are only created by the first workflow run, so the README shows broken images until then. Trigger both workflows with `workflow_dispatch` right after merge.
3. **Mobile GitHub app width (~375px)**: wide tables scroll sideways. Images must use `width="100%"` or a percentage so they shrink.
4. **Renumbering drift**: if a project is added or removed later, counts in the badge and headings go stale. `check-readme.mjs` must catch this (Task 1 test `counts match`).
5. **Action permissions**: the default `GITHUB_TOKEN` cannot push without `permissions: contents: write`, so the workflow fails silently on schedule. Each workflow declares it.

---

### Task 1: README rule checker

**Files:**
- Create: `scripts/check-readme.mjs`
- Create: `scripts/check-readme.test.mjs`

**Interfaces:**
- Produces: `checkReadme(markdown: string) -> string[]` (list of problems; empty = OK), exported from `scripts/check-readme.mjs`. Running the file directly (`node scripts/check-readme.mjs`) reads `ReadMe.md`, prints problems, exits 1 if any.

- [ ] **Step 1: Write the failing tests** in `scripts/check-readme.test.mjs` using `node:test` + `node:assert`:
  - `counts match`: a fixture with badge `Total_Repositories-3_Projects`, heading `(2 Projects)` over 2 rows and `(1 Projects)` over 1 row → `[]`; changing the badge to `4_Projects` → result contains a string including `badge says 4, found 3`.
  - `numbering continuous`: rows numbered `1, 2, 4` → contains `numbering gap after 2`.
  - `img alt required`: `<img src="x.svg" />` → contains `img without alt: x.svg`.
  - `banned host`: any `github-readme-stats.vercel.app` URL → contains `banned host: github-readme-stats.vercel.app`.
  - `avatar used`: README without `1.jpg` → contains `avatar 1.jpg not referenced`.
  - `real README passes` (added at the end of Task 3, marked `todo` until then): `checkReadme(readFileSync('ReadMe.md','utf8'))` deep-equals `[]`.
- [ ] **Step 2: Run** `node --test scripts/` → FAIL (`checkReadme` not exported).
- [ ] **Step 3: Implement `checkReadme`.** Rows are table lines matching `^\| (\d+) \|`. Section counts come from `^## .*\((\d+) Projects\)$` headings, each followed by rows until the next `## `. Use a plain regex scan, no markdown parser.
- [ ] **Step 4: Run** `node --test scripts/` → PASS. Run `node scripts/check-readme.mjs` → expect it to **list the current README's problems** (missing alts, banned host, avatar), exit 1.
- [ ] **Step 5: Commit** `test: add README rule checker`.

### Task 2: Content fixes

**Files:**
- Modify: `ReadMe.md` (About Me, Tech Stack, Featured cards, header)

**Interfaces:**
- Consumes: `node scripts/check-readme.mjs` from Task 1.

- [ ] **Step 1: Header avatar.** Add above the `<h1>`: `<p align="center"><img src="1.jpg" width="120" alt="Abdullah Al Fuad" /></p>`. GitHub does not round it; that is accepted.
- [ ] **Step 2: Grammar.** Replace the About sentence with: *"With extensive experience in **Flutter cross-platform engineering**, **Node.js/Express** and **Cloudflare edge infrastructure**, I transform ideas into reliable, user-centric software solutions across mobile, web, and cloud."*
- [ ] **Step 3: Stack consistency.**
  - About bullet "Web & Cloud" → `Node.js, Express.js, FastAPI, PHP, React, Cloudflare Workers/Pages/D1/R2, REST APIs`.
  - Skill icons URL: add `php` after `fastapi`.
  - Backend table row: add `` `PHP` ``. Add a new "Frontend" row: `` `React` `HTML5` `CSS3` `JavaScript` ``.
- [ ] **Step 4: DeenSphere card.** Add the MySQL badge (same markup as the Smart Homeopathy card) after the Node.js badge.
- [ ] **Step 5: Alt text.** Every badge `<img>` in Featured cards gets `alt="<Tech name>"`; every "View/Demo" button gets `alt="<Project> demo repository"` / `alt="<Project> live website"`.
- [ ] **Step 6: Run** `node scripts/check-readme.mjs` → only remaining problem: `banned host: github-readme-stats.vercel.app` (fixed in Task 3).
- [ ] **Step 7: Commit** `docs: fix about-me grammar, stack consistency and image alt text`.

### Task 3: 3D contribution graph + snake (GitHub Actions)

**Files:**
- Create: `.github/workflows/profile-3d.yml`
- Create: `.github/workflows/snake.yml`
- Modify: `ReadMe.md` (sections "📊 GitHub Analytics" and "📈 GitHub Contribution Activity")
- Modify: `scripts/check-readme.test.mjs` (un-`todo` `real README passes`)

**Interfaces:**
- Produces (after first run): `profile-3d-contrib/profile-night-rainbow.svg` and `profile-3d-contrib/profile-gitblue.svg` on the default branch; `github-snake.svg` and `github-snake-dark.svg` on branch `output`.

- [ ] **Step 1: `profile-3d.yml`.** Triggers: `schedule: cron "17 18 * * *"` (00:17 Asia/Dhaka) + `workflow_dispatch`. `permissions: contents: write`. Steps: `actions/checkout@v4`, `yoshi389111/github-profile-3d-contrib@0.7.1` with `env: GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}, USERNAME: ${{ github.repository_owner }}`, then commit `profile-3d-contrib/` as `github-actions[bot]` with message `chore: update 3D contribution graph` (skip commit when no diff).
- [ ] **Step 2: `snake.yml`.** Same triggers/permissions. `Platane/snk@v3` with `github_user_name: ${{ github.repository_owner }}` and outputs `dist/github-snake.svg` and `dist/github-snake-dark.svg?palette=github-dark`; publish `dist` to branch `output` with `crazy-max/ghaction-github-pages@v4` (`target_branch: output`, `build_dir: dist`).
- [ ] **Step 3: README Analytics.** Delete both `github-readme-stats.vercel.app` images. Put the 3D graph in their place inside `<picture>`: `<source media="(prefers-color-scheme: dark)" srcset="profile-3d-contrib/profile-night-rainbow.svg">`, fallback `<img src="profile-3d-contrib/profile-gitblue.svg" width="100%" alt="3D GitHub contribution graph">`. Keep the streak-stats image (add `alt`).
- [ ] **Step 4: README Contribution Activity.** Replace the `ghchart.rshah.org` image with a `<picture>` of the snake: dark `https://raw.githubusercontent.com/Fuad2e3/Fuad2e3/output/github-snake-dark.svg`, light `.../output/github-snake.svg`, `width="100%"`, `alt="Snake eating my contribution graph"`.
- [ ] **Step 5: Run** `node --test scripts/` and `node scripts/check-readme.mjs` → PASS / exit 0.
- [ ] **Step 6: Validate YAML:** `python3 -c "import yaml;[yaml.safe_load(open(f'.github/workflows/{f}.yml')) for f in ('profile-3d','snake')]"` → no error.
- [ ] **Step 7: Commit** `ci: generate 3D contribution graph and snake animation`.
- [ ] **Step 8 (after merge to default branch, user or agent):** run both workflows once via *Actions → Run workflow*; confirm the images render on github.com/Fuad2e3.

### Task 4: Animated developer character (SVG)

**Files:**
- Create: `assets/dev-coding.svg`
- Modify: `ReadMe.md` (header, under the typing SVG)

- [ ] **Step 1: Draw `assets/dev-coding.svg`** (viewBox `0 0 600 220`, under 15 KB, original artwork): a flat-shaded isometric desk with a laptop and a seated character. Motion via `<style>` keyframes inside the SVG:
  - `type`: hands move up and down by 3px, 0.4s loop
  - `blink`: eyes scaleY to 0.1 for 0.15s every 4s
  - `code`: three code lines on the laptop screen grow left-to-right then reset, 3s loop, using colours `#00C2FF`, `#8E75FF`, `#34D399`
  - `float`: Flutter, Dart and Cloudflare-coloured cubes float above the laptop with an 8px bob, 3s loop, staggered by 1s
  - Background transparent; outlines `#94A3B8`, so it reads on light and dark themes.
  - `@media (prefers-reduced-motion: reduce) { * { animation: none } }`.
- [ ] **Step 2: Verify render.** Use a Playwright script in the scratchpad: open the SVG file, wait 1s, screenshot at frames 0s and 1.5s on white and `#0d1117` backgrounds, then compare the two frames by eye: they should differ, and the art should be visible on both backgrounds.
- [ ] **Step 3: README.** Under the typing SVG: `<p align="center"><img src="assets/dev-coding.svg" width="80%" alt="Animated developer coding at a desk" /></p>`.
- [ ] **Step 4: Run** `node scripts/check-readme.mjs` → exit 0.
- [ ] **Step 5: Commit** `feat: add animated developer illustration to profile header`.

### Task 5: Link the 3D Journey site (after the journey plan ships)

**Files:**
- Modify: `ReadMe.md` (after the badges row)

**Interfaces:**
- Consumes: the deployed URL and `assets/journey-preview.gif` produced by plan `2026-11-10-3d-scroll-journey.md`, Task 6.

- [ ] **Step 1:** Add a centred clickable preview: `<a href="<journey URL>"><img src="assets/journey-preview.gif" width="100%" alt="3D scroll journey preview – click to open" /></a>`, plus a `Live-3D_Journey` shields badge.
- [ ] **Step 2: Run** `node scripts/check-readme.mjs` → exit 0.
- [ ] **Step 3: Commit** `docs: link 3D scroll journey from profile`.
