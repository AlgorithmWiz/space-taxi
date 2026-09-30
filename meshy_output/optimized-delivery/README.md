# Optimized Space Taxi assets

As of September 30, 2026: 15 models optimized and all six passengers rigged. Atlas, Pip, Sol and Rae each include optimized, rigged, walking and running GLBs. Eight props optimized in this batch: fuel canister, radar dish, enamel platform, candy cane, lollipop, cloud platform, lounger and parasol.

This batch consumed 80 credits (12 remeshes and four rigs, five credits each). Verified remaining balance: 0. Including the earlier taxi/Nova/Juno batch, optimization and rigging have consumed 105 credits.

Validation: GLB headers and lengths, triangle counts, texture references, skins, joint/weight attributes and animation tracks checked. The four new passengers were played in Chromium/Three.js; no errors or invalid animated bounds were reported. Walking/running views were inspected. Rigging supplied no separate preview; gallery images are remesh renders.

Limitations: fuel-canister remeshing introduced visible triangular surface artifacts; keep using the original until repaired. Original 4K textures remain large. Animation feet dip approximately 2.7–7.7 cm beneath the reference floor and need grounding during game integration. The game now uses compact derivatives of the taxi, all six passengers and seven props, with runtime foot grounding. The fuel-canister remesh is excluded.

21 of the 36 generated models remain unoptimized. All six passengers are rigged. See catalog.json for all current file locations, triangle counts, task IDs, resource types, projects and actual charges; batch-2026-09-30.json covers the latest batch only.

## Files and task trail

### taxi-classic

Project: `/media/pirate/EXTERNAL/Space Taxi/meshy_output/20260928_210000_taxi-classic_01a0e963`

- remesh: `01a0e987-8cef-70e9-8727-3125b736b215`; 5 credits
- optimized: `/media/pirate/EXTERNAL/Space Taxi/meshy_output/20260928_210000_taxi-classic_01a0e963/taxi-classic-optimized.glb` (13,789 triangles, 0 joints)

### passenger-nova-botanist

Project: `/media/pirate/EXTERNAL/Space Taxi/meshy_output/20260928_210316_passenger-nova-botanist_01a0e966`

- remesh: `01a0e987-98ba-7004-9c4e-de10b09c8b71`; 5 credits
- rigging: `01a0e98a-cdd4-7652-9863-a809dbd32b6e`; 5 credits
- optimized: `/media/pirate/EXTERNAL/Space Taxi/meshy_output/20260928_210316_passenger-nova-botanist_01a0e966/passenger-nova-botanist-optimized.glb` (10,395 triangles, 0 joints)
- rigged: `/media/pirate/EXTERNAL/Space Taxi/meshy_output/20260928_210316_passenger-nova-botanist_01a0e966/passenger-nova-botanist-rigged.glb` (10,395 triangles, 24 joints)
- walking: `/media/pirate/EXTERNAL/Space Taxi/meshy_output/20260928_210316_passenger-nova-botanist_01a0e966/passenger-nova-botanist-walking.glb` (10,395 triangles, 24 joints)
- running: `/media/pirate/EXTERNAL/Space Taxi/meshy_output/20260928_210316_passenger-nova-botanist_01a0e966/passenger-nova-botanist-running.glb` (10,395 triangles, 24 joints)

### passenger-juno-courier

Project: `/media/pirate/EXTERNAL/Space Taxi/meshy_output/20260928_210330_passenger-juno-courier_01a0e966`

- remesh: `01a0e987-a44e-776e-a84b-0aa48f2754ca`; 5 credits
- rigging: `01a0e98a-f78e-7422-9abe-dc950ac7edcc`; 5 credits
- optimized: `/media/pirate/EXTERNAL/Space Taxi/meshy_output/20260928_210330_passenger-juno-courier_01a0e966/passenger-juno-courier-optimized.glb` (10,344 triangles, 0 joints)
- rigged: `/media/pirate/EXTERNAL/Space Taxi/meshy_output/20260928_210330_passenger-juno-courier_01a0e966/passenger-juno-courier-rigged.glb` (10,344 triangles, 24 joints)
- walking: `/media/pirate/EXTERNAL/Space Taxi/meshy_output/20260928_210330_passenger-juno-courier_01a0e966/passenger-juno-courier-walking.glb` (10,344 triangles, 24 joints)
- running: `/media/pirate/EXTERNAL/Space Taxi/meshy_output/20260928_210330_passenger-juno-courier_01a0e966/passenger-juno-courier-running.glb` (10,344 triangles, 24 joints)
