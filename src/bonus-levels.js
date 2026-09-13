export const BONUS_LEVELS = [
  {
    name: 'The night shift', district: 'ORBITAL GARDENS', subtitle: 'A little gravity. A lot of possibility.',
    color: '#b9f768', gravity: 3.4, wind: 0,
    pads: [
      { id: 1, x: -17, y: -8, w: 8, fuel: true, name: 'Depot' },
      { id: 2, x: -5, y: -1, w: 7, name: 'Botanical' },
      { id: 3, x: 16, y: -5, w: 8, name: 'Arrivals' },
      { id: 4, x: 9, y: 7, w: 6.5, name: 'Observatory' },
    ],
    obstacles: [], hazards: [], routes: [[2, 3], [3, 4], [4, 1]],
  },
  {
    name: 'Crystal drift', district: 'THE AMETHYST BELT', subtitle: 'Mind the rocks. Enjoy the view.',
    color: '#c7a0ff', gravity: 3.0, wind: .42,
    pads: [
      { id: 1, x: -17, y: -8, w: 7, fuel: true, name: 'Depot' },
      { id: 2, x: -13, y: 5, w: 6, name: 'Geology' },
      { id: 3, x: 13, y: -7, w: 7, name: 'Quarry' },
      { id: 4, x: 14, y: 7, w: 6, name: 'Sky lounge' },
    ],
    obstacles: [{ x: 0, y: -.5, w: 5, h: 3 }],
    hazards: [{ x: 1, y: 8, radius: .9, range: 6, speed: .55 }],
    routes: [[2, 3], [3, 4], [4, 1]],
  },
  {
    name: 'Solar refinery', district: 'HELIOS INDUSTRIAL', subtitle: 'Hot engines. Higher stakes.',
    color: '#ffb86a', gravity: 4.0, wind: -.3,
    pads: [
      { id: 1, x: -17, y: -8, w: 7, fuel: true, name: 'Depot' },
      { id: 2, x: -15, y: 6, w: 5.8, name: 'Reactor' },
      { id: 3, x: 3, y: -5, w: 6.5, name: 'Foundry' },
      { id: 4, x: 17, y: 7, w: 6, name: 'Sun deck' },
    ],
    obstacles: [{ x: -5, y: 2, w: 3.6, h: 2 }, { x: 17, y: -5, w: 4, h: 2.5 }],
    hazards: [{ x: 3, y: 7.5, radius: .8, range: 6, speed: .72 }, { x: 9, y: -1, radius: .65, range: 5, speed: -.6 }],
    routes: [[2, 3], [3, 4], [4, 1]],
  },
];

