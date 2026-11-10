# 3D Scroll Journey Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A single-page "Developer's Journey" site. A 3D character walks along a path as the visitor scrolls (backwards when scrolling up) and passes 4 stations (Mobile → Web & Cloud → AI & Automation → Academic). Each station shows its projects. A rotating 3D phone shows the mobile app screenshots.

**Architecture:** Static site with no build step, in `journey/`, using ES modules loaded from a CDN. The scroll maths and data are pure modules covered by `node:test`. The Three.js scene and GSAP ScrollTrigger are thin layers on top, tested with Playwright smoke tests. The character is built from Three.js primitives (original, no external model needed). A GLB avatar (Ready Player Me + Mixamo walk) can replace it later through the same `Character` interface.

**Tech Stack:** Three.js `0.160.0` (`https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js` via importmap), GSAP `3.12.5` + ScrollTrigger (`https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js`, `.../ScrollTrigger.min.js`), vanilla JS/CSS, Node 22 `node:test`, the pre-installed `playwright` library (no npm install).

**Spec:** This session's ideas #1 ("Developer's Journey"), #3 (3D phone) and #6 (lightweight fallback), plus the project list in `ReadMe.md`.

## Global Constraints

- **Location:** `journey/` in this repo for now, served by GitHub Pages at `https://fuad2e3.github.io/Fuad2e3/journey/`. Moving it into the `Fuad2e3/Portfolio` repo later only means copying the folder, so no absolute paths. Every URL inside `journey/` is relative.
- No npm dependencies, no bundler. Opening `journey/index.html` through any static server must work.
- Page weight under 1.5 MB on first load, not counting CDN libs. Phone screenshots are WebP, max 720px tall.
- Use the colour tokens from the README: accent `#00C2FF`, AI `#8E75FF`, Flutter `#02569B`, background `#0B1020`.
- Content (station titles, project names, repo links) comes **only** from `journey/js/data.js`, copied from `ReadMe.md`.
- Station order and scroll ranges: Intro `0–0.08`, Mobile `0.08–0.32`, Web & Cloud `0.32–0.56`, AI & Automation `0.56–0.76`, Academic `0.76–0.94`, Contact `0.94–1`.

## Review Focus

1. **`prefers-reduced-motion: reduce`**: no camera fly-through. Show a static scene and normal readable sections (test `reduced motion shows static page`, Task 5).
2. **WebGL unavailable or a CDN blocked**: all project content stays readable as plain HTML. The canvas just doesn't appear (test `content readable without WebGL`, Task 5).
3. **Phone width 375px**: no horizontal scroll, and text cards don't cover the character (test `no horizontal overflow at 375px`, Task 5).
4. **Fast scroll / jump (Home, End, anchor link)**: the character jumps to the right spot on the path, not a long glide, and the walk cycle doesn't spin wildly (test `positionAt is pure in progress`, Task 1, plus `end key lands at contact`, Task 5).
5. **Window resize / device rotation**: the renderer and camera aspect update with no stretching (test `resize keeps aspect`, Task 5).

---

### Task 1: Journey data + pure scroll maths

**Files:**
- Create: `journey/js/data.js`
- Create: `journey/js/journey-math.js`
- Test: `journey/tests/journey-math.test.mjs`

**Interfaces:**
- Produces:
  - `STATIONS: Array<{ id: 'intro'|'mobile'|'web'|'ai'|'academic'|'contact', title: string, color: string, range: [number, number], projects: Array<{ name: string, desc: string, url: string, shot?: string }> }>`, exported from `data.js`
  - `clamp01(x: number) -> number`
  - `stationIndexAt(progress: number, stations) -> number` (index of the station whose `range` contains progress; the last one for `1`)
  - `localProgress(progress: number, station) -> number` (0..1 inside that station)
  - `walkPhase(progress: number, stepsPerJourney = 60) -> number` (radians, `progress * stepsPerJourney * 2π`)
  - `positionAt(progress: number, points: Array<[x,y,z]>) -> [x,y,z]` (linear interpolation along the polyline by arc length)

- [ ] **Step 1: Write failing tests** (`node:test`):
  - `ranges cover 0..1 without gaps`: the `range`s are contiguous, start at 0 and end at 1.
  - `project counts match README`: mobile 9, web 11, ai 5, academic 15.
  - `stationIndexAt`: `0 → 0`, `0.1 → 1`, `0.5 → 2`, `0.6 → 3`, `0.8 → 4`, `1 → 5`, `-0.2 → 0`, `1.4 → 5`.
  - `localProgress`: mobile station at `0.2` → `0.5`.
  - `positionAt is pure in progress`: `positionAt(0.5, [[0,0,0],[10,0,0]])` deep-equals `[5,0,0]`; calling it with `0.9` and then `0.5` gives the same `[5,0,0]`; `positionAt(0, pts)` = the first point and `positionAt(1, pts)` = the last.
  - `walkPhase(0.5, 60)` ≈ `60π`.
- [ ] **Step 2: Run** `node --test journey/tests/` → FAIL (modules missing).
- [ ] **Step 3: Implement** `data.js` (copy names, descriptions and URLs from `ReadMe.md`; `shot` only for the mobile apps, path `assets/shots/<id>.webp`) and `journey-math.js`.
- [ ] **Step 4: Run** `node --test journey/tests/` → PASS.
- [ ] **Step 5: Commit** `feat(journey): add station data and scroll maths`.

### Task 2: Semantic page + fallback content

**Files:**
- Create: `journey/index.html`
- Create: `journey/css/style.css`
- Create: `journey/js/render-sections.js`
- Test: `journey/tests/smoke.test.mjs` (Playwright, via `node:test`)
- Create: `journey/tests/serve.mjs` (tiny `node:http` static server, `startServer(root) -> Promise<{url, close}>`)

**Interfaces:**
- Consumes: `STATIONS` (Task 1).
- Produces: `renderSections(root: HTMLElement, stations) -> void`, which writes one `<section id="station-<id>" class="station">` per station with an `<h2>` and a project `<ul>` of `<a>` cards. `index.html` contains `<canvas id="scene" aria-hidden="true">` and `<main id="content">`.

- [ ] **Step 1: Write failing smoke tests** (Chromium, viewport 1280×800):
  - `sections render`: 6 `.station` elements; 40 project links in total.
  - `content readable without WebGL`: launch with `--disable-webgl --disable-3d-apis`, so `#station-mobile h2` is visible and the page shows no uncaught errors.
  - `no horizontal overflow at 375px`: `document.documentElement.scrollWidth <= 375`.
- [ ] **Step 2: Run** `node --test journey/tests/smoke.test.mjs` → FAIL.
- [ ] **Step 3: Implement.** Each `.station` has `min-height: 100vh` and a glass-style card (`backdrop-filter: blur(12px)`) aligned left on desktop and at the bottom on mobile (`max-width: 640px` breakpoint). The canvas is `position: fixed; inset: 0; z-index: -1`. Fonts: Poppins via Google Fonts.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(journey): semantic sections with no-WebGL fallback`.

### Task 3: 3D world, path and character

**Files:**
- Create: `journey/js/world.js`
- Create: `journey/js/character.js`
- Create: `journey/js/main.js`

**Interfaces:**
- Consumes: `STATIONS`, `positionAt`, `walkPhase`, `stationIndexAt` (Task 1).
- Produces:
  - `createWorld(scene, stations) -> { pathPoints: Array<[x,y,z]>, setActiveStation(i: number): void }`. A ground with a glowing path line (`#00C2FF`), one low-poly landmark per station (Mobile: tall phone slab, Web: cloud of cubes, AI: icosahedron "brain" in `#8E75FF`, Academic: stack of books, Contact: portal ring). `setActiveStation` makes that landmark's emissive glow stronger.
  - `createCharacter() -> { group: THREE.Group, update(phase: number, speed: number): void }`. Body made of capsule/box primitives (head, torso, 2 arms, 2 legs on pivot groups). Legs swing `±0.6 rad` and arms `±0.4 rad` with `sin(phase)`. `speed` 0 blends the limbs back to the rest pose in ~200ms.
  - `main.js` exports `start(canvas) -> { setProgress(p: number): void, dispose(): void }`. It places the character at `positionAt(p)`, turns it to face the next point (yaw from the direction it is heading, flipped when p goes down, so it walks backwards facing back), and keeps the camera behind and above the character (`offset [0, 3, 7]`, lerp 0.1).
- [ ] **Step 1: Write failing test** in `smoke.test.mjs`: `scene boots`: canvas has non-zero width; `window.__journey` exposes `setProgress`; after `setProgress(0.5)` the pixel at the canvas centre is not the clear colour (read via `toDataURL` on a 1-frame render with `preserveDrawingBuffer: true` in test mode `?test=1`).
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** In `index.html`, an importmap points `three` to the pinned CDN URL. Renderer: `antialias`, `setPixelRatio(Math.min(devicePixelRatio, 2))`, ACES tone mapping, one hemisphere light and one directional light, fog matching the background. If WebGL context creation fails, `start` returns `null` and the page stays in fallback mode.
- [ ] **Step 4: Run** → PASS. Take a scratchpad screenshot at p = 0.2 and 0.7 and look at it: character visible, landmark visible.
- [ ] **Step 5: Commit** `feat(journey): 3D path, landmarks and walking character`.

### Task 4: Scroll binding + 3D phone

**Files:**
- Create: `journey/js/scroll.js`
- Create: `journey/js/phone.js`
- Modify: `journey/js/main.js`
- Create: `journey/assets/shots/*.webp` (user supplies the screenshots; until then a generated gradient placeholder per app with its name)

**Interfaces:**
- Consumes: `start()` from Task 3, `localProgress` from Task 1.
- Produces:
  - `bindScroll(onProgress: (p: number) => void) -> () => void` (unbind). Uses `ScrollTrigger.create({ trigger: '#content', start: 'top top', end: 'bottom bottom', scrub: 0.6, onUpdate: s => onProgress(s.progress) })`.
  - `createPhone(scene, shots: string[]) -> { group, update(local: number): void }`. Rounded box phone. Its screen texture switches to `shots[Math.floor(local * shots.length)]` and the phone turns `local * 2π` about Y. Visible only while the Mobile station is active.
- [ ] **Step 1: Write failing tests:**
  - `scroll drives character`: scroll to the middle of `#station-web`, wait 800ms, `__journey.state().station === 'web'`.
  - `end key lands at contact`: press `End`, wait 1000ms → `station === 'contact'` and `progress > 0.95`.
  - `scroll up walks backwards`: from the web station scroll up 400px → `state().facing === -1`.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** `__journey.state()` returns `{ progress, station, facing }` (test mode only). Fast jumps: if `|Δp| > 0.15` in one update, snap the position and do not run the walk cycle for that frame.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(journey): scroll-driven walk and rotating phone showcase`.

### Task 5: Accessibility, resize, performance

**Files:**
- Modify: `journey/js/main.js`, `journey/css/style.css`
- Test: `journey/tests/smoke.test.mjs`

- [ ] **Step 1: Write failing tests:**
  - `reduced motion shows static page`: context `reducedMotion: 'reduce'` → `state().animating === false`, and `#content` sections have no `transform`.
  - `resize keeps aspect`: resize the viewport 1280×800 → 600×900; camera `aspect` ≈ `600/900` (exposed through `state().aspect`).
  - `keyboard reachable`: Tab reaches the first project link and it shows a visible focus ring (`outline-style` not `none`).
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** Reduced motion: render one frame at p = 0 and skip `bindScroll`. Resize through `ResizeObserver` on the canvas. Pause the render loop on `visibilitychange` hidden. Cap at 60fps.
- [ ] **Step 4: Run** the full suite `node --test journey/tests/` → PASS.
- [ ] **Step 5: Commit** `feat(journey): reduced-motion, resize and focus handling`.

### Task 6: Deploy + README preview

**Files:**
- Create: `.github/workflows/pages.yml`
- Create: `assets/journey-preview.gif` (in repo root `assets/`, used by the README plan, Task 5)
- Create: `journey/tests/record-preview.mjs`

**Interfaces:**
- Produces: live URL `https://fuad2e3.github.io/Fuad2e3/journey/` and `assets/journey-preview.gif` (800×450, ≤ 4 MB, ~6s loop).

- [ ] **Step 1: `pages.yml`.** On push to the default branch + `workflow_dispatch`. `permissions: pages: write, id-token: write`. `actions/upload-pages-artifact@v3` with `path: .`, then `actions/deploy-pages@v4`. (User enables *Settings → Pages → Source: GitHub Actions* once.)
- [ ] **Step 2: `record-preview.mjs`.** Playwright with `recordVideo` at 800×450 scrolls from 0 to the end over 6s. Convert to GIF with `ffmpeg -vf "fps=15,scale=800:-1:flags=lanczos,palettegen/paletteuse"` (if `ffmpeg` is missing, install it with `apt-get install -y ffmpeg`).
- [ ] **Step 3: Verify:** `ls -lh assets/journey-preview.gif` shows a file under 4 MB. Open it in the scratchpad viewer: the character walks across at least two stations.
- [ ] **Step 4: Commit** `ci: deploy journey to GitHub Pages and add preview GIF`.
- [ ] **Step 5:** Run README plan Task 5 with the live URL.
