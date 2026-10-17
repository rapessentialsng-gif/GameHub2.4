import * as THREE from 'https://unpkg.com/three@0.146.0/build/three.module.js';

// Simple prototype: first-person-like camera with third-person capsule, bots, shooting, safe zone
const container = document.getElementById('canvas-container');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 2, 6);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio ? window.devicePixelRatio : 1);
container.appendChild(renderer.domElement);

// Lights
const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
hemi.position.set(0, 50, 0);
scene.add(hemi);
const dir = new THREE.DirectionalLight(0xffffff, 0.8);
dir.position.set(-5, 10, -5);
scene.add(dir);

// Ground / large map
const mapSize = 200;
const groundGeo = new THREE.PlaneGeometry(mapSize, mapSize, 16, 16);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x6b8e23 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// Simple player representation
const player = {
  mesh: null,
  pos: new THREE.Vector3(0, 1, 0),
  vel: new THREE.Vector3(),
  speed: 3,
  health: 100,
  firing: false,
  ammo: 30,
  maxAmmo: 30,
  sprint: false,
  crouch: false
};

function createPlayerMesh(){
  const group = new THREE.Group();
  const body = new THREE.CapsuleGeometry(0.5, 1.0, 4, 8);
  const mat = new THREE.MeshStandardMaterial({ color: 0x5555ff });
  const mesh = new THREE.Mesh(body, mat);
  mesh.position.y = 1;
  group.add(mesh);
  return group;
}
player.mesh = createPlayerMesh();
scene.add(player.mesh);
player.mesh.position.copy(player.pos);

// Camera follows player
function updateCamera(){
  const offset = new THREE.Vector3(0, 2.2, 5);
  if (player.sprint) offset.z = 6;
  const camPos = player.mesh.position.clone().add(offset);
  camera.position.lerp(camPos, 0.2);
  camera.lookAt(player.mesh.position.clone().add(new THREE.Vector3(0,1,0)));
}

// Simple bots
const bots = [];
function spawnBot(x,z){
  const geo = new THREE.CapsuleGeometry(0.45, 0.8, 4, 8);
  const mat = new THREE.MeshStandardMaterial({ color: 0xff5555 });
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x,1, z);
  m.userData = { health: 50, targetTimer:0 };
  scene.add(m);
  bots.push(m);
}

for(let i=0;i<6;i++){
  const angle = Math.random()*Math.PI*2;
  const r = 20 + Math.random()*40;
  spawnBot(Math.cos(angle)*r, Math.sin(angle)*r);
}

// Projectiles
const bullets = [];
function shoot(origin, dir, owner){
  const geo = new THREE.SphereGeometry(0.06, 6, 6);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffff66 });
  const b = new THREE.Mesh(geo, mat);
  b.position.copy(origin);
  b.userData = { vel: dir.clone().multiplyScalar(40), owner };
  scene.add(b);
  bullets.push(b);
}

// Safe zone
let safeZoneRadius = 80;
const safeZoneCenter = new THREE.Vector2(0,0);
const safeZoneMesh = new THREE.Mesh(new THREE.CircleGeometry(safeZoneRadius, 64), new THREE.MeshBasicMaterial({ color:0x00ff00, wireframe:true, opacity:0.25, transparent:true }));
safeZoneMesh.rotation.x = -Math.PI/2;
safeZoneMesh.position.y = 0.02;
scene.add(safeZoneMesh);
let zoneShrinkTimer = 0;

// HUD
const message = document.getElementById('message');
function setMessage(m){ message.textContent = m }

// Controls: left joystick for movement
const joy = document.getElementById('joy');
const stick = document.getElementById('stick');
let joyActive = false; let joyOrigin = null; let joyVector = {x:0,y:0};

function onJoyStart(e){
  joyActive = true; joyOrigin = getPoint(e);
  stick.style.transition = '0s';
}
function onJoyEnd(){ joyActive = false; joyOrigin = null; stick.style.transition = ''; joyVector={x:0,y:0}; stick.style.transform = '' }
function onJoyMove(e){ if(!joyActive) return; const p = getPoint(e); const dx = p.x - joyOrigin.x; const dy = p.y - joyOrigin.y; const max=48; const nx = Math.max(-1,Math.min(1, dx/max)); const ny = Math.max(-1,Math.min(1, dy/max)); joyVector = {x:nx,y:-ny}; stick.style.transform = `translate(${nx*48}px, ${-ny*48}px)` }
function getPoint(e){ const t = e.touches ? e.touches[0] : e; return {x:t.clientX, y:t.clientY} }
joy.addEventListener('touchstart', onJoyStart); joy.addEventListener('touchmove', onJoyMove); joy.addEventListener('touchend', onJoyEnd);
joy.addEventListener('pointerdown', onJoyStart); window.addEventListener('pointermove', onJoyMove); window.addEventListener('pointerup', onJoyEnd);

// Right-side aiming using pointer move on renderer
let aimYaw = 0; let aimPitch = 0; let lastPointer = null;
let isPointerDown = false;
renderer.domElement.addEventListener('pointerdown', (e)=>{ if(e.clientX > window.innerWidth/2){ isPointerDown=true; lastPointer={x:e.clientX,y:e.clientY} } });
renderer.domElement.addEventListener('pointerup', ()=> isPointerDown=false);
renderer.domElement.addEventListener('pointermove', (e)=>{ if(!isPointerDown) return; const dx=(e.clientX-lastPointer.x)/window.innerWidth; const dy=(e.clientY-lastPointer.y)/window.innerHeight; aimYaw -= dx*2*Math.PI; aimPitch = Math.max(-0.6, Math.min(0.6, aimPitch - dy*2)); lastPointer={x:e.clientX,y:e.clientY}; });

// Buttons
document.getElementById('btn-fire').addEventListener('touchstart', ()=> player.firing = true );
document.getElementById('btn-fire').addEventListener('touchend', ()=> player.firing = false );
document.getElementById('btn-fire').addEventListener('mousedown', ()=> player.firing = true );
document.getElementById('btn-fire').addEventListener('mouseup', ()=> player.firing = false );

document.getElementById('btn-jump').addEventListener('click', ()=>{ player.vel.y = 6 });
document.getElementById('btn-sprint').addEventListener('pointerdown', ()=> player.sprint=true); document.getElementById('btn-sprint').addEventListener('pointerup', ()=> player.sprint=false);

document.getElementById('btn-crouch').addEventListener('click', ()=>{ player.crouch = !player.crouch; setMessage('Crouch: '+player.crouch) });

document.getElementById('btn-reload').addEventListener('click', ()=>{ player.ammo = player.maxAmmo; setMessage('Reloaded') });

// Desktop: WASD + mouse
const keys = {};
window.addEventListener('keydown', (e)=> keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', (e)=> keys[e.key.toLowerCase()] = false);
renderer.domElement.addEventListener('click', ()=> renderer.domElement.requestPointerLock && renderer.domElement.requestPointerLock());

// Main loop
const clock = new THREE.Clock();
function animate(){
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, clock.getDelta());

  // Movement input
  let moveX = 0, moveZ = 0;
  if(Math.abs(joyVector.x)>0.05 || Math.abs(joyVector.y)>0.05){ moveX = joyVector.x; moveZ = joyVector.y }
  if(keys['w']) moveZ = 1; if(keys['s']) moveZ = -1; if(keys['a']) moveX = -1; if(keys['d']) moveX = 1;

  const speed = player.sprint ? player.speed * 1.8 : player.speed;
  const dir = new THREE.Vector3(moveX,0,moveZ);
  if(dir.length()>0.01) dir.normalize();

  // Apply camera-based direction: use camera yaw
  const yaw = aimYaw;
  const forward = new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw));
  const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0), forward).normalize();
  const vel = forward.multiplyScalar(dir.z*speed).add(right.multiplyScalar(dir.x*speed));
  player.mesh.position.addScaledVector(vel, dt);

  // Gravity / vertical
  player.vel.y = (player.vel.y || 0) - 9.8*dt;
  player.mesh.position.y += player.vel.y*dt;
  if(player.mesh.position.y < 1){ player.mesh.position.y = 1; player.vel.y = 0 }

  // Camera orientation from aim
  player.mesh.rotation.y = aimYaw;

  // Shooting
  if(player.firing && player.ammo>0){
    if(!player._lastShot || (performance.now()-player._lastShot)>120){
      player._lastShot = performance.now();
      player.ammo -= 1;
      const origin = player.mesh.position.clone().add(new THREE.Vector3(0,1.2,0));
      const dirVec = new THREE.Vector3(Math.sin(aimYaw), Math.sin(aimPitch), Math.cos(aimYaw)).normalize();
      shoot(origin, dirVec, 'player');
    }
  }

  // Bots simple AI: move toward player, occasionally shoot
  bots.forEach(b=>{
    if(!b.userData) return;
    const toPlayer = player.mesh.position.clone().sub(b.position);
    const dist = toPlayer.length();
    toPlayer.y = 0;
    if(dist>0.5){
      const move = toPlayer.clone().normalize().multiplyScalar( (dist>10?1.2:0.5) * dt );
      b.position.add(move);
    }
    // rotate toward player
    b.lookAt(player.mesh.position.clone().setY(b.position.y));
    // shooting if close
    b.userData.targetTimer = (b.userData.targetTimer || 0) + dt;
    if(dist < 25 && b.userData.targetTimer>1.2){
      b.userData.targetTimer = 0;
      const origin = b.position.clone().add(new THREE.Vector3(0,1.1,0));
      const dir = player.mesh.position.clone().sub(b.position).normalize();
      shoot(origin, dir, 'bot');
    }
  });

  // Update bullets
  for(let i=bullets.length-1;i>=0;i--){
    const b = bullets[i];
    b.position.addScaledVector(b.userData.vel, dt);
    // range cull
    if(b.position.distanceTo(player.mesh.position) > 400){ scene.remove(b); bullets.splice(i,1); continue }
    // check collision with bots
    if(b.userData.owner==='player'){
      for(let j=bots.length-1;j>=0;j--){ const bot=bots[j]; if(bot.position.distanceTo(b.position)<0.8){ bot.userData.health -= 25; scene.remove(b); bullets.splice(i,1); if(bot.userData.health <= 0){ scene.remove(bot); bots.splice(j,1); setMessage('Bot down!'); } break } }
    } else if(b.userData.owner==='bot'){
      if(player.mesh.position.distanceTo(b.position) < 1.0){ player.health -= 10; scene.remove(b); bullets.splice(i,1); setMessage('Hit! HP: '+Math.max(0,player.health)); }
    }
  }

  // Safe zone shrink
  zoneShrinkTimer += dt;
  if(zoneShrinkTimer > 8){
    zoneShrinkTimer = 0;
    safeZoneRadius = Math.max(8, safeZoneRadius - 6);
    safeZoneMesh.geometry.dispose();
    safeZoneMesh.geometry = new THREE.CircleGeometry(safeZoneRadius, 64);
  }
  // damage outside
  const player2 = new THREE.Vector2(player.mesh.position.x, player.mesh.position.z);
  if(player2.distanceTo(safeZoneCenter) > safeZoneRadius){ player.health -= 8*dt; }

  // update camera
  updateCamera();

  renderer.render(scene, camera);
}

animate();

// Resize handling
window.addEventListener('resize', ()=>{ camera.aspect = window.innerWidth/window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });

// Simple debug: show instructions
setMessage('Prototype running — HP: '+player.health+' Ammo: '+player.ammo);

// Periodic HUD update
setInterval(()=>{ setMessage(`HP: ${Math.round(player.health)} Ammo: ${player.ammo} Bots: ${bots.length} Zone: ${Math.round(safeZoneRadius)}`) }, 500);
