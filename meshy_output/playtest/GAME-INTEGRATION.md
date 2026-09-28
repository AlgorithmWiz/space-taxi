# In-game model playtest

The classic taxi uses its optimized Meshy GLB. Nova and Juno use their independently cloned skinned models, with the bundled walk cycle during boarding and departure. Waiting passengers use the rig's rest pose. Other characters and garage skins retain the procedural models.

Run the game normally to try these models. Append `?models=classic` to compare the original visuals, or `?debug=1` to test with unlimited taxis and the level navigator.

Models load asynchronously with procedural fallbacks. GitHub Pages retrieves the committed LFS binaries from GitHub's media endpoint; local runs use local GLBs. Shared geometry/textures are retained across level resets and each passenger owns its skeleton and mixer.

Validation: all 79 Node tests passed. Chromium WebGL checks covered the menu and gameplay model load, thrust, pause/resume, next/previous level changes, Juno walking, departure creation, and repeated scene disposal. No JavaScript errors were observed. Juno's evaluated foot-ground error stayed below 0.8 mm in the integration check.

Current limitations: the imported taxi's feet are baked into the model, so they remain visually extended even when the gameplay landing gear is retracted. The gear control and landing physics still operate normally. Passenger rest poses do not yet include the procedural waving gesture. Original high-resolution textures remain large, so first loading may take time. Level props have not yet been swapped in.
