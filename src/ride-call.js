// Screen-space checks also cover moving platforms and narrow/mobile viewports.
export function rectanglesOverlap(a,b,padding=0) {
  return a.left < b.right+padding && a.right > b.left-padding && a.top < b.bottom+padding && a.bottom > b.top-padding;
}
export function approachingPickup(flight,pose) {
  return Math.abs(flight.x-pose.x) < pose.w/2+4 && flight.y > pose.y-2 && flight.y < pose.y+7;
}
export function rideCallObstructs(radio,taxi,landingZones) {
  return rectanglesOverlap(radio,taxi,24) || landingZones.some(zone=>rectanglesOverlap(radio,zone,12));
}
