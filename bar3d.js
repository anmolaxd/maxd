// MAXD hero stage: a floating barbell with orbit rings and drifting particles. Each plate pair is one MAXD service.
// main.js sets canvas.loadProgress (0..1): pair k flies in and slides onto the bar as progress passes k/4.
// All four on: the bar's core lights up ("maxed").
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
  renderer.toneMappingExposure = 1.1;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 200);

  const rubber = new THREE.MeshPhysicalMaterial({ color: 0x0b0b0b, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 0.9 });
  const steel = new THREE.MeshStandardMaterial({ color: 0xdadada, roughness: 0.16, metalness: 1, envMapIntensity: 1.3 });
  const glow = (color, opacity) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });

  const rig = new THREE.Group(); scene.add(rig);
  const along = (mesh, x, parent) => { mesh.rotation.z = Math.PI / 2; mesh.position.x = x; parent.add(mesh); return mesh; };
  const cyl = (r, len, mat, x, parent) => along(new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 48), mat), x, parent);

  // The bar, floating free: no rack or stands, so it reads as a product mark rather than gym equipment
  const bell = new THREE.Group(); rig.add(bell);
  cyl(0.085, 7.2, steel, 0, bell);
  for (const s of [-1, 1]) {
    cyl(0.15, 2.3, steel, s * 4.65, bell);
    cyl(0.25, 0.18, steel, s * 3.48, bell);
    cyl(0.2, 0.14, steel, s * 5.66, bell);
  }
  const core = cyl(0.11, 6.9, glow(0xff4f1f, 0), 0, bell);   // glowing sheath, lights up once all four services are on

  // Plates: lathe body + printed faces + a thin glowing rim
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
    const rimRing = new THREE.Mesh(new THREE.TorusGeometry(R - 0.01, 0.02, 8, 120), glow(0xff6a3a, 0.75));
    rimRing.rotation.y = Math.PI / 2; g.add(rimRing);
    rig.add(g);
    return g;
  }

  const plates = [];
  let edge = 3.58;
  PLATES.forEach(([R, t, w, name]) => {
    const tex = faceTexture(w, name, font);
    const at = edge + t / 2; edge += t + 0.02;
    plates.push({ at, pair: [plate(R, t, tex), plate(R, t, tex)] });
  });

  // Orbit rings and drifting particles behind the bar
  const halo = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.02, 8, 200), glow(0xff4f1f, 0.3)); halo.position.z = -1.5; scene.add(halo);
  const halo2 = new THREE.Mesh(new THREE.TorusGeometry(4.4, 0.012, 8, 200), glow(0xffa070, 0.2)); halo2.position.z = -1.5; scene.add(halo2);
  const N = 700, pts = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = 3 + Math.random() * 7, a = Math.random() * Math.PI * 2;
    pts.set([Math.cos(a) * r * 1.4, (Math.random() - 0.5) * 4, Math.sin(a) * r * 0.6 - 2], i * 3);
  }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pts, 3));
  const dust = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.045, color: 0xff9a6a, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(dust);

  scene.add(new THREE.AmbientLight(0xffffff, 0.16));
  const key = new THREE.DirectionalLight(0xffffff, 1.8); key.position.set(4, 7, 8); scene.add(key);
  const rim = new THREE.DirectionalLight(0xff5a24, 6); rim.position.set(-8, -2, -4); scene.add(rim);
  const under = new THREE.PointLight(0xff4f1f, 50, 40); under.position.set(0, -3.5, 4); scene.add(under);
  const warm = new THREE.DirectionalLight(0xffd2b8, 0.8); warm.position.set(8, 3, -6); scene.add(warm);

  // Frame the bar (about 12 units end to end) so it fills the canvas
  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const hfov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect);
    const vfov = THREE.MathUtils.degToRad(camera.fov);
    const dist = Math.max((13 / 2) / Math.tan(hfov / 2), (5.6 / 2) / Math.tan(vfov / 2));
    camera.position.set(0, dist * 0.14, dist);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  };
  resize();
  addEventListener('resize', resize);

  // Pair k flies in from off-screen, spinning, and slides onto the sleeve as progress passes k/4
  const ease = (x) => 1 - Math.pow(1 - x, 3);
  const place = (p) => {
    plates.forEach(({ at, pair }, k) => {
      const a = ease(Math.min(1, Math.max(0, (p - k / SERVICES) * SERVICES * 1.1)));
      pair.forEach((g, i) => {
        const s = i ? 1 : -1, from = at + 7 + k;
        g.position.set(s * (from + (at - from) * a), (1 - a) * (1.8 - k * 0.9), (1 - a) * 2.5);
        g.rotation.x = (1 - a) * 7 * s;
        g.visible = a > 0.001;
      });
    });
  };

  rig.rotation.set(0.05, -0.32, 0);
  if (still) { place(1); core.material.opacity = 0.5; renderer.render(scene, camera); return; }

  let mx = 0, my = 0, visible = true, t0 = performance.now(), shown = canvas.loadProgress ?? 0;
  addEventListener('pointermove', (e) => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; }, { passive: true });
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(canvas);

  const cur = { x: 0.05, y: -0.32 };
  const tick = (t) => {
    requestAnimationFrame(tick);
    const dt = Math.max(0, Math.min((t - t0) / 1000, 0.05)); t0 = t;   // first frame can be stamped before t0
    if (!visible || document.hidden) return;
    const T = t / 1000, target = canvas.loadProgress ?? 1;
    shown += Math.sign(target - shown) * Math.min(Math.abs(target - shown), dt * 0.3);   // one pair takes ~0.8 s
    place(shown);
    core.material.opacity += ((shown > 0.985 ? 0.55 : 0) - core.material.opacity) * Math.min(1, dt * 2);
    under.intensity = 50 + 60 * shown + Math.sin(T * 2) * 10;
    // float: bob, sway, and lean toward the pointer
    rig.position.y = Math.sin(T * 1.1) * 0.18;
    cur.y += (-0.32 + Math.sin(T * 0.4) * 0.14 + mx * 0.3 - cur.y) * Math.min(1, dt * 3);
    cur.x += (0.05 + Math.sin(T * 0.7) * 0.03 + my * 0.12 - cur.x) * Math.min(1, dt * 3);
    rig.rotation.set(cur.x, cur.y, Math.sin(T * 0.9) * 0.025);
    halo.rotation.set(Math.sin(T * 0.3) * 0.25, T * 0.2, 0);
    halo2.rotation.set(1.1 + Math.sin(T * 0.25) * 0.2, -T * 0.12, 0.3);
    halo.material.opacity = 0.2 + 0.4 * shown;
    dust.rotation.y = T * 0.03;
    renderer.render(scene, camera);
  };
  requestAnimationFrame(tick);
}
