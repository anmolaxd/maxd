// MAXD services stage: a barbell on J-hooks between two plate racks. Each plate pair is one MAXD service.
// main.js sets canvas.loadProgress (0..1) from the open service tab: pair k leaves the racks and slides onto
// the bar when tab k opens, and goes back when you return. All four on: the bar lifts off the hooks ("maxed").
// With reduced motion it renders one still frame, fully loaded.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export const SERVICES = 4;
const PLATES = [ // radius, thickness, weight, service printed on the plate
  [1.6, 0.36, '20', 'RENEWAL REMINDERS'],
  [1.42, 0.32, '15', 'AI FRONT DESK'],
  [1.22, 0.28, '10', 'TRIAL WEBSITE'],
  [1.02, 0.24, '5', 'FULL PLATFORM'],
];

// Printed plate face: raised rim, orange ring, service name on the top arc, MAXD on the bottom arc, weight by the hub.
function faceTexture(weight, service, font) {
  const S = 768, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'), m = S / 2;
  const ring = (r, w, col) => { g.beginPath(); g.arc(m, m, r, 0, Math.PI * 2); g.lineWidth = w; g.strokeStyle = col; g.stroke(); };
  g.fillStyle = '#0d0d0d'; g.beginPath(); g.arc(m, m, m, 0, Math.PI * 2); g.fill();
  ring(m - 14, 26, '#1d1d1d'); ring(m - 30, 3, '#2a2a2a');
  ring(m - 62, 7, '#ff4f1f');
  const arc = (text, r, size, col, top) => {
    g.font = `${size}px ${font}`; g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle';
    const chars = [...text], widths = chars.map((ch) => g.measureText(ch).width + size * 0.12);
    const total = widths.reduce((a, b) => a + b, 0), span = total / r;
    let ang = top ? -Math.PI / 2 - span / 2 : Math.PI / 2 + span / 2;
    chars.forEach((ch, i) => {
      const a = ang + (top ? 1 : -1) * widths[i] / 2 / r;
      g.save(); g.translate(m + Math.cos(a) * r, m + Math.sin(a) * r); g.rotate(a + (top ? Math.PI / 2 : -Math.PI / 2));
      g.fillText(ch, 0, 0); g.restore();
      ang += (top ? 1 : -1) * widths[i] / r;
    });
  };
  arc(service, m - 118, service.length > 14 ? 40 : 46, '#d9d9d3', true);
  arc('MAXD', m - 118, 50, '#ff4f1f', false);
  g.fillStyle = '#202020'; g.beginPath(); g.arc(m, m, 118, 0, Math.PI * 2); g.fill();
  ring(118, 6, '#2e2e2e');
  g.font = `110px ${font}`; g.fillStyle = '#ededea'; g.textAlign = 'right'; g.textBaseline = 'middle';
  g.fillText(weight, m - 132, m + 6);
  g.font = `44px ${font}`; g.textAlign = 'left'; g.fillText('KG', m + 136, m + 6);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return tex;
}

export default async function init(canvas, still) {
  const font = '"Bowlby One", Impact, sans-serif';
  try { await document.fonts.load(`64px ${font}`); } catch { /* falls back to Impact */ }

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 200);

  const rubber = new THREE.MeshPhysicalMaterial({ color: 0x0b0b0b, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 0.9 });
  const steel = new THREE.MeshStandardMaterial({ color: 0xdadada, roughness: 0.18, metalness: 1, envMapIntensity: 1.2 });
  const frame = new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.45, metalness: 0.7, envMapIntensity: 0.8 });
  const orange = new THREE.MeshStandardMaterial({ color: 0xff4f1f, roughness: 0.4, metalness: 0.2, emissive: 0xff4f1f, emissiveIntensity: 0.25 });

  const rig = new THREE.Group(); scene.add(rig);
  const FLOOR = -2.5, REST = 0.35;            // floor height, bar height on the hooks
  const box = (w, h, d, mat, x, y, z, parent = rig) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); parent.add(m); return m; };
  const along = (mesh, x, parent) => { mesh.rotation.z = Math.PI / 2; mesh.position.x = x; parent.add(mesh); return mesh; };
  const cyl = (r, len, mat, x, parent) => along(new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 48), mat), x, parent);

  // J-hook uprights holding the bar
  for (const s of [-1, 1]) {
    box(0.26, REST - FLOOR + 0.5, 0.26, frame, s * 2.75, (REST + 0.5 + FLOOR) / 2 - 0.1, 0);
    box(0.26, 0.1, 0.42, orange, s * 2.75, REST - 0.18, 0.14);                 // hook lip
    box(0.9, 0.08, 0.9, frame, s * 2.75, FLOOR + 0.04, 0);                     // foot
  }

  // The bar
  const bell = new THREE.Group(); rig.add(bell);
  cyl(0.085, 7.2, steel, 0, bell);
  for (const s of [-1, 1]) {
    cyl(0.15, 2.3, steel, s * 4.65, bell);
    cyl(0.25, 0.18, steel, s * 3.48, bell);
    cyl(0.2, 0.14, steel, s * 5.66, bell);
  }

  // Plates: lathe body + printed faces. Each lives in the rig so it can travel from rack to bar.
  function plate(R, t, tex) {
    const h = t / 2, p = [
      [0.16, -h], [0.32, -h], [0.36, -h + 0.04], [R - 0.3, -h + 0.04], [R - 0.26, -h], [R - 0.07, -h], [R, -h + 0.07],
      [R, h - 0.07], [R - 0.07, h], [R - 0.26, h], [R - 0.3, h - 0.04], [0.36, h - 0.04], [0.32, h], [0.16, h], [0.16, -h],
    ].map(([a, b]) => new THREE.Vector2(a, b));
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.LatheGeometry(p, 96), rubber); body.rotation.z = Math.PI / 2; g.add(body);
    const faceMat = new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.42, clearcoat: 0.7, clearcoatRoughness: 0.18, envMapIntensity: 0.6 });
    for (const s of [-1, 1]) {
      const f = new THREE.Mesh(new THREE.RingGeometry(0.16, R - 0.05, 96), faceMat);
      // map the texture across the plate's full diameter so it lines up with the rim
      const uv = f.geometry.attributes.uv, pos = f.geometry.attributes.position;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / (2 * R) + 0.5, pos.getY(i) / (2 * R) + 0.5);
      f.rotation.y = s * Math.PI / 2; f.position.x = s * (h + 0.004); g.add(f);
    }
    rig.add(g);
    return g;
  }

  // Plate racks on both sides: slot k nearest the bar holds the plate that goes on first.
  const RACK_X = 6.3, SLOT = 0.62;
  for (const s of [-1, 1]) {
    const x0 = s * (RACK_X - 0.45), x1 = s * (RACK_X + SLOT * 3 + 0.45);
    box(Math.abs(x1 - x0), 0.12, 0.9, frame, (x0 + x1) / 2, FLOOR + 0.06, 0);           // base
    for (let k = 0; k <= 4; k++) box(0.06, 0.55, 0.06, steel, s * (RACK_X - SLOT / 2 + k * SLOT), FLOOR + 0.38, 0.38); // pins
    box(0.12, 1.2, 0.12, frame, x1, FLOOR + 0.6, 0);                                     // end post
  }

  const plates = [];
  let edge = 3.58;
  PLATES.forEach(([R, t, w, name], k) => {
    const tex = faceTexture(w, name, font);
    const at = edge + t / 2; edge += t + 0.02;
    plates.push({ R, at, rack: RACK_X + k * SLOT, pair: [plate(R, t, tex), plate(R, t, tex)] });
  });

  scene.add(new THREE.AmbientLight(0xffffff, 0.14));
  const key = new THREE.DirectionalLight(0xffffff, 1.7); key.position.set(4, 7, 8); scene.add(key);
  const rim = new THREE.DirectionalLight(0xff5a24, 5); rim.position.set(-8, -2, -4); scene.add(rim);
  const under = new THREE.PointLight(0xff4f1f, 60, 40); under.position.set(0, -4, 5); scene.add(under);
  const cool = new THREE.DirectionalLight(0x7fb0ff, 0.6); cool.position.set(8, 3, -6); scene.add(cool);

  // Fit the whole rig (about 18 units wide) to the canvas.
  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const hfov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect);
    const vfov = THREE.MathUtils.degToRad(camera.fov);
    // Wide: whole rig incl. both racks (angled view needs ~21 units). Narrow: frame the bar; plates swing in from off-screen racks.
    const narrow = w < 640, span = narrow ? 12.6 : 21;
    const dist = Math.max((span / 2) / (Math.tan(hfov / 2) * 0.96), (7.4 / 2) / (Math.tan(vfov / 2) * 0.92));
    camera.position.set(0, dist * 0.2, dist);
    camera.lookAt(0, narrow ? -0.35 : -0.75, 0);
    camera.updateProjectionMatrix();
  };
  resize();
  addEventListener('resize', resize);

  // Pair k's travel: a = 0 in its rack slot, a = 1 on the sleeve. It lifts out, swings over, slides on.
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  let lift = 0;
  const place = (p) => {
    plates.forEach(({ R, at, rack, pair }, k) => {
      const a = ease(Math.min(1, Math.max(0, (p - k / SERVICES) * SERVICES * 1.15)));
      const barY = REST + lift, rackY = FLOOR + 0.12 + R;
      pair.forEach((g, i) => {
        const s = i ? 1 : -1;
        g.position.set(s * (rack + (at - rack) * a), rackY + (barY - rackY) * a + Math.sin(Math.PI * a) * 1.4, Math.sin(Math.PI * a) * 0.6);
        g.rotation.x = Math.sin(Math.PI * a) * 0.25 * s;
      });
    });
  };
  const setBar = () => (bell.position.y = REST + lift);

  rig.rotation.set(0.02, -0.24, 0);
  if (still) { lift = 0.9; setBar(); place(1); renderer.render(scene, camera); return; }

  let mx = 0, my = 0, visible = true, t0 = performance.now(), shown = canvas.loadProgress ?? 0;
  addEventListener('pointermove', (e) => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; }, { passive: true });
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(canvas);

  const cur = { x: 0.02, y: -0.24 };
  const tick = (t) => {
    requestAnimationFrame(tick);
    const dt = Math.max(0, Math.min((t - t0) / 1000, 0.05)); t0 = t;   // first frame can be stamped before t0
    if (!visible || document.hidden) return;
    const target = canvas.loadProgress ?? 1;
    shown += Math.sign(target - shown) * Math.min(Math.abs(target - shown), dt * 0.32);   // one pair takes ~0.8 s
    lift += ((shown > 0.985 ? 0.9 : 0) - lift) * Math.min(1, dt * 3);                  // all four on: off the hooks
    setBar(); place(shown);
    cur.y += (-0.24 + mx * 0.22 - cur.y) * Math.min(1, dt * 3);
    cur.x += (0.02 + my * 0.1 - cur.x) * Math.min(1, dt * 3);
    rig.rotation.set(cur.x, cur.y, 0);
    renderer.render(scene, camera);
  };
  requestAnimationFrame(tick);
}
