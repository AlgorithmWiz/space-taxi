# Model assets and local playback

The GLB models and reference/preview images use Git LFS. After cloning, install Git LFS and run `git lfs pull` to download them.

Run `PORT=5188 npm start` from the repository root, then open `http://localhost:5188/meshy_output/playtest/index.html` for all six passengers’ animation playback. The viewer's Three.js r186 runtime and required loaders are included. `playtest/REPORT.md` records the checks and runtime ground-contact correction.

`catalog.json` lists the 36 generated models. `optimized-delivery/catalog.json` lists the optimized taxi, all six optimized/rigged passengers, and eight optimized props. Paths in those original records refer to the generating workstation; the actual files are stored under the corresponding project folders in this directory. The viewer resolves those records into repository-relative URLs.

Original source models are retained alongside optimized versions. The game campaign uses compact derivatives of the taxi, all six passengers, and all 29 props from `assets/models/`. The damaged Meshy fuel-canister remesh is excluded; a local optimization of the intact source is used instead. All 36 generated models now have optimized browser versions. `../assets/models/manifest.json` records local optimizations, separate from the historical Meshy-stage catalog.

Duplicate ZIP packages, temporary API responses containing expiring signed URLs, and cached dependencies unrelated to playback are excluded from version control. Task IDs and cost records are retained in the curated catalogs and state files. The Python generation helpers are operator tools that can spend Meshy credits; they should only be run intentionally.
