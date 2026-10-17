import * as THREE from 'https://unpkg.com/three@0.146.0/build/three.module.js';

const GAME_CONFIG = {
  stage: 1,
  level: 1,
  totalStages: 4,
  levelsPerStage: 50,
  saveKey: 'frontline_last_zone_save_v1',
};

const container = document.getElementById('canvas-container');
const menuScreen = document.getElementById('menu-screen');
const hud = document.getElementById('hud');
const startButton = document.getElementById('start-button');
const stageSelect = document.getElementById('stage-select');
const levelSelect = document.getElementById('level-select');
const saveStageChip = document.getElementById('save-stage-chip');
const saveLevelChip = document.getElementById('save-level-chip');
const saveXpChip = document.getElementById('save-xp-chip');
const saveKillsChip = document.getElementById('save-kills-chip');

const healthStat = document.getElementById('health-stat');
const ammoStat = document.getElementById('ammo-stat');
const stageStat = document.getElementById('stage-stat');
const levelStat = document.getElementById('level-stat');
const xpStat = document.getElementById('xp-stat');
const objectiveText = document.getElementById('objective-text');
const centerBanner = document.getElementById('center-banner');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x7fb4d9);
scene.fog = new THREE.Fog(0x7fb4d9, 30, 220);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.domElement.style.touchAction = 'none';
container.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 600);
camera.position.set(0, 2.6, 8);

const hemi = new THREE.HemisphereLight(0xffffff, 0x405132, 1.2);
hemi.position.set(0, 50, 0);
scene.add(hemi);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(-12, 26, -12);
scene.add(dirLight);

const ambient = new THREE.AmbientLight(0xffffff, 0.18);
scene.add(ambient);

const mapSize = 220;
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(mapSize, mapSize, 2, 2),
  new THREE.MeshStandardMaterial({ color: 0x6d8f52, roughness: 0.96, metalness: 0.05 })
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

const road = new THREE.Mesh(
  new THREE.PlaneGeometry(38, 180, 1, 1),
  new THREE.MeshStandardMaterial({ color: 0x4a5459, roughness: 0.8, metalness: 0.2 })
);
road.rotation.x = -Math.PI / 2;
road.position.set(0, 0.01, 0);
scene.add(road);

const safeZoneCenter = new THREE.Vector2(0, 0);
let safeZoneRadius = 80;
let safeZoneMesh = new THREE.Mesh(
  new THREE.CircleGeometry(safeZoneRadius, 80),
  new THREE.MeshBasicMaterial({ color: 0x5ef7b8, wireframe: true, transparent: true, opacity: 0.42 })
);
safeZoneMesh.rotation.x = -Math.PI / 2;
safeZoneMesh.position.y = 0.03;
scene.add(safeZoneMesh);
let zoneShrinkTimer = 0;

const props = [];
function addProp(x, z, type = 'tree') {
  if (type === 'tree') {
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.28, 1.8, 8),
      new THREE.MeshStandardMaterial({ color: 0x5c3b1f })
    );
    trunk.position.set(x, 0.9, z);
    scene.add(trunk);

    const leaves = new THREE.Mesh(
      new THREE.SphereGeometry(1.05, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0x2f7d43 })
    );
    leaves.position.set(x, 2.2, z);
    scene.add(leaves);
    props.push({ type: 'tree', position: new THREE.Vector3(x, 0, z), radius: 1.5 });
  } else if (type === 'crate') {
    const crate = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 1.3, 1.3),
      new THREE.MeshStandardMaterial({ color: 0x7a6f52, roughness: 0.9 })
    );
    crate.position.set(x, 0.65, z);
    scene.add(crate);
    props.push({ type: 'crate', position: new THREE.Vector3(x, 0, z), radius: 1.1 });
  }
}

for (let i = 0; i < 55; i++) {
  const x = (Math.random() - 0.5) * 170;
  const z = (Math.random() - 0.5) * 170;
  addProp(x, z, Math.random() > 0.5 ? 'tree' : 'crate');
}

function createBodyColor(r, g, b) {
  return new THREE.MeshStandardMaterial({ color: new THREE.Color(r, g, b), roughness: 0.7, metalness: 0.15 });
}

const player = {
  mesh: null,
  speed: 5.8,
  sprintMultiplier: 1.7,
  health: 100,
  maxHealth: 100,
  ammo: 30,
  maxAmmo: 30,
  xp: 0,
  kills: 0,
  vel: new THREE.Vector3(),
  sprint: false,
  crouch: false,
  firing: false,
  _lastShot: 0,
  _cooldown: 0,
};

function createPlayerMesh() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.56, 1.25, 6, 14), createBodyColor(0.3, 0.55, 1.0));
  body.position.y = 1.25;
  group.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 14), new THREE.MeshStandardMaterial({ color: 0xf0d2b2, roughness: 0.9 }));
  head.position.y = 2.3;
  group.add(head);

  const weapon = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.18, 1.1),
    new THREE.MeshStandardMaterial({ color: 0x1a1e22, metalness: 0.6, roughness: 0.35 })
  );
  weapon.position.set(0.5, 1.4, 0.6);
  weapon.rotation.x = -0.3;
  group.add(weapon);

  return group;
}

player.mesh = createPlayerMesh();
scene.add(player.mesh);
player.mesh.position.set(0, 0, 0);

const bots = [];
function spawnBot(x, z, tone = 0xff5a5a) {
  const bot = new THREE.Group();

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.45, 0.95, 5, 12), new THREE.MeshStandardMaterial({ color: tone, roughness: 0.72 }));
  body.position.y = 1.0;
  bot.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 12), new THREE.MeshStandardMaterial({ color: 0xe8c29a, roughness: 0.8 }));
  head.position.y = 1.95;
  bot.add(head);

  const gun = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.12, 0.8),
    new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.5, roughness: 0.4 })
  );
  gun.position.set(0.4, 1.3, 0.5);
  gun.rotation.x = -0.2;
  bot.add(gun);

  bot.position.set(x, 0, z);
  bot.userData = {
    health: 55,
    targetTimer: 0,
    alive: true,
    speed: 1.2 + Math.random() * 0.9,
    attackDelay: 0.85 + Math.random() * 0.6,
  };

  scene.add(bot);
  bots.push(bot);
}

function spawnWaveForLevel(level) {
  for (let i = bots.length - 1; i >= 0; i--) {
    const old = bots[i];
    scene.remove(old);
    bots.splice(i, 1);
  }

  const count = Math.min(8 + level, 18);
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.8;
    const radius = 24 + Math.random() * (42 + level * 3);
    spawnBot(Math.cos(angle) * radius, Math.sin(angle) * radius, i % 2 === 0 ? 0xff6b6b : 0xffb449);
  }
}

const bullets = [];
function shoot(origin, direction, owner) {
  const bullet = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 8, 8),
    new THREE.MeshBasicMaterial({ color: owner === 'player' ? 0xfaf7a4 : 0xff924a })
  );
  bullet.position.copy(origin);
  bullet.userData = { owner, vel: direction.clone().multiplyScalar(owner === 'player' ? 46 : 30), life: 3.5 };
  scene.add(bullet);
  bullets.push(bullet);
}

function updateObjectiveText() {
  const objective = `Eliminate ${Math.max(0, bots.length)} hostiles and survive the shrinking zone. ${player.health > 0 ? 'Advance when objective is complete.' : 'Mission failed.'}`;
  objectiveText.textContent = objective;
}

function updateHUD() {
  healthStat.textContent = `${Math.max(0, Math.round(player.health))}`;
  ammoStat.textContent = `${player.ammo}`;
  stageStat.textContent = `${GAME_CONFIG.stage}`;
  levelStat.textContent = `${GAME_CONFIG.level}`;
  xpStat.textContent = `${player.xp}`;
  updateObjectiveText();
}

function saveProgress() {
  const payload = {
    stage: GAME_CONFIG.stage,
    level: GAME_CONFIG.level,
    xp: player.xp,
    kills: player.kills,
  };
  localStorage.setItem(GAME_CONFIG.saveKey, JSON.stringify(payload));

  saveStageChip.textContent = `Stage ${GAME_CONFIG.stage}`;
  saveLevelChip.textContent = `Level ${GAME_CONFIG.level}`;
  saveXpChip.textContent = `XP ${player.xp}`;
  saveKillsChip.textContent = `Kills ${player.kills}`;
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(GAME_CONFIG.saveKey);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (saved.stage) GAME_CONFIG.stage = Math.min(saved.stage, GAME_CONFIG.totalStages);
    if (saved.level) GAME_CONFIG.level = Math.min(saved.level, GAME_CONFIG.levelsPerStage);
    if (saved.xp) player.xp = saved.xp;
    if (saved.kills) player.kills = saved.kills;
  } catch (err) {
    console.warn('Progress load failed', err);
  }
}

function repopulateStageSelect() {
  stageSelect.innerHTML = '';
  for (let s = 1; s <= GAME_CONFIG.totalStages; s++) {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = `Stage ${s}`;
    if (s === GAME_CONFIG.stage) opt.selected = true;
    stageSelect.appendChild(opt);
  }

  repopulateLevelSelect();
}

function repopulateLevelSelect() {
  levelSelect.innerHTML = '';
  const maxLevel = GAME_CONFIG.levelsPerStage;
  for (let l = 1; l <= maxLevel; l++) {
    const opt = document.createElement('option');
    opt.value = l;
    opt.textContent = `Level ${l}`;
    if (l === GAME_CONFIG.level) opt.selected = true;
    levelSelect.appendChild(opt);
  }
}

stageSelect.addEventListener('change', (event) => {
  GAME_CONFIG.stage = Number(event.target.value);
  if (GAME_CONFIG.level > GAME_CONFIG.levelsPerStage) GAME_CONFIG.level = GAME_CONFIG.levelsPerStage;
  repopulateLevelSelect();
  saveProgress();
});

levelSelect.addEventListener('change', (event) => {
  GAME_CONFIG.level = Number(event.target.value);
  saveProgress();
});

function startGame() {
  menuScreen.classList.add('hidden');
  hud.classList.remove('hidden');
  centerBanner.textContent = `Stage ${GAME_CONFIG.stage} — Level ${GAME_CONFIG.level}`;
  spawnWaveForLevel(GAME_CONFIG.level);
  saveProgress();
  updateHUD();
}

startButton.addEventListener('click', startGame);

function advanceLevel() {
  if (bots.length > 0) return;

  player.xp += 60 + GAME_CONFIG.level * 12;
  player.ammo = player.maxAmmo;
  const nextLevel = GAME_CONFIG.level + 1;
  if (nextLevel > GAME_CONFIG.levelsPerStage) {
    GAME_CONFIG.level = 1;
    GAME_CONFIG.stage = Math.min(GAME_CONFIG.stage + 1, GAME_CONFIG.totalStages);
  } else {
    GAME_CONFIG.level = nextLevel;
  }

  centerBanner.textContent = `Mission complete! Stage ${GAME_CONFIG.stage} — Level ${GAME_CONFIG.level}`;
  repopulateStageSelect();
  repopulateLevelSelect();
  saveProgress();
  setTimeout(() => {
    centerBanner.textContent = `Stage ${GAME_CONFIG.stage} — Level ${GAME_CONFIG.level}`;
    spawnWaveForLevel(GAME_CONFIG.level);
    updateHUD();
  }, 900);
}

// Joystick setup
const joy = document.getElementById('joy');
const stick = document.getElementById('stick');
let joyActive = false;
let joyOrigin = null;
let stickVec = { x: 0, y: 0 };

function getEventPoint(event) {
  const source = event.touches ? event.touches[0] : event;
  return { x: source.clientX, y: source.clientY };
}

function onJoyStart(event) {
  const p = getEventPoint(event);
  if (p.x > window.innerWidth / 2) return;
  joyActive = true;
  joyOrigin = p;
}

function onJoyMove(event) {
  if (!joyActive || !joyOrigin) return;
  const p = getEventPoint(event);
  const dx = p.x - joyOrigin.x;
  const dy = p.y - joyOrigin.y;
  const max = 44;
  const nx = Math.max(-1, Math.min(1, dx / max));
  const ny = Math.max(-1, Math.min(1, dy / max));
  stick.style.transform = `translate(${nx * max * 0.8}px, ${ny * max * 0.8}px)`;
  stickVec = { x: nx, y: -ny };
}

function onJoyEnd() {
  joyActive = false;
  joyOrigin = null;
  stick.style.transition = '0.08s ease';
  stick.style.transform = 'translate(0,0)';
  stickVec = { x: 0, y: 0 };
}

joy.addEventListener('touchstart', onJoyStart, { passive: true });
joy.addEventListener('touchmove', onJoyMove, { passive: true });
joy.addEventListener('touchend', onJoyEnd);
joy.addEventListener('pointerdown', onJoyStart);
window.addEventListener('pointermove', onJoyMove);
window.addEventListener('pointerup', onJoyEnd);

// camera / mouse aim
let aimYaw = 0;
let aimPitch = 0;
let pointerDown = false;
let lastPointer = null;

renderer.domElement.addEventListener('pointerdown', (event) => {
  if (event.clientX > window.innerWidth / 2) {
    pointerDown = true;
    lastPointer = { x: event.clientX, y: event.clientY };
  }
});

renderer.domElement.addEventListener('pointermove', (event) => {
  if (!pointerDown || !lastPointer) return;
  const dx = (event.clientX - lastPointer.x) / window.innerWidth;
  const dy = (event.clientY - lastPointer.y) / window.innerHeight;
  aimYaw -= dx * Math.PI * 1.8;
  aimPitch -= dy * Math.PI * 1.6;
  aimPitch = Math.max(-0.8, Math.min(0.8, aimPitch));
  lastPointer = { x: event.clientX, y: event.clientY };
});

renderer.domElement.addEventListener('pointerup', () => {
  pointerDown = false;
  lastPointer = null;
});

renderer.domElement.addEventListener('pointerleave', () => {
  pointerDown = false;
  lastPointer = null;
});

window.addEventListener('mousemove', (event) => {
  if (document.pointerLockElement === renderer.domElement) {
    aimYaw -= (event.movementX / window.innerWidth) * Math.PI * 2.8;
    aimPitch -= (event.movementY / window.innerHeight) * Math.PI * 2.0;
    aimPitch = Math.max(-0.8, Math.min(0.8, aimPitch));
  }
});

renderer.domElement.addEventListener('click', () => {
  if (!document.pointerLockElement && renderer.domElement.requestPointerLock) {
    renderer.domElement.requestPointerLock();
  }
});

const btnFire = document.getElementById('btn-fire');
const btnJump = document.getElementById('btn-jump');
const btnCrouch = document.getElementById('btn-crouch');
const btnReload = document.getElementById('btn-reload');
const btnSprint = document.getElementById('btn-sprint');

btnFire.addEventListener('touchstart', (event) => { event.preventDefault(); player.firing = true; }, { passive: false });
btnFire.addEventListener('touchend', (event) => { event.preventDefault(); player.firing = false; }, { passive: false });
btnFire.addEventListener('mousedown', () => { player.firing = true; });
btnFire.addEventListener('mouseup', () => { player.firing = false; });

btnJump.addEventListener('click', () => {
  if (player.mesh.position.y <= 0.06) player.vel.y = 6.2;
});

btnSprint.addEventListener('pointerdown', () => { player.sprint = true; });
btnSprint.addEventListener('pointerup', () => { player.sprint = false; });
btnSprint.addEventListener('pointerleave', () => { player.sprint = false; });

btnCrouch.addEventListener('click', () => {
  player.crouch = !player.crouch;
  centerBanner.textContent = `Crouch ${player.crouch ? 'ON' : 'OFF'}`;
  setTimeout(() => { centerBanner.textContent = `Stage ${GAME_CONFIG.stage} — Level ${GAME_CONFIG.level}`; }, 300);
});

btnReload.addEventListener('click', () => {
  if (player.ammo !== player.maxAmmo) {
    player.ammo = player.maxAmmo;
    centerBanner.textContent = 'Reloaded';
    setTimeout(() => { centerBanner.textContent = `Stage ${GAME_CONFIG.stage} — Level ${GAME_CONFIG.level}`; }, 330);
  }
});

const keys = {};
window.addEventListener('keydown', (event) => {
  keys[event.key.toLowerCase()] = true;
  if (event.code === 'Space') {
    event.preventDefault();
    if (player.mesh.position.y <= 0.05) player.vel.y = 6.2;
  }
  if (event.key.toLowerCase() === 'x') {
    player.firing = true;
  }
});
window.addEventListener('keyup', (event) => {
  keys[event.key.toLowerCase()] = false;
  if (event.key.toLowerCase() === 'x') {
    player.firing = false;
  }
});

function updateCamera() {
  const facing = new THREE.Vector3(Math.sin(aimYaw), 0, Math.cos(aimYaw));
  const cameraDistance = 5.5;
  const camPos = player.mesh.position.clone().add(new THREE.Vector3(-facing.x * cameraDistance, 2.5 + Math.sin(aimPitch) * 0.8, -facing.z * cameraDistance));
  camera.position.lerp(camPos, 0.15);
  camera.lookAt(player.mesh.position.clone().add(new THREE.Vector3(0, 1.4, 0)));
}

function updatePlayerMovement(dt) {
  let moveX = 0;
  let moveZ = 0;

  if (Math.abs(stickVec.x) > 0.08 || Math.abs(stickVec.y) > 0.08) {
    moveX = stickVec.x;
    moveZ = stickVec.y;
  }

  if (keys['w']) moveZ = 1;
  if (keys['s']) moveZ = -1;
  if (keys['a']) moveX = -1;
  if (keys['d']) moveX = 1;

  const input = new THREE.Vector3(moveX, 0, moveZ);
  if (input.lengthSq() > 0.01) input.normalize();

  const speed = player.sprint ? player.speed * player.sprintMultiplier : player.speed;
  const forward = new THREE.Vector3(Math.sin(aimYaw), 0, Math.cos(aimYaw));
  const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), forward).normalize();

  const movement = new THREE.Vector3();
  movement.addScaledVector(forward, input.z * speed);
  movement.addScaledVector(right, input.x * speed);

  player.mesh.position.addScaledVector(movement, dt);
  player.mesh.position.x = THREE.MathUtils.clamp(player.mesh.position.x, -mapSize * 0.42, mapSize * 0.42);
  player.mesh.position.z = THREE.MathUtils.clamp(player.mesh.position.z, -mapSize * 0.42, mapSize * 0.42);

  player.vel.y -= 12.0 * dt;
  player.mesh.position.y += player.vel.y * dt;
  if (player.mesh.position.y < 0) {
    player.mesh.position.y = 0;
    player.vel.y = 0;
  }

  player.mesh.rotation.y = aimYaw;
}

function handleShooting(dt) {
  if (player.firing && player.ammo > 0) {
    const now = performance.now();
    if (now - player._lastShot > 170) {
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

  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i];
    bullet.position.addScaledVector(bullet.userData.vel, dt);
    bullet.userData.life -= dt;

    if (bullet.userData.life <= 0) {
      scene.remove(bullet);
      bullets.splice(i, 1);
      continue;
    }

    const playerDistance = bullet.position.distanceTo(player.mesh.position);
    if (playerDistance > 500) {
      scene.remove(bullet);
      bullets.splice(i, 1);
      continue;
    }

    if (bullet.userData.owner === 'player') {
      for (let j = bots.length - 1; j >= 0; j--) {
        const bot = bots[j];
        if (!bot || !bot.userData.alive) continue;
        if (bot.position.distanceTo(bullet.position) < 1.1) {
          bot.userData.health -= 35;
          scene.remove(bullet);
          bullets.splice(i, 1);
          if (bot.userData.health <= 0) {
            scene.remove(bot);
            bot.userData.alive = false;
            bots.splice(j, 1);
            player.kills += 1;
            player.xp += 120;
            centerBanner.textContent = 'Hostile neutralized';
            setTimeout(() => {
              centerBanner.textContent = `Stage ${GAME_CONFIG.stage} — Level ${GAME_CONFIG.level}`;
            }, 220);
          }
          break;
        }
      }
    } else if (bullet.userData.owner === 'bot') {
      if (player.mesh.position.distanceTo(bullet.position) < 1.0) {
        player.health -= 8;
        scene.remove(bullet);
        bullets.splice(i, 1);
      }
    }
  }
}

function updateBots(dt) {
  bots.forEach((bot) => {
    if (!bot || !bot.userData.alive) return;

    const toPlayer = player.mesh.position.clone().sub(bot.position);
    const dist = toPlayer.length();
    if (dist > 0.1) {
      const step = toPlayer.clone().setY(0).normalize();
      const speed = bot.userData.speed * (dist > 10 ? 1 : 0.6);
      bot.position.addScaledVector(step, speed * dt);
    }

    bot.lookAt(player.mesh.position.clone().setY(bot.position.y + 1.0));
    bot.userData.targetTimer += dt;

    if (dist < 20 && bot.userData.targetTimer >= bot.userData.attackDelay) {
      bot.userData.targetTimer = 0;
      const origin = bot.position.clone().add(new THREE.Vector3(0, 1.2, 0));
      const dir = player.mesh.position.clone().sub(bot.position).normalize();
      shoot(origin, dir, 'bot');
    }
  });
}

function updateZone(dt) {
  zoneShrinkTimer += dt;
  if (zoneShrinkTimer > 8) {
    zoneShrinkTimer = 0;
    safeZoneRadius = Math.max(12, safeZoneRadius - 5);
    scene.remove(safeZoneMesh);
    safeZoneMesh.geometry.dispose();
    safeZoneMesh = new THREE.Mesh(
      new THREE.CircleGeometry(safeZoneRadius, 72),
      new THREE.MeshBasicMaterial({ color: 0x5ef7b8, wireframe: true, transparent: true, opacity: 0.42 })
    );
    safeZoneMesh.rotation.x = -Math.PI / 2;
    safeZoneMesh.position.y = 0.03;
    scene.add(safeZoneMesh);
  }

  const player2D = new THREE.Vector2(player.mesh.position.x, player.mesh.position.z);
  if (player2D.distanceTo(safeZoneCenter) > safeZoneRadius) {
    player.health -= 10 * dt;
  }
}

function checkGameState() {
  if (player.health <= 0) {
    player.health = 0;
    centerBanner.textContent = 'Mission failed — reload the level';
    return;
  }

  if (bots.length === 0) {
    advanceLevel();
  }
}

loadProgress();
repopulateStageSelect();
repopulateLevelSelect();
saveProgress();
updateHUD();

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, clock.getDelta());

  if (!menuScreen.classList.contains('hidden')) {
    renderer.render(scene, camera);
    return;
  }

  updatePlayerMovement(dt);
  handleShooting(dt);
  updateBots(dt);
  updateZone(dt);
  checkGameState();
  updateCamera();
  updateHUD();

  renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
});
