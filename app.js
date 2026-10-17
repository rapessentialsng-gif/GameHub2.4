import * as THREE from 'https://unpkg.com/three@0.146.0/build/three.module.js';

const CONFIG = {
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
const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 600);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.domElement.style.touchAction = 'none';
container.appendChild(renderer.domElement);

const state = {
  stage: 1,
  level: 1,
  currentWeaponIndex: 0,
  waveActive: false,
  missionStart: 0,
  missionType: 'eliminate',
};

const themes = {
  1: {
    bg: 0x7fb4d9,
    fog: 0x7fb4d9,
    ground: 0x6d8f52,
    accent: 0x4fd1ff,
    name: 'Forest Front',
    objective: 'Eliminate the hostile squad and stay inside the safe zone.'
  },
  2: {
    bg: 0x6e8199,
    fog: 0x6e8199,
    ground: 0x6d7584,
    accent: 0x8ce1ff,
    name: 'Industrial Yard',
    objective: 'Clear the compounds and secure the extraction route.'
  },
  3: {
    bg: 0x8f7362,
    fog: 0x8f7362,
    ground: 0x7a5d3d,
    accent: 0xffd177,
    name: 'Desert Run',
    objective: 'Survive the ambush and hold the checkpoint.'
  },
  4: {
    bg: 0x3f4c67,
    fog: 0x3f4c67,
    ground: 0x475666,
    accent: 0xa184ff,
    name: 'Night Siege',
    objective: 'Break the last defense line and survive the final sweep.'
  }
};

const weaponDefs = [
  { name: 'Rifle', damage: 34, fireRate: 170, ammo: 30, maxAmmo: 30, color: 0xfaf7a4 },
  { name: 'SMG', damage: 18, fireRate: 95, ammo: 42, maxAmmo: 42, color: 0x8ad8ff },
  { name: 'Shotgun', damage: 12, fireRate: 420, ammo: 16, maxAmmo: 16, color: 0xffb474 }
];

const player = {
  mesh: null,
  speed: 5.8,
  sprintMultiplier: 1.7,
  health: 100,
  maxHealth: 100,
  xp: 0,
  kills: 0,
  ammo: 30,
  maxAmmo: 30,
  vel: new THREE.Vector3(),
  sprint: false,
  crouch: false,
  firing: false,
  lastShot: 0,
  currentWeaponIndex: 0,
  weaponCooldown: 0,
};

const mapSize = 220;
const safeZoneCenter = new THREE.Vector2(0, 0);
let safeZoneRadius = 80;
let safeZoneMesh = null;
let zoneShrinkTimer = 0;
const bots = [];
const bullets = [];
const pickups = [];
const props = [];
const keys = {};

function setTheme(stage) {
  const theme = themes[stage] || themes[1];
  scene.background = new THREE.Color(theme.bg);
  scene.fog = new THREE.Fog(theme.fog, 30, 220);
  ground.material.color.setHex(theme.ground);
  dirLight.color.setHex(theme.accent);
  objectiveText.textContent = theme.objective;
}

function createGround() {
  const groundMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(mapSize, mapSize, 2, 2),
    new THREE.MeshStandardMaterial({ color: 0x6d8f52, roughness: 0.96, metalness: 0.05 })
  );
  groundMesh.rotation.x = -Math.PI / 2;
  scene.add(groundMesh);
  return groundMesh;
}

const ground = createGround();

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
  } else {
    const crate = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 1.2, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x7a6f52, roughness: 0.9 })
    );
    crate.position.set(x, 0.6, z);
    scene.add(crate);
    props.push({ type: 'crate', position: new THREE.Vector3(x, 0, z), radius: 1.2 });
  }
}

for (let i = 0; i < 60; i++) {
  const x = (Math.random() - 0.5) * 170;
  const z = (Math.random() - 0.5) * 170;
  addProp(x, z, Math.random() > 0.45 ? 'tree' : 'crate');
}

const hemi = new THREE.HemisphereLight(0xffffff, 0x405132, 1.2);
hemi.position.set(0, 50, 0);
scene.add(hemi);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(-12, 26, -12);
scene.add(dirLight);

const ambient = new THREE.AmbientLight(0xffffff, 0.18);
scene.add(ambient);

function createBodyColor(r, g, b) {
  return new THREE.MeshStandardMaterial({ color: new THREE.Color(r, g, b), roughness: 0.7, metalness: 0.15 });
}

function createPlayerMesh() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.56, 1.25, 6, 14), createBodyColor(0.3, 0.55, 1.0));
  body.position.y = 1.25;
  group.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 14), new THREE.MeshStandardMaterial({ color: 0xf0d2b2, roughness: 0.9 }));
  head.position.y = 2.3;
  group.add(head);

  const weapon = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.18, 1.0),
    new THREE.MeshStandardMaterial({ color: 0x1a1e22, metalness: 0.6, roughness: 0.35 })
  );
  weapon.position.set(0.5, 1.4, 0.6);
  weapon.rotation.x = -0.3;
  group.add(weapon);

  return group;
}

player.mesh = createPlayerMesh();
scene.add(player.mesh);

function createPickup(x, z, kind = 'ammo') {
  const mesh = new THREE.Mesh(
    kind === 'medkit'
      ? new THREE.OctahedronGeometry(0.55, 0)
      : new THREE.CylinderGeometry(0.42, 0.42, 0.6, 14),
    new THREE.MeshStandardMaterial({
      color: kind === 'medkit' ? 0x56f39a : 0xf7cd63,
      emissive: kind === 'medkit' ? 0x113322 : 0x332a08,
      emissiveIntensity: 0.35,
      roughness: 0.35,
      metalness: 0.2
    })
  );

  mesh.position.set(x, 0.7, z);
  mesh.userData = { kind, bob: Math.random() * Math.PI * 2 };
  scene.add(mesh);
  pickups.push(mesh);
}

function spawnPickupsForLevel(level) {
  for (let i = pickups.length - 1; i >= 0; i--) {
    scene.remove(pickups[i]);
    pickups.splice(i, 1);
  }

  const count = 3 + Math.min(level, 5);
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.8;
    const radius = 18 + Math.random() * 35;
    createPickup(Math.cos(angle) * radius, Math.sin(angle) * radius, i % 2 === 0 ? 'ammo' : 'medkit');
  }
}

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
    attackDelay: 0.8 + Math.random() * 0.7,
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

  spawnPickupsForLevel(level);
  state.waveActive = true;
  state.missionType = (state.stage + state.level) % 2 === 0 ? 'hold' : 'eliminate';
}

function buildZoneMesh(radius) {
  const mesh = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 72),
    new THREE.MeshBasicMaterial({ color: 0x5ef7b8, wireframe: true, transparent: true, opacity: 0.42 })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.03;
  return mesh;
}

safeZoneMesh = buildZoneMesh(safeZoneRadius);
scene.add(safeZoneMesh);

function shoot(origin, direction, owner) {
  const weapon = owner === 'player' ? weaponDefs[player.currentWeaponIndex] : null;
  const color = weapon ? weapon.color : 0xff924a;

  const bullet = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 8, 8),
    new THREE.MeshBasicMaterial({ color })
  );
  bullet.position.copy(origin);
  bullet.userData = {
    owner,
    vel: direction.clone().multiplyScalar(owner === 'player' ? 46 : 29),
    life: 3.5,
  };
  scene.add(bullet);
  bullets.push(bullet);
}

function updateObjectiveText() {
  const theme = themes[state.stage] || themes[1];
  const modeText = state.missionType === 'hold' ? 'Hold the zone and wipe the siege' : 'Eliminate all hostiles and survive';
  objectiveText.textContent = `${theme.objective} Mission: ${modeText}.`;
}

function updateHUD() {
  healthStat.textContent = `${Math.max(0, Math.round(player.health))}`;
  ammoStat.textContent = `${player.ammo}`;
  stageStat.textContent = `${state.stage}`;
  levelStat.textContent = `${state.level}`;
  xpStat.textContent = `${player.xp}`;
  updateObjectiveText();
}

function saveProgress() {
  const payload = { stage: state.stage, level: state.level, xp: player.xp, kills: player.kills };
  localStorage.setItem(CONFIG.saveKey, JSON.stringify(payload));
  saveStageChip.textContent = `Stage ${state.stage}`;
  saveLevelChip.textContent = `Level ${state.level}`;
  saveXpChip.textContent = `XP ${player.xp}`;
  saveKillsChip.textContent = `Kills ${player.kills}`;
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(CONFIG.saveKey);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (saved.stage) state.stage = Math.min(saved.stage, CONFIG.totalStages);
    if (saved.level) state.level = Math.min(saved.level, CONFIG.levelsPerStage);
    if (typeof saved.xp === 'number') player.xp = saved.xp;
    if (typeof saved.kills === 'number') player.kills = saved.kills;
  } catch (error) {
    console.warn('Progress load failed', error);
  }
}

function repopulateStageSelect() {
  stageSelect.innerHTML = '';
  for (let s = 1; s <= CONFIG.totalStages; s++) {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = `Stage ${s}`;
    if (s === state.stage) opt.selected = true;
    stageSelect.appendChild(opt);
  }
  repopulateLevelSelect();
}

function repopulateLevelSelect() {
  levelSelect.innerHTML = '';
  for (let l = 1; l <= CONFIG.levelsPerStage; l++) {
    const option = document.createElement('option');
    option.value = l;
    option.textContent = `Level ${l}`;
    if (l === state.level) option.selected = true;
    levelSelect.appendChild(option);
  }
}

stageSelect.addEventListener('change', (event) => {
  state.stage = Number(event.target.value);
  if (state.level > CONFIG.levelsPerStage) state.level = CONFIG.levelsPerStage;
  repopulateLevelSelect();
  setTheme(state.stage);
  saveProgress();
});

levelSelect.addEventListener('change', (event) => {
  state.level = Number(event.target.value);
  saveProgress();
});

function cycleWeapon() {
  player.currentWeaponIndex = (player.currentWeaponIndex + 1) % weaponDefs.length;
  const selected = weaponDefs[player.currentWeaponIndex];
  player.ammo = selected.ammo;
  player.maxAmmo = selected.maxAmmo;
  centerBanner.textContent = `${selected.name} equipped`;
  setTimeout(() => {
    centerBanner.textContent = `Stage ${state.stage} — Level ${state.level}`;
  }, 400);
}

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  keys[key] = true;
  if (event.code === 'Space') {
    event.preventDefault();
    if (player.mesh.position.y <= 0.05) player.vel.y = 6.2;
  }
  if (key === '1' || key === '2' || key === '3') {
    player.currentWeaponIndex = Number(key) - 1;
    const selected = weaponDefs[player.currentWeaponIndex];
    player.ammo = selected.ammo;
    player.maxAmmo = selected.maxAmmo;
  }
  if (key === 'q' || key === 'e') cycleWeapon();
  if (key === 'x') player.firing = true;
});
window.addEventListener('keyup', (event) => {
  const key = event.key.toLowerCase();
  keys[key] = false;
  if (key === 'x') player.firing = false;
});

function setMissionStarted() {
  menuScreen.classList.add('hidden');
  hud.classList.remove('hidden');
  setTheme(state.stage);
  player.currentWeaponIndex = 0;
  const selected = weaponDefs[player.currentWeaponIndex];
  player.ammo = selected.ammo;
  player.maxAmmo = selected.maxAmmo;
  centerBanner.textContent = `Stage ${state.stage} — Level ${state.level}`;
  spawnWaveForLevel(state.level);
  saveProgress();
  updateHUD();
}

startButton.addEventListener('click', setMissionStarted);

function advanceLevel() {
  if (state.level >= CONFIG.levelsPerStage) {
    state.level = 1;
    state.stage = Math.min(state.stage + 1, CONFIG.totalStages);
  } else {
    state.level += 1;
  }

  centerBanner.textContent = `Objective complete! Stage ${state.stage} level ${state.level}`;
  repopulateStageSelect();
  repopulateLevelSelect();
  saveProgress();
  setTimeout(() => {
    centerBanner.textContent = `Stage ${state.stage} — Level ${state.level}`;
    spawnWaveForLevel(state.level);
    updateHUD();
  }, 850);
}

function getEventPoint(event) {
  const source = event.touches ? event.touches[0] : event;
  return { x: source.clientX, y: source.clientY };
}

const joy = document.getElementById('joy');
const stick = document.getElementById('stick');
let joyActive = false;
let joyOrigin = null;
let stickVec = { x: 0, y: 0 };

function onJoyStart(event) {
  const point = getEventPoint(event);
  if (point.x > window.innerWidth / 2) return;
  joyActive = true;
  joyOrigin = point;
}

function onJoyMove(event) {
  if (!joyActive || !joyOrigin) return;
  const point = getEventPoint(event);
  const dx = point.x - joyOrigin.x;
  const dy = point.y - joyOrigin.y;
  const max = 46;
  const nx = Math.max(-1, Math.min(1, dx / max));
  const ny = Math.max(-1, Math.min(1, dy / max));
  stick.style.transform = `translate(${nx * max * 0.82}px, ${ny * max * 0.82}px)`;
  stickVec = { x: nx, y: -ny };
}

function onJoyEnd() {
  joyActive = false;
  joyOrigin = null;
  stick.style.transform = 'translate(0,0)';
  stickVec = { x: 0, y: 0 };
}

joy.addEventListener('touchstart', onJoyStart, { passive: true });
joy.addEventListener('touchmove', onJoyMove, { passive: true });
joy.addEventListener('touchend', onJoyEnd);
joy.addEventListener('pointerdown', onJoyStart);
window.addEventListener('pointermove', onJoyMove);
window.addEventListener('pointerup', onJoyEnd);

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
  if (player.mesh.position.y <= 0.05) player.vel.y = 6.2;
});

btnSprint.addEventListener('pointerdown', () => { player.sprint = true; });
btnSprint.addEventListener('pointerup', () => { player.sprint = false; });
btnSprint.addEventListener('pointerleave', () => { player.sprint = false; });

btnCrouch.addEventListener('click', () => {
  player.crouch = !player.crouch;
  centerBanner.textContent = `Crouch ${player.crouch ? 'ON' : 'OFF'}`;
  setTimeout(() => {
    centerBanner.textContent = `Stage ${state.stage} — Level ${state.level}`;
  }, 300);
});

btnReload.addEventListener('click', () => {
  const selected = weaponDefs[player.currentWeaponIndex];
  player.ammo = selected.maxAmmo;
  player.maxAmmo = selected.maxAmmo;
  centerBanner.textContent = `${selected.name} reloaded`;
  setTimeout(() => {
    centerBanner.textContent = `Stage ${state.stage} — Level ${state.level}`;
  }, 320);
});

function updateCamera() {
  const facing = new THREE.Vector3(Math.sin(aimYaw), 0, Math.cos(aimYaw));
  const distance = 5.5;
  const camPos = player.mesh.position.clone().add(
    new THREE.Vector3(-facing.x * distance, 2.5 + Math.sin(aimPitch) * 0.8, -facing.z * distance)
  );
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

  if (keys.w) moveZ = 1;
  if (keys.s) moveZ = -1;
  if (keys.a) moveX = -1;
  if (keys.d) moveX = 1;

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

function tryPickup() {
  for (let i = pickups.length - 1; i >= 0; i--) {
    const pickup = pickups[i];
    if (!pickup) continue;
    if (pickup.position.distanceTo(player.mesh.position) < 1.3) {
      const kind = pickup.userData.kind;
      if (kind === 'medkit') {
        player.health = Math.min(player.maxHealth, player.health + 25);
        centerBanner.textContent = 'Medkit secured';
      } else {
        const selected = weaponDefs[player.currentWeaponIndex];
        selected.ammo = Math.min(selected.maxAmmo + 10, selected.maxAmmo + 18);
        player.ammo = selected.ammo;
        player.maxAmmo = selected.maxAmmo;
        centerBanner.textContent = 'Ammo cache secured';
      }
      scene.remove(pickup);
      pickups.splice(i, 1);
      setTimeout(() => {
        centerBanner.textContent = `Stage ${state.stage} — Level ${state.level}`;
      }, 260);
    }
  }
}

function handleShooting(dt) {
  const weapon = weaponDefs[player.currentWeaponIndex];
  if (player.firing && player.ammo > 0) {
    const now = performance.now();
    if (now - player.lastShot > weapon.fireRate) {
      player.lastShot = now;
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

    if (bullet.userData.life <= 0 || bullet.position.distanceTo(player.mesh.position) > 500) {
      scene.remove(bullet);
      bullets.splice(i, 1);
      continue;
    }

    if (bullet.userData.owner === 'player') {
      for (let j = bots.length - 1; j >= 0; j--) {
        const bot = bots[j];
        if (!bot || !bot.userData.alive) continue;
        if (bot.position.distanceTo(bullet.position) < 1.0) {
          bot.userData.health -= weapon.damage;
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
              centerBanner.textContent = `Stage ${state.stage} — Level ${state.level}`;
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
    safeZoneMesh = buildZoneMesh(safeZoneRadius);
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
    centerBanner.textContent = 'Mission failed — reload to retry';
    return;
  }

  if (bots.length === 0 && state.waveActive) {
    state.waveActive = false;
    player.xp += 180;
    centerBanner.textContent = 'Objective clear';
    setTimeout(() => {
      advanceLevel();
    }, 700);
  }
}

function updatePickups(dt) {
  for (const pickup of pickups) {
    pickup.rotation.y += dt * 1.3;
    pickup.position.y = 0.7 + Math.sin(performance.now() * 0.003 + pickup.userData.bob) * 0.25;
  }
}

function updateMeta(dt) {
  tryPickup();
  updatePickups(dt);
  updateZone(dt);
  updateBots(dt);
  handleShooting(dt);
  updatePlayerMovement(dt);
  checkGameState();
}

function applyThemeColors() {
  setTheme(state.stage);
}

loadProgress();
repopulateStageSelect();
repopulateLevelSelect();
applyThemeColors();
saveProgress();
updateHUD();

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, clock.getDelta());

  if (menuScreen.classList.contains('hidden')) {
    updateMeta(dt);
    updateCamera();
    updateHUD();
  }

  renderer.render(scene, camera);
}

animate();
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
});

setTheme(state.stage);
updateHUD();
