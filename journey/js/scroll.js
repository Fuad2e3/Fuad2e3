// Turns page scroll into journey progress. Native scroll events, so it works without GSAP.
import { progressFromScroll } from './journey-math.js';

export function bindScroll(onProgress, stations, sections) {
  let spans = [];
  const measure = () => {
    spans = sections.map((s) => [s.offsetTop, s.offsetTop + s.offsetHeight]);
  };
  const update = () => onProgress(progressFromScroll(scrollY, innerHeight, spans, stations));
  const onResize = () => { measure(); update(); };
  measure();
  update();
  addEventListener('scroll', update, { passive: true });
  addEventListener('resize', onResize);
  return () => {
    removeEventListener('scroll', update);
    removeEventListener('resize', onResize);
  };
}

/** Card reveal animations, only when GSAP + ScrollTrigger loaded. */
export function revealCards() {
  const { gsap, ScrollTrigger } = window;
  if (!gsap || !ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  for (const card of document.querySelectorAll('.station .card')) {
    gsap.from(card, { y: 60, opacity: 0, rotateX: -8, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: card, start: 'top 85%' } });
    gsap.from(card.querySelectorAll('.projects li'), {
      y: 24, opacity: 0, duration: 0.5, stagger: 0.04, ease: 'power2.out', scrollTrigger: { trigger: card, start: 'top 75%' },
    });
  }
}
