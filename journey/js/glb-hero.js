// A realistic rigged avatar (assets/me.glb) with the same interface as createCharacter():
// { group, heroPhoto, walkTime, update(phase, speed, dt, opts) }.
// The Walk clip is scrubbed by the walk phase, so the feet follow the scroll in both directions.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const pick = (clips, re) => clips.find((c) => re.test(c.name));

/** Walk clips exported "not in place" drift forward; keep the hip bob but drop horizontal root motion. */
function inPlace(clip) {
  const c = clip.clone();
  for (const t of c.tracks) {
    if (!/(hips|root|pelvis)[^.]*\.position$/i.test(t.name)) continue;
    for (let i = 0; i < t.values.length; i += 3) {
      t.values[i] = t.values[0];
      t.values[i + 2] = t.values[2];
    }
  }
  return c;
}

export function createGlbHero(gltf, height = 1.8) {
  const model = gltf.scene;
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  model.scale.multiplyScalar(height / (size.y || 1));
  box.setFromObject(model);
  const centre = box.getCenter(new THREE.Vector3());
  model.position.x -= centre.x;
  model.position.z -= centre.z;
  model.position.y -= box.min.y;
  model.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });
  const group = new THREE.Group();
  group.add(model);

  const clips = gltf.animations ?? [];
  const mixer = new THREE.AnimationMixer(model);
  const walkClip = pick(clips, /walk/i) ?? clips[0];
  const idleClip = pick(clips, /idle|stand|breath/i);
  const waveClip = pick(clips, /wave|hello|greet/i);
  const walk = walkClip ? mixer.clipAction(inPlace(walkClip)) : null;
  const idle = idleClip && idleClip !== walkClip ? mixer.clipAction(idleClip) : null;
  const wave = waveClip ? mixer.clipAction(waveClip) : null;
  if (walk) { walk.play(); walk.timeScale = 0; } // time set by hand from the phase
  idle?.play();
  wave?.play();

  let amt = 0;
  return {
    group,
    heroPhoto: true,
    get walkTime() { return walk ? walk.time : 0; },
    update(phase, speed, dt = 1 / 60, opts = {}) {
      amt += ((speed > 0 ? 1 : 0) - amt) * Math.min(1, dt / 0.25);
      const waving = !!(opts.wave && wave && amt < 0.5);
      if (walk) {
        walk.time = ((phase / (2 * Math.PI)) % 1) * walk.getClip().duration;
        walk.setEffectiveWeight(idle || wave ? amt : 1);
      }
      idle?.setEffectiveWeight((1 - amt) * (waving ? 0 : 1));
      wave?.setEffectiveWeight(waving ? 1 - amt : 0);
      mixer.update(dt);
    },
  };
}

export const loadGlbHero = (url) =>
  new Promise((resolve, reject) => new GLTFLoader().load(url, (gltf) => resolve(createGlbHero(gltf)), undefined, reject));
