# GameHub2.4 — Frontline: Last Zone prototype

This repository was empty. I added a playable single-player prototype for "Frontline: Last Zone" built with Three.js and mobile-first controls.

Stage 1 implemented here (prototype):
- Cross-platform web build (runs on desktop and mobile browsers)
- Touch joystick for movement and touch aiming on right side
- Fire, jump, crouch, reload, sprint buttons
- Player capsule, multiple AI bots that navigate toward the player and shoot
- Shooting with simple projectile collisions
- Health, ammo, HUD
- Large flat map and a shrinking safe zone

How to run (quick):
1. Clone the repo:
   git clone https://github.com/rapessentialsng-gif/GameHub2.4.git
2. Serve the files with a static server (recommended):
   cd GameHub2.4
   npx http-server -c-1 .  # or: python3 -m http.server 8000
3. Open the site on your device or browser at http://localhost:8080 (http-server default) or http://localhost:8000

Controls:
- Mobile: left joystick (move), drag right side to aim, fire button on right vertical stack.
- Desktop: WASD to move, mouse to aim (click inside canvas to lock pointer), left click/Fire button to shoot.

Notes and next steps:
- This is a Stage 1 playable prototype. Art is procedural (geometries) for portability. For more realism, add GLTF character models, weapon models, and textures.
- AI is simplistic: it moves toward player and fires. Improve with navmesh, cover, and state machines.
- Optimize rendering and add LOD / texture compression for mobile.

If you want, I can:
- Add GLTF character models and sample weapons (I will reference CDN-hosted models or include smaller assets)
- Improve bot AI and add spawn points, loot, and inventory
- Build an APK / iOS wrapper using Capacitor / Cordova or a PWA manifest for home-screen installation

