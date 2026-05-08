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
  const nightStops = [
    { t: 0.00, c: [0.18, 0.16, 0.30] },
    { t: 0.20, c: [0.12, 0.12, 0.26] },
    { t: 0.45, c: [0.08, 0.08, 0.20] },
    { t: 0.70, c: [0.05, 0.05, 0.14] },
    { t: 1.00, c: [0.02, 0.02, 0.08] },
  ];
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
      post.position.set(side * 2.6, 1.1, z);
      lanterns.add(post);
      const lamp = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.22, 0),
        new THREE.MeshStandardMaterial({
          color: 0xffe2a0, emissive: 0xffb060, emissiveIntensity: 0, flatShading: true,
        })
      );
      lamp.position.set(side * 2.6, 2.3, z);
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
      branch.rotation.z = (rng() * 0.6 + 0.4) * (rng() < 0.5 ? -1 : 1);
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
      const y = terrainHeight(x, z);
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
      const y = terrainHeight(x, z);
      const tree = makeBlossomTree(treeSeed++);
      tree.position.set(x, y, z);
      tree.scale.setScalar(0.7 + rand() * 0.5);
      tree.rotation.y = rand() * Math.PI * 2;
      treesGroup.add(tree);
    }
  }
  scene.add(treesGroup);

  // Bushes (small low-poly clusters) — extra interest
  const bushGroup = new THREE.Group();
  const bushColors = [0xc88068, 0xb86058, 0xa05058, 0xd9a07a];
  for (let z = 14; z > -360; z -= 2.6 + rand() * 2.2) {
    if (rand() < 0.5) continue;
    const side = rand() < 0.5 ? -1 : 1;
    const x = side * (2.6 + rand() * 8);
    const y = terrainHeight(x, z);
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
    const y = terrainHeight(x, z);
    const s = 0.3 + rand() * 1.2;
    dummy.position.set(x, y + 0.1, z);
    dummy.rotation.set(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI);
    dummy.scale.set(s * 1.4, s, s * 1.2);
    dummy.updateMatrix();
    rocks.setMatrixAt(i, dummy.matrix);
  }
  scene.add(rocks);

  // Distant mountains
  const mountains = new THREE.Group();
  const mountainMats = [];
  for (let i = 0; i < 22; i++) {
    const x = (rand() - 0.5) * 240;
    const z = -180 - rand() * 130;
    const w = 16 + rand() * 18;
    const h = 22 + rand() * 22;
    const mat = new THREE.MeshStandardMaterial({
      color: rand() < 0.5 ? 0x6a3a4a : 0x7a4858, flatShading: true, roughness: 1,
    });
    mountainMats.push(mat);
    const mesh = new THREE.Mesh(new THREE.ConeGeometry(w, h, 5), mat);
    mesh.position.set(x, h / 2 - 1, z);
    mesh.rotation.y = rand() * Math.PI;
    mountains.add(mesh);
  }
  scene.add(mountains);

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
  const clock = new THREE.Clock();
  function tick() {
    const dt = Math.min(0.05, clock.getDelta());
    const t = clock.getElapsedTime();
    state.displayed += (state.progress - state.displayed) * Math.min(1, dt * 6);
    const p = state.displayed;

    const z = lerp(Z_START, Z_END, p);
    const camX = Math.sin(p * Math.PI * 1.6) * 0.6;
    const camY = 1.7 + Math.sin(p * Math.PI * 2.4) * 0.25;
    camera.position.set(camX, camY, z);
    const lookZ = z - 6;
    const lookX = Math.sin((p + 0.05) * Math.PI * 1.6) * 0.4;
    camera.lookAt(lookX, 1.5, lookZ);

    // Sky / sun follow camera so they're always ahead
    sky.position.set(camera.position.x, 0, camera.position.z);
    stars.position.set(camera.position.x, 0, camera.position.z);
    celestial.position.z = z - 110;
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
    const w = window.innerWidth;
    const h = window.innerHeight;
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
