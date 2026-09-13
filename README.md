# Space Taxi — Orbital Shift

A playable Three.js remake of the Commodore 64 classic, with all 24 level themes, the Mystery Screen finale, and the three original Orbital Shift sectors retained as bonus routes. The taxi, scenery, passengers, lighting, particles, and synthesized sound are original to this remake.

**[Play Space Taxi](https://algorithmwiz.github.io/space-taxi/)** · [Source on GitHub](https://github.com/AlgorithmWiz/space-taxi)

## Run

Requires Node.js 20 or later. No dependency installation or build step is needed.

```sh
npm start
```

Open [localhost:5173](http://localhost:5173). Keep the terminal running while playing. Set the `PORT` environment variable to use another port. The server listens only on your computer.

### Debug scene explorer

Open [localhost:5173/?debug=1](http://localhost:5173/?debug=1) to opt into debug mode. The amber **Scene Explorer** panel provides Previous/Next buttons and a dropdown for all 28 stages, including Mystery Screen and the bonus routes. **Page Up / Page Down** also change levels and wrap around at either end. In the menu these controls preview the scenery; during a flight they immediately start a fresh taxi on the chosen level.

Debug flights have **infinite lives**: collisions still explode and respawn the taxi, but never end the run. Fuel, landing physics, and the landing-gear side-thruster lock work normally. Debug runs cannot save high scores, bank fares, advance campaign progress, or unlock skins. **Exit debug** reloads normal mode; the setting is not saved. Click the **Scene Explorer** heading to collapse the panel for a clearer view; the keyboard shortcuts remain active. The debug navigator and shortcuts are unavailable without `?debug=1`.

The required Three.js r186 modules were copied from `C:\three.js-master` into `vendor/three`, with their MIT license. The game runs independently of that original folder. Fonts are bundled with their SIL Open Font Licenses. Code and visuals work offline; optional passenger speech uses your browser’s available speech engine.

## Publish with GitHub Pages

This is a static site: publish the repository root with no build command. All game assets use relative URLs, so the game also works under a project path such as `/space-taxi/`. The included `.nojekyll` file keeps the bundled modules and fonts unchanged.

In the repository’s **Settings → Pages**, choose **Deploy from a branch**, select **main** and **/ (root)**, then save. GitHub shows the live URL when deployment completes. Keep `index.html`, all three stylesheets, `favicon.svg`, `src/`, and `vendor/` together when deploying elsewhere. The Node server is only for local development.

Scores, fare credits, purchased skins, and campaign progress are stored in the player’s browser for the site’s origin. A hosted copy starts with its own save data, separate from `localhost`.

## Campaign

Select **Morning**, **Day**, or **Night** to start at levels 1, 9, or 17. **View all levels** opens an illustrated browser where every stage is immediately available. Select a card to preview it, then press **Start your shift**.

| Morning · 01–08 | Day · 09–16 | Night · 17–24 |
| --- | --- | --- |
| Short -n- Sweet | Crossfire | Interference |
| The Beach | Shooting Stars | Taxi Maze |
| Skyscrapers | Magnets | The Switch |
| Taxi Trainer | Black Hole | Fast Break |
| Beanstalk | Turbo-Charged Taxi | Rebound |
| Taxi Pong | Space Mines | Shift-o-Rama |
| Teleports | Electroids | Lasers |
| Puzzler | Blizzard | On The Move |

Finishing level 24 leads to **Mystery Screen**, a Museworld-inspired finale. Mystery Screen and the three retained bonus routes—The night shift, Crystal drift, and Solar refinery—are also selectable from the **Bonus** tab. Finishing Mystery Screen ends the classic campaign; the three Orbital Shift bonus routes form a separate sequence.

The new layouts reinterpret the original arrangements for this taxi’s dimensions and flight model. Their defining mechanics include growing beanstalk leaves, paired portals, linked puzzle switches, cannon fire, falling stars, upward gravity, a central black hole, turbo thrust, mine tripwires, moving electrical gaps, blizzard gusts, radio interference, reversed controls, resettable curtains, rebound orbs, shifting barriers, timed lasers, and moving landing pads. These are adaptations with modern controls and timing, rather than pixel-exact emulation.

## Fly

- **W / Up:** upward thrust. Release to descend under normal gravity.
- **A / D or Left / Right:** side thrusters. Apply opposite thrust to slow your drift.
- **S / Down:** downward thrust.
- **Space:** deploy or retract landing gear in flight. **Deployed gear disables both left and right thrusters.** Retract it to steer; brake and line up before deploying it for touchdown. Existing drift slows naturally, and wind still affects the taxi.
- **Escape:** pause or resume. **M:** mute. **H:** flight manual.
- Touch controls and a clickable landing-gear panel are provided for mobile.

Land with gear extended and both feet over a platform, descending below 3 m/s and drifting sideways below 2.2 m/s **relative to the pad**. Hold still briefly to board or deliver a passenger. The glowing platform marks your current destination. Fares begin at 500 credits and decrease with ride time, to a minimum of 100.

Follow the level hint: Magnets reverses gravity, while The Switch reverses all directional controls. Fly into rings to teleport; touch diamonds to toggle doors or retract curtains. Moving pads carry a docked taxi. Snowflakes and cannon shots remain dangerous while you are parked.

Classic levels end with a passenger asking “Up, please!” Take that passenger through the opening at the top center. Bonus routes open the same exit after their three deliveries. Selected stages have a **single-use fuel canister**, collected by landing at its cache or touching the item. It adds 35 fuel units (45 in Turbo-Charged Taxi) and is collected only when the tank has room for the full amount. A consumed canister stays gone after a crash and resets on a new level attempt. There are no unlimited fuel stations or fuel charges.

You start with three taxis. Crashes return the current passenger to their pickup. Every fourth classic level restores one taxi, up to three. Browser storage saves your best score, completed levels, and a checkpoint at the beginning of the current level. **Resume level** restarts that level with the checkpoint’s earnings, taxis, and delivery totals. Starting a new shift replaces the checkpoint but preserves completion marks and your best score.

## High scores

Open **High scores ↗** beside the menu’s record, or **View high scores** on a pause/results screen. Each board keeps its top ten runs:

- **Classic campaign:** shifts beginning at level 01.
- **Level select:** shifts beginning at another classic level or Mystery Screen.
- **Bonus routes:** the three Orbital Shift levels.

Positive scores save after fares and on pause, results, or return to departures. A qualifying results screen shows your rank and a three-character callsign field. Enter letters or numbers and choose **Save name**; the game remembers that callsign for future shifts. Rows show earnings, departure/reached levels, and fares. Ties use fares, level progress, and elapsed flight time.

A shift keeps one record as its score improves. Its ID travels with saved checkpoints, so resuming or replaying a checkpoint does not duplicate the entry. Scores are saved locally in this browser; there is no online leaderboard or account requirement. If storage is unavailable, the UI reports that scores last for the current session. Your earlier personal-best number is retained; detailed leaderboard entries begin with this version.

## Taxi garage and fare wallet

The departures screen has dedicated **High Scores** and **Taxi Garage** buttons, available before launching a level. The interface uses larger DM Sans labels and instructions, brighter supporting text, and a reflowing mobile layout; monospace remains on the instruments and scores.

Every delivered passenger now deposits the actual fare into a persistent garage wallet, including passengers taken through the upper exit. Credits accumulate across shifts. Level bonuses only affect the run score; buying a skin only affects the wallet. Earlier versions did not record lifetime fares, so the wallet begins accumulating rides with this update.

Open **Taxi Garage** to preview the real 3D models, buy a skin, or equip one you own:

| Skin | Price | Unlock requirement |
| --- | ---: | --- |
| TX–84 Original | Included | Available immediately |
| Lagoon Runner | 3,000 CR | Fares only |
| Polar Rescue | 8,000 CR | Reach campaign level 8 |
| After Hours | 16,000 CR | Reach campaign level 16 |
| Solar Flare | 28,000 CR | Reach campaign level 20 |
| Auric Executive | 45,000 CR | Reach campaign level 24 |

Rare skins need **both** the level milestone and the credits. Reach a campaign level by clearing the preceding classic levels in order, across one or more shifts. A saved campaign checkpoint also preserves the level reached. Selecting a later departure in the atlas does not grant its milestone. The garage shows level requirements, progress, and credit shortfalls; earned milestones persist through restarts and reloads. Existing progress is recognized, and skins purchased before this rebalance remain owned and free to equip.

Paint, trim, windows, decals, and exhaust colors change; handling and collision geometry stay identical. Purchased skins are permanent in this browser and free to switch between. Previewing a locked skin does not equip it. Returning from the garage restores the equipped skin. Rewards save immediately and are deduplicated by shift, level, and passenger, so replaying a saved checkpoint cannot claim the same fare again. If browser storage is unavailable, the garage clearly reports session-only saving.

The taxi has a detailed utilitarian body, a swept dark-glass canopy, warm headlights, subdued running lights, four lift turbines, and a legible roof sign. Paint is satin rather than high-gloss; the purchased skins retain their colors. The menu, flying taxi, and garage portraits share this model; handling, landing-foot positions, and skin unlock requirements are unchanged.

Landing surfaces use materials suited to their setting: cloud and canvas on the beach, foliage on the beanstalk, continuous snow in Blizzard, felt on the table-tennis stage, stone in the caves and textured metal in the machinery stages. Painted touchdown brackets and small destination lights keep landing surfaces readable. Waves, drifting snow, spores, portal motion and machinery provide scene-specific animation. The decorative orbital arch and shared cyberpunk city backdrop have been removed. Decorative ambient motion respects the system’s reduced-motion preference.

## Passengers, explosions, and music

Six recurring passengers have distinct names, suit colors, occupations, calls, and thank-you lines. Their models use adult proportions, shaped faces behind curved visors, hair or facial hair, blinking eyes, helmet radios, oxygen tanks and hoses, articulated fingers, elbows and knees, and layered boots. Fabric weave, seams, pockets, straps and crew badges add clothing detail. Job-specific equipment distinguishes the botanist’s plant canister, courier’s parcel, engineer’s wrench, tourist’s camera, cook’s work jacket, and medic’s kit. The ride callout uses a 144-pixel portrait rendered from the same model.

Passengers breathe, shift their weight, glance toward the taxi and hail intermittently. Articulated strides and counter-swinging arms animate boarding and departure. Browser speech gives each passenger a different pitch; callouts remain visible when sound is muted or speech is unavailable.

Crashes produce a bright fireball, two expanding shockwaves, tumbling taxi fragments, sparks, a brief light flash and camera shake, then drifting smoke. The effect reuses a bounded mesh pool, and its animation freezes when paused.

**Orbit After Hours** is an original 100 BPM, 32-bar synth score with pads, bass, arpeggios, melody, kick, snare, and hi-hats. Music starts after a user interaction, quiets under passenger speech, and fades out when paused or the page is hidden. **M** mutes all audio; the **Music** button in the flight manual toggles only the soundtrack and remembers that choice. The score and effects are synthesized locally without external audio downloads.

## Verification and structure

```sh
npm test
```

The 75 simulation, debug-mode, interface-clearance, and data tests cover the original bonus gameplay, continuous flight through the first classic level, landing tolerances, passenger service, refueling, crashes, portals, switches, environmental forces, beam timing, growing and moving pads, rebounds, campaign milestones, saved progress, the landing-gear thrust lock, passenger identities, the score arrangement, high-score sorting, and wallet purchases, validation, persistence, and deduplication. Skin tests cover milestone and price requirements, atlas departures, persistent unlocks, and migration of existing purchases. Fare rewards are checked across all 28 levels, including exit passengers. A spatial audit checks that all layouts connect the spawn, landing areas, switches, and exit; dynamic hazards are tested separately. This is automated coverage, not a claim of a complete manual playthrough at every difficulty.

The optional [media check page](http://localhost:5173/tests/media.html) previews astronaut animation, explosion stages and cleanup, and renders a 12-second sample through Web Audio with peak/RMS checks and a local listening control.

The [leaderboard check page](http://localhost:5173/tests/scores.html) exercises the actual score UI with isolated sample data. Its separate storage key never changes game scores; use **Clear test data** after checking persistence.

The [garage check page](http://localhost:5173/tests/garage.html) uses isolated fare credits and campaign milestones to check buying, equipping, level locks, insufficient funds, and persistence without changing the game wallet. Use **Clear test data** after checking.

Physics runs at a fixed 120 Hz. `src/levels.js` contains the campaign layouts and `src/bonus-levels.js` preserves the original three sectors. `src/environment.js` shares moving geometry between physics and rendering. `src/level-backdrops.js`, `src/art-direction.js` and `src/surface-materials.js` build the original-inspired environments and material palettes, with dedicated cave, candy and radar models in `src/caves.js`, `src/candy-props.js` and `src/radar.js`. `src/scenery.js` builds the interactive obstacles and mechanisms; `src/atlas.js` generates the level thumbnails. Read-only diagnostic state is available through `window.spaceTaxi.snapshot()` and the HUD’s `data-state` attribute.

## Credits and references

Inspired by *Space Taxi* by John F. Kutcher / Muse Software (1984). This independent tribute includes no original game graphics, music, ROMs, or extracted level data. Level order and mechanics were cross-checked against the [C64 Wiki overview](https://www.c64-wiki.com/wiki/Space_Taxi), the [level catalog](https://de.wikipedia.org/wiki/Space_Taxi#Levels), and Andrea Cucchetto’s [Atari conversion manual](https://www.atarimania.com/8bit/files/Space%20Taxi.pdf), whose illustrated layouts served as an additional adaptation reference.

## Original-inspired visual direction

All 28 stages have their own environment profile. The 24 classic levels and Mystery Screen take their prominent scenery cues from [Matt Flin’s C64 all-levels video](https://www.youtube.com/watch?v=6l32vrfu1X4): the candy cane, cloud/lounger/parasol, brick towers, growing stalk, table tennis, transfer chambers, puzzle bays, artillery, caves, magnets, singularity, turbo building, mines, electrical bands, winter trees, relay dishes, maze, curtains, rebound rails, shifting walls, lasers and moving chains. The three bonus routes remain separate original environments. See [the art-direction notes](docs/level-art-direction.md) for the stage-by-stage reference map.

This pass uses restrained lighting, textured surfaces, natural foliage, smaller character heads and neutral expressions. The original game’s unusual motifs remain recognizable. The extra backgrounds are new interpretations, not backgrounds extracted from the C64 footage or a claim of pixel-exact geometry.

Short -n- Sweet has a continuous curved cane with winding red-and-ivory stripes and rounded spiral lollipops. Teleports, Shooting Stars, Taxi Maze and the bonus Crystal Drift use rock-lined caverns, mineral formations and distant drips. Distant rock framing sits behind the flight zone; foreground cave terrain uses shared rendering and collision outlines.

Interference has four parabolic radar dishes mounted on its brick towers. Each scans and tilts independently, with faint expanding signal pulses. The dishes and decorative cave motion respect reduced-motion preferences.

Crossfire restores the two three-ledge buildings, broad central pedestal, inward ground cannons and airborne entry visible in the C64 reference. Both cannons sweep the central airspace with six mirrored directions and three shell speeds. Barrel aim, muzzle flashes and recoil follow the firing schedule. Shells are absorbed by pad edges, undersides and walls for the remainder of their cycle. The inner ends of pads 2 and 6 are exposed to side fire; the lower pads and pedestal offer shelter. Dedicated tests cover the actual firing lanes, parked-taxi danger, pad absorption, muzzle alignment and a complete first fare using continuous flight. Beanstalk leaves unfurl outward from fixed stem attachments, alternate in height and stop growing before becoming landing surfaces. Every leaf has a tested departure route.

The Beach uses the cloud, striped reclining chair and fabric umbrella as the actual landing objects. Shooting Stars has connected jagged solid terrain, including its five ledges and lower fuel-cache passage; the same polygon outlines define the visible rock and taxi collisions. Teleports and Taxi Maze also use jagged solid wall outlines. Blizzard landings sit directly on continuous snow, with trees leaning in the gusts and their trunk collision poses following the visible motion.

Airborne level starts and respawns begin with landing gear retracted and side thrusters available. Pad starts begin docked with gear deployed. The rule is identical in normal and debug play.

Ride requests use a docked radio panel; it clears during pickup approach and whenever it would cover the taxi or a landing corridor. Nearby pad labels also disappear while the taxi passes them.
