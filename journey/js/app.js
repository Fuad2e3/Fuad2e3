import { STATIONS } from './data.js';
import { renderSections, renderDots, setActiveDot } from './render-sections.js';

const test = new URLSearchParams(location.search).has('test');
const dots = document.getElementById('dots');

renderSections(document.getElementById('content'), STATIONS);
renderDots(dots, STATIONS);
setActiveDot(dots, STATIONS[0].id);

let api = null;
try {
  const { start } = await import('./main.js');
  api = start(document.getElementById('scene'), {
    stations: STATIONS,
    test,
    onStation: (id) => setActiveDot(dots, id),
  });
} catch (err) {
  console.warn('3D journey unavailable, showing the plain page.', err);
}
if (!api) document.body.classList.add('no-webgl');

if (test) window.__journey = api ? { ...api, ready: true } : { ready: false };
