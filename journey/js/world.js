// The journey world: neon road along a curve, starfield, grid floor and one landmark per station.
import * as THREE from 'three';
import { positionAt } from './journey-math.js';

const CONTROL = [[0, 0, 4], [0, 0, -6], [8, 0, -30], [-8, 0, -60], [8, 0, -90], [-8, 0, -120], [0, 0, -146], [0, 0, -154]];
const ROAD_HALF = 1.4;

const v3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);
const glow = (color, intensity = 1) =>
  new THREE.MeshStandardMaterial({ color: 0x0b1020, emissive: new THREE.Color(color), emissiveIntensity: intensity, roughness: 0.4, metalness: 0.2 });

/** Right-hand vector (xz plane) of the path at progress p. */
export function rightAt(p, points) {
  const a = positionAt(Math.max(0, p - 0.002), points);
  const b = positionAt(Math.min(1, p + 0.002), points);
  const t = new THREE.Vector3(b[0] - a[0], 0, b[2] - a[2]).normalize();
  return new THREE.Vector3(-t.z, 0, t.x);
}

function starfield(count, radius) {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const palette = [new THREE.Color('#ffffff'), new THREE.Color('#00C2FF'), new THREE.Color('#8E75FF')];
  for (let i = 0; i < count; i++) {
    const u = Math.random() * Math.PI * 2;
    const v = Math.random() * Math.PI * 0.48;
    const r = radius * (0.6 + Math.random() * 0.4);
    pos.set([Math.cos(u) * Math.sin(v) * r, Math.cos(v) * r * 0.7 + 4, Math.sin(u) * Math.sin(v) * r - 75], i * 3);
    palette[i % 7 === 0 ? 1 : i % 11 === 0 ? 2 : 0].toArray(col, i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return new THREE.Points(g, new THREE.PointsMaterial({ size: 0.45, vertexColors: true, fog: false, transparent: true, opacity: 0.7 }));
}

function dust(points, count) {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const c = positionAt(Math.random(), points);
    pos.set([c[0] + (Math.random() - 0.5) * 30, Math.random() * 8, c[2] + (Math.random() - 0.5) * 20], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(g, new THREE.PointsMaterial({ size: 0.08, color: 0x7dd3fc, transparent: true, opacity: 0.7 }));
}

function sky() {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: { top: { value: new THREE.Color('#03050d') }, horizon: { value: new THREE.Color('#1b1150') } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 horizon; varying vec3 vP; void main(){ float h = clamp(vP.y * 2.2, 0.0, 1.0); gl_FragColor = vec4(mix(horizon, top, pow(h, 0.6)), 1.0); }',
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(320, 32, 16), mat);
  dome.position.z = -75;
  return dome;
}

function planet() {
  const group = new THREE.Group();
  group.position.set(-90, 42, -330);
  const body = new THREE.Mesh(new THREE.SphereGeometry(34, 48, 32), new THREE.MeshStandardMaterial({ color: 0x2b1d6b, emissive: 0x160c3f, roughness: 1, fog: false }));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(52, 0.6, 8, 160), new THREE.MeshBasicMaterial({ color: 0x8e75ff, fog: false, transparent: true, opacity: 0.55 }));
  ring.rotation.set(1.25, 0.2, 0.3);
  group.add(body, ring);
  return group;
}

function road(points) {
  const n = points.length;
  const surface = new Float32Array(n * 2 * 3);
  const left = [];
  const right = [];
  for (let i = 0; i < n; i++) {
    const p = i / (n - 1);
    const c = v3(points[i]);
    const r = rightAt(p, points).multiplyScalar(ROAD_HALF);
    const l = c.clone().sub(r).setY(0.02);
    const rr = c.clone().add(r).setY(0.02);
    left.push(l.clone().setY(0.04));
    right.push(rr.clone().setY(0.04));
    surface.set([l.x, l.y, l.z, rr.x, rr.y, rr.z], i * 6);
  }
  const index = [];
  for (let i = 0; i < n - 1; i++) {
    const a = i * 2;
    index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(surface, 3));
  g.setIndex(index);
  g.computeVertexNormals();
  const group = new THREE.Group();
  group.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x0f1a3a, emissive: 0x06102a, roughness: 0.8, side: THREE.DoubleSide })));
  const edge = new THREE.LineBasicMaterial({ color: 0x00c2ff });
  group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(left), edge));
  group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(right), edge));
  // dashed centre line
  const dashes = [];
  for (let i = 0; i < n - 1; i += 4) dashes.push(v3(points[i]).setY(0.03), v3(points[i + 1]).setY(0.03));
  group.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(dashes), new THREE.LineBasicMaterial({ color: 0x8e75ff, transparent: true, opacity: 0.6 })));
  return group;
}

// ---------- landmarks: each returns { group, mats: Material[], tick(t) } ----------

function gate() {
  const group = new THREE.Group();
  const m = glow('#00C2FF', 1.1);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.07, 12, 96), m);
  ring.position.y = 2.6;
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(2.9, 0.03, 8, 96), glow('#8E75FF', 1.2));
  ring2.position.y = 2.6;
  group.add(ring, ring2);
  return { group, mats: [m, ring2.material], tick: (t) => { ring2.rotation.z = t * 0.6; ring.rotation.z = -t * 0.3; } };
}

function pedestal(color) {
  const group = new THREE.Group();
  const m = glow(color, 1.5);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.9, 0.4, 48), new THREE.MeshStandardMaterial({ color: 0x111a33, roughness: 0.5, metalness: 0.6 }));
  base.position.y = 0.2;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.75, 0.04, 8, 64), m);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.42;
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.5, 7, 32, 1, true),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.06, side: THREE.DoubleSide, depthWrite: false }));
  beam.position.y = 3.9;
  group.add(base, rim, beam);
  return { group, mats: [m], tick: (t) => { beam.material.opacity = 0.05 + Math.sin(t * 2) * 0.02; } };
}

function cloud() {
  const group = new THREE.Group();
  const mats = [glow('#F38020', 0.6), glow('#00C2FF', 0.7), glow('#FBAD41', 0.5)];
  const cubes = [];
  for (let i = 0; i < 18; i++) {
    const s = 0.4 + Math.random() * 0.7;
    const c = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), mats[i % 3]);
    const a = (i / 18) * Math.PI * 2;
    c.position.set(Math.cos(a) * (1.2 + Math.random() * 1.4), 3 + Math.sin(i * 1.7) * 1.1, Math.sin(a) * (1.2 + Math.random()));
    c.userData.spin = 0.3 + Math.random();
    cubes.push(c);
    group.add(c);
  }
  const server = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.4, 1.2), new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.3 }));
  server.position.y = 1.2;
  const leds = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.06, 1.22), mats[1]);
  leds.position.y = 1.6;
  group.add(server, leds);
  return { group, mats, tick: (t) => { group.rotation.y = t * 0.15; for (const c of cubes) { c.rotation.x = t * c.userData.spin; c.rotation.y = t * c.userData.spin * 0.7; } } };
}

function brain() {
  const group = new THREE.Group();
  const m = glow('#8E75FF', 2);
  const shell = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(2, 1)), new THREE.LineBasicMaterial({ color: 0x8e75ff }));
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9, 2), m);
  shell.position.y = core.position.y = 3.4;
  const orbit = new THREE.Group();
  orbit.position.y = 3.4;
  for (let i = 0; i < 24; i++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), glow('#00C2FF', 3));
    const a = (i / 24) * Math.PI * 2;
    s.position.set(Math.cos(a) * 2.8, Math.sin(a * 3) * 0.6, Math.sin(a) * 2.8);
    orbit.add(s);
  }
  group.add(shell, core, orbit);
  return { group, mats: [m], tick: (t) => { shell.rotation.y = t * 0.25; shell.rotation.x = t * 0.1; core.scale.setScalar(1 + Math.sin(t * 3) * 0.08); orbit.rotation.y = -t * 0.5; } };
}

function library() {
  const group = new THREE.Group();
  const colors = ['#34D399', '#00C2FF', '#8E75FF', '#FBBF24'];
  for (let i = 0; i < 4; i++) {
    const book = new THREE.Mesh(new THREE.BoxGeometry(2 - i * 0.15, 0.32, 1.4 - i * 0.1), new THREE.MeshStandardMaterial({ color: colors[i], roughness: 0.6 }));
    book.position.y = 0.16 + i * 0.33;
    book.rotation.y = (i - 1.5) * 0.18;
    group.add(book);
  }
  const m = glow('#34D399', 2);
  const atom = new THREE.Group();
  atom.position.y = 3.6;
  atom.add(new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 24), m));
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.025, 8, 80), glow('#34D399', 1.5));
    ring.rotation.set(Math.PI / 2, (i * Math.PI) / 3, 0);
    atom.add(ring);
  }
  group.add(atom);
  return { group, mats: [m], tick: (t) => { atom.rotation.y = t * 0.6; atom.rotation.x = Math.sin(t * 0.4) * 0.4; } };
}

function portal() {
  const group = new THREE.Group();
  const m = glow('#00C2FF', 2.5);
  const rings = [];
  for (let i = 0; i < 4; i++) {
    const r = new THREE.Mesh(new THREE.TorusGeometry(3.4 - i * 0.6, 0.05, 10, 120), i % 2 ? glow('#8E75FF', 2) : m);
    r.position.y = 3.6;
    rings.push(r);
    group.add(r);
  }
  const disk = new THREE.Mesh(new THREE.CircleGeometry(3.3, 64), new THREE.MeshBasicMaterial({ color: 0x00c2ff, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false }));
  disk.position.y = 3.6;
  group.add(disk);
  return { group, mats: [m], tick: (t) => rings.forEach((r, i) => { r.rotation.z = t * (i % 2 ? -0.5 : 0.4) * (1 + i * 0.3); r.scale.setScalar(1 + Math.sin(t * 2 + i) * 0.03); }) };
}

const BUILDERS = { intro: gate, mobile: () => pedestal(0x02569b), web: cloud, ai: brain, academic: library, contact: portal };

export function createWorld(scene, stations) {
  const curve = new THREE.CatmullRomCurve3(CONTROL.map(v3), false, 'catmullrom', 0.5);
  const pathPoints = curve.getSpacedPoints(480).map((v) => [v.x, v.y, v.z]);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), new THREE.MeshStandardMaterial({ color: 0x060a17, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.z = -75;
  const grid = new THREE.GridHelper(500, 200, 0x16245a, 0x16245a);
  grid.position.set(0, 0.005, -75);
  grid.material.transparent = true;
  grid.material.opacity = 0.45;
  const stars = starfield(2600, 220);
  const motes = dust(pathPoints, 700);
  const skyDome = sky();
  const planetGroup = planet();
  const roadGroup = road(pathPoints);
  scene.add(skyDome, planetGroup, floor, grid, stars, motes, roadGroup);

  // energy pulses running along the road
  const pulses = [];
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), new THREE.MeshBasicMaterial({ color: i % 2 ? 0x8e75ff : 0x00c2ff }));
    s.userData.offset = i / 6;
    s.userData.side = i % 2 ? 1 : -1;
    pulses.push(s);
    scene.add(s);
  }

  const anchors = {};
  const landmarks = stations.map((s) => {
    const lm = BUILDERS[s.id]();
    // a little ahead of the station's midpoint so it is in view while walking towards it
    const mid = Math.min(0.985, (s.range[0] + s.range[1]) / 2 + 0.05);
    const at = v3(positionAt(mid, pathPoints));
    const side = s.id === 'intro' || s.id === 'contact' ? 0 : 3.9;
    lm.group.position.copy(at.add(rightAt(mid, pathPoints).multiplyScalar(side)));
    if (side === 0) {
      const r = rightAt(mid, pathPoints);
      lm.group.rotation.y = Math.atan2(r.x, r.z);
      lm.group.position.y = 0;
    }
    if (s.id === 'intro') lm.group.position.copy(v3(positionAt(0.05, pathPoints)));
    anchors[s.id] = lm.group.position.clone();
    lm.base = lm.mats.map((m) => m.emissiveIntensity);
    lm.level = 0.35;
    scene.add(lm.group);
    return lm;
  });

  let active = 0;
  return {
    pathPoints,
    anchors,
    /** @param {import('./theme.js').THEMES['night']} t */
    setTheme(t) {
      skyDome.material.uniforms.top.value.set(t.skyTop);
      skyDome.material.uniforms.horizon.value.set(t.skyHorizon);
      floor.material.color.set(t.floor);
      grid.material.color.set(t.grid);
      grid.material.opacity = t.gridOpacity;
      const [surface, ...lines] = roadGroup.children;
      surface.material.color.set(t.road);
      surface.material.emissive.set(t.roadEmissive);
      lines[0].material.color.set(t.edge);
      lines[1].material.color.set(t.edge);
      stars.visible = t.stars > 0;
      stars.material.opacity = t.stars;
      planetGroup.children[1].material.opacity = t.planet;
      planetGroup.visible = t.planet > 0.3;
    },
    setActiveStation(i) { active = i; },
    update(t, dt) {
      landmarks.forEach((lm, i) => {
        lm.level += ((i === active ? 1 : 0.35) - lm.level) * Math.min(1, dt * 3);
        lm.mats.forEach((m, k) => { m.emissiveIntensity = lm.base[k] * lm.level; });
        lm.tick(t);
      });
      for (const s of pulses) {
        const p = (t * 0.02 + s.userData.offset) % 1;
        const c = positionAt(p, pathPoints);
        const r = rightAt(p, pathPoints).multiplyScalar(ROAD_HALF * s.userData.side);
        s.position.set(c[0] + r.x, 0.08, c[2] + r.z);
      }
      motes.rotation.y = Math.sin(t * 0.05) * 0.02;
      motes.position.y = Math.sin(t * 0.3) * 0.3;
      stars.rotation.y = t * 0.003;
    },
  };
}
