// Scene, renderer, camera and the per-frame loop. start() returns null when WebGL is unavailable.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createWorld } from './world.js';
import { createCharacter } from './character.js';
import { positionAt, walkPhase, stationIndexAt, clamp01 } from './journey-math.js';

const BG = 0x0b1020;
const JUMP = 0.15;

const shortestAngle = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

export function start(canvas, { stations, test = false, onStation = () => {}, extras = [] } = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: test, powerPreference: 'high-performance' });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.setClearColor(BG);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(BG, 0.024);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 500);

  scene.add(new THREE.HemisphereLight(0x9cc3ff, 0x0b1020, 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 1.4);
  sun.position.set(6, 12, 8);
  scene.add(sun);
  const rim = new THREE.PointLight(0x00c2ff, 6, 9, 1.6);
  scene.add(rim);

  const world = createWorld(scene, stations);
  const hero = createCharacter();
  scene.add(hero.group);

  // glowing footprints that fade out
  const prints = Array.from({ length: 24 }, () => {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.09, 0.16, 24), new THREE.MeshBasicMaterial({ color: 0x00c2ff, transparent: true, opacity: 0, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    scene.add(m);
    return m;
  });
  let printIdx = 0;
  let lastStep = 0;

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.8, 0.5, 0.3);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  const ctx = { scene, camera, world, stations, pathPoints: world.pathPoints };
  const updaters = extras.map((make) => make(ctx)).filter(Boolean);

  let target = 0;
  let p = 0;
  let facing = 1;
  let yaw = Math.PI;
  let station = stations[0].id;
  let running = true;
  let animating = true;
  let raf = 0;
  const camPos = new THREE.Vector3();
  const look = new THREE.Vector3();
  let firstFrame = true;

  function resize() {
    const w = canvas.clientWidth || innerWidth;
    const h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    bloom.resolution.set(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();

  function frame(t, dt) {
    const dp = target - p;
    let moved = 0;
    if (Math.abs(dp) > JUMP) {
      p = target; // jump: snap, don't glide across the world
      firstFrame = true;
    } else {
      moved = dp * Math.min(1, dt * 5);
      p += moved;
      if (Math.abs(target - p) < 1e-5) p = target;
    }
    const speed = Math.abs(moved) / Math.max(dt, 1e-3);
    const walking = speed > 0.0015;
    if (walking) facing = moved > 0 ? 1 : -1;

    const pos = positionAt(p, world.pathPoints);
    const a = positionAt(clamp01(p - 0.002), world.pathPoints);
    const b = positionAt(clamp01(p + 0.002), world.pathPoints);
    let want = Math.atan2(b[0] - a[0], b[2] - a[2]);
    if (facing < 0) want += Math.PI;
    if (!walking && p < 0.02) want = 0; // face the camera at the start
    yaw += shortestAngle(yaw, want) * Math.min(1, dt * 8);
    hero.group.position.set(pos[0], 0, pos[2]);
    hero.group.rotation.y = yaw;

    const phase = walkPhase(p);
    const i = stationIndexAt(p, stations);
    const id = stations[i].id;
    hero.update(phase, walking ? speed : 0, dt, { wave: id === 'intro' || id === 'contact' });

    const step = Math.floor(phase / Math.PI);
    if (walking && step !== lastStep) {
      const pr = prints[printIdx++ % prints.length];
      const side = step % 2 ? 0.13 : -0.13;
      pr.position.set(pos[0] + Math.cos(yaw) * side, 0.04, pos[2] - Math.sin(yaw) * side);
      pr.material.opacity = 0.9;
    }
    lastStep = step;
    for (const pr of prints) pr.material.opacity = Math.max(0, pr.material.opacity - dt * 0.6);

    if (id !== station) {
      station = id;
      onStation(id, i);
    }
    world.setActiveStation(i);
    world.update(t, dt);
    for (const u of updaters) u(t, dt, { p, station: id });

    // camera: behind & above; on wide screens shift so the hero sits right of the cards
    const wide = camera.aspect > 1.1;
    const frameX = wide ? -2.2 : 0;
    camPos.set(pos[0] + frameX, wide ? 3 : 3.6, pos[2] + (wide ? 7 : 8.5));
    const lookAt = new THREE.Vector3(pos[0] + frameX, wide ? 1.1 : 0.2, pos[2] - 2);
    if (firstFrame) {
      camera.position.copy(camPos);
      look.copy(lookAt);
      firstFrame = false;
    } else {
      camera.position.lerp(camPos, Math.min(1, dt * 6));
      look.lerp(lookAt, Math.min(1, dt * 6));
    }
    camera.lookAt(look);
    rim.position.set(pos[0] - 1, 2.2, pos[2] + 1.5);

    composer.render(dt);
  }

  let last = performance.now();
  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000);
    if (dt < 1 / 61) return; // cap at ~60fps
    last = now;
    frame(now / 1000, dt);
  }
  raf = requestAnimationFrame(loop);
  addEventListener('resize', resize);

  return {
    setProgress(v) { target = clamp01(v); },
    renderOnce(v = target) { target = p = clamp01(v); firstFrame = true; frame(performance.now() / 1000, 1 / 60); },
    pause() { running = false; cancelAnimationFrame(raf); },
    resume() { if (!running) { running = true; last = performance.now(); raf = requestAnimationFrame(loop); } },
    stopAnimating() { animating = false; this.pause(); },
    resize,
    state: () => ({ progress: p, target, station, facing, animating: animating && running, aspect: camera.aspect }),
    dispose() { cancelAnimationFrame(raf); removeEventListener('resize', resize); renderer.dispose(); },
  };
}
