# Model assets and local playback

The GLB models and reference/preview images use Git LFS. After cloning, install Git LFS and run `git lfs pull` to download them.

Run `PORT=5188 npm start` from the repository root, then open `http://localhost:5188/meshy_output/playtest/index.html` for Nova/Juno animation playback. The viewer's Three.js r186 runtime and required loaders are included. `playtest/REPORT.md` records the checks and remaining ground-contact adjustment.

`catalog.json` lists the 36 generated models. `optimized-delivery/catalog.json` lists the optimized taxi and the optimized/rigged Nova and Juno files. Paths in those original records refer to the generating workstation; the actual files are stored under the corresponding project folders in this directory. The viewer resolves those records into repository-relative URLs.

Original source models are retained alongside optimized versions. These assets have not been integrated into the game campaign. Four passengers remain unrigged and 33 generated models remain unoptimized.

Duplicate ZIP packages, temporary API responses containing expiring signed URLs, and cached dependencies unrelated to playback are excluded from version control. Task IDs and cost records are retained in the curated catalogs and state files. The Python generation helpers are operator tools that can spend Meshy credits; they should only be run intentionally.
