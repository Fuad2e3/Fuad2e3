// Fuad as a stylised human: photo face, blazer + tie, two-segment limbs driven by gaitPose().
// Local forward is +z, feet at y = 0.
import * as THREE from 'three';
import { gaitPose } from './gait.js';

const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra });

/** A pivot with a tapered limb hanging below it; `end` sits at the far joint. */
function segment(radius, length, mat, topRadius = radius) {
  const pivot = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(topRadius, radius, length, 14), mat);
  mesh.position.y = -length / 2;
  const capTop = new THREE.Mesh(new THREE.SphereGeometry(topRadius, 14, 10), mat);
  const end = new THREE.Group();
  end.position.y = -length;
  pivot.add(mesh, capTop, end);
  return { pivot, end };
}

function blobShadow() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(0,194,255,0.5)');
  grad.addColorStop(0.5, 'rgba(0,80,140,0.22)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.03;
  return m;
}

/** Curved face cap (front of the head) with a planar-projected photo and a soft oval mask. */
function photoFace(url, radius, crop, onReady) {
  const cap = new THREE.SphereGeometry(radius, 40, 20, 0, Math.PI * 2, 0, Math.PI * 0.46);
  const pos = cap.attributes.position;
  const uv = cap.attributes.uv;
  const span = 2 * radius * Math.sin(Math.PI * 0.46);
  for (let i = 0; i < pos.count; i++) uv.setXY(i, 0.5 + pos.getX(i) / span, 0.5 - pos.getZ(i) / span);
  const mat = new THREE.MeshBasicMaterial({ transparent: true, visible: false, toneMapped: false, color: 0xe8e8e8 });
  const mesh = new THREE.Mesh(cap, mat);
  mesh.rotation.x = Math.PI / 2; // cap faces +z
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    const [sx, sy, size] = crop(img.naturalWidth, img.naturalHeight);
    g.drawImage(img, sx, sy, size, size, 0, 0, 256, 256);
    g.globalCompositeOperation = 'destination-in';
    const mask = g.createRadialGradient(128, 128, 70, 128, 128, 120);
    mask.addColorStop(0, 'rgba(0,0,0,1)');
    mask.addColorStop(1, 'rgba(0,0,0,0)');
    g.setTransform(0.78, 0, 0, 1, 28, 0); // oval, narrower than tall
    g.fillStyle = mask;
    g.fillRect(0, 0, 330, 256);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    mat.map = tex;
    mat.visible = true;
    mat.needsUpdate = true;
    onReady();
  };
  img.src = url;
  return mesh;
}

// The bundled avatar (journey/assets/me.jpg, 256px) has the face centred around (128, 100).
const DEFAULT_CROP = () => [18, 8, 220];

export function createCharacter({ photoUrl, photoCrop = DEFAULT_CROP } = {}) {
  const group = new THREE.Group();
  const body = new THREE.Group(); // bob + sway
  group.add(body, blobShadow());

  const skin = std(0xd9a582, { roughness: 0.7 });
  const blazer = std(0x2c303d, { roughness: 0.45, metalness: 0.15 });
  const shirtMat = std(0x8f9aab, { roughness: 0.8 });
  const trousers = std(0x1d2029);
  const shoeMat = std(0x0d0d10, { roughness: 0.3, metalness: 0.2 });
  const glow = new THREE.MeshStandardMaterial({ color: 0x0b1020, emissive: 0x00c2ff, emissiveIntensity: 1.1 });

  const pelvis = new THREE.Group();
  pelvis.position.y = 0.95;
  body.add(pelvis);
  const hips = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.16, 0.16, 16), trousers);
  hips.scale.z = 0.7;
  pelvis.add(hips);

  // legs: hip -> knee -> ankle
  const legs = [-1, 1].map((side) => {
    const thigh = segment(0.065, 0.44, trousers, 0.085);
    thigh.pivot.position.set(side * 0.095, -0.03, 0);
    const shin = segment(0.05, 0.43, trousers, 0.065);
    thigh.end.add(shin.pivot);
    const ankle = new THREE.Group();
    ankle.position.y = -0.43;
    shin.pivot.add(ankle);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.08, 0.27), shoeMat);
    shoe.position.set(0, -0.035, 0.06);
    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.015, 0.275), glow);
    sole.position.set(0, -0.08, 0.06);
    ankle.add(shoe, sole);
    pelvis.add(thigh.pivot);
    return { hip: thigh.pivot, knee: shin.pivot, ankle };
  });

  // chest: counter-twists against the pelvis
  const chest = new THREE.Group();
  chest.position.y = 0.06;
  pelvis.add(chest);
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.17, 0.56, 20), blazer);
  torso.scale.z = 0.62;
  torso.position.y = 0.28;
  const shirt = new THREE.Mesh(new THREE.CylinderGeometry(0.001, 0.085, 0.26, 3), shirtMat);
  shirt.rotation.set(Math.PI, Math.PI / 3, 0);
  shirt.scale.z = 0.25;
  shirt.position.set(0, 0.43, 0.125);
  const tie = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.26, 0.015), std(0x6b1d2a));
  tie.position.set(0, 0.37, 0.14);
  const lapels = [-1, 1].map((side) => {
    const lap = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.012), std(0x23262f));
    lap.position.set(side * 0.06, 0.42, 0.135);
    lap.rotation.z = side * 0.35;
    return lap;
  });
  const shoulders = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.48, 12), blazer);
  shoulders.rotation.z = Math.PI / 2;
  shoulders.position.y = 0.52;
  chest.add(torso, shirt, tie, ...lapels, shoulders);

  // arms: shoulder -> elbow -> hand
  const arms = [-1, 1].map((side) => {
    const upper = segment(0.052, 0.29, blazer, 0.06);
    upper.pivot.position.set(side * 0.25, 0.52, 0);
    const fore = segment(0.044, 0.27, blazer, 0.05);
    upper.end.add(fore.pivot);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.048, 12, 10), skin);
    hand.scale.set(0.8, 1.2, 0.9);
    hand.position.y = -0.3;
    fore.pivot.add(hand);
    chest.add(upper.pivot);
    return { shoulder: upper.pivot, elbow: fore.pivot };
  });

  // neck + head
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.1, 12), skin);
  neck.position.y = 0.6;
  chest.add(neck);
  const head = new THREE.Group();
  head.position.y = 0.88;
  head.scale.setScalar(1.25);
  chest.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 18), std(0x2a1f1a, { roughness: 0.55 }));
  skull.scale.set(0.95, 1.08, 1);
  const ears = [-1, 1].map((side) => {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), skin);
    ear.scale.set(0.5, 1, 0.8);
    ear.position.set(side * 0.19, 0, 0.01);
    return ear;
  });
  head.add(skull, ...ears);
  let heroPhoto = false;
  if (photoUrl) {
    head.add(photoFace(photoUrl, 0.206, photoCrop, () => { heroPhoto = true; }));
  } else {
    const plain = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.45), skin);
    plain.rotation.x = Math.PI / 2;
    plain.position.z = 0.005;
    head.add(plain);
  }

  let amt = 0;
  let clock = 0;

  return {
    group,
    get heroPhoto() { return heroPhoto; },
    /**
     * @param {number} phase walk cycle angle (radians)
     * @param {number} speed 0 when standing still
     * @param {number} [dt] seconds since last frame
     * @param {{ wave?: boolean }} [opts]
     */
    update(phase, speed, dt = 1 / 60, opts = {}) {
      clock += dt;
      amt += ((speed > 0 ? 1 : 0) - amt) * Math.min(1, dt / 0.25);
      const a = amt < 1e-3 ? 0 : amt;
      const g = gaitPose(phase, a);
      const pose = [
        [legs[0], g.hipL, g.kneeL, g.ankleL],
        [legs[1], g.hipR, g.kneeR, g.ankleR],
      ];
      for (const [leg, hip, knee, ankle] of pose) {
        leg.hip.rotation.x = -hip;
        leg.knee.rotation.x = knee;
        leg.ankle.rotation.x = ankle;
      }
      const breathe = Math.sin(clock * 1.6);
      for (const [arm, sh, el, side] of [[arms[0], g.shoulderL, g.elbowL, -1], [arms[1], g.shoulderR, g.elbowR, 1]]) {
        arm.shoulder.rotation.set(-sh, 0, side * (0.1 + 0.02 * breathe));
        arm.elbow.rotation.set(-(el + 0.12 * (1 - a)), 0, 0);
      }
      if (opts.wave && a < 0.5) {
        arms[1].shoulder.rotation.set(-0.2, 0, 2.5);
        arms[1].elbow.rotation.set(0, 0, 0.5 + Math.sin(clock * 7) * 0.45);
      }
      body.position.y = g.bob + 0.004 * breathe;
      body.position.x = g.sway + 0.01 * Math.sin(clock * 0.5) * (1 - a); // idle weight shift
      pelvis.rotation.y = g.twist;
      chest.rotation.y = -g.twist * 1.4;
      chest.rotation.x = 0.06 * a; // lean into the walk
      chest.scale.setScalar(1 + 0.006 * breathe);
      head.rotation.y = g.twist * 0.6 + Math.sin(clock * 0.6) * 0.12 * (1 - a);
      head.rotation.x = -0.04 * a;
    },
  };
}
