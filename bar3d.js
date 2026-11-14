// MAXD footer: a glossy loaded barbell (the logo, in 3D). Loaded on demand by main.js when the footer is near.
// Turns with scroll, tilts toward the mouse. With reduced motion it renders one still frame.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

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
  const along = (mesh, x) => { mesh.rotation.z = Math.PI / 2; mesh.position.x = x; bell.add(mesh); return mesh; };
  const cyl = (r, len, mat, x) => along(new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 64), mat), x);

  // Plate cross-section turned on a lathe: rounded rim, recessed faces, hole for the sleeve.
  function plate(R, t, x, side) {
    const h = t / 2, p = [
      [0.16, -h], [0.32, -h], [0.36, -h + 0.04], [R - 0.3, -h + 0.04], [R - 0.26, -h], [R - 0.07, -h], [R, -h + 0.07],
      [R, h - 0.07], [R - 0.07, h], [R - 0.26, h], [R - 0.3, h - 0.04], [0.36, h - 0.04], [0.32, h], [0.16, h], [0.16, -h],
    ].map(([a, b]) => new THREE.Vector2(a, b));
    const m = along(new THREE.Mesh(new THREE.LatheGeometry(p, 96), rubber), x);
    if (R > 1.2) { // orange ring on the outer face of the big plates
      const ring = new THREE.Mesh(new THREE.TorusGeometry(R - 0.28, 0.03, 12, 128), orange);
      ring.rotation.y = Math.PI / 2; ring.position.x = x + side * (h - 0.035); bell.add(ring);
    }
    return m;
  }

  cyl(0.085, 7.2, steel, 0);                 // shaft
  for (const s of [-1, 1]) {
    cyl(0.15, 2.3, steel, s * 4.65);         // sleeve
    cyl(0.25, 0.18, steel, s * 3.48);        // inner collar
    plate(1.6, 0.34, s * 3.78, s);
    plate(1.6, 0.34, s * 4.14, s);
    plate(1.05, 0.26, s * 4.46, s);
    cyl(0.21, 0.16, steel, s * 4.68);        // clip
  }
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
    const fill = w < 700 ? 0.74 : 0.62;
    camera.position.set(0, 0.9, Math.max(9, (11.6 * 0.86 / 2) / (Math.tan(hfov / 2) * fill)));
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  };
  resize();
  addEventListener('resize', resize);

  const base = { x: 0.16, y: -0.5, z: -0.06 };
  const set = (x, y, z) => bell.rotation.set(x, y, z);
  set(base.x, base.y, base.z);
  bell.position.y = -0.55;
  if (still) { renderer.render(scene, camera); return; }

  let mx = 0, my = 0, spin = 0, lastY = scrollY, visible = true, t0 = performance.now();
  addEventListener('pointermove', (e) => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; }, { passive: true });
  // Scrolling gives it a push that settles back, so it never ends up end-on.
  addEventListener('scroll', () => { spin = Math.max(-0.9, Math.min(0.9, spin + (scrollY - lastY) * 0.0016)); lastY = scrollY; }, { passive: true });
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(canvas);

  const cur = { x: base.x, y: base.y };
  const tick = (t) => {
    requestAnimationFrame(tick);
    const dt = Math.min((t - t0) / 1000, 0.05); t0 = t;
    if (!visible || document.hidden) return;
    const r = canvas.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (innerHeight - r.top) / (innerHeight + r.height)));  // 0 entering, 1 leaving
    spin *= Math.pow(0.94, dt * 60);
    const ty = base.y + (p - 0.5) * 0.7 + spin + mx * 0.35;
    const tx = base.x + my * 0.18;
    cur.y += (ty - cur.y) * Math.min(1, dt * 4);
    cur.x += (tx - cur.x) * Math.min(1, dt * 4);
    set(cur.x, cur.y, base.z + Math.sin(t / 1400) * 0.025);
    bell.position.y = -0.55 + Math.sin(t / 1100) * 0.08;
    renderer.render(scene, camera);
  };
  requestAnimationFrame(tick);
}
