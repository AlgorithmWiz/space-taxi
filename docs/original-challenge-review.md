# Original-game challenge review

Reviewed 30 September 2026. The target is a comparable progression and the same defining obstacle or control problem, scaled for this remake's taxi and landing tolerances. This is not a frame-accurate C64 simulation or a measured equivalence of completion times.

References: the [Morning shift](https://strategywiki.org/wiki/Space_Taxi/Morning_shift), [Day shift](https://strategywiki.org/wiki/Space_Taxi/Day_shift), [Night shift](https://strategywiki.org/wiki/Space_Taxi/Night_shift), and [Mystery Screen](https://strategywiki.org/wiki/Space_Taxi/Mystery_screen) guides. The existing [art-direction map](level-art-direction.md) links the original gameplay footage used for visual motifs. The three bonus stages have no original-game counterpart.

| Level | Defining original challenge | Review and resulting remake behavior |
| --- | --- | --- |
| 01 Short -n- Sweet | Single-pad introduction | Retained the simple first pickup, angled cane and unobstructed exit approach. |
| 02 The Beach | Introductory furniture landings | Retained cloud, lounger and umbrella landing surfaces and their structural hazards. |
| 03 Skyscrapers | Five rooftops of different heights | Retained five roofs, deep tower sides and narrow approaches. |
| 04 Taxi Trainer | Precision practice with refueling | Retained nine landing tests and a finite fuel cache. Fuel rules are intentionally different; see below. |
| 05 Beanstalk | Growing pads; early-pickup shortcut | Retained nine growing leaves, fixed mature positions and the early exit fare. Staggered heights preserve cabin clearance. |
| 06 Taxi Pong | Timing around a bouncing ball | Retained the moving ball, table, net and three stops. Only one tabletop is rendered. |
| 07 Teleports | Disconnected areas and transfers | Retained partitions and eight portals. Pairing is deterministic and color-coded, unlike the original's unpredictable destinations. |
| 08 Puzzler | Switch combinations and changing doors | Delivery now changes a door state. All five switches remain usable to recover access; the simplified toggle network is deterministic. |
| 09 Crossfire | Projectiles crossing landing approaches | Retained six firing lanes, exposed pad ends and shells absorbed by solid surfaces. |
| 10 Shooting Stars | Falling hazards and tight rock passages | Retained jagged collision polygons, narrow lower routes and danger while boarding. |
| 11 Magnets | Upward attraction complicates landing | Retained reversed gravity and stronger downward thrust. |
| 12 Black Hole | Central attraction replaces ordinary gravity | Removed the extra downward gravity. Attraction is now radial around the singularity. |
| 13 Turbo-Charged Taxi | Strong acceleration and fuel pressure | Retained 1.8× thrust, higher speed limit and increased fuel use. |
| 14 Space Mines | Connections between matching mines | Retained lethal links. Faint wires remain as a readability aid. |
| 15 Electroids | Moving gaps and one destination | Retained four moving electrical bands and a single landing pad. |
| 16 Blizzard | Snow hazards and gusts | Retained falling flakes, wind, swaying trees and clear snow landings. |
| 17 Interference | Disturbed controls through confined areas | Retained the interference band, towers and lower passages. |
| 18 Taxi Maze | Maze rearranges after pickup | Rebuilt as alternating corridors with one bottom pad. Pickup reverses the openings; a crash restores the outbound maze. Removed shortcut portals. Both layouts have a reachable exit. |
| 19 The Switch | Familiar rooftops with altered controls | Retained the five-roof layout and consistent reversed inputs. |
| 20 Fast Break | Fast gate crossing; slow attempts bounce | Replaced resettable curtains with a central speed gate. A successful upward crossing arrests velocity; the one-way outer return passages reset the gate. |
| 21 Rebound | Diagonal gravity and deflecting projectiles | Added rightward drift to downward gravity. Orbs still reverse velocity without costing a taxi. |
| 22 Shift-o-Rama | Opposing moving barrier rows | Retained four alternating rows and their moving gaps. |
| 23 Lasers | Timed openings in a labyrinth | Retained four intermittent beams and connecting chambers. |
| 24 On The Move | Landing on moving chains of pads | Retained moving floors, relative landing velocity and docked transport. Restored incremental movement with stationary docking windows and eased short steps. |
| 25 Mystery Screen | End-of-shift reward screen | Retained the archive setting and final fares. Original secret-menu commands are not reproduced. |
| 26 The night shift | Original bonus, no C64 equivalent | Reviewed island approaches and exits using the remake's collision dimensions. |
| 27 Crystal drift | Original bonus, no C64 equivalent | Reviewed cave readability, rock undersides and moving hazards. |
| 28 Solar refinery | Original bonus, no C64 equivalent | Reviewed industrial silhouettes, island clearance, fuel pickup and exit access. |

## Loading and visual treatment

Scenes are prepared behind a short departure screen: requested models finish loading, current passengers attach, shaders compile and a complete frame renders before flight is revealed. Physics and fare clocks stay frozen during preparation. Four downloads can run concurrently. Recurring passenger assets remain cached; remaining files warm in the browser HTTP cache at low priority after the initial scene. The first scene only waits for its own passengers. Data Saver skips speculative prefetch. Network failures settle into procedural fallbacks, and asset fetches have a 15-second timeout.

All interiors now use softly lit, weathered material backdrops with recessed structural framing instead of a high-contrast tiled grid. Outdoor stages use layered cloud light and textured distant ridges. Foreground props receive a subtle theme-colored fill. Background elements never create new collision surfaces. The mobile instruments use one compact row so the lower pads remain visible. No additional image downloads were introduced. Higgsfield image-cost and workspace tools returned internal errors, so this release uses local shader artwork and consumes no generation credits.

## Validation and limits

87 automated tests pass, including full-campaign fare events, spatial access to every pad/switch/exit, both maze configurations, speed-gate acceptance/bounce/reset, puzzle changes, radial gravity and diagonal drift. A continuous controller completed the changed maze with all three taxis and fuel remaining. Browser renders of all 28 levels were inspected together; all six passenger animations and grounding checks still pass. Delayed and failed asset loads plus rapid level changes were exercised in Chromium. The checks cover implementation and reachability; they do not claim a full human playthrough of every fare or physical mobile-device frame-rate measurements.

Intentional remake differences remain: keyboard/touch controls, taxi size, landing tolerances, fare amounts, finite fuel canisters, three starting taxis, predictable portal pairs, visible mine links and eased chain steps. These are retained user-facing rules, not evidence of exact C64 difficulty parity.
