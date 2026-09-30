import * as THREE from 'three';
import { loadModel, normalize } from './loader.js';

/* ---------- Adjustable constants ---------- */
export const RIDER_URL = '/models/rider.glb';
export const RIDER_SCALE = 1;
export const RIDER_TARGET_SIZE = 2.4;             // metres, largest rider dimension
export const RIDER_POSITION = new THREE.Vector3(0, 0, 0);
export const RIDER_ROTATION = [0, Math.PI, 0];    // press R or drag to turn her
export const CAMERA_OFFSET = new THREE.Vector3(0, 1.6, 4.4);
export const CAMERA_LOOK_AT_OFFSET = new THREE.Vector3(0, 0.9, 0);
export const RIDE_SPEED = 14;                     // m/s, how fast the ground moves (0 = standing still)
export const SPOT_INTENSITY = 250;                // spotlight brightness: lower = dimmer
export const SPOT_COLOR = 0xfff0dc;
export const EXPOSURE = 0.8;                      // overall brightness of the whole scene
export const RIM_INTENSITY = 0.8;                 // blue light from behind her
export const GLOW_STRENGTH = 0.3;                 // bright circle on the ground (0 = none)
/* ------------------------------------------ */

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const TILE = 5; // metres per ground texture tile

function makeGroundTexture(renderer) {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#0d0f1b';
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2600; i++) {
    const v = 25 + Math.random() * 40;
    g.fillStyle = `rgba(${v},${v + 4},${v + 14},${0.15 + Math.random() * 0.3})`;
    g.fillRect(Math.random() * 512, Math.random() * 512, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
  g.strokeStyle = 'rgba(120,135,190,0.12)';  // faint worn streaks
  g.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    const x = Math.random() * 512, y = Math.random() * 512;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (Math.random() - 0.5) * 6, y + 60 + Math.random() * 120); g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return tex;
}

function makeGlowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, `rgba(255,240,220,${GLOW_STRENGTH})`);
  grad.addColorStop(0.5, `rgba(255,240,220,${GLOW_STRENGTH * 0.25})`);
  grad.addColorStop(1, 'rgba(255,240,220,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

export async function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = EXPOSURE;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x060812);
  scene.fog = new THREE.FogExp2(0x060812, 0.03);

  const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 1000);
  camera.position.copy(RIDER_POSITION).add(CAMERA_OFFSET).add(new THREE.Vector3(0, 0.6, 2));

  /* Lighting: dim night ambience, a spotlight on her, cool rim from behind */
  scene.add(new THREE.HemisphereLight(0x5a6aa8, 0x120f1e, 0.55));
  const spot = new THREE.SpotLight(SPOT_COLOR, SPOT_INTENSITY, 22, 0.45, 0.75, 1.6);
  spot.position.set(0.5, 8, 2.5);
  spot.target.position.set(0, 0.8, 0);
  scene.add(spot, spot.target);
  const rim = new THREE.DirectionalLight(0x7f95ff, RIM_INTENSITY);
  rim.position.set(-2, 4, -6);
  scene.add(rim);

  /* Ground (scrolls to give the feeling of riding) */
  const groundTex = makeGroundTexture(renderer);
  groundTex.repeat.set(120 / TILE, 120 / TILE);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 120),
    new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.7, metalness: 0.15 }),
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const pool = new THREE.Mesh(
    new THREE.CircleGeometry(3.4, 48),
    new THREE.MeshBasicMaterial({ map: makeGlowTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(0, 0.015, 0);
  scene.add(pool);

  /* Rider */
  const riderGltf = await loadModel(RIDER_URL);
  const rider = normalize(riderGltf.scene, { targetSize: RIDER_TARGET_SIZE, scale: RIDER_SCALE, rotation: RIDER_ROTATION });
  rider.pivot.position.copy(RIDER_POSITION);
  rider.pivot.rotation.order = 'YXZ';
  scene.add(rider.pivot);
  console.info('Rider size', rider.dims);

  let mixer = null;
  if (riderGltf.animations?.length) {
    mixer = new THREE.AnimationMixer(riderGltf.scene);
    const action = mixer.clipAction(riderGltf.animations[0]);
    action.setLoop(THREE.LoopRepeat, Infinity).play();
    mixer.timeScale = 0; // frozen until the ride starts
  } else console.warn('Rider GLB has no animations.');

  /* Thin wind streaks rushing past */
  const wCount = reduced ? 0 : 140;
  const wPos = new Float32Array(wCount * 3);
  const respawn = (i, far) => wPos.set([
    (Math.random() - 0.5) * 14,
    0.1 + Math.random() * 3.5,
    far ? -30 - Math.random() * 10 : -Math.random() * 40 + 6,
  ], i * 3);
  for (let i = 0; i < wCount; i++) respawn(i, false);
  const wGeo = new THREE.BufferGeometry();
  wGeo.setAttribute('position', new THREE.BufferAttribute(wPos, 3));
  scene.add(new THREE.Points(wGeo, new THREE.PointsMaterial({ size: 0.035, color: 0xaab8e0, transparent: true, opacity: 0.35, depthWrite: false })));

  /* State */
  const state = { running: false, speed: 0 };
  let flipYaw = 0, t = 0, lean = 0;
  const clock = new THREE.Clock();
  const target = new THREE.Vector3();
  const lookAt = new THREE.Vector3().copy(RIDER_POSITION).add(CAMERA_LOOK_AT_OFFSET);

  function frame() {
    const dt = Math.min(clock.getDelta(), 0.1);
    t += dt;
    state.speed += ((state.running ? RIDE_SPEED : 0) - state.speed) * Math.min(1, dt * 0.9);
    const k = state.speed / Math.max(RIDE_SPEED, 0.001); // 0..1 ease-in
    const move = state.speed * dt;

    mixer?.update(dt);

    groundTex.offset.y += move / TILE;
    for (let i = 0; i < wCount; i++) {
      wPos[i * 3 + 2] += move * 1.6 + dt * 0.2;
      if (wPos[i * 3 + 2] > 8) respawn(i, true);
    }
    if (wCount) wGeo.attributes.position.needsUpdate = true;

    // Rider: slight bob and lean into the ride
    const m = reduced ? 0 : k;
    lean += ((Math.sin(t * 0.6) * 0.05 * m) - lean) * Math.min(1, dt * 3);
    rider.pivot.position.y = RIDER_POSITION.y + Math.sin(t * 7) * 0.012 * m;
    rider.pivot.rotation.y += (flipYaw - rider.pivot.rotation.y) * Math.min(1, dt * 8);
    rider.pivot.rotation.z = lean;

    // Camera: gentle sway, tiny vibration, FOV widens with speed
    target.copy(RIDER_POSITION).add(CAMERA_OFFSET);
    target.x += Math.sin(t * 0.4) * 0.25 * m;
    target.y += Math.sin(t * 9) * 0.008 * m + Math.sin(t * 0.8) * 0.04 * m;
    target.z += k * 0.6;
    camera.position.lerp(target, 1 - Math.exp(-dt * 2.2));
    target.copy(RIDER_POSITION).add(CAMERA_LOOK_AT_OFFSET);
    lookAt.lerp(target, 1 - Math.exp(-dt * 4));
    camera.lookAt(lookAt);
    const fov = 55 + (reduced ? 0 : k * 7);
    if (Math.abs(camera.fov - fov) > 0.01) { camera.fov += (fov - camera.fov) * Math.min(1, dt * 2); camera.updateProjectionMatrix(); }

    renderer.render(scene, camera);
  }

  function resize() {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(innerWidth, innerHeight);
  }
  window.addEventListener('resize', resize);
  renderer.setAnimationLoop(frame);

  return {
    start() { state.running = true; if (mixer) mixer.timeScale = 1; clock.getDelta(); },
    flip() { flipYaw += Math.PI; },
    rotate(angle) { flipYaw += angle; },
    dispose() { renderer.setAnimationLoop(null); window.removeEventListener('resize', resize); renderer.dispose(); },
  };
}