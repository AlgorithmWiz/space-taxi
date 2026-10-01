// Collision surfaces keep their authored gameplay dimensions. Freestanding
// objects retain their proportions instead of inheriting a fallback's depth.
export const PROP_FITS = {
  fuel: 'contain', radar: 'contain', paddle: 'contain', pong: 'contain',
  portal: 'contain', crystalSwitch: 'contain',
  candy: 'silhouette', lollipop: 'silhouette', pine: 'silhouette',
};

export function modelFit(source, target, mode = 'stretch') {
  const ratios = source.map((size, i) => target[i] / Math.max(size, 1e-6));
  if (mode === 'contain') return Array(3).fill(Math.min(ratios[0], ratios[1]));
  if (mode === 'silhouette') ratios[2] = Math.min(ratios[0], ratios[1]);
  return ratios;
}
