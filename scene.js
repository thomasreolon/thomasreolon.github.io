import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Sunset / night road journey - peach blossoms, day-night theming, longer road
export function createScene(canvas) {
  const assetUrl = (name) => `${import.meta.env.BASE_URL}uploads/${name}`;
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

  function terrainHeight(x, z) {
    return (
      Math.sin(x * 0.10) * 0.4 +
      Math.cos(z * 0.06) * 0.5 +
      Math.sin((x + z) * 0.04) * 0.6 +
      Math.cos(x * 0.03 - z * 0.025) * 1.0 - 0.4
    );
  }

  // Mirrors the road falloff applied when building the terrain mesh — use this for object placement
  // so things sit on the actual carved ground rather than the un-flattened analytical surface.
  function groundY(x, z) {
    const h = terrainHeight(x, z);
    const roadFalloff = clamp01(1 - Math.abs(x) / 5);
    return lerp(h, -0.05, roadFalloff * 0.85);
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
      const baseY = groundY(x, z + 180);
      post.position.set(x, baseY + 1.1, z);
      lanterns.add(post);
      const lamp = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.22, 0),
        new THREE.MeshStandardMaterial({
          color: 0xffe2a0, emissive: 0xffb060, emissiveIntensity: 0, flatShading: true,
        })
      );
      lamp.position.set(x, baseY + 2.3, z);
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
      const y = groundY(x, z + 180);
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
      const y = groundY(x, z + 180);
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
    const y = groundY(x, z + 180);
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
    const y = groundY(x, z + 180);
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

  // Valley altar at the end of the road — two flanking boulders, a stone platform,
  // and a stele bearing interactive icons that link out to contact destinations.
  const altarZ = -250;
  const altarX = 0;
  const altarY = -0.18;
  const altarGroup = new THREE.Group();
  altarGroup.position.set(altarX, altarY, altarZ);
  scene.add(altarGroup);

  // Ground a free-standing group whose contents are positioned with their bottom near local y=0.
  function groundFreeGroup(group, worldX, worldZ, yOffset = 0) {
    group.position.set(worldX, 0, worldZ);
    group.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(group);
    const targetY = groundY(worldX, worldZ + 180);
    group.position.y = targetY - box.min.y + yOffset;
  }

  // Two flanking sharp rocks loaded from SharpRock.glb. The second is rotated differently so
  // it reads as a sibling rather than a mirror duplicate.
  const sharpRockLoader = new GLTFLoader();
  sharpRockLoader.load(assetUrl('SharpRock.glb'), (gltf) => {
    const proto = gltf.scene;
    proto.traverse((obj) => {
      if (!obj.isMesh || !obj.material) return;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((mat) => {
        if (mat.color) mat.color.lerp(new THREE.Color(0x6e4d3f), 0.20);
        if ('roughness' in mat) mat.roughness = 1;
        if ('metalness' in mat) mat.metalness = 0;
      });
    });

    const left = proto.clone(true);
    left.scale.setScalar(0.010);
    left.rotation.set(0.0, 0.55, 0.0);
    groundFreeGroup(left, altarX - 3.7, altarZ + 0.3, -0.844);
    scene.add(left);

    const right = proto.clone(true);
    right.scale.setScalar(0.0086);
    right.rotation.set(0.0, -1.85, 0.18);
    groundFreeGroup(right, altarX + 3.7, altarZ - 0.15, -0.907);
    scene.add(right);
  }, undefined, (err) => console.warn('Failed to load SharpRock.glb', err));

  // Wider rock platform between the boulders.
  const altarPlatformMat = new THREE.MeshStandardMaterial({ color: 0x7a6058, flatShading: true, roughness: 1 });
  const altarPlatform = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 2.05, 0.8, 8), altarPlatformMat);
  altarPlatform.position.set(0, 0.4, 0);
  altarPlatform.rotation.y = 0.3;
  altarGroup.add(altarPlatform);

  // Tall stele standing on the platform (intentionally irregular, hand-carved look).
  const STELE_W = 1.75, STELE_H = 4.0, STELE_D = 0.7;
  const STELE_BASE_Y = 0.74; // slightly embedded into platform to avoid visible base seam
  const STELE_TOP_R = STELE_W * 0.42;
  const STELE_BOT_R = STELE_W * 0.58;
  const steleMat = new THREE.MeshStandardMaterial({ color: 0x8b7066, flatShading: true, roughness: 1 });
  const steleGeo = new THREE.CylinderGeometry(STELE_TOP_R, STELE_BOT_R, STELE_H, 8, 2);
  const sp = steleGeo.attributes.position;
  for (let i = 0; i < sp.count; i++) {
    const y = sp.getY(i);
    const n = Math.sin(y * 1.4 + i * 0.5) * 0.05;
    const m = Math.cos(y * 0.9 + i * 0.4) * 0.035;
    sp.setX(i, sp.getX(i) + n);
    sp.setZ(i, sp.getZ(i) + m);
  }
  steleGeo.computeVertexNormals();
  const stele = new THREE.Mesh(steleGeo, steleMat);
  stele.position.set(0, STELE_BASE_Y + STELE_H / 2, 0);
  stele.rotation.y = 0.17;
  altarGroup.add(stele);

  // Base collar to mask the stele/platform seam from every camera angle.
  const steleCollar = new THREE.Mesh(
    new THREE.CylinderGeometry(STELE_BOT_R * 1.06, STELE_BOT_R * 1.14, 0.24, 8),
    new THREE.MeshStandardMaterial({ color: 0x775f54, flatShading: true, roughness: 1 })
  );
  steleCollar.position.set(0, STELE_BASE_Y + 0.02, 0);
  steleCollar.rotation.y = 0.17;
  altarGroup.add(steleCollar);

  // Carved cap stone giving the stele a distinct crown silhouette.
  const steleCap = new THREE.Mesh(
    new THREE.CylinderGeometry(STELE_W * 0.48, STELE_W * 0.42, 0.26, 8),
    new THREE.MeshStandardMaterial({ color: 0x6e564a, flatShading: true, roughness: 1 })
  );
  steleCap.position.set(0, STELE_BASE_Y + STELE_H + 0.13, 0);
  steleCap.rotation.y = 0.17;
  altarGroup.add(steleCap);

  // Animated altar flame: layered low-poly fire cones with a warm point light.
  const flameGroup = new THREE.Group();
  const flameOuter = new THREE.Mesh(
    new THREE.ConeGeometry(0.20, 0.62, 8, 1),
    new THREE.MeshStandardMaterial({
      color: 0xff9a3d,
      emissive: 0xff5a1f,
      emissiveIntensity: 2.4,
      flatShading: true,
      roughness: 0.25,
      metalness: 0,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
    })
  );
  flameOuter.position.y = 0.28;
  flameGroup.add(flameOuter);
  const flameInner = new THREE.Mesh(
    new THREE.ConeGeometry(0.11, 0.40, 7, 1),
    new THREE.MeshStandardMaterial({
      color: 0xffe7a8,
      emissive: 0xffe3a0,
      emissiveIntensity: 2.8,
      flatShading: true,
      roughness: 0.15,
      metalness: 0,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    })
  );
  flameInner.position.y = 0.25;
  flameGroup.add(flameInner);
  flameGroup.position.set(0, STELE_BASE_Y + STELE_H + 0.16, 0);
  flameGroup.scale.setScalar(3);
  flameGroup.rotation.y = 0.17;
  altarGroup.add(flameGroup);
  const flameLight = new THREE.PointLight(0xffb866, 1.4, 8.5, 2);
  flameLight.position.set(0, STELE_BASE_Y + STELE_H + 0.44, 0.25);
  altarGroup.add(flameLight);

  // Soft fill light near the stele so the runes stay readable at night.
  const altarFill = new THREE.PointLight(0xffe2bf, 1.2, 10, 2);
  altarFill.position.set(0, 2.7, 1.4);
  altarGroup.add(altarFill);

  // Cylinder radius at any altar-local y — needed so runes sit just outside the actual stele
  // surface (its tapered cylinder) instead of being buried inside it.
  function steleRadiusAt(y) {
    const stelLocalY = y - (STELE_BASE_Y + STELE_H / 2);
    const fraction = clamp01((stelLocalY + STELE_H / 2) / STELE_H);
    return lerp(STELE_BOT_R, STELE_TOP_R, fraction);
  }

  // Rune-like interactive marks: a dark carved recess plate with a glowing accent-coloured
  // symbol on top. Symbol fill uses the rune's accent so it actually emits visible colour.
  const recessCv = document.createElement('canvas'); recessCv.width = recessCv.height = 128;
  const rCtx = recessCv.getContext('2d');
  const rGrad = rCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
  rGrad.addColorStop(0,   'rgba(155, 115, 90, 0.78)');
  rGrad.addColorStop(0.55,'rgba(120,  88, 68, 0.48)');
  rGrad.addColorStop(1,   'rgba(80,  55, 40, 0.0)');
  rCtx.fillStyle = rGrad; rCtx.fillRect(0, 0, 128, 128);
  const recessTex = new THREE.CanvasTexture(recessCv);
  recessTex.colorSpace = THREE.SRGBColorSpace;
  const recessMat = new THREE.MeshStandardMaterial({ map: recessTex, roughness: 1, metalness: 0, transparent: true, depthWrite: false });
  // Two-pass corona: fill with a wide blurred shadow to generate the halo, then
  // punch out the solid interior with destination-out — leaving only the soft
  // glow radiating outward from the symbol edge.
  function makeIconTexture(symbol, accent) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 256;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, 256, 256);
    ctx.font = 'bold 190px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = accent;
    ctx.shadowBlur = 58;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(symbol, 128, 140);
    ctx.shadowBlur = 28;
    ctx.fillText(symbol, 128, 140);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.shadowBlur = 0;
    ctx.fillText(symbol, 128, 140);
    ctx.globalCompositeOperation = 'source-over';
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }

  function makeMoonTexture(accent) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 256;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, 256, 256);
    const off = document.createElement('canvas');
    off.width = off.height = 256;
    const oc = off.getContext('2d');
    oc.fillStyle = '#ffffff';
    oc.beginPath(); oc.arc(118, 132, 78, 0, Math.PI * 2); oc.fill();
    oc.globalCompositeOperation = 'destination-out';
    oc.beginPath(); oc.arc(160, 116, 70, 0, Math.PI * 2); oc.fill();
    ctx.shadowColor = accent;
    ctx.shadowBlur = 58;
    ctx.drawImage(off, 0, 0);
    ctx.shadowBlur = 28;
    ctx.drawImage(off, 0, 0);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.shadowBlur = 0;
    ctx.drawImage(off, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }

  const interactiveIcons = [];
  const glowRunes = [];

  // Two main rune planes — sized large with bright accent fill so they read clearly.
  const RUNE_Y_OFFSET = -0.35; // push all altar runes slightly lower to avoid UI overlap
  const MAIN_RUNE_SCALE = 0.8; // 20% smaller
  const MAIN_RUNE_X_OFFSET = -0.14; // shifted left for better composition
  [
    { sym: 'moon', y: 3.10, action: 'toggleTheme',   emissive: 0xb03a1a, accent: '#b03a1a', label: 'Theme', glowPhase: 0   },
    { sym: '→',   y: 2.05, action: 'openLinksPopup', emissive: 0xb03a1a, accent: '#b03a1a', label: 'Links', glowPhase: 2.1 },
  ].forEach(({ sym, y, action, emissive, accent, label, glowPhase }) => {
    const runeY = y + RUNE_Y_OFFSET;
    const frontZ = steleRadiusAt(runeY) + 0.03;
    const recess = new THREE.Mesh(new THREE.CircleGeometry(0.5, 24), recessMat);
    recess.position.set(MAIN_RUNE_X_OFFSET, runeY, frontZ - 0.012);
    recess.scale.setScalar(MAIN_RUNE_SCALE);
    altarGroup.add(recess);

    const tex = sym === 'moon' ? makeMoonTexture(accent) : makeIconTexture(sym, accent);
    const dCv = document.createElement('canvas'); dCv.width = dCv.height = 256;
    const dCtx = dCv.getContext('2d');
    dCtx.clearRect(0, 0, 256, 256);
    // Warm dark-brown carved fill — identical for both runes so the symbols
    // look made of the same stone, with a subtle vertical gradient for depth.
    const fillGrad = dCtx.createLinearGradient(0, 60, 0, 220);
    fillGrad.addColorStop(0, 'rgba(38, 18, 6, 0.94)');
    fillGrad.addColorStop(1, 'rgba(16,  8, 3, 0.94)');
    dCtx.fillStyle = fillGrad;
    if (sym === 'moon') {
      dCtx.beginPath(); dCtx.arc(118, 132, 78, 0, Math.PI * 2); dCtx.fill();
      dCtx.globalCompositeOperation = 'destination-out';
      dCtx.beginPath(); dCtx.arc(160, 116, 70, 0, Math.PI * 2); dCtx.fill();
    } else {
      dCtx.font = 'bold 190px Georgia, serif';
      dCtx.textAlign = 'center'; dCtx.textBaseline = 'middle';
      dCtx.fillText(sym, 128, 140);
    }
    const darkTex = new THREE.CanvasTexture(dCv);
    darkTex.colorSpace = THREE.SRGBColorSpace; darkTex.anisotropy = 4;
    const mat = new THREE.MeshStandardMaterial({
      map: darkTex,
      emissiveMap: tex,
      emissive: new THREE.Color(emissive),
      emissiveIntensity: 0,
      roughness: 1,
      transparent: true,
      alphaTest: 0.04,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 0.92), mat);
    mesh.position.set(MAIN_RUNE_X_OFFSET, runeY, frontZ);
    mesh.scale.setScalar(MAIN_RUNE_SCALE);
    mesh.userData = {
      isAltarIcon: true,
      action,
      label,
      baseEmissive: 0,
      hoverEmissive: 3.6,
    };
    altarGroup.add(mesh);
    interactiveIcons.push(mesh);
    glowRunes.push({ mesh, phase: glowPhase });
  });

  // Surrounding lamps & glows around the altar.
  const altarLights = new THREE.Group();
  const altarLampMat = new THREE.MeshStandardMaterial({
    color: 0xffe6bf, emissive: 0xffd6a0, emissiveIntensity: 1.5, flatShading: true, roughness: 1,
  });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const rx = altarX + Math.cos(a) * 3.2;
    const rz = altarZ + Math.sin(a) * 2.1;
    const ry = groundY(rx, rz + 180);
    const lamp = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 0), altarLampMat);
    lamp.position.set(rx, ry + 0.42, rz);
    altarLights.add(lamp);
    const glow = new THREE.PointLight(0xffd5a8, 0.55, 8, 2);
    glow.position.set(rx, ry + 0.55, rz);
    altarLights.add(glow);
  }
  scene.add(altarLights);

  // Crystals — emissive shards on the ground around the altar and emerging from the mountain.
  const crystalMats = [];
  function makeCrystal(color, h, baseIntensity = 1.6) {
    const geo = new THREE.OctahedronGeometry(h * 0.5, 0);
    geo.scale(0.55, 1.8, 0.55);
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: new THREE.Color(color),
      emissiveIntensity: baseIntensity,
      flatShading: true,
      roughness: 0.3,
      metalness: 0.1,
      transparent: true,
      opacity: 0.88,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mat.userData.baseIntensity = baseIntensity;
    crystalMats.push(mat);
    return mesh;
  }

  // Hero crystal clusters — two bouquets framing the altar at the screen borders. Each cluster
  // has one dominant central shard plus 8–11 secondary shards fanning out asymmetrically with
  // a cyan/blue body and a subtle violet accent. The base appears fused at the ground.
  function makeCrystalCluster(primary, accent, dominantHeight, secondaryCount, baseIntensity, style = 'fan') {
    const g = new THREE.Group();
    const cPrimary = new THREE.Color(primary);
    const cAccent = new THREE.Color(accent);
    const cWhite = new THREE.Color(0xffffff);
    function addShard(h, colorChoice, posX, posY, posZ, leanX, leanZ, intensity, slender = 1) {
      const colorBody = colorChoice.clone();
      // Tint a few shards toward white for high-contrast facets.
      if (rand() < 0.22) colorBody.lerp(cWhite, 0.30);
      const geo = new THREE.OctahedronGeometry(h * 0.21, 0);
      const baseXZ = (0.44 + rand() * 0.20) * slender;
      geo.scale(baseXZ, 2.0 + rand() * 0.9, baseXZ);
      const mat = new THREE.MeshStandardMaterial({
        color: colorBody,
        emissive: colorChoice,
        emissiveIntensity: intensity,
        flatShading: true,
        roughness: 0.26,
        metalness: 0.08,
        transparent: true,
        opacity: 0.92,
      });
      mat.userData.baseIntensity = intensity;
      crystalMats.push(mat);
      const shard = new THREE.Mesh(geo, mat);
      shard.position.set(posX, posY, posZ);
      shard.rotation.set(leanX, rand() * Math.PI * 2, leanZ);
      g.add(shard);
    }
    const isSpear = style === 'spear';
    const isRose = style === 'rose';
    // Dominant central shard — stands tallest, slight lean.
    addShard(
      dominantHeight,
      cPrimary,
      (rand() - 0.5) * 0.12,
      dominantHeight * 0.46,
      (rand() - 0.5) * 0.12,
      (rand() - 0.5) * (isSpear ? 0.05 : isRose ? 0.08 : 0.12),
      (rand() - 0.5) * (isSpear ? 0.05 : isRose ? 0.08 : 0.12),
      baseIntensity * (isSpear ? 1.18 : isRose ? 1.12 : 1.05),
      isSpear ? 0.72 : isRose ? 0.82 : 1.0,
    );
    if (isRose) {
      // Rose-like crystal bloom: layered petals around a bud.
      const layers = [
        { count: 6, r: 0.26, hMul: 0.52, lean: 0.36 },
        { count: 8, r: 0.44, hMul: 0.45, lean: 0.52 },
        { count: 9, r: 0.62, hMul: 0.38, lean: 0.64 },
      ];
      layers.forEach(({ count, r, hMul, lean }, layerIdx) => {
        const phase = rand() * Math.PI * 2;
        for (let i = 0; i < count; i++) {
          const a = phase + (i / count) * Math.PI * 2;
          const jitterR = r + (rand() - 0.5) * 0.08;
          const h = dominantHeight * (hMul + rand() * 0.2);
          const colorChoice = (i + layerIdx) % 4 === 0 ? cAccent : cPrimary;
          addShard(
            h,
            colorChoice,
            Math.cos(a) * jitterR,
            h * (0.32 + layerIdx * 0.02),
            Math.sin(a) * jitterR,
            Math.sin(a) * lean,
            -Math.cos(a) * lean,
            baseIntensity * (0.78 + rand() * 0.35),
            0.78,
          );
        }
      });
      // small outer petals
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + rand() * 0.25;
        const h = dominantHeight * (0.34 + rand() * 0.16);
        addShard(
          h,
          cPrimary,
          Math.cos(a) * 0.82,
          h * 0.22,
          Math.sin(a) * 0.82,
          Math.sin(a) * 0.7,
          -Math.cos(a) * 0.7,
          baseIntensity * 0.72,
          0.86,
        );
      }
      return g;
    }
    // Asymmetric fan: right crystal can switch to a tighter spear bouquet.
    const fanCenter = rand() * Math.PI * 2;
    const fanWidth = isSpear ? Math.PI * 1.15 : Math.PI * 1.55;
    for (let i = 0; i < secondaryCount; i++) {
      const t = (i + rand() * 0.5) / secondaryCount;
      const angle = fanCenter + (t - 0.5) * fanWidth + (rand() - 0.5) * 0.35;
      const radius = isSpear ? (0.12 + rand() * 0.42) : (0.18 + rand() * 0.62);
      const h = dominantHeight * (isSpear ? (0.5 + rand() * 0.55) : (0.34 + rand() * 0.52));
      const useAccent = rand() < 0.30;
      addShard(
        h,
        useAccent ? cAccent : cPrimary,
        Math.cos(angle) * radius,
        h * 0.42 + rand() * 0.08,
        Math.sin(angle) * radius,
        Math.sin(angle) * (isSpear ? (0.11 + rand() * 0.20) : (0.18 + rand() * 0.30)) + (rand() - 0.5) * 0.14,
        -Math.cos(angle) * (isSpear ? (0.11 + rand() * 0.20) : (0.18 + rand() * 0.30)) + (rand() - 0.5) * 0.14,
        baseIntensity * (isSpear ? (0.86 + rand() * 0.48) : (0.7 + rand() * 0.45)),
        isSpear ? 0.78 : 1.0,
      );
    }
    if (isSpear) {
      // Add two extra rear guard spikes to complete the crystal silhouette.
      [-0.28, 0.26].forEach((off) => {
        addShard(
          dominantHeight * (0.62 + rand() * 0.18),
          cPrimary,
          off,
          dominantHeight * (0.30 + rand() * 0.07),
          -0.15 - rand() * 0.16,
          0.08 + rand() * 0.12,
          (off < 0 ? -1 : 1) * (0.1 + rand() * 0.12),
          baseIntensity * 0.95,
          0.74,
        );
      });
    }
    return g;
  }

  // Two clusters — left larger and richer in violet; right smaller and bluer. Positioned at
  // screen borders, well off the centre lane so they frame the altar.
  [
    { dx: -5.9, dz:  2.3, h: 3.2, primary: 0x3aa6ff, accent: 0x9a6cff, n: 11, li: 2.4, style: 'fan' },
    { dx:  6.6, dz: -2.4, h: 2.7, primary: 0x6cc4ff, accent: 0xb088ff, n: 10, li: 1.9, style: 'rose' },
  ].forEach(({ dx, dz, h, primary, accent, n, li, style }) => {
    const wx = altarX + dx;
    const wz = altarZ + dz;
    const wy = groundY(wx, wz + 180);
    const cluster = makeCrystalCluster(primary, accent, h, n, 2.7, style);
    cluster.position.set(wx, wy + 0.06, wz);
    cluster.rotation.y = rand() * Math.PI * 2;
    scene.add(cluster);
    const pl = new THREE.PointLight(primary, li, 16, 2);
    pl.position.set(wx, wy + h * 0.72, wz);
    scene.add(pl);
    const plAccent = new THREE.PointLight(accent, li * 0.45, 12, 2);
    plAccent.position.set(wx + 0.4, wy + h * 0.45, wz - 0.4);
    scene.add(plAccent);
  });

  // Mountain crystals — emerging from the cone face above the altar.
  [
    { x: -1.4, y: 0.7, z: -221.3, h: 0.55, c: 0x9aa8ff, rx:  0.3, rz:  0.4 },
    { x:  1.6, y: 1.5, z: -221.2, h: 0.70, c: 0xb088ff, rx: -0.2, rz: -0.3 },
    { x: -2.6, y: 2.4, z: -222.0, h: 0.60, c: 0x88c8ff, rx:  0.4, rz:  0.6 },
    { x:  2.8, y: 0.5, z: -221.7, h: 0.45, c: 0xffa8d8, rx: -0.1, rz: -0.5 },
    { x: -0.9, y: 3.1, z: -222.4, h: 0.55, c: 0xa8c8ff, rx:  0.2, rz:  0.2 },
    { x:  1.0, y: 2.8, z: -221.6, h: 0.50, c: 0xd0a8ff, rx: -0.3, rz:  0.3 },
    { x: -2.1, y: 0.4, z: -221.5, h: 0.40, c: 0x9adcff, rx:  0.1, rz:  0.7 },
    { x:  3.4, y: 1.8, z: -222.2, h: 0.50, c: 0xc4a4ff, rx: -0.4, rz: -0.2 },
  ].forEach(({ x, y, z, h, c, rx, rz }) => {
    const mesh = makeCrystal(c, h, 1.9);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, rand() * Math.PI * 2, rz);
    mountains.add(mesh);
    const pl = new THREE.PointLight(c, 0.45, 5, 2);
    pl.position.set(x, y, z + 0.3);
    scene.add(pl);
  });

  scene.add(mountains);

  // ===== GLB MODELS =====
  // Torii gates + guardian statues: near 80% journey toward mountain intersection
  // Rocks: scattered along the path
  const TORII_Z   = [-184, -196]; // 2 gates close to the mountain/road convergence
  const GATE_SCALE   = 16;      // 20% smaller than previous size 20
  const GATE_X_OFFSET = 0.1;    // slightly right of the road centerline
  const STATUE_SCALE = 2.52;   // 1.4x bigger than previous 1.8
  const STATUE_GROUND_OFFSET = -0.75; // sink statues lower so they sit firmly on terrain
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

  loadGLB(assetUrl('ToriiGate.glb'))
    .then((proto) => {
      TORII_Z.forEach((tz) => {
        const gate = proto.clone(true);
        gate.scale.setScalar(GATE_SCALE);
        gate.rotation.y = Math.PI / 4; // 45° anti-clockwise
        placeModelOnGround(gate, GATE_X_OFFSET, tz, groundY(GATE_X_OFFSET, tz + 180), -0.05);
        scene.add(gate);
      });
    })
    .catch((err) => {
      console.warn('Failed to load ToriiGate.glb', err);
    });

  loadGLB(assetUrl('Statue.glb'))
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
          const statueZ = tz + 0.1;
          placeModelOnGround(statue, sx, statueZ, groundY(sx, statueZ + 180), STATUE_GROUND_OFFSET);
          scene.add(statue);
        });
      });
    })
    .catch((err) => {
      console.warn('Failed to load Statue.glb', err);
    });

  loadGLB(assetUrl('Rock.glb'))
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
        placeModelOnGround(rock, rx, rz, groundY(rx, rz + 180));
        scene.add(rock);
      });
    })
    .catch((err) => {
      console.warn('Failed to load Rock.glb', err);
    });

  // Grass patches, bell flowers, and tulips around the altar base — kept off the road.
  function scatterAltarPlants(url, offsets, scaleBase, scaleVar, yOffset = -0.04) {
    loadGLB(url)
      .then((proto) => {
        offsets.forEach(([dx, dz], i) => {
          // Road half-width is 1.8 — leave a comfortable buffer so nothing lands on the lane.
          if (Math.abs(dx) < 2.0) return;
          const m = proto.clone(true);
          const jitter = (rand() - 0.5) * 0.12;
          m.scale.setScalar(scaleBase + (i % 3) * scaleVar + jitter);
          m.rotation.y = rand() * Math.PI * 2;
          const wx = altarX + dx;
          const wz = altarZ + dz;
          placeModelOnGround(m, wx, wz, groundY(wx, wz + 180), yOffset);
          scene.add(m);
        });
      })
      .catch((err) => console.warn('Failed to load ' + url, err));
  }

  scatterAltarPlants(assetUrl('GrassPatch.glb'), [
    // Keep center path visually open; denser side/back clusters.
    [-3.2, 0.6], [-2.8, 1.8], [-3.5, -0.9], [-2.4, -1.8],
    [3.2, 0.7], [2.7, 1.9], [3.4, -0.8], [2.5, -1.7],
    [-1.9, 2.5], [1.9, 2.5], [-2.2, -2.4], [2.2, -2.3],
    [-4.6, 2.2], [4.5, 2.1], [-4.4, -2.1], [4.4, -2.0],
    [-2.3, 3.4], [2.4, 3.3], [-2.4, -3.3], [2.5, -3.2],
  ], 0.5, 0.1, -0.08);

  scatterAltarPlants(assetUrl('BellFlower.glb'), [
    [-2.6, 1.5], [2.5, 1.4], [-2.1, -1.3], [2.2, -1.3],
    [-3.0, 2.1], [3.0, 2.0], [-1.7, 2.8], [1.7, 2.7],
    [-3.8, 0.6], [3.7, 0.5], [-2.8, -2.3], [2.9, -2.2],
  ], 0.6, 0.1, -0.05);

  scatterAltarPlants(assetUrl('Tulip.glb'), [
    [-1.6, 2.2], [1.7, 2.1], [-2.9, 0.8], [2.8, 0.7],
    [-1.8, -2.0], [1.8, -2.0], [-2.5, -0.4], [2.4, -0.5],
    [-3.4, 1.8], [3.3, 1.7], [-3.0, -1.8], [3.1, -1.7],
  ], 0.5, 0.08, -0.04);

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

  // Pointer raycasting for the altar icons. Listeners attached to window so the icons stay
  // interactive without needing pointer-events on the canvas (which would block React UI).
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2(-2, -2);
  let pointerInside = false;
  let hoveredIcon = null;

  function onPointerMove(e) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    pointerInside = true;
  }
  function onPointerClick(e) {
    // Skip clicks that landed on overlay UI (popups, header, etc.)
    if (e && e.target && e.target.closest && e.target.closest('[data-altar-overlay], header, button, a')) return;
    // Mobile/touch: hover state may not be set before click fires, so sync the
    // pointer from the click event and raycast inline.
    if (e && typeof e.clientX === 'number' && state.displayed > 0.85) {
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(interactiveIcons, false);
      if (hits.length > 0) hoveredIcon = hits[0].object;
    }
    if (!hoveredIcon) return;
    const data = hoveredIcon.userData;
    if (data.action === 'toggleTheme') {
      window.dispatchEvent(new CustomEvent('altar-theme-toggle'));
      return;
    }
    if (data.action === 'openLinksPopup') {
      window.dispatchEvent(new CustomEvent('altar-links-popup'));
      return;
    }
    if (data.link) window.open(data.link, '_blank', 'noopener');
  }
  function clearHover() {
    if (!hoveredIcon) return;
    hoveredIcon.material.emissiveIntensity = hoveredIcon.userData.baseEmissive;
    hoveredIcon = null;
    document.body.style.cursor = '';
  }
  window.addEventListener('mousemove', onPointerMove);
  window.addEventListener('click', onPointerClick);

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

    // Crystal breathing — each shard pulses on its own slight phase.
    for (let i = 0; i < crystalMats.length; i++) {
      const m = crystalMats[i];
      const p = 1 + Math.sin(t * 1.4 + i * 0.7) * 0.18;
      m.emissiveIntensity = m.userData.baseIntensity * p;
    }

    // Flame flicker: subtle shape wobble + light/intensity breathing.
    const flamePulseA = 1 + Math.sin(t * 8.0) * 0.12;
    const flamePulseB = 1 + Math.sin(t * 11.0 + 1.2) * 0.10;
    flameOuter.scale.set(1.0 + Math.sin(t * 6.6) * 0.06, flamePulseA, 1.0 + Math.cos(t * 7.1) * 0.06);
    flameInner.scale.set(1.0 + Math.sin(t * 7.9 + 0.4) * 0.05, flamePulseB, 1.0 + Math.cos(t * 8.3 + 0.2) * 0.05);
    flameGroup.rotation.z = Math.sin(t * 4.2) * 0.05;
    flameGroup.rotation.x = Math.cos(t * 3.7) * 0.04;
    flameOuter.material.emissiveIntensity = 2.2 + Math.sin(t * 9.4) * 0.35;
    flameInner.material.emissiveIntensity = 2.7 + Math.sin(t * 10.3 + 0.6) * 0.30;
    flameLight.intensity = 1.3 + Math.sin(t * 10.6) * 0.22;

    treesGroup.rotation.z = Math.sin(t * 0.4) * 0.004;

    // Ambient glow pulse on the two main altar runes — breathes slowly, offset phases.
    for (let i = 0; i < glowRunes.length; i++) {
      const gr = glowRunes[i];
      if (gr.mesh !== hoveredIcon) {
        gr.mesh.material.emissiveIntensity = 0.55 + Math.sin(t * 1.4 + gr.phase) * 0.38;
      }
    }

    // Hover state for altar icons — only active in the last stretch of the scroll, after
    // the camera is approaching the altar at the end of the journey.
    if (pointerInside && state.displayed > 0.85) {
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(interactiveIcons, false);
      const newHover = hits.length > 0 ? hits[0].object : null;
      if (newHover !== hoveredIcon) {
        if (hoveredIcon) hoveredIcon.material.emissiveIntensity = hoveredIcon.userData.baseEmissive;
        hoveredIcon = newHover;
        if (hoveredIcon) hoveredIcon.material.emissiveIntensity = hoveredIcon.userData.hoverEmissive;
        document.body.style.cursor = hoveredIcon ? 'pointer' : '';
      }
    } else if (hoveredIcon) {
      clearHover();
    }

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
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('click', onPointerClick);
      clearHover();
      renderer.dispose();
    },
  };
}
