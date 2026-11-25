import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const canvas = document.getElementById('scene');
const loader = document.getElementById('loader');
const fallback = document.getElementById('fallback');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- scroll plumbing: Lenis + GSAP ---------- */

const hasGSAP = Boolean(window.gsap && window.ScrollTrigger);
if (hasGSAP) window.gsap.registerPlugin(window.ScrollTrigger);

if (!reduceMotion && window.Lenis) {
  const lenis = new window.Lenis({ lerp: 0.1, wheelMultiplier: 1, touchMultiplier: 1.5 });
  if (hasGSAP) lenis.on('scroll', () => window.ScrollTrigger.update());
}

if (hasGSAP && !reduceMotion) {
  window.gsap.utils.toArray('.section__inner').forEach((el) => {
    window.gsap.fromTo(
      el,
      { y: 46, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 1.1,
        ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 82%', toggleActions: 'play none none reverse' },
      }
    );
  });
}

/* ---------- helpers ---------- */

function radialTexture(inner, outer) {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function labelTexture() {
  const w = 1024;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#eafaff';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#052a3a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 210px Arial, Helvetica, sans-serif';
  ctx.fillText('BRIX', w / 2, h / 2 - 34);
  ctx.fillStyle = '#2c6f8a';
  ctx.font = '600 44px Arial, Helvetica, sans-serif';
  ctx.fillText('STILL WATER  ·  750 ML', w / 2, h / 2 + 132);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const lerp = (a, b, k) => a + (b - a) * k;
const smootherstep = (x) => x * x * x * (x * (x * 6 - 15) + 10);

/* ---------- choreography keyframes (scroll 0 → 1) ---------- */

const STOPS = [
  { t: 0.0, cam: [0.0, 0.1, 9.4], look: [0, -2.5, 0], y: -2.7, rot: 0.25, tilt: 0.2 },
  { t: 0.27, cam: [0.9, -0.1, 6.1], look: [0, -1.2, 0], y: -1.4, rot: 1.5, tilt: -0.06 },
  { t: 0.52, cam: [1.7, -0.1, 3.9], look: [0, -0.3, 0], y: -0.3, rot: 3.0, tilt: 0.07 },
  { t: 0.76, cam: [0.4, 1.5, 6.4], look: [0, 0.6, 0], y: 0.7, rot: 4.7, tilt: 0.1 },
  { t: 1.0, cam: [0.0, 3.1, 9.9], look: [0, 2.2, 0], y: 2.7, rot: 6.3, tilt: 0.0 },
];

function sampleStops(p) {
  let i = 0;
  for (let j = 0; j < STOPS.length - 1; j += 1) if (p >= STOPS[j].t) i = j;
  const a = STOPS[i];
  const b = STOPS[Math.min(i + 1, STOPS.length - 1)];
  const span = b.t - a.t || 1;
  const k = smootherstep(clamp01((p - a.t) / span));
  return {
    cam: a.cam.map((v, idx) => lerp(v, b.cam[idx], k)),
    look: a.look.map((v, idx) => lerp(v, b.look[idx], k)),
    y: lerp(a.y, b.y, k),
    rot: lerp(a.rot, b.rot, k),
    tilt: lerp(a.tilt, b.tilt, k),
  };
}

/* ---------- scene ---------- */

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
} catch (err) {
  fallback.hidden = false;
  canvas.hidden = true;
  loader.classList.add('is-done');
}

if (renderer) {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x031a26, 0.075);

  const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 120);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const key = new THREE.DirectionalLight(0xa9ecff, 2.4);
  key.position.set(3.5, 7, 4.5);
  scene.add(key);

  const rim = new THREE.DirectionalLight(0x2b6f9e, 1.8);
  rim.position.set(-4, -2, -3);
  scene.add(rim);

  scene.add(new THREE.HemisphereLight(0x8adcff, 0x02121a, 1.0));

  /* surface glow */
  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: radialTexture('rgba(180,244,255,0.95)', 'rgba(111,227,255,0)'),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  glow.position.set(1.2, 3.6, -2);
  glow.scale.set(12, 12, 1);
  scene.add(glow);

  /* bottle */
  const bottle = new THREE.Group();
  scene.add(bottle);

  const profile = [
    [0.0, -1.05], [0.3, -1.05], [0.36, -0.98], [0.36, -0.55], [0.37, -0.1],
    [0.37, 0.3], [0.35, 0.48], [0.24, 0.66], [0.15, 0.78], [0.14, 1.02],
    [0.17, 1.06], [0.17, 1.14], [0.0, 1.14],
  ].map(([x, y]) => new THREE.Vector2(x, y));

  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xdcf7ff,
    roughness: 0.05,
    metalness: 0,
    transmission: 1,
    thickness: 0.9,
    ior: 1.33,
    transparent: true,
    envMapIntensity: 1.5,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
  });

  const body = new THREE.Mesh(new THREE.LatheGeometry(profile, 96), glass);
  bottle.add(body);

  const water = new THREE.Mesh(
    new THREE.LatheGeometry(
      profile.map((p) => new THREE.Vector2(Math.max(0.001, p.x * 0.955), p.y * 0.985)),
      64
    ),
    new THREE.MeshPhysicalMaterial({
      color: 0x8fe6ff,
      roughness: 0.15,
      transmission: 0.85,
      thickness: 1.4,
      ior: 1.33,
      transparent: true,
      opacity: 0.55,
    })
  );
  bottle.add(water);

  const label = new THREE.Mesh(
    new THREE.CylinderGeometry(0.376, 0.376, 0.52, 64, 1, true),
    new THREE.MeshStandardMaterial({ map: labelTexture(), roughness: 0.85, metalness: 0 })
  );
  label.position.y = -0.02;
  bottle.add(label);

  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.155, 0.155, 0.2, 40),
    new THREE.MeshStandardMaterial({ color: 0x0b2b3d, metalness: 0.85, roughness: 0.28 })
  );
  cap.position.y = 1.2;
  bottle.add(cap);

  /* bubbles */
  const BUBBLES = 90;
  const bubbleMat = new THREE.MeshStandardMaterial({
    color: 0xdff6ff,
    emissive: 0x2f9ecb,
    emissiveIntensity: 0.7,
    roughness: 0.2,
    transparent: true,
    opacity: 0.45,
  });
  const bubbles = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 8, 8), bubbleMat, BUBBLES);
  const bubbleData = [];
  const dummy = new THREE.Object3D();
  for (let i = 0; i < BUBBLES; i += 1) {
    bubbleData.push({
      x: (Math.random() - 0.5) * 10,
      y: -4 + Math.random() * 9,
      z: (Math.random() - 0.5) * 7 - 1,
      s: 0.4 + Math.random() * 1.1,
      v: 0.15 + Math.random() * 0.55,
    });
  }
  scene.add(bubbles);

  /* drift particles */
  const driftGeo = new THREE.BufferGeometry();
  const driftCount = 420;
  const positions = new Float32Array(driftCount * 3);
  for (let i = 0; i < driftCount; i += 1) {
    positions[i * 3] = (Math.random() - 0.5) * 16;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 14;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 10 - 2;
  }
  driftGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  scene.add(
    new THREE.Points(
      driftGeo,
      new THREE.PointsMaterial({ color: 0x9fe8ff, size: 0.035, transparent: true, opacity: 0.5, depthWrite: false })
    )
  );

  /* ---------- scroll → progress ---------- */

  let target = 0;
  let current = reduceMotion ? 0.5 : 0;

  function measure() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    target = max > 0 ? clamp01(window.scrollY / max) : 0;
  }

  window.addEventListener('scroll', measure, { passive: true });
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    measure();
  });
  measure();

  /* pause when offscreen or hidden */
  let visible = true;
  document.addEventListener('visibilitychange', () => {
    visible = !document.hidden;
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting && !document.hidden;
    }).observe(canvas);
  }

  const clock = new THREE.Clock();
  let firstFrame = true;

  function tick() {
    requestAnimationFrame(tick);
    if (!visible) return;

    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.getElapsedTime();

    if (reduceMotion) {
      current = 0.5;
    } else {
      current += (target - current) * 0.075;
    }

    const s = sampleStops(current);

    camera.position.set(s.cam[0], s.cam[1], s.cam[2]);
    camera.lookAt(s.look[0], s.look[1], s.look[2]);

    bottle.position.y = s.y + (reduceMotion ? 0 : Math.sin(t * 0.8) * 0.06);
    bottle.rotation.y = s.rot + (reduceMotion ? 0 : Math.sin(t * 0.35) * 0.05);
    bottle.rotation.z = s.tilt;

    for (let i = 0; i < BUBBLES; i += 1) {
      const b = bubbleData[i];
      b.y += b.v * dt;
      if (b.y > 4.2) b.y = -4.2;
      dummy.position.set(b.x + Math.sin(t * 0.6 + i) * 0.08, b.y, b.z);
      dummy.scale.setScalar(b.s);
      dummy.updateMatrix();
      bubbles.setMatrixAt(i, dummy.matrix);
    }
    bubbles.instanceMatrix.needsUpdate = true;

    renderer.render(scene, camera);

    if (firstFrame) {
      firstFrame = false;
      loader.classList.add('is-done');
    }
  }

  tick();
}
