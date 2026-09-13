// Explicit per-page opt-in; never inherited from saved campaign data.
export function debugEnabled(search='') {
  return new URLSearchParams(search).get('debug') === '1';
}
export function adjacentDebugLevel(index, direction, count) {
  return ((index + direction) % count + count) % count;
}
