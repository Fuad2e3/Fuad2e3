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

/** Point at `progress` (0..1) of the polyline `points`, measured by arc length. */
export function positionAt(progress, points) {
  const seg = [];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const len = Math.hypot(...points[i].map((v, k) => v - points[i - 1][k]));
    seg.push(len);
    total += len;
  }
  let d = clamp01(progress) * total;
  for (let i = 0; i < seg.length; i++) {
    if (d <= seg[i] || i === seg.length - 1) {
      const t = seg[i] === 0 ? 0 : Math.min(1, d / seg[i]);
      return points[i].map((v, k) => v + (points[i + 1][k] - v) * t);
    }
    d -= seg[i];
  }
  return [...points[0]];
}
