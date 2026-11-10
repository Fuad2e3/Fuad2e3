// A low-poly developer built from primitives. Local forward is +z, feet at y = 0.
import * as THREE from 'three';

const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, ...extra });
const neon = (color, i = 2.2) => new THREE.MeshStandardMaterial({ color: 0x0b1020, emissive: color, emissiveIntensity: i });

function limb(radius, length, mat) {
  const pivot = new THREE.Group();
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 6, 12), mat);
  m.position.y = -(length / 2 + radius);
  pivot.add(m);
  return pivot;
}

function blobShadow() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(0,194,255,0.55)');
  grad.addColorStop(0.5, 'rgba(0,80,140,0.25)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.03;
  return m;
}

export function createCharacter() {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body, blobShadow());

  const skin = std(0xf2c6a0);
  const hoodie = std(0x1e3a8a);
  const pants = std(0x111827);
  const cyan = neon(0x00c2ff, 1.3);
  const violet = neon(0x8e75ff, 0.9);

  // legs
  const legs = [-1, 1].map((side) => {
    const leg = limb(0.085, 0.62, pants);
    leg.position.set(side * 0.13, 0.95, 0);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.1, 0.3), std(0xf8fafc));
    shoe.position.set(0, -0.9, 0.05);
    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.025, 0.31), cyan);
    sole.position.set(0, -0.96, 0.05);
    leg.add(shoe, sole);
    body.add(leg);
    return leg;
  });

  // torso + hoodie details
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.27, 0.36, 6, 16), hoodie);
  torso.position.y = 1.27;
  torso.scale.z = 0.8;
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.38, 0.02), cyan);
  stripe.position.set(0, 1.3, 0.22);
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.44, 0.16), std(0x0f172a));
  pack.position.set(0, 1.28, -0.27);
  const packLight = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.03, 0.02), violet);
  packLight.position.set(0, 1.36, -0.36);
  body.add(torso, stripe, pack, packLight);

  // arms
  const arms = [-1, 1].map((side) => {
    const arm = limb(0.07, 0.44, hoodie);
    arm.position.set(side * 0.35, 1.5, 0);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 12), skin);
    hand.position.y = -0.66;
    arm.add(hand);
    body.add(arm);
    return arm;
  });

  // head
  const head = new THREE.Group();
  head.position.y = 1.72;
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 18), skin);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.235, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), std(0x1f2937));
  hair.rotation.x = -0.25;
  hair.position.set(0, 0.02, -0.02);
  const eyes = [-1, 1].map((side) => {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 10), std(0x0f172a));
    e.position.set(side * 0.075, 0.01, 0.2);
    head.add(e);
    return e;
  });
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.245, 0.022, 8, 32, Math.PI), violet);
  band.position.y = 0.02;
  const cups = [-1, 1].map((side) => {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.06, 16), violet);
    cup.rotation.z = Math.PI / 2;
    cup.position.set(side * 0.245, 0.0, 0);
    return cup;
  });
  head.add(skull, hair, band, ...cups);
  body.add(head);

  let amt = 0; // 0 = rest pose, 1 = full walk
  let clock = 0;

  return {
    group,
    /**
     * @param {number} phase walk cycle angle (radians)
     * @param {number} speed 0 when standing still
     * @param {number} [dt] seconds since last frame
     * @param {{ wave?: boolean }} [opts]
     */
    update(phase, speed, dt = 1 / 60, opts = {}) {
      clock += dt;
      amt += ((speed > 0 ? 1 : 0) - amt) * Math.min(1, dt / 0.2);
      const s = Math.sin(phase);
      legs[0].rotation.x = s * 0.6 * amt;
      legs[1].rotation.x = -s * 0.6 * amt;
      arms[0].rotation.x = -s * 0.4 * amt;
      arms[1].rotation.x = s * 0.4 * amt;
      arms[0].rotation.z = -0.08;
      arms[1].rotation.z = 0.08;
      if (opts.wave && amt < 0.5) {
        arms[1].rotation.x = 0;
        arms[1].rotation.z = 2.6 + Math.sin(clock * 8) * 0.35;
      }
      body.position.y = Math.abs(s) * 0.05 * amt + Math.sin(clock * 2) * 0.008;
      head.rotation.y = Math.sin(clock * 0.7) * 0.15 * (1 - amt);
      const blink = clock % 3.6 < 0.12 ? 0.1 : 1;
      for (const e of eyes) e.scale.y = blink;
    },
  };
}
