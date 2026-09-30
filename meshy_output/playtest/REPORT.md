# Local upgrade verification — September 30, 2026

The game uses all 36 optimized assets, including 29 distinct prop types observed across the 28 levels. Local GLB preview checks covered all 22 newly processed files (the remaining 21 plus the fuel repair). Original files were retained; no Meshy requests or credits were used.

Browser checks cover every level, all six character rigs through 90 samples of standing/walking/blending, waving, landing-gear extension/retraction, garage portraits, mobile resizing, reduced motion, repeated scene changes, delayed downloads, and failed-download fallback. Full-mesh foot audits were within 0.001 world units. A keyboard-controlled first fare completed with all three taxis intact, awarded 730 credits, advanced to the beach, and passed pause/resume. 80 automated tests pass, including embedded-buffer/image validation for all 36 browser GLBs and the existing campaign collision/control checks.

In the same 390×844 Chromium software-WebGL fixture, passenger update median fell from roughly 6–7 ms to 1.1 ms. At device scale factor 2 (render cap 1.25), bloom-on median frame time was 59.4 ms versus 28.5 ms without bloom. These measurements characterize this software renderer, not physical-phone frame rates. Repeated level cycles stayed within six unused cached assets; GPU counts did not grow monotonically. Lower-detail pine foliage is angular at close range. Idle gestures and taxi gear deformation are game-side animation, not additional baked GLB clips.

`local-upgrade.json` contains the detailed test results and before/after measurements. `local-levels.jpg` shows all levels; `local-assets.jpg` shows the reviewed models; `local-wave.jpg` shows the new idle gesture. The historical checks below predate these changes and describe source-file limitations now corrected by the game.

# Game integration — 2026-09-30

All six passengers and seven prop types are integrated into the game. Browser derivatives preserve geometry and rigs, with smaller embedded textures. Checks in `game-integration.json` cover all six standing/walking character roots, the candy/beach/radio props, repeated scene changes, the actual game UI, desktop/mobile rendering, and the original-model switch. No browser errors were reported in the normal-load checks. A separate forced-download-failure check confirmed the game stays playable using procedural taxi/passenger fallbacks. A stale inverse bind transform was corrected before measuring skinned feet; all six ground offsets were below 0.001 world units.

A browser keyboard-input flight completed the first fare for 730 credits with all three taxis intact, advanced to the beach, and passed pause/resume. Its completion snapshot is `game-flight.json`.

80 automated tests pass, including embedded GLB integrity and texture limits. Browser screenshots are `game-beach.png`, `game-candy.png`, `game-radio.png`, and `game-mobile.png`. Tests used Chromium software WebGL; hardware GPU performance was not benchmarked. Renderer counters from the postprocessing pipeline reflect the final pass, not complete scene totals.

The fuel-canister remesh has surface artifacts and is not used in the game. Waiting characters use a base pose; the rigging outputs do not include an idle clip. Baked taxi feet remain extended visually. Raw source animation ground dips below are corrected by the game loader.

# Animation playtest — 2026-09-28

Result: both passengers load and animate correctly in an isolated Three.js r186 WebGL viewer, with minor ground-contact issues to address during game integration.

## Coverage

- Loaded optimized taxi, Nova/Juno rigged GLBs, and all four walking/running GLBs.
- Evaluated 120 samples over two cycles per character file and played clips in real time.
- Reviewed rendered front, side and rear views at multiple animation phases.
- Checked pause/resume, camera view buttons, resize, reload, and repeated asset switches.
- GLB loading, skinning and textures worked. No non-finite animated bounds. No obvious detached limbs, severe stretching, or broken limb orientation in the reviewed frames.
- Walk loops are approximately 1.067 seconds; run loops approximately 0.667 seconds. The rigged files contain a static base-pose clip, not an idle animation.

## Findings

- Nova: lowest mesh points reach y=-0.0446 m during walking and y=-0.0579 m during running.
- Juno: lowest mesh points reach y=-0.0447 m during walking and y=-0.0519 m during running.
- Minor foot-ground penetration is visible/expected with a fixed y=0 ground; adjust grounding or foot placement at integration. No model changes were made for this inspection.
- Character textures remain large. Hardware GPU performance and game-level movement/collision synchronization were not measured.
- The initial viewer run recorded a missing favicon (404); a local empty icon was added, and the UI was rechecked separately.

## Evidence and use

Open http://localhost:5188/meshy_output/playtest/index.html while the local server is running. Use the model selector, Pause/Play, view buttons, or drag to orbit. The viewer uses the delivered files directly.

Numeric samples: results.json. UI follow-up: ui-check.json. The four *-sheet.jpg files contain the reviewed animation frames.

This was an asset animation playtest, not integration into the Space Taxi campaign. No Meshy credits were spent.
