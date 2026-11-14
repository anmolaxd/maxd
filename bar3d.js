// MAXD services: the logo's barbell in 3D, loaded one service at a time.
// Each plate pair is one MAXD service. main.js sets canvas.loadProgress (0..1) from the open service tab;
// plate k slides on when tab k opens, and the bar lifts once all four are on ("maxed").
// With reduced motion it renders one still frame, fully loaded.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export const SERVICES = 4;

export default function init(canvas, still) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 100);

  const rubber = new THREE.MeshPhysicalMaterial({ color: 0x0b0b0b, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 0.9 });
  const steel = new THREE.MeshStandardMaterial({ color: 0xdadada, roughness: 0.18, metalness: 1, envMapIntensity: 1.2 });
  const orange = new THREE.MeshStandardMaterial({ color: 0xff4f1f, roughness: 0.35, emissive: 0xff4f1f, emissiveIntensity: 0.35 });

  const bell = new THREE.Group();
  const along = (mesh, x, parent = bell) => { mesh.rotation.z = Math.PI / 2; mesh.position.x = x; parent.add(mesh); return mesh; };
  const cyl = (r, len, mat, x) => along(new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 64), mat), x);

  // Plate cross-section turned on a lathe: rounded rim, recessed faces, hole for the sleeve. Orange ring on the outer face.
  function plate(R, t, side) {
    const h = t / 2, p = [
      [0.16, -h], [0.32, -h], [0.36, -h + 0.04], [R - 0.3, -h + 0.04], [R - 0.26, -h], [R - 0.07, -h], [R, -h + 0.07],
      [R, h - 0.07], [R - 0.07, h], [R - 0.26, h], [R - 0.3, h - 0.04], [0.36, h - 0.04], [0.32, h], [0.16, h], [0.16, -h],
    ].map(([a, b]) => new THREE.Vector2(a, b));
    const g = new THREE.Group();
    along(new THREE.Mesh(new THREE.LatheGeometry(p, 96), rubber), 0, g);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(R - 0.28, 0.03, 12, 128), orange);
    ring.rotation.y = Math.PI / 2; ring.position.x = side * (h - 0.035); g.add(ring);
    bell.add(g);
    return g;
  }

  cyl(0.085, 7.2, steel, 0);                 // shaft
  // One pair per service, heaviest first, packed outward from the collar: [radius, thickness].
  const sizes = [[1.6, 0.36], [1.42, 0.32], [1.22, 0.28], [1.02, 0.24]];
  const plates = [];                          // plates[k] = { pair: [left, right], at: resting |x| }
  for (const s of [-1, 1]) {
    cyl(0.15, 2.3, steel, s * 4.65);         // sleeve (3.5 .. 5.8)
    cyl(0.25, 0.18, steel, s * 3.48);        // inner collar
    cyl(0.2, 0.14, steel, s * 5.66);         // end cap
  }
  let edge = 3.58;
  sizes.forEach(([R, t], k) => {
    const at = edge + t / 2; edge += t + 0.02;
    plates[k] = { at, pair: [plate(R, t, -1), plate(R, t, 1)] };
  });
  scene.add(bell);

  scene.add(new THREE.AmbientLight(0xffffff, 0.12));
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(4, 6, 7); scene.add(key);
  const rim = new THREE.DirectionalLight(0xff5a24, 5); rim.position.set(-7, -3, -3); scene.add(rim);
  const under = new THREE.PointLight(0xff4f1f, 40, 30); under.position.set(-2, -5, 4); scene.add(under);
  const cool = new THREE.DirectionalLight(0x7fb0ff, 0.7); cool.position.set(7, 2, -5); scene.add(cool);

  // Fit the barbell to the canvas width (it is ~11.6 units long, seen at an angle).
  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const hfov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect);
    const fill = 0.8;
    camera.position.set(0, 0.9, Math.max(9, (11.6 * 0.86 / 2) / (Math.tan(hfov / 2) * fill)));
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  };
  resize();
  addEventListener('resize', resize);

  // Plate k is on once progress passes its slot; it slides in from past the end of the sleeve.
  const ease = (x) => 1 - Math.pow(1 - x, 3);
  const place = (p) => {
    plates.forEach(({ at, pair }, k) => {
      const a = ease(Math.min(1, Math.max(0, (p - k / SERVICES) * SERVICES * 1.25)));
      const x = at + (1 - a) * 4.2;          // 4.2 units out = off the end of the bar, out of frame
      pair[0].position.x = -x; pair[1].position.x = x;
      pair.forEach((g) => (g.visible = a > 0.001));
    });
  };

  const base = { x: 0.16, y: -0.5, z: -0.06 };
  const set = (x, y, z) => bell.rotation.set(x, y, z);
  set(base.x, base.y, base.z);
  bell.position.set(0, -0.4, 0);
  if (still) { place(1); bell.position.y = 0; renderer.render(scene, camera); return; }

  let mx = 0, my = 0, spin = 0, lastY = scrollY, visible = true, t0 = performance.now(), shown = 0, lift = 0;
  addEventListener('pointermove', (e) => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; }, { passive: true });
  // Scrolling gives it a push that settles back.
  addEventListener('scroll', () => { spin = Math.max(-0.6, Math.min(0.6, spin + (scrollY - lastY) * 0.0012)); lastY = scrollY; }, { passive: true });
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(canvas);

  const cur = { x: base.x, y: base.y };
  const tick = (t) => {
    requestAnimationFrame(tick);
    const dt = Math.max(0, Math.min((t - t0) / 1000, 0.05)); t0 = t;  // first frame can be stamped before t0
    if (!visible || document.hidden) return;
    const k = Math.min(1, dt * 6);
    shown += ((canvas.loadProgress ?? 1) - shown) * k;     // smooth the scroll-driven loading
    place(shown);
    lift += ((shown > 0.97 ? 1 : 0) - lift) * Math.min(1, dt * 3);  // fully loaded: the bar goes up
    spin *= Math.pow(0.94, dt * 60);
    cur.y += (base.y + spin + mx * 0.35 - cur.y) * Math.min(1, dt * 4);
    cur.x += (base.x + my * 0.18 - cur.x) * Math.min(1, dt * 4);
    set(cur.x, cur.y, base.z + Math.sin(t / 1400) * 0.025);
    bell.position.set(0, -0.4 + lift * 0.55 + Math.sin(t / 1100) * 0.06, 0);
    renderer.render(scene, camera);
  };
  requestAnimationFrame(tick);
}
