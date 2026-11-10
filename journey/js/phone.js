// A floating 3D phone over the Mobile station that spins and flips through app screens.
import * as THREE from 'three';

const W = 360;
const H = 720;

/** Mock app screen drawn on a canvas, used until a real screenshot is supplied (project.shotUrl). */
function mockScreen(project, color) {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  const bg = g.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0b1020');
  bg.addColorStop(1, '#141c3d');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  const head = g.createLinearGradient(0, 0, W, 0);
  head.addColorStop(0, color);
  head.addColorStop(1, '#8E75FF');
  g.fillStyle = head;
  g.beginPath();
  g.roundRect(0, 0, W, 230, [0, 0, 36, 36]);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,.9)';
  g.font = '600 18px Poppins, sans-serif';
  g.fillText('9:41', 28, 40);
  g.font = '800 38px Poppins, sans-serif';
  g.fillText(project.name.length > 14 ? project.name.split(' ').slice(0, 2).join(' ') : project.name, 28, 130);
  g.font = '400 17px Poppins, sans-serif';
  g.fillStyle = 'rgba(255,255,255,.8)';
  const words = project.desc.split(' ');
  let line = '';
  let y = 170;
  for (const w of words) {
    if (g.measureText(line + w).width > W - 56) { g.fillText(line, 28, y); line = ''; y += 24; if (y > 200) break; }
    line += w + ' ';
  }
  if (y <= 200) g.fillText(line, 28, y);
  for (let i = 0; i < 4; i++) {
    const top = 260 + i * 105;
    g.fillStyle = 'rgba(255,255,255,.06)';
    g.beginPath();
    g.roundRect(24, top, W - 48, 88, 20);
    g.fill();
    g.fillStyle = i % 2 ? '#8E75FF' : color;
    g.beginPath();
    g.arc(68, top + 44, 24, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,.75)';
    g.fillRect(108, top + 26, 150 - i * 18, 12);
    g.fillStyle = 'rgba(255,255,255,.35)';
    g.fillRect(108, top + 50, 190 - i * 24, 10);
  }
  g.fillStyle = 'rgba(255,255,255,.5)';
  g.beginPath();
  g.roundRect(W / 2 - 60, H - 26, 120, 6, 3);
  g.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createPhone(scene, projects, color = '#00C2FF') {
  const group = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.7, 3.4, 0.16), new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.8, roughness: 0.25 }));
  const edge = new THREE.Mesh(new THREE.BoxGeometry(1.74, 3.44, 0.12), new THREE.MeshStandardMaterial({ color: 0x0b1020, emissive: 0x00c2ff, emissiveIntensity: 0.9 }));
  const textures = projects.map((p) => mockScreen(p, color));
  projects.forEach((p, i) => {
    if (!p.shotUrl) return;
    new THREE.TextureLoader().load(p.shotUrl, (t) => { t.colorSpace = THREE.SRGBColorSpace; textures[i] = t; });
  });
  const screenMat = new THREE.MeshBasicMaterial({ map: textures[0], toneMapped: false });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.56, 3.12), screenMat);
  screen.position.z = 0.081;
  const back = new THREE.Mesh(new THREE.CircleGeometry(0.22, 32), new THREE.MeshStandardMaterial({ color: 0x0b1020, emissive: 0x02569b, emissiveIntensity: 1.6 }));
  back.position.set(0, 0.9, -0.081);
  back.rotation.y = Math.PI;
  group.add(edge, frame, screen, back);
  group.scale.setScalar(0.001);
  scene.add(group);

  let shown = 0;
  let scale = 0;
  let index = 0;
  return {
    group,
    get index() { return index; },
    /** @param {number} local progress inside the Mobile station (0..1) @param {boolean} visible */
    update(local, visible, t = 0, dt = 1 / 60) {
      shown += ((visible ? 1 : 0) - shown) * Math.min(1, dt * 4);
      scale = Math.max(0.001, shown) * 0.75;
      group.scale.setScalar(scale);
      index = Math.min(projects.length - 1, Math.floor(local * projects.length));
      if (screenMat.map !== textures[index]) {
        screenMat.map = textures[index];
        screenMat.needsUpdate = true;
      }
      // a full turn per screen, settling face-on in the middle of each screen's slice
      const slice = local * projects.length - index;
      group.rotation.y = Math.sin((slice - 0.5) * Math.PI) * 0.5 + (1 - shown) * Math.PI;
      group.rotation.z = Math.sin(t * 0.8) * 0.05;
      group.position.y = 2.1 + Math.sin(t * 1.4) * 0.12;
    },
  };
}
