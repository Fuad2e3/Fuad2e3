import { STATIONS } from './data.js';
import { renderSections, renderDots } from './render-sections.js';

renderSections(document.getElementById('content'), STATIONS);
renderDots(document.getElementById('dots'), STATIONS);
