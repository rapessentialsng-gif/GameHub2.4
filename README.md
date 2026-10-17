# GameHub2.4 — Frontline: Last Zone (Stage 1 playable prototype)

This repository contains Stage 1 — a mobile-first, cross-platform playable prototype of "Frontline: Last Zone" built with Three.js.

What I implemented in Stage 1
- Cross-platform web build (desktop + mobile browsers)
- Mobile-first touch joystick on the left and touch-to-aim on the right
- Touch buttons: Fire, Jump, Crouch, Reload, Sprint
- Desktop controls: WASD for movement, pointer-lock/mouse for looking and click to fire
- Realistic-feeling 3D characters (procedural low-poly geometries), multiple AI bots, shooting with projectile bullets and simple collision, health, ammo, and HUD
- Large flat map with props for cover and a shrinking safe zone
- Mobile optimizations: limited device pixel ratio, low-poly props, and simplified materials

Files changed
- `app.js` — complete Stage 1 Three.js prototype (mobile-optimized controls, bots, bullets, safe zone)
- `index.html` — minimal mobile-first HUD and control layout (already present)
- `README.md` — this file (updated with run & test instructions)

How to run (quick)
1. Clone the repo:
   git clone https://github.com/rapessentialsng-gif/GameHub2.4.git
2. Serve the files with a static server from the repo root (browsers block module imports from file://):
   cd GameHub2.4
   # Recommended: http-server (Node)
   npx http-server -c-1 .
   # Or Python (simple):
   python3 -m http.server 8000
3. Open the site on your device or browser at the server URL shown by the static server (for example `http://localhost:8080` or `http://localhost:8000`).

Notes on mobile testing
- Use a modern mobile browser (Chrome on Android, Safari on iOS). For iOS, prefer Safari due to WebGL/AOT limitations.
- If the page appears blank on mobile, ensure the server is reachable from the device (same LAN) and that modules are permitted.
- The prototype is intentionally low on assets (procedural geometry) to keep bundle size small and performance reasonable on phones.

Controls
- Mobile:
  - Move: left joystick (drag inside the round joystick)
  - Aim: drag anywhere on the right half of the screen
  - Fire: tap & hold the Fire button (top of the right button column)
  - Jump: J button
  - Crouch: toggle C button
  - Reload: R button
  - Sprint: hold S button
- Desktop:
  - Move: WASD
  - Look: move mouse (click in canvas to request pointer lock for continuous mouse-look)
  - Fire: left-click or Fire button

What to expect in Stage 1
- You spawn as a capsule-style player in a large flat map with several simple bots scattered around.
- Bots will approach and shoot at you; you can shoot back with limited ammo.
- There's a visible wireframe safe zone that shrinks every ~8 seconds. Standing outside the zone deals damage over time.
- HUD shows HP, Ammo, number of bots, and the current safe zone radius.

Performance & mobile tips
- The prototype limits renderer.setPixelRatio to at most 2 for better performance on high-DPI devices.
- Reduce the number of props or lower geometry subdivisions if performance is poor.
- For production builds consider: GLTF skinned meshes with baked LODs, texture compression (ASTC/ETC), GPU instancing, and occlusion culling.

Next steps I can take (if you'd like)
- Replace procedural characters with lightweight GLTF characters and weapon models (CDN-hosted samples)
- Improve bot AI (navmesh, cover, patrol/state machine)
- Add loot, spawn points, and a simple inventory/weapon system
- Create a PWA manifest and build wrappers (Capacitor/Capacitor) to produce APK/IPA

Commit notes
- I updated `app.js` to finalize a working Stage 1 prototype and mobile controls.

If you want me to continue, I can:
- Add small GLTF player/bot models (CDN) and a weapons pickup system
- Add better mobile performance tuning and an optional debug panel
- Package an APK via Capacitor for Android testing

Enjoy — test the prototype and tell me any bugs or improvements you want prioritized.