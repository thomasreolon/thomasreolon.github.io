import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Sunset / night road journey — peach blossoms, day-night theming, longer road
window.createScene = function (canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xf2a878, 32, 120);

  const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 320);

  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp01 = (t) => Math.max(0, Math.min(1, t));
  const smoothstep = (t) => { t = clamp01(t); return t * t * (3 - 2 * t); };
  function mulberry32(seed) {
    return function () {
      let t = (seed += 0x6D2B79F5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rand = mulberry32(20260507);
  const settleOffset = (z) => (z < -165 && z > -220 ? -0.18 : 0);

  function terrainHeight(x, z) {
    return (
      Math.sin(x * 0.10) * 0.4 +
      Math.cos(z * 0.06) * 0.5 +
      Math.sin((x + z) * 0.04) * 0.6 +
      Math.cos(x * 0.03 - z * 0.025) * 1.0 - 0.4
    );
  }

  // Day & night sky stops
  const dayStops = [
    { t: 0.00, c: [0.94, 0.84, 0.62] },
    { t: 0.18, c: [0.96, 0.66, 0.36] },
    { t: 0.34, c: [0.92, 0.46, 0.42] },
    { t: 0.55, c: [0.72, 0.36, 0.52] },
    { t: 0.78, c: [0.40, 0.28, 0.50] },
    { t: 1.00, c: [0.18, 0.18, 0.36] },
  ];
  // light theme scroll-end: deep dusk — rose/violet horizon, dark purple sky
  const dayScrolledStops = [
    { t: 0.00, c: [0.72, 0.42, 0.58] },
    { t: 0.18, c: [0.64, 0.26, 0.50] },
    { t: 0.34, c: [0.50, 0.18, 0.46] },
    { t: 0.55, c: [0.32, 0.12, 0.40] },
    { t: 0.78, c: [0.16, 0.10, 0.30] },
    { t: 1.00, c: [0.06, 0.06, 0.20] },
  ];
  const nightStops = [
    { t: 0.00, c: [0.18, 0.16, 0.30] },
    { t: 0.20, c: [0.12, 0.12, 0.26] },
    { t: 0.45, c: [0.08, 0.08, 0.20] },
    { t: 0.70, c: [0.05, 0.05, 0.14] },
    { t: 1.00, c: [0.02, 0.02, 0.08] },
  ];
  // dark theme scroll-end: pre-dawn warmth — warmer violet-rose at horizon
  const nightScrolledStops = [
    { t: 0.00, c: [0.34, 0.18, 0.42] },
    { t: 0.20, c: [0.24, 0.14, 0.36] },
    { t: 0.45, c: [0.18, 0.10, 0.28] },
    { t: 0.70, c: [0.12, 0.08, 0.22] },
    { t: 1.00, c: [0.08, 0.06, 0.16] },
  ];
  function blendStops(a, b, t) {
    return a.map((sa, i) => ({
      t: sa.t,
      c: [lerp(sa.c[0], b[i].c[0], t), lerp(sa.c[1], b[i].c[1], t), lerp(sa.c[2], b[i].c[2], t)],
    }));
  }
  function sampleStop(stops, t) {
    for (let i = 0; i < stops.length - 1; i++) {
      if (t <= stops[i + 1].t) {
        const a = stops[i], b = stops[i + 1];
        const k = (t - a.t) / (b.t - a.t);
        return [lerp(a.c[0], b.c[0], k), lerp(a.c[1], b.c[1], k), lerp(a.c[2], b.c[2], k)];
      }
    }
    return stops[stops.length - 1].c;
  }

  // Sky dome
  const skyGeo = new THREE.SphereGeometry(170, 32, 16);
  const skyColors = new Float32Array(skyGeo.attributes.position.count * 3);
  skyGeo.setAttribute('color', new THREE.BufferAttribute(skyColors, 3));
  function applySkyColors(stops) {
    for (let i = 0; i < skyGeo.attributes.position.count; i++) {
      const y = skyGeo.attributes.position.getY(i);
      const t = clamp01((y + 30) / 200);
      const c = sampleStop(stops, t);
      skyColors[i * 3] = c[0];
      skyColors[i * 3 + 1] = c[1];
      skyColors[i * 3 + 2] = c[2];
    }
    skyGeo.attributes.color.needsUpdate = true;
  }
  applySkyColors(dayStops);
  const sky = new THREE.Mesh(
    skyGeo,
    new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false })
  );
  scene.add(sky);

  // Sun / Moon disc (one mesh, swaps look)
  const celestial = new THREE.Group();
  const sunDisc = new THREE.Mesh(
    new THREE.CircleGeometry(8, 32),
    new THREE.MeshBasicMaterial({ color: 0xffe2b0, fog: false, transparent: true, opacity: 0.95 })
  );
  const halo1 = new THREE.Mesh(
    new THREE.CircleGeometry(14, 32),
    new THREE.MeshBasicMaterial({ color: 0xff9a6c, fog: false, transparent: true, opacity: 0.35 })
  );
  const halo2 = new THREE.Mesh(
    new THREE.CircleGeometry(22, 32),
    new THREE.MeshBasicMaterial({ color: 0xff7a5a, fog: false, transparent: true, opacity: 0.18 })
  );
  sunDisc.position.z = 0;
  halo1.position.z = -1;
  halo2.position.z = -2;
  celestial.add(halo2); celestial.add(halo1); celestial.add(sunDisc);
  celestial.position.set(0, 5, -120);
  scene.add(celestial);

  // Stars (visible at night)
  const STAR_N = 400;
  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(STAR_N * 3);
  for (let i = 0; i < STAR_N; i++) {
    const phi = rand() * Math.PI * 2;
    const theta = (rand() * 0.5 + 0.05) * Math.PI;
    const r = 140;
    starPos[i * 3] = Math.sin(theta) * Math.cos(phi) * r;
    starPos[i * 3 + 1] = Math.cos(theta) * r;
    starPos[i * 3 + 2] = Math.sin(theta) * Math.sin(phi) * r;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const stars = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({ color: 0xffffff, size: 0.5, transparent: true, opacity: 0, fog: false, depthWrite: false })
  );
  scene.add(stars);

  // Lights
  const hemi = new THREE.HemisphereLight(0xffd2a0, 0x6b4a5e, 0.7);
  scene.add(hemi);
  const sunLight = new THREE.DirectionalLight(0xffb87a, 1.4);
  sunLight.position.set(0, 10, -40);
  scene.add(sunLight);
  const fill = new THREE.DirectionalLight(0x9a78b0, 0.4);
  fill.position.set(-20, 12, 20);
  scene.add(fill);

  // Terrain (long)
  const terrainMat = new THREE.MeshStandardMaterial({
    color: 0xb87856, flatShading: true, roughness: 1, metalness: 0,
  });
  const tGeo = new THREE.PlaneGeometry(240, 600, 32, 100);
  tGeo.rotateX(-Math.PI / 2);
  const tPos = tGeo.attributes.position;
  for (let i = 0; i < tPos.count; i++) {
    const x = tPos.getX(i), z = tPos.getZ(i);
    let h = terrainHeight(x, z);
    const roadFalloff = clamp01(1 - Math.abs(x) / 5);
    h = lerp(h, -0.05, roadFalloff * 0.85);
    tPos.setY(i, h);
  }
  tGeo.computeVertexNormals();
  const terrain = new THREE.Mesh(tGeo, terrainMat);
  terrain.position.z = -180;
  scene.add(terrain);

  // Road — longer, extends well past camera end
  const roadMat = new THREE.MeshStandardMaterial({ color: 0xd9a47a, flatShading: true, roughness: 1 });
  const roadGeo = new THREE.PlaneGeometry(3.6, 700, 1, 1);
  roadGeo.rotateX(-Math.PI / 2);
  const road = new THREE.Mesh(roadGeo, roadMat);
  road.position.set(0, -0.18, -180);
  scene.add(road);

  // Center stones
  const stoneGroup = new THREE.Group();
  for (let z = 18; z > -360; z -= 4) {
    const s = new THREE.Mesh(
      new THREE.CircleGeometry(0.4 + rand() * 0.15, 6),
      new THREE.MeshStandardMaterial({ color: 0xc89870, flatShading: true, roughness: 1 })
    );
    s.rotation.x = -Math.PI / 2;
    s.position.set((rand() - 0.5) * 0.4, -0.16, z);
    stoneGroup.add(s);
  }
  scene.add(stoneGroup);

  // Lanterns along the road (visible at night)
  const lanterns = new THREE.Group();
  for (let z = 0; z > -340; z -= 18) {
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.08, 2.2, 5),
        new THREE.MeshStandardMaterial({ color: 0x3a2218, flatShading: true })
      );
      const x = side * 2.6;
      const baseY = terrainHeight(x, z + 180);
      post.position.set(x, baseY + 1.1 + settleOffset(z), z);
      lanterns.add(post);
      const lamp = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.22, 0),
        new THREE.MeshStandardMaterial({
          color: 0xffe2a0, emissive: 0xffb060, emissiveIntensity: 0, flatShading: true,
        })
      );
      lamp.position.set(x, baseY + 2.3 + settleOffset(z), z);
      lamp.userData.isLamp = true;
      lanterns.add(lamp);
    }
  }
  scene.add(lanterns);

  // Trees (peach blossoms)
  function makeBlossomTree(seed) {
    const rng = mulberry32(seed);
    const tree = new THREE.Group();
    const trunkH = 1.6 + rng() * 1.2;
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a2e26, flatShading: true, roughness: 1 });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.18, trunkH, 6), trunkMat);
    trunk.position.y = trunkH / 2;
    tree.add(trunk);
    const branchCount = 1 + Math.floor(rng() * 2);
    for (let b = 0; b < branchCount; b++) {
      const bL = 0.8 + rng() * 0.5;
      const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.09, bL, 5), trunkMat);
      branch.position.y = trunkH * (0.55 + rng() * 0.25);
      const angle = rng() * Math.PI * 2;
      branch.rotation.order = 'ZYX';
      branch.rotation.z = rng() * 0.6 + 0.4;
      rng(); // consume to keep rng sequence length
      branch.rotation.y = angle;
      branch.position.x += Math.cos(angle) * 0.2;
      branch.position.z += Math.sin(angle) * 0.2;
      tree.add(branch);
    }
    const blossomColors = [0xf6c0cd, 0xf2a5b8, 0xeec2c8, 0xf8d5d8, 0xe8889e, 0xf5b0bf];
    const clusterCount = 4 + Math.floor(rng() * 4);
    for (let i = 0; i < clusterCount; i++) {
      const r = 0.55 + rng() * 0.35;
      const blob = new THREE.Mesh(
        new THREE.IcosahedronGeometry(r, 0),
        new THREE.MeshStandardMaterial({
          color: blossomColors[Math.floor(rng() * blossomColors.length)],
          flatShading: true, roughness: 0.85,
        })
      );
      const angle = rng() * Math.PI * 2;
      const dist = rng() * 0.7;
      blob.position.set(Math.cos(angle) * dist, trunkH + 0.2 + rng() * 0.6, Math.sin(angle) * dist);
      blob.rotation.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI);
      blob.scale.set(1 + rng() * 0.3, 0.85 + rng() * 0.3, 1 + rng() * 0.3);
      tree.add(blob);
    }
    return tree;
  }

  const treesGroup = new THREE.Group();
  let treeSeed = 1;
  for (let z = 16; z > -360; z -= 3.0 + rand() * 1.6) {
    for (const side of [-1, 1]) {
      if (rand() < 0.16) continue;
      const x = side * (3.4 + rand() * 6.5);
      const y = terrainHeight(x, z + 180) + settleOffset(z);
      const tree = makeBlossomTree(treeSeed++);
      tree.position.set(x, y, z);
      tree.scale.setScalar(0.85 + rand() * 0.55);
      tree.rotation.y = rand() * Math.PI * 2;
      treesGroup.add(tree);
    }
  }
  for (let z = 12; z > -340; z -= 5.5 + rand() * 4) {
    for (const side of [-1, 1]) {
      if (rand() < 0.4) continue;
      const x = side * (10 + rand() * 16);
      const y = terrainHeight(x, z + 180) + settleOffset(z);
      const tree = makeBlossomTree(treeSeed++);
      tree.position.set(x, y, z);
      tree.scale.setScalar(0.7 + rand() * 0.5);
      tree.rotation.y = rand() * Math.PI * 2;
      treesGroup.add(tree);
    }
  }
  // Remove trees that intersect the first large end-mountain volume.
  const firstMountain = { x: 0, z: -268, r: 55, h: 95, baseY: -1 };
  for (let i = treesGroup.children.length - 1; i >= 0; i--) {
    const t = treesGroup.children[i];
    const dx = t.position.x - firstMountain.x;
    const dz = t.position.z - firstMountain.z;
    const d = Math.hypot(dx, dz);
    if (d >= firstMountain.r) continue;
    const surfaceY = firstMountain.baseY + (1 - d / firstMountain.r) * firstMountain.h;
    if (t.position.y < surfaceY + 6) treesGroup.remove(t);
  }
  scene.add(treesGroup);

  // Bushes (small low-poly clusters) — extra interest
  const bushGroup = new THREE.Group();
  const bushColors = [0xc88068, 0xb86058, 0xa05058, 0xd9a07a];
  for (let z = 14; z > -360; z -= 2.6 + rand() * 2.2) {
    if (rand() < 0.5) continue;
    const side = rand() < 0.5 ? -1 : 1;
    const x = side * (2.6 + rand() * 8);
    const y = terrainHeight(x, z + 180) + settleOffset(z);
    const bush = new THREE.Group();
    const cnt = 2 + Math.floor(rand() * 3);
    for (let i = 0; i < cnt; i++) {
      const r = 0.25 + rand() * 0.3;
      const blob = new THREE.Mesh(
        new THREE.IcosahedronGeometry(r, 0),
        new THREE.MeshStandardMaterial({
          color: bushColors[Math.floor(rand() * bushColors.length)],
          flatShading: true, roughness: 1,
        })
      );
      blob.position.set((rand() - 0.5) * 0.5, r * 0.8, (rand() - 0.5) * 0.5);
      blob.rotation.set(rand(), rand(), rand());
      bush.add(blob);
    }
    bush.position.set(x, y, z);
    bushGroup.add(bush);
  }
  scene.add(bushGroup);

  // Rocks — bigger pool
  const ROCK_N = 140;
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x8b6852, flatShading: true, roughness: 1 });
  const rocks = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.55, 0), rockMat, ROCK_N);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < ROCK_N; i++) {
    const z = 14 - rand() * 360;
    let x = (rand() - 0.5) * 50;
    if (Math.abs(x) < 2.4) x = (x < 0 ? -1 : 1) * (2.4 + rand() * 1.5);
    const y = terrainHeight(x, z + 180) + settleOffset(z);
    const s = 0.3 + rand() * 1.2;
    dummy.position.set(x, y, z);
    dummy.rotation.set(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI);
    dummy.scale.set(s * 1.4, s, s * 1.2);
    dummy.updateMatrix();
    rocks.setMatrixAt(i, dummy.matrix);
  }
  scene.add(rocks);

  // Mountains — flanking the road so the walk passes between them
  // Two layers: a close dramatic ring and a far backdrop ring
  const mountains = new THREE.Group();
  const mountainMats = [];
  const MTN_N = 34;
  for (let i = 0; i < MTN_N; i++) {
    // Alternate sides with slight jitter so groupings feel organic
    const side = rand() < 0.5 ? -1 : 1;
    // Inner ring (i < 20): close flanking peaks, x: ±26–62
    // Outer ring (i >= 20): far backdrop, x: ±55–130
    const inner = i < 20;
    const x = side * (inner ? 26 + rand() * 36 : 55 + rand() * 75);
    // Spread along the full journey; inner ring concentrated mid-journey
    const z = inner ? -50 - rand() * 200 : -30 - rand() * 240;
    const w = inner ? 12 + rand() * 14 : 20 + rand() * 24;
    const h = inner ? 18 + rand() * 20 : 28 + rand() * 28;
    const mat = new THREE.MeshStandardMaterial({
      color: rand() < 0.5 ? 0x6a3a4a : 0x7a4858, flatShading: true, roughness: 1,
    });
    mountainMats.push(mat);
    const mesh = new THREE.Mesh(new THREE.ConeGeometry(w, h, 5), mat);
    mesh.position.set(x, h / 2 - 1, z);
    mesh.rotation.y = rand() * Math.PI;
    mountains.add(mesh);
  }
  // Three close mountains at end of road — fill the screen as camera approaches
  [
    { x:  0,  z: -268, w: 55, h: 95, s: 5, r: 0.3 },
    { x: -14, z: -282, w: 38, h: 72, s: 5, r: 1.4 },
    { x:  20, z: -290, w: 30, h: 60, s: 6, r: 2.1 },
  ].forEach(({ x, z, w, h, s, r }) => {
    const mat = new THREE.MeshStandardMaterial({ color: 0x5a3050, flatShading: true, roughness: 1 });
    mountainMats.push(mat);
    const mesh = new THREE.Mesh(new THREE.ConeGeometry(w, h, s), mat);
    mesh.position.set(x, h / 2 - 1, z);
    mesh.rotation.y = r;
    mountains.add(mesh);
  });

  // Small crack exactly at camera-path entry on first mountain.
  const crackMat = new THREE.MeshStandardMaterial({ color: 0x21141b, roughness: 1, metalness: 0, flatShading: true });
  const crack = new THREE.Group();
  const crackParts = [
    { x: 0.05, y: 3.4, z: -214.3, sx: 0.22, sy: 2.6, sz: 0.24, rz: 0.10 },
    { x: -0.24, y: 2.5, z: -214.0, sx: 0.16, sy: 1.35, sz: 0.18, rz: -0.26 },
    { x: 0.26, y: 2.6, z: -214.0, sx: 0.16, sy: 1.30, sz: 0.18, rz: 0.24 },
  ];
  crackParts.forEach(({ x, y, z, sx, sy, sz, rz }) => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), crackMat);
    p.position.set(x, y, z);
    p.scale.set(sx, sy, sz);
    p.rotation.x = -0.2;
    p.rotation.z = rz;
    crack.add(p);
  });
  mountains.add(crack);

  // Faint white glow from inside the crack.
  const crackGlow = new THREE.PointLight(0xf5f5ff, 1.2, 16, 2);
  crackGlow.position.set(0.02, 3.1, -214.1);
  scene.add(crackGlow);

  // Valley altar: two rocks before the last mountain plus surrounding lights.
  const altarZ = -236;
  const altarX = 0.2;
  const altarY = terrainHeight(altarX, altarZ + 180);
  const altarGroup = new THREE.Group();
  const altarMat = new THREE.MeshStandardMaterial({ color: 0x8a6c60, flatShading: true, roughness: 1, metalness: 0 });
  [
    { x: -0.8, y: 0.52, z: 0.1, sx: 1.05, sy: 1.35, sz: 0.95, ry: 0.4 },
    { x: 0.75, y: 0.46, z: -0.05, sx: 0.95, sy: 1.2, sz: 1.05, ry: -0.3 },
  ].forEach(({ x, y, z, sx, sy, sz, ry }) => {
    const r = new THREE.Mesh(new THREE.IcosahedronGeometry(0.62, 0), altarMat);
    r.position.set(x, y, z);
    r.scale.set(sx, sy, sz);
    r.rotation.y = ry;
    altarGroup.add(r);
  });
  altarGroup.position.set(altarX, altarY, altarZ);
  scene.add(altarGroup);

  const altarLights = new THREE.Group();
  const altarLampMat = new THREE.MeshStandardMaterial({
    color: 0xffe6bf, emissive: 0xffd6a0, emissiveIntensity: 1.5, flatShading: true, roughness: 1,
  });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const rx = altarX + Math.cos(a) * 3.2;
    const rz = altarZ + Math.sin(a) * 2.2;
    const ry = terrainHeight(rx, rz + 180);
    const lamp = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 0), altarLampMat);
    lamp.position.set(rx, ry + 0.42, rz);
    altarLights.add(lamp);
    const glow = new THREE.PointLight(0xffd5a8, 0.55, 7, 2);
    glow.position.set(rx, ry + 0.55, rz);
    altarLights.add(glow);
  }
  scene.add(altarLights);

  scene.add(mountains);

  // ===== GLB MODELS =====
  // Torii gates + guardian statues: near 80% journey toward mountain intersection
  // Rocks: scattered along the path
  const TORII_Z   = [-184, -196]; // 2 gates close to the mountain/road convergence
  const GATE_SCALE   = 16;      // 20% smaller than previous size 20
  const GATE_X_OFFSET = 0.9;    // slightly right of the road centerline
  const STATUE_SCALE = 2.52;   // 1.4x bigger than previous 1.8
  const ROCK_SCALE   = 2.0;  // adjust if model appears too big/small

  const gltfLoader = new GLTFLoader();
  const loadGLB = (url) => new Promise((resolve, reject) => {
    gltfLoader.load(url, (g) => resolve(g.scene), undefined, reject);
  });

  function placeModelOnGround(model, x, z, targetY, yOffset = 0) {
    model.position.set(x, targetY, z);
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const lift = targetY - box.min.y;
    model.position.y += lift + yOffset;
  }

  loadGLB('/uploads/ToriiGate.glb')
    .then((proto) => {
      TORII_Z.forEach((tz) => {
        const gate = proto.clone(true);
        gate.scale.setScalar(GATE_SCALE);
        gate.rotation.y = Math.PI / 4; // 45° anti-clockwise
        placeModelOnGround(gate, GATE_X_OFFSET, tz, terrainHeight(GATE_X_OFFSET, tz + 180), -0.3);
        scene.add(gate);
      });
    })
    .catch((err) => {
      console.warn('Failed to load ToriiGate.glb', err);
    });

  loadGLB('/uploads/Statue.glb')
    .then((proto) => {
      TORII_Z.forEach((tz) => {
        [[-1, Math.PI / 2], [1, -Math.PI / 2]].forEach(([side, ry]) => {
          const sx = side * 4.2;
          const statue = proto.clone(true);
          statue.rotation.y = ry; // face inward toward road
          statue.scale.setScalar(STATUE_SCALE);
          statue.traverse((obj) => {
            if (!obj.isMesh || !obj.material) return;
            const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
            mats.forEach((mat) => {
              if (mat.color) mat.color.lerp(new THREE.Color(0xffffff), 0.35);
              mat.transparent = false;
              mat.opacity = 1;
              if ('metalness' in mat) mat.metalness = 0;
              if ('roughness' in mat) mat.roughness = 1;
              if ('envMapIntensity' in mat) mat.envMapIntensity = 0;
              if (mat.needsUpdate !== undefined) mat.needsUpdate = true;
            });
          });
          placeModelOnGround(statue, sx, tz + 0.5, terrainHeight(sx, tz + 180), -0.22);
          scene.add(statue);
        });
      });
    })
    .catch((err) => {
      console.warn('Failed to load Statue.glb', err);
    });

  loadGLB('/uploads/Rock.glb')
    .then((proto) => {
      [
        [-5, -22], [8, -38], [-9, -55], [6, -72],
        [-11, -90], [7, -108], [-6, -128], [10, -150],
        [-8, -170], [9, -192], [-12, -215], [5, -232],
      ].forEach(([rx, rz], i) => {
        const rock = proto.clone(true);
        const scl = ROCK_SCALE * (0.6 + (i % 4) * 0.25);
        rock.scale.setScalar(scl);
        rock.rotation.y = i * 1.37;
        placeModelOnGround(rock, rx, rz, terrainHeight(rx, rz + 180));
        scene.add(rock);
      });
    })
    .catch((err) => {
      console.warn('Failed to load Rock.glb', err);
    });

  // Falling petals
  const PETAL_N = 280;
  const petalGeo = new THREE.BufferGeometry();
  const petalPos = new Float32Array(PETAL_N * 3);
  const petalSpeed = new Float32Array(PETAL_N);
  const petalSway = new Float32Array(PETAL_N);
  const petalColor = new Float32Array(PETAL_N * 3);
  for (let i = 0; i < PETAL_N; i++) {
    petalPos[i * 3] = (rand() - 0.5) * 50;
    petalPos[i * 3 + 1] = rand() * 18;
    petalPos[i * 3 + 2] = 14 - rand() * 360;
    petalSpeed[i] = 0.4 + rand() * 0.6;
    petalSway[i] = rand() * Math.PI * 2;
    const tone = rand();
    petalColor[i * 3] = 0.95;
    petalColor[i * 3 + 1] = 0.7 + tone * 0.15;
    petalColor[i * 3 + 2] = 0.75 + tone * 0.1;
  }
  petalGeo.setAttribute('position', new THREE.BufferAttribute(petalPos, 3));
  petalGeo.setAttribute('color', new THREE.BufferAttribute(petalColor, 3));
  const petals = new THREE.Points(
    petalGeo,
    new THREE.PointsMaterial({ size: 0.18, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false })
  );
  scene.add(petals);

  // ---- THEME ----
  const themes = {
    light: {
      fog: 0xf2a878, fogNear: 32, fogFar: 130,
      sunColor: 0xffe2b0, halo1Color: 0xff9a6c, halo2Color: 0xff7a5a,
      hemiSky: 0xffd2a0, hemiGround: 0x6b4a5e, hemiInt: 0.7,
      sunLightColor: 0xffb87a, sunLightInt: 1.4,
      fillColor: 0x9a78b0, fillInt: 0.4,
      terrainColor: 0xb87856, roadColor: 0xd9a47a,
      lampEmissiveInt: 0,
      starOpacity: 0,
      stops: dayStops,
    },
    dark: {
      fog: 0x1a1830, fogNear: 22, fogFar: 110,
      sunColor: 0xeef0ff, halo1Color: 0x8a98c8, halo2Color: 0x4858a0,
      hemiSky: 0x9aa8d8, hemiGround: 0x141226, hemiInt: 0.35,
      sunLightColor: 0xb8c4f0, sunLightInt: 0.5,
      fillColor: 0x6a78a8, fillInt: 0.3,
      terrainColor: 0x3a2840, roadColor: 0x4a3858,
      lampEmissiveInt: 1.6,
      starOpacity: 0.95,
      stops: nightStops,
    },
  };

  let currentTheme = 'light';
  function applyTheme(name) {
    const T = themes[name];
    currentTheme = name;
    scene.fog.color.setHex(T.fog);
    scene.fog.near = T.fogNear;
    scene.fog.far = T.fogFar;
    sunDisc.material.color.setHex(T.sunColor);
    halo1.material.color.setHex(T.halo1Color);
    halo2.material.color.setHex(T.halo2Color);
    hemi.color.setHex(T.hemiSky);
    hemi.groundColor.setHex(T.hemiGround);
    hemi.intensity = T.hemiInt;
    sunLight.color.setHex(T.sunLightColor);
    sunLight.intensity = T.sunLightInt;
    fill.color.setHex(T.fillColor);
    fill.intensity = T.fillInt;
    terrainMat.color.setHex(T.terrainColor);
    roadMat.color.setHex(T.roadColor);
    stoneGroup.children.forEach((c) => c.material.color.setHex(T.roadColor));
    mountainMats.forEach((m, i) => m.color.setHex(name === 'dark' ? (i % 2 ? 0x2a2238 : 0x342848) : (i % 2 ? 0x6a3a4a : 0x7a4858)));
    lanterns.children.forEach((c) => {
      if (c.userData.isLamp) c.material.emissiveIntensity = T.lampEmissiveInt;
    });
    stars.material.opacity = T.starOpacity;
    applySkyColors(T.stops);
  }
  applyTheme('light');

  // State
  const state = { progress: 0, displayed: 0 };
  const Z_START = 12;
  const Z_END = -240; // longer journey

  let raf;
  let lastSkyMix = -1;
  let lastSkyTheme = currentTheme;
  const clock = new THREE.Clock();
  function tick() {
    const dt = Math.min(0.05, clock.getDelta());
    const t = clock.getElapsedTime();
    state.displayed += (state.progress - state.displayed) * Math.min(1, dt * 3.2);
    const p = smoothstep(state.displayed);

    const z = lerp(Z_START, Z_END, p);
    const camX = Math.sin(p * Math.PI * 1.25) * 0.35;
    const camY = 1.7 + Math.sin(p * Math.PI * 1.9) * 0.13;
    camera.position.set(camX, camY, z);
    const lookZ = z - 6;
    const lookX = Math.sin((p + 0.05) * Math.PI * 1.25) * 0.24;
    camera.lookAt(lookX, 1.5, lookZ);

    // Sky / sun follow camera so they're always ahead
    sky.position.set(camera.position.x, 0, camera.position.z);
    stars.position.set(camera.position.x, 0, camera.position.z);
    celestial.position.z = z - 110;

    // Gradually shift sky color as scroll progresses (max 72% blend)
    const scrollMix = smoothstep(p) * 0.72;
    if (Math.abs(scrollMix - lastSkyMix) > 0.003 || lastSkyTheme !== currentTheme) {
      const baseStops = currentTheme === 'light' ? dayStops : nightStops;
      const shiftStops = currentTheme === 'light' ? dayScrolledStops : nightScrolledStops;
      applySkyColors(blendStops(baseStops, shiftStops, scrollMix));
      lastSkyMix = scrollMix;
      lastSkyTheme = currentTheme;
    }
    celestial.position.x = Math.sin(p * Math.PI * 0.5) * 8;

    // Petals
    const arr = petals.geometry.attributes.position.array;
    for (let i = 0; i < PETAL_N; i++) {
      arr[i * 3 + 1] -= petalSpeed[i] * dt * 0.6;
      arr[i * 3] += Math.sin(t * 0.6 + petalSway[i]) * dt * 0.25;
      const dz = arr[i * 3 + 2] - camera.position.z;
      if (arr[i * 3 + 1] < -0.5 || dz > 18 || dz < -90) {
        arr[i * 3] = camera.position.x + (rand() - 0.5) * 36;
        arr[i * 3 + 1] = 12 + rand() * 8;
        arr[i * 3 + 2] = camera.position.z - 6 - rand() * 70;
      }
    }
    petals.geometry.attributes.position.needsUpdate = true;

    // Lamp pulse at night
    if (currentTheme === 'dark') {
      const pulse = 1 + Math.sin(t * 1.3) * 0.15;
      lanterns.children.forEach((c) => {
        if (c.userData.isLamp) c.material.emissiveIntensity = themes.dark.lampEmissiveInt * pulse;
      });
    }

    treesGroup.rotation.z = Math.sin(t * 0.4) * 0.004;

    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  }

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);
  tick();

  return {
    setProgress: (p) => { state.progress = p; },
    setTheme: applyTheme,
    dispose: () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      renderer.dispose();
    },
  };
};
window.dispatchEvent(new CustomEvent('scene-ready'));
