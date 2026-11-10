// Pure scroll maths for the journey. No DOM, no Three.js.
export const clamp01 = (x) => Math.min(1, Math.max(0, x));

export function stationIndexAt(progress, stations) {
  const p = clamp01(progress);
  const i = stations.findIndex(({ range: [a, b] }) => p >= a && p < b);
  return i === -1 ? stations.length - 1 : i;
}

export function localProgress(progress, { range: [a, b] }) {
  return clamp01((progress - a) / (b - a));
}

export const walkPhase = (progress, stepsPerJourney = 60) => progress * stepsPerJourney * 2 * Math.PI;

// Cumulative arc lengths per polyline, cached so per-frame calls are O(log n) and allocation-light.
const LENGTHS = new WeakMap();
function cumulative(points) {
  let cum = LENGTHS.get(points);
  if (!cum) {
    cum = new Float64Array(points.length);
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1];
      const b = points[i];
      cum[i] = cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    }
    LENGTHS.set(points, cum);
  }
  return cum;
}

/** Total arc length of a polyline. */
export const pathLength = (points) => cumulative(points)[points.length - 1];

/** Point at `progress` (0..1) of the polyline `points`, measured by arc length. */
export function positionAt(progress, points) {
  const cum = cumulative(points);
  const d = clamp01(progress) * cum[cum.length - 1];
  let lo = 0;
  let hi = cum.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] <= d) lo = mid;
    else hi = mid;
  }
  const seg = cum[hi] - cum[lo];
  const t = seg === 0 ? 0 : (d - cum[lo]) / seg;
  const a = points[lo];
  const b = points[hi];
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** Walk-cycle phase after covering `distance` (either direction): one stride = 2π, never runs backwards. */
export const advancePhase = (phase, distance, stride) => phase + (Math.abs(distance) / stride) * 2 * Math.PI;

/**
 * Journey progress for a scroll position. The reading line moves from the top of the
 * document (scrollY = 0) to the bottom (scrollY = max), and the section it is in maps
 * linearly onto that station's range.
 * @param {number} scrollY @param {number} viewport @param {Array<[number, number]>} spans section [top, bottom]
 */
export function progressFromScroll(scrollY, viewport, spans, stations) {
  const docH = spans.at(-1)[1];
  const max = Math.max(1, docH - viewport);
  const y = clamp01(scrollY / max) * max;
  const line = y + viewport * (y / max);
  for (let i = 0; i < spans.length; i++) {
    const [top, bottom] = spans[i];
    if (line < bottom || i === spans.length - 1) {
      const [a, b] = stations[i].range;
      return a + (b - a) * clamp01((line - top) / (bottom - top));
    }
  }
  return 1;
}
