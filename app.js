import * as THREE from 'https://unpkg.com/three@0.146.0/build/three.module.js';

const container = document.getElementById('canvas-container');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 25, 180);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(0, 2.5, 6);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.domElement.style.touchAction = 'none';
container.appendChild(renderer.domElement);

// Lights
const hemi = new THREE.HemisphereLight(0xffffff, 0x334433, 1.1);
hemi.position.set(0, 50, 0);
scene.add(hemi);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
dirLight.position.set(-12, 20, -8);
scene.add(dirLight);

// Large map
const mapSize = 220;
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(mapSize, mapSize, 24, 24),
  new THREE.MeshStandardMaterial({ color: 0x6a8f32, roughness: 0.95, metalness: 0.05 })
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// Trees / cover props (simple, low-poly, fast to render)
const props = [];
for (let i = 0; i < 40; i++) {
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.26, 1.4, 8),
    new THREE.MeshStandardMaterial({ color: 0x5c3a1d })
  );
  trunk.position.set((Math.random() - 0.5) * 180, 0.7, (Math.random() - 0.5) * 180);
  scene.add(trunk);

  const leaves = new THREE.Mesh(
    new THREE.SphereGeometry(0.9, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0x2e7d32 })
  );
  leaves.position.set(trunk.position.x, 1.9, trunk.position.z);
  scene.add(leaves);

  props.push({ trunk, leaves });
}

// Player object
const player = {
  mesh: null,
  vel: new THREE.Vector3(),
  speed: 4,
  health: 100,
  ammo: 30,
  maxAmmo: 30,
  firing: false,
  sprint: false,
  crouch: false,
  _lastShot: 0
};

function createPlayerMesh() {
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.5, 1.1, 6, 12),
    new THREE.MeshStandardMaterial({ color: 0x4e72ff, roughness: 0.7 })
  );
  body.position.y = 1.1;
  group.add(body);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0xf2d0b1, roughness: 0.8 })
  );
  head.position.y = 2.1;
  group.add(head);

  return group;
}

player.mesh = createPlayerMesh();
scene.add(player.mesh);
player.mesh.position.set(0, 0, 0);

// Bots
const bots = [];
function spawnBot(x, z) {
  const bot = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.42, 0.9, 6, 10),
    new THREE.MeshStandardMaterial({ color: 0xe14f4f, roughness: 0.7 })
  );
  body.position.y = 1.0;
  bot.add(body);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0xebb899 })
  );
  head.position.y = 1.9;
  bot.add(head);

  bot.position.set(x, 0, z);
  bot.userData = { health: 50, targetTimer: 0 };
  scene.add(bot);
  bots.push(bot);
}

for (let i = 0; i < 8; i++) {
  const angle = Math.random() * Math.PI * 2;
  const r = 20 + Math.random() * 55;
  spawnBot(Math.cos(angle) * r, Math.sin(angle) * r);
}

// Safe zone
let safeZoneRadius = 80;
const safeZoneCenter = new THREE.Vector2(0, 0);
let safeZoneMesh = new THREE.Mesh(
  new THREE.CircleGeometry(safeZoneRadius, 72),
  new THREE.MeshBasicMaterial({ color: 0x00d486, wireframe: true, transparent: true, opacity: 0.35 })
);
safeZoneMesh.rotation.x = -Math.PI / 2;
safeZoneMesh.position.y = 0.03;
scene.add(safeZoneMesh);
let zoneShrinkTimer = 0;

// Bullets
const bullets = [];
function shoot(origin, direction, owner) {
  const bullet = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 8, 8),
    new THREE.MeshBasicMaterial({ color: owner === 'player' ? 0xfaf070 : 0xffa54d })
  );
  bullet.position.copy(origin);
  bullet.userData = {
    owner,
    vel: direction.clone().multiplyScalar(42),
    life: 4
  };
  scene.add(bullet);
  bullets.push(bullet);
}

// HUD
const message = document.getElementById('message');
function setMessage(text) {
  message.textContent = text;
}

// Joystick controls
const joy = document.getElementById('joy');
const stick = document.getElementById('stick');
let joyActive = false;
let joyOrigin = null;
let joyVector = { x: 0, y: 0 };

function getPoint(event) {
  const touch = event.touches ? event.touches[0] : event;
  return { x: touch.clientX, y: touch.clientY };
}

function onJoyStart(event) {
  const p = getPoint(event);
  if (p.x > window.innerWidth / 2) return;
  joyActive = true;
  joyOrigin = p;
  stick.style.transition = '0s';
}

function onJoyMove(event) {
  if (!joyActive || !joyOrigin) return;
  const p = getPoint(event);
  const dx = p.x - joyOrigin.x;
  const dy = p.y - joyOrigin.y;
  const max = 48;
  const nx = Math.max(-1, Math.min(1, dx / max));
  const ny = Math.max(-1, Math.min(1, dy / max));

  stick.style.transform = `translate(${nx * max * 0.7}px, ${ny * max * 0.7}px)`;
  joyVector.x = nx;
  joyVector.y = -ny;
}

function onJoyEnd() {
  joyActive = false;
  joyOrigin = null;
  stick.style.transition = '0.08s ease';
  stick.style.transform = 'translate(0, 0)';
  joyVector = { x: 0, y: 0 };
}

joy.addEventListener('touchstart', onJoyStart, { passive: true });
joy.addEventListener('touchmove', onJoyMove, { passive: true });
joy.addEventListener('touchend', onJoyEnd);
joy.addEventListener('pointerdown', onJoyStart);
window.addEventListener('pointermove', onJoyMove);
window.addEventListener('pointerup', onJoyEnd);

// Aim / look controls
let aimYaw = 0;
let aimPitch = 0;
let lastPointer = null;
let isPointerDown = false;

renderer.domElement.addEventListener('pointerdown', (event) => {
  if (event.clientX > window.innerWidth / 2) {
    isPointerDown = true;
    lastPointer = { x: event.clientX, y: event.clientY };
  }
});
renderer.domElement.addEventListener('pointermove', (event) => {
  if (!isPointerDown || !lastPointer) return;
  const dx = (event.clientX - lastPointer.x) / window.innerWidth;
  const dy = (event.clientY - lastPointer.y) / window.innerHeight;

  aimYaw -= dx * Math.PI * 1.8;
  aimPitch -= dy * Math.PI * 1.25;
  aimPitch = Math.max(-0.7, Math.min(0.7, aimPitch));
  lastPointer = { x: event.clientX, y: event.clientY };
});
renderer.domElement.addEventListener('pointerup', () => {
  isPointerDown = false;
  lastPointer = null;
});
renderer.domElement.addEventListener('pointerleave', () => {
  isPointerDown = false;
  lastPointer = null;
});

window.addEventListener('mousemove', (event) => {
  if (document.pointerLockElement === renderer.domElement) {
    aimYaw -= (event.movementX / window.innerWidth) * Math.PI * 2.2;
    aimPitch -= (event.movementY / window.innerHeight) * Math.PI * 1.6;
    aimPitch = Math.max(-0.7, Math.min(0.7, aimPitch));
  }
});

renderer.domElement.addEventListener('click', () => {
  if (!document.pointerLockElement && renderer.domElement.requestPointerLock) {
    renderer.domElement.requestPointerLock();
  }
});

// Buttons
const btnFire = document.getElementById('btn-fire');
btnFire.addEventListener('touchstart', (event) => {
  event.preventDefault();
  player.firing = true;
});
btnFire.addEventListener('touchend', (event) => {
  event.preventDefault();
  player.firing = false;
});
btnFire.addEventListener('mousedown', () => { player.firing = true; });
btnFire.addEventListener('mouseup', () => { player.firing = false; });

const btnJump = document.getElementById('btn-jump');
btnJump.addEventListener('click', () => {
  if (player.mesh.position.y <= 1.05) {
    player.vel.y = 6;
  }
});

const btnSprint = document.getElementById('btn-sprint');
btnSprint.addEventListener('pointerdown', () => { player.sprint = true; });
btnSprint.addEventListener('pointerup', () => { player.sprint = false; });
btnSprint.addEventListener('pointerleave', () => { player.sprint = false; });

const btnCrouch = document.getElementById('btn-crouch');
btnCrouch.addEventListener('click', () => {
  player.crouch = !player.crouch;
  setMessage(`Crouch: ${player.crouch ? 'ON' : 'OFF'}`);
});

const btnReload = document.getElementById('btn-reload');
btnReload.addEventListener('click', () => {
  player.ammo = player.maxAmmo;
  setMessage('Reloaded');
});

// Keyboard input
const keys = {};
window.addEventListener('keydown', (event) => {
  keys[event.key.toLowerCase()] = true;
});
window.addEventListener('keyup', (event) => {
  keys[event.key.toLowerCase()] = false;
});

// Camera update
function updateCamera() {
  const facing = new THREE.Vector3(Math.sin(aimYaw), 0, Math.cos(aimYaw));
  const camPos = player.mesh.position.clone().add(new THREE.Vector3(-facing.x * 5, 2.3, -facing.z * 5));
  camera.position.lerp(camPos, 0.16);
  camera.lookAt(player.mesh.position.clone().add(new THREE.Vector3(0, 1.4, 0)));
}

// Main loop
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, clock.getDelta());

  // Player movement from joystick + keyboard
  let moveX = 0;
  let moveZ = 0;

  if (Math.abs(joyVector.x) > 0.05 || Math.abs(joyVector.y) > 0.05) {
    moveX = joyVector.x;
    moveZ = joyVector.y;
  }

  if (keys.w) moveZ = 1;
  if (keys.s) moveZ = -1;
  if (keys.a) moveX = -1;
  if (keys.d) moveX = 1;

  const input = new THREE.Vector3(moveX, 0, moveZ);
  if (input.lengthSq() > 0.01) {
    input.normalize();
  }

  const currentSpeed = player.sprint ? player.speed * 1.7 : player.speed;
  const forward = new THREE.Vector3(Math.sin(aimYaw), 0, Math.cos(aimYaw));
  const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), forward).normalize();

  const movement = new THREE.Vector3();
  movement.addScaledVector(forward, input.z * currentSpeed);
  movement.addScaledVector(right, input.x * currentSpeed);
  player.mesh.position.addScaledVector(movement, dt);

  // Keep player inside the play area
  const halfMap = mapSize * 0.42;
  player.mesh.position.x = THREE.MathUtils.clamp(player.mesh.position.x, -halfMap, halfMap);
  player.mesh.position.z = THREE.MathUtils.clamp(player.mesh.position.z, -halfMap, halfMap);

  // Gravity / jump
  player.vel.y -= 9.8 * dt;
  player.mesh.position.y += player.vel.y * dt;
  if (player.mesh.position.y < 0) {
    player.mesh.position.y = 0;
    player.vel.y = 0;
  }

  // Rotate player to aim direction
  player.mesh.rotation.y = aimYaw;

  // Shooting
  if (player.firing && player.ammo > 0) {
    const now = performance.now();
    if (!player._lastShot || now - player._lastShot > 160) {
      player._lastShot = now;
      player.ammo -= 1;
      const origin = player.mesh.position.clone().add(new THREE.Vector3(0, 1.35, 0));
      const dir = new THREE.Vector3(
        Math.sin(aimYaw) * Math.cos(aimPitch),
        Math.sin(aimPitch),
        Math.cos(aimYaw) * Math.cos(aimPitch)
      ).normalize();
      shoot(origin, dir, 'player');
    }
  }

  // Bots movement & shooting
  bots.forEach((bot) => {
    if (!bot || !bot.userData) return;

    const toPlayer = player.mesh.position.clone().sub(bot.position);
    const dist = toPlayer.length();

    if (dist > 0.5) {
      toPlayer.y = 0;
      const step = toPlayer.clone().normalize();
      const chaseSpeed = dist > 10 ? 1.45 : 0.6;
      bot.position.addScaledVector(step, chaseSpeed * dt);
    }

    bot.lookAt(player.mesh.position.clone().setY(bot.position.y + 1));
    bot.userData.targetTimer += dt;

    if (dist < 24 && bot.userData.targetTimer > 1.2) {
      bot.userData.targetTimer = 0;
      const origin = bot.position.clone().add(new THREE.Vector3(0, 1.1, 0));
      const dir = player.mesh.position.clone().sub(bot.position).normalize();
      shoot(origin, dir, 'bot');
    }
  });

  // Bullet update & collisions
  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i];
    bullet.position.addScaledVector(bullet.userData.vel, dt);
    bullet.userData.life -= dt;

    if (bullet.userData.life <= 0) {
      scene.remove(bullet);
      bullets.splice(i, 1);
      continue;
    }

    if (bullet.position.distanceTo(player.mesh.position) > 500) {
      scene.remove(bullet);
      bullets.splice(i, 1);
      continue;
    }

    if (bullet.userData.owner === 'player') {
      for (let j = bots.length - 1; j >= 0; j--) {
        const bot = bots[j];
        if (!bot) continue;
        if (bot.position.distanceTo(bullet.position) < 0.9) {
          bot.userData.health -= 25;
          scene.remove(bullet);
          bullets.splice(i, 1);

          if (bot.userData.health <= 0) {
            scene.remove(bot);
            bots.splice(j, 1);
            setMessage('Bot eliminated!');
          }
          break;
        }
      }
    } else if (bullet.userData.owner === 'bot') {
      if (player.mesh.position.distanceTo(bullet.position) < 1.0) {
        player.health -= 10;
        scene.remove(bullet);
        bullets.splice(i, 1);
        setMessage(`Hit! HP: ${Math.max(0, Math.round(player.health))}`);
      }
    }
  }

  // Safe zone shrink
  zoneShrinkTimer += dt;
  if (zoneShrinkTimer > 8) {
    zoneShrinkTimer = 0;
    safeZoneRadius = Math.max(8, safeZoneRadius - 6);
    scene.remove(safeZoneMesh);
    safeZoneMesh.geometry.dispose();
    safeZoneMesh = new THREE.Mesh(
      new THREE.CircleGeometry(safeZoneRadius, 72),
      new THREE.MeshBasicMaterial({ color: 0x00d486, wireframe: true, transparent: true, opacity: 0.35 })
    );
    safeZoneMesh.rotation.x = -Math.PI / 2;
    safeZoneMesh.position.y = 0.03;
    scene.add(safeZoneMesh);
  }

  const player2D = new THREE.Vector2(player.mesh.position.x, player.mesh.position.z);
  if (player2D.distanceTo(safeZoneCenter) > safeZoneRadius) {
    player.health -= 8 * dt;
  }

  if (player.health <= 0) {
    player.health = 0;
    setMessage('Eliminated. Reload the page to play again.');
  }

  updateCamera();
  renderer.render(scene, camera);
}

animate();

// Resize handling
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
});

setMessage('Prototype running — HP: 100 Ammo: 30');

setInterval(() => {
  const safeText = Math.round(safeZoneRadius);
  const botText = bots.length;
  setMessage(`HP: ${Math.max(0, Math.round(player.health))} Ammo: ${player.ammo} Bots: ${botText} Zone: ${safeText}`);
}, 500);
