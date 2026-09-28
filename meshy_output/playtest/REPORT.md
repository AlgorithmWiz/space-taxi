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
