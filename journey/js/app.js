import { STATIONS } from './data.js';
import { renderSections, renderDots, setActiveDot } from './render-sections.js';
import { bindScroll, revealCards } from './scroll.js';
import { localProgress, positionAt, stationIndexAt } from './journey-math.js';
import { watchTheme } from './theme.js';

const test = new URLSearchParams(location.search).has('test');
const dots = document.getElementById('dots');

renderSections(document.getElementById('content'), STATIONS);
renderDots(dots, STATIONS);
setActiveDot(dots, STATIONS[0].id);

let api = null;
try {
  const [{ start }, { createPhone }, { rightAt }] = await Promise.all([import('./main.js'), import('./phone.js'), import('./world.js')]);
  const mobile = STATIONS.find((s) => s.id === 'mobile');
  const mobileCards = document.querySelectorAll('#station-mobile .project');
  const phoneExtra = ({ scene, pathPoints }) => {
    const phone = createPhone(scene, mobile.projects, '#00C2FF');
    let lastIndex = -1;
    return (t, dt, { p, station }) => {
      // float beside the hero, slightly ahead and to the right of the road
      const ahead = positionAt(Math.min(1, p + 0.012), pathPoints);
      const r = rightAt(p, pathPoints);
      phone.group.position.x += (ahead[0] + r.x * 2.4 - phone.group.position.x) * Math.min(1, dt * 6);
      phone.group.position.z += (ahead[2] + r.z * 2.4 - phone.group.position.z) * Math.min(1, dt * 6);
      phone.update(localProgress(p, mobile), station === 'mobile', t, dt);
      const i = station === 'mobile' ? phone.index : -1;
      if (i !== lastIndex) {
        mobileCards.forEach((c, k) => c.classList.toggle('current', k === i));
        lastIndex = i;
      }
    };
  };
  api = start(document.getElementById('scene'), {
    stations: STATIONS,
    test,
    onStation: (id) => setActiveDot(dots, id),
    extras: [phoneExtra],
    photoUrl: 'assets/me.jpg',
    onLost: () => document.body.classList.add('no-webgl'),
  });
} catch (err) {
  console.warn('3D journey unavailable, showing the plain page.', err);
}
if (!api) document.body.classList.add('no-webgl');

watchTheme((name) => {
  document.documentElement.dataset.theme = name;
  api?.setTheme(name);
});

const sections = [...document.querySelectorAll('.station')];
const bar = document.getElementById('progress-bar');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (api && reduced) {
  api.stopAnimating();
  api.renderOnce(0);
}
let shownStation = null;
bindScroll((p) => {
  bar.style.transform = `scaleX(${p})`;
  if (api && reduced) {
    // no motion: cut straight to a still of each station
    const id = STATIONS[stationIndexAt(p, STATIONS)].id;
    if (id !== shownStation) { shownStation = id; api.renderOnce(p); setActiveDot(dots, id); }
  } else if (api) api.setProgress(p);
  else setActiveDot(dots, STATIONS[sections.findIndex((s) => s.getBoundingClientRect().bottom > innerHeight / 2)]?.id ?? 'contact');
}, STATIONS, sections);
if (!reduced) revealCards();

document.addEventListener('visibilitychange', () => {
  if (!api || reduced) return;
  if (document.hidden) api.pause();
  else api.resume();
});

if (test) window.__journey = api ? { ...api, ready: true } : { ready: false };
