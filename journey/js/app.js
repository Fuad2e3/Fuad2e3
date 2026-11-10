import { STATIONS } from './data.js';
import { renderSections, renderDots, setActiveDot } from './render-sections.js';
import { bindScroll, revealCards } from './scroll.js';
import { localProgress, positionAt } from './journey-math.js';

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
  });
} catch (err) {
  console.warn('3D journey unavailable, showing the plain page.', err);
}
if (!api) document.body.classList.add('no-webgl');

const sections = [...document.querySelectorAll('.station')];
const bar = document.getElementById('progress-bar');
bindScroll((p) => {
  bar.style.transform = `scaleX(${p})`;
  if (api) api.setProgress(p);
  else setActiveDot(dots, STATIONS[sections.findIndex((s) => s.getBoundingClientRect().bottom > innerHeight / 2)]?.id ?? 'contact');
}, STATIONS, sections);
revealCards();

if (test) window.__journey = api ? { ...api, ready: true } : { ready: false };
