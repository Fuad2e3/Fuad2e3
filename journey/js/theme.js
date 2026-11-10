// Day/night palettes; the page follows the device's colour scheme.
export const THEMES = {
  night: {
    bg: '#0B1020', fogDensity: 0.024, skyTop: '#03050d', skyHorizon: '#1b1150',
    floor: '#060a17', grid: '#16245a', gridOpacity: 0.45, road: '#0f1a3a', roadEmissive: '#06102a', edge: '#00C2FF',
    stars: 0.7, planet: 0.55, hemi: 1.1, sun: 1.4, bloom: 0.8, bloomThreshold: 0.3, exposure: 1,
  },
  day: {
    bg: '#cfe6ff', fogDensity: 0.011, skyTop: '#2a72e0', skyHorizon: '#dcefff',
    floor: '#b9cde6', grid: '#8fb0dc', gridOpacity: 0.55, road: '#eef5ff', roadEmissive: '#000000', edge: '#0091d5',
    stars: 0, planet: 0.25, hemi: 1.6, sun: 2.6, bloom: 0.3, bloomThreshold: 0.8, exposure: 0.95,
  },
};

export const prefersDay = () => matchMedia('(prefers-color-scheme: light)').matches;

/** Calls onChange('day' | 'night') now and whenever the device switches. */
export function watchTheme(onChange) {
  const mq = matchMedia('(prefers-color-scheme: light)');
  const fire = () => onChange(mq.matches ? 'day' : 'night');
  mq.addEventListener('change', fire);
  fire();
  return () => mq.removeEventListener('change', fire);
}
