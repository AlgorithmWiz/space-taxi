# Level art direction

Reference: [C64 SPACE TAXI ALL LEVELS — Matt Flin](https://www.youtube.com/watch?v=6l32vrfu1X4). Times below are approximate gameplay windows. The footage supplies the original motifs; additional scenery and materials are new artwork. No frames, ROM data or original graphics are shipped with the game.

The visual target is a mature arcade remake: subdued illumination, worn materials, clear silhouettes, and varied settings. Mature art direction does not require removing the unusual candy, cloud and table-tennis motifs that identify the original stages. This is an art direction, not a formal age certification.

| Stage | Reference | Original cue / remake treatment |
| --- | --- | --- |
| 01 Short -n- Sweet | 0:32–1:02 | Continuous curved striped cane, rounded spiral lollipops, sweets and single pad; subdued confectionery colors and a dark warm backdrop. |
| 02 The Beach | 1:08–1:18 | Pad 1 is the volumetric cloud, Pad 2 the striped reclining chair, Pad 3 the fabric umbrella; no generic deck over these objects. Coastal water and distant headlands. |
| 03 Skyscrapers | 1:25–1:44 | Five brick rooftops; concrete and masonry skyline with scattered lit windows. |
| 04 Taxi Trainer | 1:50–2:10 | Scattered training pads and fuel stop; neutral steel hangar and trusses. |
| 05 Beanstalk | 2:16–2:36 | Rising central stalk and leaves unfurling outward at alternating heights; mature leaves stay fixed, with 5.6 units of separation on each side. |
| 06 Taxi Pong | 2:42–2:54 | Table, paddles, net and bouncing ball; felt, timber and an indoor sports room. |
| 07 Teleports | 3:01–3:23 | Partitioned chambers and matching transfers; warm rock chambers, cave framing and portal hardware. |
| 08 Puzzler | 3:29–3:48 | Colored octagonal bays around an open upper center; dark stone chambers with muted identifying borders. |
| 09 Crossfire | 3:52–3:59 | Two three-ledge masonry buildings, a broad central pedestal, inward ground guns and airborne entry. Six mirrored firing lanes and three speeds cross the central courtyard; pads absorb shells, while the inner ends of pads 2 and 6 remain exposed. Barrels aim and recoil with each shot. |
| 10 Shooting Stars | 4:05–4:17 | Connected brown rock masses, narrow lower passages and five landing ledges, following the supplied C64 screenshot. Visible polygons also define collision boundaries. |
| 11 Magnets | 4:24–4:41 | Magnetic structures, upward force and diagonal central obstacle; magnetic test machinery and faint field lines. |
| 12 Black Hole | 4:47–5:09 | Isolated surrounding platforms and central singularity; sparse deep space and a textured accretion disc. |
| 13 Turbo-Charged Taxi | 5:15–5:30 | Brick central building and side pad stacks; a roofed turbine building with surrounding works. |
| 14 Space Mines | 5:36–5:56 | Matching colored mines; orbital minefield, sparse distant hardware and a dark moon. |
| 15 Electroids | 6:02–6:18 | Four moving electrical bands; ceramic insulators and recessed band housings. |
| 16 Blizzard | 6:24–6:39 | Three pines, direct snow landings and falling flakes; continuous snowfield, alpine ridges and trees leaning with the gusts. |
| 17 Interference | 6:45–7:04 | Brick relay towers and antenna dishes; mountain radio station with independently scanning and tilting parabolic dishes and faint signal pulses. |
| 18 Taxi Maze | 7:11–7:33 | Tight maze channels; textured basalt cave passages, recessed chambers and restrained lamps. |
| 19 The Switch | 7:40–8:05 | Return to the skyscraper layout with changed controls; a separate stormy skyline palette. |
| 20 Fast Break | 8:11–8:16 | Timed vertical curtains; dark fabric folds, overhead lintel and timing hardware. |
| 21 Rebound | 8:22–8:36 | Sloping baffles and bouncing balls; angled test rails and bumper machinery. |
| 22 Shift-o-Rama | 8:43–8:57 | Horizontally shifting barriers; separate guide columns, recessed tracks and drive wheels. |
| 23 Lasers | 9:03–9:21 | Chambers and timed vertical beams; laser enclosure with visible emitter housings. |
| 24 On The Move | 9:27–9:43 | Moving platforms and dividing tracks; mechanical chains and rotating sprockets. |
| 25 Mystery Screen | 9:50–10:14 | Muse references and an ambulance; archive columns, figures and a service van. |
| 26 The night shift | Original bonus | Orbital islands, a planet and observatory dishes. |
| 27 Crystal drift | Original bonus | Enclosed amethyst cavern with a deep rock rim, side chambers, faceted mineral growth and distant drips. |
| 28 Solar refinery | Original bonus | Furnace tones, industrial stacks and a distant sun. |

The layout and gameplay simulation remain the remake’s existing adaptations. Most C64 stages have sparse black negative space; added settings sit behind the flight zone. Interactive obstacles continue to use the shared layout data, rather than deriving collision shapes from background art. Theme colors for hazards, portals and switches remain readable even where decorative colors are subdued.

Verification: the 75 simulation/data tests include normal/debug gear starts and respawns, side-thruster locking, debug isolation, clear landing space, polygon-aware route connectivity, shell absorption, all nine leaf departures and one-time fuel collection. This does not substitute for a complete manual playthrough of every stage.

Fuel canisters are a requested remake rule, not a claim of exact C64 fuel-service behavior. Supply is limited to Taxi Trainer, Shooting Stars, Turbo-Charged Taxi, Interference, On The Move and Solar Refinery. Each cache contains one fixed refill per attempt; it is not replenished when a taxi is lost.

Additional browser checks cover 120 passenger poses across all six characters, all six generated portraits, and motion and reduced-motion states for all four radar dishes.
