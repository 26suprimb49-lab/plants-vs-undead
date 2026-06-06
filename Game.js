class Game {
  constructor() {
    window.game = this;
    this.entities = [];
    this.tiles = [];
    this.plants = [];
    this.zombies = [];
    this.projectiles = [];
    this.suns = [];
    this.lawnMowers = [];
    this.sun = 50;
    this.selectedPlant = null;
    this.shovelMode = false;
    this.isRunning = false;
    this.sandboxMode = false;
    this.level = 1;
    this.wave = 1;
    this.waveTimer = 0;
    this.zombiesSpawned = 0;
    this.zombiesPerWave = 3;
    this.spawnTimer = 0;
    this.sunDropTimer = 2;
    this.clock = new THREE.Clock();
    this.plantCosts = { peashooter: 100, sunflower: 50, wallnut: 50, snowpea: 175, repeater: 200, potato_mine: 25, chomper: 150 };
    this.plantCooldowns = { peashooter: 7, sunflower: 7, wallnut: 25, snowpea: 12, repeater: 7, potato_mine: 30, chomper: 10 };
    this.plantCooldownTimers = { peashooter: 0, sunflower: 0, wallnut: 0, snowpea: 0, repeater: 0, potato_mine: 0, chomper: 0 };

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB);
    this.scene.fog = new THREE.Fog(0x87CEEB, 40, 120);

    // Camera
    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
    this.camera.position.set(-2, 14, 16);
    this.camera.lookAt(0, 0, 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    document.getElementById('gameContainer').appendChild(this.renderer.domElement);

    // Lighting - warm sunlight feel
    const ambient = new THREE.AmbientLight(0xfff8e8, 0.55);
    this.scene.add(ambient);
    const hemi = new THREE.HemisphereLight(0x88ccff, 0x446622, 0.6);
    this.scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xfff0d0, 1.3);
    dir.position.set(12, 22, 8);
    dir.castShadow = true;
    dir.shadow.bias = -0.001;
    dir.shadow.mapSize.set(2048, 2048);
    dir.shadow.camera.left = -22; dir.shadow.camera.right = 22;
    dir.shadow.camera.top = 22; dir.shadow.camera.bottom = -22;
    this.scene.add(dir);
    // Subtle warm fill light from opposite side
    const fill = new THREE.DirectionalLight(0xffddaa, 0.25);
    fill.position.set(-10, 8, -5);
    this.scene.add(fill);
    // Rim light for depth
    const rim = new THREE.DirectionalLight(0xaaccff, 0.2);
    rim.position.set(-5, 15, -15);
    this.scene.add(rim);

    // Enhanced sky with gradient sphere
    this.scene.background = null;
    const skyGeo = new THREE.SphereGeometry(90, 32, 15);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        topColor: { value: new THREE.Color(0x1e90ff) },
        midColor: { value: new THREE.Color(0x87ceeb) },
        bottomColor: { value: new THREE.Color(0xb0e0ff) },
        offset: { value: 10 },
        exponent: { value: 0.4 }
      },
      vertexShader: `varying vec3 vWorldPos;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `uniform vec3 topColor; uniform vec3 midColor; uniform vec3 bottomColor;
        uniform float offset; uniform float exponent; varying vec3 vWorldPos;
        void main() {
          float h = normalize(vWorldPos + vec3(0,offset,0)).y;
          float t = max(0.0, h);
          vec3 col = mix(bottomColor, midColor, smoothstep(0.0, 0.3, t));
          col = mix(col, topColor, smoothstep(0.3, 1.0, t));
          gl_FragColor = vec4(col, 1.0);
        }`
    });
    this.scene.add(new THREE.Mesh(skyGeo, skyMat));

    // Sun in sky with radiant glow
    const sunGroup = new THREE.Group();
    sunGroup.position.set(25, 22, -30);
    this.scene.add(sunGroup);
    // Core
    const sunCore = new THREE.Mesh(
      new THREE.SphereGeometry(2.5, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0xffee66 })
    );
    sunGroup.add(sunCore);
    // Inner glow
    const glowInner = new THREE.Mesh(
      new THREE.SphereGeometry(3.5, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0xffdd44, transparent: true, opacity: 0.35 })
    );
    sunGroup.add(glowInner);
    // Outer glow
    const glowOuter = new THREE.Mesh(
      new THREE.SphereGeometry(5, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0xffcc22, transparent: true, opacity: 0.15 })
    );
    sunGroup.add(glowOuter);
    // Haze
    const glowHaze = new THREE.Mesh(
      new THREE.SphereGeometry(7, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xffeeaa, transparent: true, opacity: 0.07 })
    );
    sunGroup.add(glowHaze);
    // Rays
    const rayMat = new THREE.MeshBasicMaterial({ color: 0xffee88, transparent: true, opacity: 0.18, side: THREE.DoubleSide });
    for (let i = 0; i < 12; i++) {
      const ray = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 10), rayMat);
      ray.rotation.z = (i / 12) * Math.PI * 2;
      ray.position.set(0, 0, 0);
      sunGroup.add(ray);
    }
    this._skySunGroup = sunGroup;


    // Clouds
    const cloudMat = new THREE.MeshPhongMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, flatShading: true });
    this._clouds = [];
    for (let i = 0; i < 25; i++) {
      const cg = new THREE.Group();
      const puffs = 3 + Math.floor(Math.random() * 4);
      for (let p = 0; p < puffs; p++) {
        const s = 1.5 + Math.random() * 2.5;
        const puff = new THREE.Mesh(new THREE.SphereGeometry(s, 8, 6), cloudMat);
        puff.position.set(p * 2.2 - puffs, (Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 1.5);
        puff.scale.y = 0.5;
        cg.add(puff);
      }
      cg.position.set(-80 + Math.random() * 160, 12 + Math.random() * 10, -60 + Math.random() * 80);
      this.scene.add(cg);
      this._clouds.push({ mesh: cg, speed: 0.3 + Math.random() * 0.6 });
    }

    // Ground with gradient colors
    const groundGeo = new THREE.PlaneGeometry(200, 200, 40, 40);
    const groundColors = new Float32Array(groundGeo.attributes.position.count * 3);
    for (let i = 0; i < groundGeo.attributes.position.count; i++) {
      const x = groundGeo.attributes.position.getX(i);
      const y = groundGeo.attributes.position.getY(i);
      const dist = Math.sqrt(x * x + y * y);
      const t = Math.min(dist / 80, 1);
      const c = new THREE.Color().lerpColors(new THREE.Color(0x4a8a28), new THREE.Color(0x3a6a1e), t);
      const n = (Math.sin(x * 0.5) * Math.cos(y * 0.3) * 0.5 + 0.5) * 0.08;
      groundColors[i * 3] = c.r + n;
      groundColors[i * 3 + 1] = c.g + n;
      groundColors[i * 3 + 2] = c.b;
    }
    groundGeo.setAttribute('color', new THREE.BufferAttribute(groundColors, 3));
    const ground = new THREE.Mesh(
      groundGeo,
      new THREE.MeshLambertMaterial({ vertexColors: true })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Dirt path from house to lawn
    const pathGeo = new THREE.PlaneGeometry(2, 11);
    const pathMat = new THREE.MeshLambertMaterial({ color: 0x8B7355 });
    const path = new THREE.Mesh(pathGeo, pathMat);
    path.rotation.x = -Math.PI / 2;
    path.position.set(-9.5, 0.005, 0);
    this.scene.add(path);


    // Garden fence along left side near house
    const fenceMat = new THREE.MeshPhongMaterial({ color: 0xF5F0E0, shininess: 10 });
    const fencePostGeo = new THREE.BoxGeometry(0.12, 1.0, 0.12);
    const fenceRailGeoX = new THREE.BoxGeometry(1.8, 0.06, 0.06);
    // Fence along top side (z = -5.5)
    for (let x = -9; x <= 8.2; x += 1.8) {
      const post = new THREE.Mesh(fencePostGeo, fenceMat);
      post.position.set(x, 0.5, -5.5);
      post.castShadow = true;
      this.scene.add(post);
      const top = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.15, 4), fenceMat);
      top.position.set(x, 1.05, -5.5);
      this.scene.add(top);
      if (x < 10) {
        const rail1 = new THREE.Mesh(fenceRailGeoX, fenceMat);
        rail1.position.set(x + 0.9, 0.7, -5.5);
        this.scene.add(rail1);
        const rail2 = new THREE.Mesh(fenceRailGeoX, fenceMat);
        rail2.position.set(x + 0.9, 0.35, -5.5);
        this.scene.add(rail2);
      }
    }
    // Fence along bottom side (z = 5.5)
    for (let x = -9; x <= 8.2; x += 1.8) {
      const post = new THREE.Mesh(fencePostGeo, fenceMat);
      post.position.set(x, 0.5, 5.5);
      post.castShadow = true;
      this.scene.add(post);
      const top = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.15, 4), fenceMat);
      top.position.set(x, 1.05, 5.5);
      this.scene.add(top);
      if (x < 10) {
        const rail1 = new THREE.Mesh(fenceRailGeoX, fenceMat);
        rail1.position.set(x + 0.9, 0.7, 5.5);
        this.scene.add(rail1);
        const rail2 = new THREE.Mesh(fenceRailGeoX, fenceMat);
        rail2.position.set(x + 0.9, 0.35, 5.5);
        this.scene.add(rail2);
      }
    }

    // Grass blades scattered around edges of lawn
    this._grassBlades = [];
    const bladeMat = new THREE.MeshLambertMaterial({ color: 0x55aa30, side: THREE.DoubleSide });
    const bladeMat2 = new THREE.MeshLambertMaterial({ color: 0x448822, side: THREE.DoubleSide });
    const bladeGeo = new THREE.PlaneGeometry(0.08, 0.4);
    bladeGeo.translate(0, 0.2, 0);
    for (let i = 0; i < 600; i++) {
      let bx, bz;
      const zone = Math.random();
      if (zone < 0.3) { bx = -9 + Math.random() * 20; bz = -5.5 - Math.random() * 3; }
      else if (zone < 0.6) { bx = -9 + Math.random() * 20; bz = 5.5 + Math.random() * 3; }
      else if (zone < 0.8) { bx = 11 + Math.random() * 3; bz = -6 + Math.random() * 12; }
      else { bx = -12 + Math.random() * 3; bz = -6 + Math.random() * 12; if (bx > -11 && bz > -5.5 && bz < 5.5) continue; }
      const blade = new THREE.Mesh(bladeGeo, Math.random() > 0.5 ? bladeMat : bladeMat2);
      blade.position.set(bx, 0, bz);
      blade.rotation.y = Math.random() * Math.PI;
      blade.scale.set(0.8 + Math.random() * 0.8, 0.6 + Math.random() * 1.0, 1);
      this.scene.add(blade);
      this._grassBlades.push({ mesh: blade, phase: Math.random() * Math.PI * 2, speed: 1 + Math.random() * 1.5 });
    }

    // Small flowers scattered in garden
    const flowerColors = [0xFF6B8A, 0xFFD700, 0xFF69B4, 0xBA55D3, 0xFF4500, 0xFFFFFF];
    for (let i = 0; i < 40; i++) {
      let fx, fz;
      const z2 = Math.random();
      if (z2 < 0.5) { fx = -9 + Math.random() * 20; fz = -6 - Math.random() * 2; }
      else { fx = -9 + Math.random() * 20; fz = 6 + Math.random() * 2; }
      const fg = new THREE.Group();
      // Stem
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 4), new THREE.MeshLambertMaterial({ color: 0x338822 }));
      stem.position.y = 0.15;
      fg.add(stem);
      // Petals
      const fc = flowerColors[Math.floor(Math.random() * flowerColors.length)];
      for (let p = 0; p < 5; p++) {
        const petal = new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 4), new THREE.MeshLambertMaterial({ color: fc }));
        const ang = (p / 5) * Math.PI * 2;
        petal.position.set(Math.cos(ang) * 0.07, 0.32, Math.sin(ang) * 0.07);
        petal.scale.y = 0.5;
        fg.add(petal);
      }
      // Center
      const center = new THREE.Mesh(new THREE.SphereGeometry(0.04, 5, 4), new THREE.MeshLambertMaterial({ color: 0xFFDD00 }));
      center.position.y = 0.33;
      fg.add(center);
      fg.position.set(fx, 0, fz);
      this.scene.add(fg);
    }

    // Butterfly particles
    this._butterflies = [];
    const bfColors = [0xFFFF88, 0xFF88FF, 0x88FFFF, 0xFFAA44];
    for (let i = 0; i < 6; i++) {
      const bg = new THREE.Group();
      const wMat = new THREE.MeshBasicMaterial({ color: bfColors[i % bfColors.length], side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
      const wGeo = new THREE.PlaneGeometry(0.15, 0.1);
      const wL = new THREE.Mesh(wGeo, wMat);
      wL.position.x = -0.07;
      const wR = new THREE.Mesh(wGeo, wMat);
      wR.position.x = 0.07;
      bg.add(wL, wR);
      bg.position.set(-5 + Math.random() * 18, 1 + Math.random() * 2, -5 + Math.random() * 10);
      this.scene.add(bg);
      this._butterflies.push({ mesh: bg, wingL: wL, wingR: wR, phase: Math.random() * Math.PI * 2, cx: bg.position.x, cz: bg.position.z, radius: 1 + Math.random() * 3 });
    }

    // Floating dust/pollen particles
    const particleCount = 80;
    const pPositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      pPositions[i * 3] = -15 + Math.random() * 30;
      pPositions[i * 3 + 1] = 0.5 + Math.random() * 5;
      pPositions[i * 3 + 2] = -8 + Math.random() * 16;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    const pMat = new THREE.PointsMaterial({ color: 0xffffcc, size: 0.06, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending });
    this._dustParticles = new THREE.Points(pGeo, pMat);
    this.scene.add(this._dustParticles);
    this._dustTime = 0;

    // House - high quality detailed build
    const houseMat = (color, s, e) => {
      const m = new THREE.MeshStandardMaterial({ color, roughness: e || 0.6, metalness: 0.05 });
      if (s) m.roughness = 1.0 - s / 200;
      return m;
    };
    const houseGroup = new THREE.Group();
    this.scene.add(houseGroup);

    // Foundation - stone textured
    const foundationMat = new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.9, metalness: 0.0 });
    const foundation = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.5, 11.5), foundationMat);
    foundation.position.set(-12, 0.25, 0);
    foundation.castShadow = true; foundation.receiveShadow = true;
    houseGroup.add(foundation);
    // Foundation stone details
    for (let z = -5.2; z <= 5.2; z += 0.9) {
      for (let y = 0.08; y <= 0.42; y += 0.18) {
        const stone = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14 + Math.random()*0.04, 0.7 + Math.random()*0.2),
          new THREE.MeshStandardMaterial({ color: new THREE.Color(0x666666).lerp(new THREE.Color(0x888888), Math.random()), roughness: 0.95 }));
        stone.position.set(-10.04, y, z);
        houseGroup.add(stone);
      }
    }

    // Main walls with slight color variation for warmth
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xF0E4CC, roughness: 0.75, metalness: 0.0 });
    const houseBase = new THREE.Mesh(new THREE.BoxGeometry(3.5, 3.8, 11), wallMat);
    houseBase.position.set(-12, 2.4, 0);
    houseBase.castShadow = true; houseBase.receiveShadow = true;
    houseGroup.add(houseBase);

    // Horizontal siding lines on front wall
    const sidingMat = new THREE.MeshStandardMaterial({ color: 0xE0D0B5, roughness: 0.8 });
    for (let y = 0.7; y < 4.2; y += 0.4) {
      const siding = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, 11.02), sidingMat);
      siding.position.set(-10.24, y, 0);
      houseGroup.add(siding);
    }

    // Corner trim boards
    const trimMat = new THREE.MeshStandardMaterial({ color: 0xFAF8F0, roughness: 0.5, metalness: 0.02 });
    for (const zOff of [-5.52, 5.52]) {
      const corner = new THREE.Mesh(new THREE.BoxGeometry(3.6, 3.85, 0.12), trimMat);
      corner.position.set(-12, 2.4, zOff);
      houseGroup.add(corner);
    }
    // Front face trim
    const frontTrimL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 3.85, 0.14), trimMat);
    frontTrimL.position.set(-10.22, 2.4, -5.45);
    houseGroup.add(frontTrimL);
    const frontTrimR = frontTrimL.clone(); frontTrimR.position.z = 5.45; houseGroup.add(frontTrimR);

    // Roof (pitched) with better material
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x7A3030, roughness: 0.65, metalness: 0.08 });
    const roofShape = new THREE.Shape();
    roofShape.moveTo(-6.3, 0); roofShape.lineTo(0, 2.4); roofShape.lineTo(6.3, 0); roofShape.closePath();
    const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: 4.3, bevelEnabled: false });
    const roofMesh = new THREE.Mesh(roofGeo, roofMat);
    roofMesh.rotation.y = Math.PI / 2;
    roofMesh.position.set(-14.2, 4.3, 0);
    roofMesh.castShadow = true;
    houseGroup.add(roofMesh);



    // Front door - rich wood
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x4A2A10, roughness: 0.45, metalness: 0.05 });
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.2, 1.0), doorMat);
    door.position.set(-10.22, 1.6, 0);
    door.castShadow = true;
    houseGroup.add(door);
    // Door panels (recessed)
    const panelMat = new THREE.MeshStandardMaterial({ color: 0x3D220D, roughness: 0.5 });
    for (const py of [1.0, 2.0]) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.6, 0.35), panelMat);
      panel.position.set(-10.15, py, 0);
      houseGroup.add(panel);
    }
    // Doorknob - brass
    const knobMat = new THREE.MeshStandardMaterial({ color: 0xD4AA40, roughness: 0.2, metalness: 0.8 });
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), knobMat);
    knob.position.set(-10.14, 1.5, 0.25);
    houseGroup.add(knob);
    // Doorknob plate
    const knobPlate = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.18, 0.08), knobMat);
    knobPlate.position.set(-10.15, 1.5, 0.25);
    houseGroup.add(knobPlate);
    // Door frame with crown molding
    const frameMat = new THREE.MeshStandardMaterial({ color: 0xFAF5E8, roughness: 0.4 });
    const doorFrameL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.3, 0.1), frameMat);
    doorFrameL.position.set(-10.20, 1.65, -0.55);
    houseGroup.add(doorFrameL);
    const doorFrameR = doorFrameL.clone(); doorFrameR.position.z = 0.55; houseGroup.add(doorFrameR);
    const doorFrameT = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 1.2), frameMat);
    doorFrameT.position.set(-10.20, 2.8, 0);
    houseGroup.add(doorFrameT);
    // Door pediment (decorative top)
    const pediment = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 1.35), frameMat);
    pediment.position.set(-10.19, 2.92, 0);
    houseGroup.add(pediment);
    // Small arch/semicircle above door
    const archGeo = new THREE.SphereGeometry(0.3, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    const archMesh = new THREE.Mesh(archGeo, new THREE.MeshStandardMaterial({ color: 0x88BBDD, roughness: 0.3, metalness: 0.05, transparent: true, opacity: 0.7 }));
    archMesh.rotation.x = Math.PI / 2;
    archMesh.rotation.z = Math.PI / 2;
    archMesh.scale.set(0.12, 1.6, 1);
    archMesh.position.set(-10.17, 2.8, 0);
    houseGroup.add(archMesh);

    // Windows with glass reflection shader
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x6699BB, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.7
    });
    const windowFrameMat = new THREE.MeshStandardMaterial({ color: 0xFAF5E8, roughness: 0.4 });
    const shutterMat = new THREE.MeshStandardMaterial({ color: 0x1E4A1E, roughness: 0.6 });
    for (let i = -1; i <= 1; i += 2) {
      const wz = i * 2.8;
      // Window glass
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.2, 1.0), glassMat);
      win.position.set(-10.23, 2.6, wz);
      houseGroup.add(win);
      // Window sill
      const sill = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 1.15), windowFrameMat);
      sill.position.set(-10.15, 2.0, wz);
      houseGroup.add(sill);
      // Window header
      const header = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 1.15), windowFrameMat);
      header.position.set(-10.20, 3.25, wz);
      houseGroup.add(header);
      // Frame sides
      for (const s of [-0.55, 0.55]) {
        const side = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.3, 0.08), windowFrameMat);
        side.position.set(-10.20, 2.6, wz + s);
        houseGroup.add(side);
      }
      // Mullions (cross bars)
      const mullV = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.2, 0.04), windowFrameMat);
      mullV.position.set(-10.20, 2.6, wz);
      houseGroup.add(mullV);
      const mullH = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 1.0), windowFrameMat);
      mullH.position.set(-10.20, 2.6, wz);
      houseGroup.add(mullH);
      // Shutters with slat detail
      for (const s of [-1, 1]) {
        const shutterGroup = new THREE.Group();
        const shutterBody = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.2, 0.38), shutterMat);
        shutterGroup.add(shutterBody);
        // Slat lines
        for (let sy = -0.45; sy <= 0.45; sy += 0.12) {
          const slat = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.02, 0.34),
            new THREE.MeshStandardMaterial({ color: 0x163A16, roughness: 0.7 }));
          slat.position.set(0.03, sy, 0);
          shutterGroup.add(slat);
        }
        shutterGroup.position.set(-10.20, 2.6, wz + s * 0.72);
        houseGroup.add(shutterGroup);
      }
      // Flower box under window
      const boxMat = new THREE.MeshStandardMaterial({ color: 0x6B4226, roughness: 0.7 });
      const flowerBox = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.15, 1.0), boxMat);
      flowerBox.position.set(-10.10, 1.93, wz);
      houseGroup.add(flowerBox);
      // Tiny flowers in box
      const fColors = [0xFF6B8A, 0xFF4500, 0xFFD700, 0xFF69B4];
      for (let fz = -0.4; fz <= 0.4; fz += 0.2) {
        const fc = fColors[Math.floor(Math.random() * fColors.length)];
        const fl = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4),
          new THREE.MeshStandardMaterial({ color: fc, roughness: 0.6 }));
        fl.position.set(-10.06, 2.06, wz + fz + (Math.random()-0.5)*0.08);
        fl.scale.y = 0.7;
        houseGroup.add(fl);
        // Tiny leaf
        const lf = new THREE.Mesh(new THREE.SphereGeometry(0.03, 4, 3),
          new THREE.MeshStandardMaterial({ color: 0x33AA33, roughness: 0.7 }));
        lf.position.set(-10.06, 2.02, wz + fz);
        houseGroup.add(lf);
      }
    }

    // Chimney with brick detail
    const chimneyMat = new THREE.MeshStandardMaterial({ color: 0x884433, roughness: 0.85 });
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.7, 2.2, 0.7), chimneyMat);
    chimney.position.set(-12.5, 5.2, 3.5);
    chimney.castShadow = true;
    houseGroup.add(chimney);
    // Brick lines
    const brickLineMat = new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 0.9 });
    for (let by = 4.2; by < 6.2; by += 0.22) {
      const bLine = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.02, 0.72), brickLineMat);
      bLine.position.set(-12.5, by, 3.5);
      houseGroup.add(bLine);
    }
    // Chimney cap
    const capMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.4, metalness: 0.3 });
    const chimneyCap = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 0.9), capMat);
    chimneyCap.position.set(-12.5, 6.32, 3.5);
    houseGroup.add(chimneyCap);
    // Chimney pot
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.3, 8), capMat);
    pot.position.set(-12.5, 6.52, 3.5);
    houseGroup.add(pot);

    // Porch/step in front of door
    const stepMat = new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.8 });
    const step1 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.12, 1.4), stepMat);
    step1.position.set(-10.0, 0.06, 0);
    step1.receiveShadow = true;
    houseGroup.add(step1);
    const step2 = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.12, 1.3), stepMat);
    step2.position.set(-10.15, 0.18, 0);
    houseGroup.add(step2);

    // Porch light (small lantern by door)
    const lanternMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.3, metalness: 0.6 });
    const lanternBase = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, 0.08), lanternMat);
    lanternBase.position.set(-10.16, 3.1, -0.7);
    houseGroup.add(lanternBase);
    const lanternGlow = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 0.1),
      new THREE.MeshStandardMaterial({ color: 0xFFDD66, roughness: 0.2, emissive: 0xFFCC33, emissiveIntensity: 0.5 }));
    lanternGlow.position.set(-10.16, 3.0, -0.7);
    houseGroup.add(lanternGlow);
    // Porch light on other side
    const lanternBase2 = lanternBase.clone(); lanternBase2.position.z = 0.7; houseGroup.add(lanternBase2);
    const lanternGlow2 = lanternGlow.clone(); lanternGlow2.position.z = 0.7; houseGroup.add(lanternGlow2);

    // House number
    const numPlate = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.2, 0.3),
      new THREE.MeshStandardMaterial({ color: 0xDDAA44, roughness: 0.25, metalness: 0.7 }));
    numPlate.position.set(-10.15, 3.05, 0);
    houseGroup.add(numPlate);



    // Trees around edges of grass
    this._createTrees();

    // Create tiles (5 rows x 9 cols)
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 9; c++) {
        const tile = new Tile(this.scene, r, c);
        this.tiles.push(tile);
        this.entities.push(tile);
      }
    }

    // Lawn mowers
    for (let r = 0; r < 5; r++) {
      const lm = new LawnMower(this.scene, r);
      this.lawnMowers.push(lm);
      this.entities.push(lm);
    }

    // Raycaster for clicking
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // Camera orbit controls
    this.isDragging = false;
    this.lastMouse = { x: 0, y: 0 };
    this.cameraTarget = new THREE.Vector3(0, 0, 0);
    this.cameraSpherical = new THREE.Spherical();
    this.cameraSpherical.setFromVector3(this.camera.position.clone().sub(this.cameraTarget));

    this._sandboxPainting = false;
    this._lastPaintedTile = null;
    this.renderer.domElement.addEventListener('pointerdown', (e) => {
      this.isDragging = true;
      this.lastMouse.x = e.clientX;
      this.lastMouse.y = e.clientY;
      // Start sandbox painting if plant selected
      if (this.sandboxMode && this.isRunning && this.selectedPlant && !this.shovelMode) {
        this._sandboxPainting = true;
        this._lastPaintedTile = null;
      }
    });
    this.renderer.domElement.addEventListener('pointermove', (e) => {
      if (!this.isDragging) return;
      if (this._sandboxPainting) return;
      const dx = e.clientX - this.lastMouse.x;
      const dy = e.clientY - this.lastMouse.y;
      this.lastMouse.x = e.clientX;
      this.lastMouse.y = e.clientY;
      this.cameraSpherical.theta -= dx * 0.005;
      this.cameraSpherical.phi -= dy * 0.005;
      this.cameraSpherical.phi = Math.max(0.2, Math.min(Math.PI / 2 - 0.05, this.cameraSpherical.phi));
      const pos = new THREE.Vector3().setFromSpherical(this.cameraSpherical).add(this.cameraTarget);
      this.camera.position.copy(pos);
      this.camera.lookAt(this.cameraTarget);
    });
    window.addEventListener('pointerup', () => { this.isDragging = false; this._sandboxPainting = false; this._lastPaintedTile = null; });

    this.renderer.domElement.addEventListener('wheel', (e) => {
      e.preventDefault();
      // Get mouse position in NDC
      const mouseNDC = new THREE.Vector2(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1
      );
      // Raycast to find world point under mouse
      const rc = new THREE.Raycaster();
      rc.setFromCamera(mouseNDC, this.camera);
      const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const worldPoint = new THREE.Vector3();
      rc.ray.intersectPlane(groundPlane, worldPoint);

      const zoomFactor = 1 + e.deltaY * 0.001;
      const newRadius = Math.max(5, Math.min(40, this.cameraSpherical.radius * zoomFactor));
      const actualFactor = newRadius / this.cameraSpherical.radius;

      if (worldPoint && actualFactor !== 1) {
        // Move target towards the world point under mouse when zooming in
        const t = 1 - actualFactor; // positive when zooming in
        const shift = new THREE.Vector3().subVectors(worldPoint, this.cameraTarget).multiplyScalar(t * 1.0);
        this.cameraTarget.add(shift);
      }

      this.cameraSpherical.radius = newRadius;
      const pos = new THREE.Vector3().setFromSpherical(this.cameraSpherical).add(this.cameraTarget);
      this.camera.position.copy(pos);
      this.camera.lookAt(this.cameraTarget);
    }, { passive: false });

    // Hover preview
    this.hoverPreview = null;
    this.hoverTile = null;
    this.renderer.domElement.addEventListener('pointermove', (e) => { this._onHover(e); this._onSunHover(e); this._onSandboxPaint(e); });
    this.renderer.domElement.addEventListener('click', (e) => this.onClick(e));
    window.addEventListener('resize', () => this.onResize());
    this.onResize();
    this._generatePlantIcons();
    this._generateSunIcon();
    this._drawShovelIcon();
    this._generateZombieHeadIcon();
    this._generateStartScreenCharacters();
    this.levelConfigs = [
      { waves: 2, baseZombies: 3, spawnInterval: [22, 14], coneChance: 0, bucketChance: 0, burstNormal: 2, burstFinal: 5 },
      { waves: 3, baseZombies: 3, spawnInterval: [20, 14, 11], coneChance: 0.1, bucketChance: 0, burstNormal: 2, burstFinal: 6 },
      { waves: 3, baseZombies: 4, spawnInterval: [18, 13, 10], coneChance: 0.15, bucketChance: 0.03, burstNormal: 3, burstFinal: 7 },
      { waves: 4, baseZombies: 4, spawnInterval: [17, 13, 10, 8], coneChance: 0.2, bucketChance: 0.06, burstNormal: 3, burstFinal: 8 },
      { waves: 4, baseZombies: 5, spawnInterval: [16, 12, 9, 7], coneChance: 0.22, bucketChance: 0.1, burstNormal: 4, burstFinal: 10 },
      { waves: 5, baseZombies: 5, spawnInterval: [15, 11, 9, 7, 6], coneChance: 0.25, bucketChance: 0.12, burstNormal: 5, burstFinal: 11 },
      { waves: 5, baseZombies: 6, spawnInterval: [14, 10, 8, 6, 5], coneChance: 0.28, bucketChance: 0.15, burstNormal: 5, burstFinal: 13 },
      { waves: 5, baseZombies: 7, spawnInterval: [13, 10, 8, 6, 5], coneChance: 0.3, bucketChance: 0.18, burstNormal: 6, burstFinal: 15 },
      { waves: 6, baseZombies: 8, spawnInterval: [12, 9, 7, 6, 5, 4], coneChance: 0.32, bucketChance: 0.2, burstNormal: 7, burstFinal: 17 },
      { waves: 6, baseZombies: 9, spawnInterval: [11, 8, 7, 5, 4, 4], coneChance: 0.35, bucketChance: 0.25, burstNormal: 8, burstFinal: 19 },
    ];
    this.zombiesKilledInWave = 0;
    this.waveBarProgress = 0;
    this.flagPositions = [50, 90];
    this.flagsTriggered = [false, false];
    this._applyLevelConfig();
    this._setupWaveBar();
  }

  _onSandboxPaint(e) {
    if (!this._sandboxPainting || !this.sandboxMode || !this.isRunning || !this.selectedPlant) return;
    const mouse = new THREE.Vector2(
      (e.clientX / window.innerWidth) * 2 - 1,
      -(e.clientY / window.innerHeight) * 2 + 1
    );
    this.raycaster.setFromCamera(mouse, this.camera);
    const tileMeshes = this.tiles.map(t => t.mesh).filter(m => m);
    const hits = this.raycaster.intersectObjects(tileMeshes);
    if (hits.length > 0) {
      const tile = this.tiles.find(t => t.mesh === hits[0].object);
      if (tile && !tile.plant && tile !== this._lastPaintedTile) {
        this._lastPaintedTile = tile;
        const plantType = this.selectedPlant;
        const plant = new Plant(this.scene, plantType, tile.row, tile.col);
        tile.plant = plant;
        this.plants.push(plant);
        this.entities.push(plant);
      }
    }
  }

  _onHover(e) {
    if (!this.isRunning || !this.selectedPlant) {
      this._clearHoverPreview();
      return;
    }
    const mouse = new THREE.Vector2(
      (e.clientX / window.innerWidth) * 2 - 1,
      -(e.clientY / window.innerHeight) * 2 + 1
    );
    this.raycaster.setFromCamera(mouse, this.camera);
    const tileMeshes = this.tiles.map(t => t.mesh).filter(m => m);
    const hits = this.raycaster.intersectObjects(tileMeshes);
    if (hits.length > 0) {
      const tile = this.tiles.find(t => t.mesh === hits[0].object);
      if (tile && !tile.plant) {
        if (this.hoverTile === tile && this.hoverPreview) return;
        this._clearHoverPreview();
        this.hoverTile = tile;
        // Create ghost plant
        const ghost = new Plant(this.scene, this.selectedPlant, tile.row, tile.col);
        ghost.mesh.rotation.y = Math.PI / 2;
        // Make semi-transparent
        ghost.mesh.traverse(child => {
          if (child.isMesh && child.material) {
            child.material = child.material.clone();
            child.material.transparent = true;
            child.material.opacity = 0.45;
          }
        });
        // Remove from entities so it doesn't update/shoot
        this.entities = this.entities.filter(en => en !== ghost);
        this.plants = this.plants.filter(p => p !== ghost);
        this.hoverPreview = ghost;
        return;
      }
    }
    this._clearHoverPreview();
  }

  _onSunHover(e) {
    if (!this.isRunning) return;
    const mouse = new THREE.Vector2(
      (e.clientX / window.innerWidth) * 2 - 1,
      -(e.clientY / window.innerHeight) * 2 + 1
    );
    this.raycaster.setFromCamera(mouse, this.camera);
    const sunMeshes = this.suns.filter(s => s.alive && !s.collected).map(s => s.mesh).filter(m => m);
    const sunHits = this.raycaster.intersectObjects(sunMeshes, true);
    if (sunHits.length > 0) {
      const sunObj = this.suns.find(s => s.mesh && (s.mesh === sunHits[0].object || s.mesh === sunHits[0].object.parent));
      if (sunObj) sunObj.collect();
    }
  }

  _clearHoverPreview() {
    if (this.hoverPreview) {
      this.scene.remove(this.hoverPreview.mesh);
      this.hoverPreview.alive = false;
      this.hoverPreview = null;
      this.hoverTile = null;
    }
  }

  toggleShovel() {
    this._clearHoverPreview();
    this._deselectPlant();
    this.shovelMode = !this.shovelMode;
    const btn = document.getElementById('shovel-btn');
    if (this.shovelMode) {
      btn.style.borderColor = '#ffdd00';
      btn.style.boxShadow = '0 0 16px rgba(255,221,0,0.5), 0 4px 12px rgba(0,0,0,0.4)';
    } else {
      btn.style.borderColor = 'rgba(255,255,255,0.15)';
      btn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)';
    }
  }

  _deselectShovel() {
    this.shovelMode = false;
    const btn = document.getElementById('shovel-btn');
    if (btn) {
      btn.style.borderColor = 'rgba(255,255,255,0.15)';
      btn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)';
    }
  }

  selectPlant(type) {
    this._clearHoverPreview();
    this._deselectShovel();
    if (this.selectedPlant === type) {
      this._deselectPlant();
      return;
    }
    if (!this.sandboxMode && this.plantCooldownTimers[type] > 0) return;
    if (!this.sandboxMode && this.sun < this.plantCosts[type]) return;
    this.selectedPlant = type;
    document.querySelectorAll('.plant-btn').forEach(b => b.classList.remove('selected'));
    document.querySelector(`[data-plant="${type}"]`).classList.add('selected');
  }

  startLevel(lvl) {
    this.level = Math.max(1, Math.min(10, lvl));
    this.sandboxMode = false;
    this._applyLevelConfig();
    this._setupWaveBar();
    const levelLabel = document.getElementById('wave-level-label');
    if (levelLabel) levelLabel.textContent = 'Level ' + this.level;
    const fillEl = document.getElementById('wave-bar-fill');
    if (fillEl) fillEl.style.width = '0%';
    const headEl = document.getElementById('wave-head');
    if (headEl) headEl.style.left = '100%';
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('start-wave-btn').style.display = 'none';
    document.getElementById('wave-bar-container').style.display = 'flex';
    this._applyInitialCooldowns();
    this._playReadySetPlant();
  }

  startGame() {
    this.sandboxMode = false;
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('start-wave-btn').style.display = 'none';
    document.getElementById('wave-bar-container').style.display = 'flex';
    this._applyInitialCooldowns();
    this._playReadySetPlant();
  }

  startSandbox() {
    this.sandboxMode = true;
    this.sun = 99999;
    document.getElementById('sun-amount').textContent = '∞';
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('wave-bar-container').style.display = 'none';
    document.getElementById('start-wave-btn').style.display = 'block';
    // No cooldowns in sandbox
    for (const type in this.plantCooldownTimers) this.plantCooldownTimers[type] = 0;
    this.isRunning = true;
  }

  startSandboxWave() {
    if (!this.sandboxMode || !this.isRunning) return;
    this._showWaveAnnouncement('A huge wave of\nzombies is approaching!');
    const count = 10 + Math.floor(Math.random() * 8);
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        if (!this.isRunning) return;
        const row = Math.floor(Math.random() * 5);
        const x = 10 + Math.random() * 3;
        const roll = Math.random();
        let type = 'normal';
        if (roll < 0.15) type = 'buckethead';
        else if (roll < 0.4) type = 'conehead';
        const z = new Zombie(this.scene, row, x, type);
        z.baseSpeed = 0.35 + Math.random() * 0.2;
        z.speed = z.baseSpeed;
        this.zombies.push(z);
        this.entities.push(z);
      }, i * (400 + Math.random() * 400));
    }
  }

  _playReadySetPlant() {
    const overlay = document.createElement('div');
    overlay.id = 'rsp-overlay';
    overlay.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:100;';
    const text = document.createElement('div');
    text.style.cssText = 'font-family:Fredoka,Arial,sans-serif;font-weight:500;font-size:80px;color:#ff2222;text-shadow:4px 4px 8px rgba(0,0,0,0.8),-2px -2px 4px rgba(100,0,0,0.5);transform:scale(0);transition:transform 0.4s cubic-bezier(0.17,0.67,0.3,1.3),opacity 0.3s;opacity:1;';
    overlay.appendChild(text);
    document.getElementById('ui-layer').appendChild(overlay);

    const words = ['Ready...', 'Set...', 'PLANT!'];
    let i = 0;
    const showNext = () => {
      if (i >= words.length) {
        text.style.opacity = '0';
        setTimeout(() => { overlay.remove(); this.isRunning = true; }, 300);
        return;
      }
      text.textContent = words[i];
      text.style.transform = 'scale(0)';
      requestAnimationFrame(() => { text.style.transform = 'scale(1)'; });
      i++;
      setTimeout(() => {
        text.style.transform = 'scale(1.3)';
        text.style.opacity = '0.5';
        setTimeout(() => { text.style.opacity = '1'; showNext(); }, 200);
      }, 600);
    };
    showNext();
  }

  getTile(row, col) {
    return this.tiles.find(t => t.row === row && t.col === col);
  }

  onClick(e) {
    if (!this.isRunning) return;
    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Check sun clicks first
    const sunMeshes = this.suns.filter(s => s.alive && !s.collected).map(s => s.mesh).filter(m => m);
    const sunHits = this.raycaster.intersectObjects(sunMeshes, true);
    if (sunHits.length > 0) {
      const sunObj = this.suns.find(s => s.mesh && (s.mesh === sunHits[0].object || s.mesh === sunHits[0].object.parent));
      if (sunObj) { sunObj.collect(); return; }
    }

    // Shovel mode: remove plant from clicked tile
    if (this.shovelMode) {
      const tileMeshes = this.tiles.map(t => t.mesh).filter(m => m);
      const hits = this.raycaster.intersectObjects(tileMeshes);
      if (hits.length > 0) {
        const tile = this.tiles.find(t => t.mesh === hits[0].object);
        if (tile && tile.plant && tile.plant.alive) {
          tile.plant.destroy();
          tile.plant = null;
          this._deselectShovel();
        }
      }
      return;
    }

    // Check tile clicks
    if (!this.selectedPlant) return;
    if (this.plantCooldownTimers[this.selectedPlant] > 0) return;
    const tileMeshes = this.tiles.map(t => t.mesh).filter(m => m);
    const hits = this.raycaster.intersectObjects(tileMeshes);
    if (hits.length > 0) {
      const tile = this.tiles.find(t => t.mesh === hits[0].object);
      if (tile && !tile.plant) {
        const cost = this.plantCosts[this.selectedPlant];
        if (this.sun >= cost && this.plantCooldownTimers[this.selectedPlant] <= 0) {
          if (!this.sandboxMode) this.sun -= cost;
          document.getElementById('sun-amount').textContent = this.sandboxMode ? '∞' : this.sun;
          const plantType = this.selectedPlant;
          const plant = new Plant(this.scene, plantType, tile.row, tile.col);
          tile.plant = plant;
          this.plants.push(plant);
          this.entities.push(plant);
          this.plantCooldownTimers[plantType] = this.sandboxMode ? 0 : this.plantCooldowns[plantType];
          this._updateCooldownUI(plantType);
          this._clearHoverPreview();
          if (!this.sandboxMode) this._deselectPlant();
        }
      }
      return;
    }
    // Clicked somewhere else with plant selected — deselect
    if (this.selectedPlant) {
      this._deselectPlant();
    }
  }

  _updateCooldownUI(type) {
    const btn = document.querySelector(`[data-plant="${type}"]`);
    if (!btn) return;
    let overlay = btn.querySelector('.cooldown-overlay');
    const remaining = this.plantCooldownTimers[type];
    const total = this.plantCooldowns[type];
    if (remaining <= 0) {
      if (overlay) overlay.remove();
      btn.style.pointerEvents = '';
      return;
    }
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'cooldown-overlay';
      overlay.style.cssText = 'position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.6);pointer-events:none;border-radius:0 0 7px 7px;transition:height 0.2s;';
      btn.style.position = 'relative';
      btn.appendChild(overlay);
    }
    const pct = (remaining / total) * 100;
    overlay.style.height = pct + '%';
  }

  _deselectPlant() {
    this._clearHoverPreview();
    this.selectedPlant = null;
    document.querySelectorAll('.plant-btn').forEach(b => b.classList.remove('selected'));
  }

  spawnZombie() {
    const row = Math.floor(Math.random() * 5);
    const x = 10 + Math.random() * 1;
    const cfg = this.levelConfigs[Math.min(this.level - 1, 9)];
    let type = 'normal';
    const spawnIndex = this.zombiesSpawned; // 0-based index of this spawn in current wave
    if (spawnIndex < 2) {
      // First 2 spawns are easy
      if (this.level >= 5 && spawnIndex === 1) {
        // Level 5+: second spawn is conehead or stronger
        if (this.level >= 8) type = 'buckethead';
        else type = 'conehead';
      } else {
        type = 'normal';
      }
    } else if (spawnIndex === 2) {
      // Third spawn still easy (normal)
      type = 'normal';
    } else {
      const roll = Math.random();
      if (roll < cfg.bucketChance) {
        type = 'buckethead';
      } else if (roll < cfg.bucketChance + cfg.coneChance) {
        type = 'conehead';
      }
    }
    const z = new Zombie(this.scene, row, x, type);
    // Scale speed slightly with level
    const speedBonus = (this.level - 1) * 0.03 + Math.max(0, this.wave - 2) * 0.02;
    z.baseSpeed = 0.4 + speedBonus;
    z.speed = z.baseSpeed;
    this.zombies.push(z);
    this.entities.push(z);
    this.zombiesSpawned++;
  }

  update() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    if (!this.isRunning) return;

    if (!this.sandboxMode) {
    // Spawn zombies
    this.spawnTimer += dt;
    const cfg = this.levelConfigs[Math.min(this.level - 1, 9)];
    const waveIdx = Math.min(this.wave - 1, cfg.spawnInterval.length - 1);
    const spawnInterval = this.flagsTriggered[0] ? Math.max(cfg.spawnInterval[waveIdx] * 0.7, 2) : cfg.spawnInterval[waveIdx];
    if (this.spawnTimer >= spawnInterval && this.zombiesSpawned < this.zombiesPerWave) {
      this.spawnTimer = 0;
      this.spawnZombie();
    }

    // Wave complete
    if (this.zombiesSpawned >= this.zombiesPerWave && this.zombies.every(z => !z.alive)) {
      if (this.wave >= this.wavesInLevel) {
        // Level complete!
        this.isRunning = false;
        this._showLevelComplete();
      } else {
        this.wave++;
        this.zombiesSpawned = 0;
        this.zombiesKilledInWave = 0;
        this.zombiesPerWave = cfg.baseZombies + this.wave + Math.floor((this.level - 1) * 1.2);
        this.spawnTimer = -3;
      }
    }

    // Smooth wave bar update
    this._updateWaveBarSmooth(dt);

    // Check flag triggers
    this._checkFlagTriggers();
    }

    // Drop sun from sky
    this.sunDropTimer -= dt;
    if (this.sunDropTimer <= 0) {
      this.sunDropTimer = 7 + Math.random() * 5;
      const x = -8 + Math.random() * 16;
      const z = -4 + Math.random() * 8;
      const sun = new Sun(this.scene, x, 10, z, false);
      this.suns.push(sun);
      this.entities.push(sun);
    }

    // Update plant button brightness based on affordability
    document.querySelectorAll('.plant-btn').forEach(btn => {
      const type = btn.dataset.plant;
      const canAfford = this.sandboxMode || (this.sun >= this.plantCosts[type] && this.plantCooldownTimers[type] <= 0);
      btn.style.filter = canAfford ? 'brightness(1.3)' : 'brightness(0.7)';
    });

    // Update plant cooldowns
    for (const type in this.plantCooldownTimers) {
      if (this.plantCooldownTimers[type] > 0) {
        this.plantCooldownTimers[type] -= dt;
        if (this.plantCooldownTimers[type] <= 0) {
          this.plantCooldownTimers[type] = 0;
        }
        this._updateCooldownUI(type);
      }
    }

    // Update ambient effects
    this._updateAmbientEffects(dt);

    // Update all entities
    for (const e of this.entities) {
      if (e.alive) e.update(dt);
    }

    // Check if zombies reached the house
    for (const z of this.zombies) {
      if (!z.alive) continue;
      if (z.position.x <= -8.9) {
        // Trigger lawn mower
        const lm = this.lawnMowers.find(l => l.alive && !l.triggered && l.row === z.row);
        if (lm) {
          lm.trigger();
        } else if (z.position.x <= -10.2) {
          this.gameOver();
          return;
        }
      }
    }

    // Cleanup dead
    this.entities = this.entities.filter(e => e.alive);
    this.zombies = this.zombies.filter(z => z.alive);
    this.projectiles = this.projectiles.filter(p => p.alive);
    this.suns = this.suns.filter(s => s.alive);
    this.plants = this.plants.filter(p => p.alive);
    this.lawnMowers = this.lawnMowers.filter(l => l.alive);
  }

  gameOver() {
    this.isRunning = false;
    // Render zombie image for game over screen
    const zombieImg = document.getElementById('gameover-zombie-img');
    if (this._gameoverZombieURL) {
      zombieImg.innerHTML = `<img src="${this._gameoverZombieURL}">`;
    } else {
      const size = 256;
      const iconRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      iconRenderer.setSize(size, size);
      const iconScene = new THREE.Scene();
      const iconCam = new THREE.PerspectiveCamera(35, 1, 0.1, 20);
      iconCam.position.set(0.6, 0.8, 3.2);
      iconCam.lookAt(0, 0.3, 0);
      iconScene.add(new THREE.AmbientLight(0xffffff, 0.7));
      const dl = new THREE.DirectionalLight(0xffffff, 1);
      dl.position.set(2, 4, 3);
      iconScene.add(dl);
      const tempZ = new Zombie(iconScene, 0, 0);
      tempZ.mesh.position.set(0, -0.25, 0);
      tempZ.mesh.rotation.set(0, -0.2, 0);
      tempZ._setOpacity(tempZ.mesh, 1);
      iconRenderer.render(iconScene, iconCam);
      this._gameoverZombieURL = iconRenderer.domElement.toDataURL();
      iconScene.remove(tempZ.mesh);
      iconRenderer.dispose();
      zombieImg.innerHTML = `<img src="${this._gameoverZombieURL}">`;
    }
    // Show stats
    const statsEl = document.getElementById('gameover-stats');
    const plantsAlive = this.plants.filter(p => p.alive).length;
    statsEl.innerHTML = `Level ${this.level}`;
    // Show with fresh animation
    const goEl = document.getElementById('game-over');
    goEl.style.display = 'none';
    void goEl.offsetWidth;
    goEl.style.display = 'flex';
  }

  restartLevel() {
    // Hide game over screen
    document.getElementById('game-over').style.display = 'none';
    // Remove all dynamic entities from scene
    for (const e of this.entities) {
      if (e.mesh) this.scene.remove(e.mesh);
    }
    // Also clean up zombies/plants/projectiles/suns that may have been removed from entities
    for (const z of this.zombies) { if (z.mesh) this.scene.remove(z.mesh); }
    for (const p of this.plants) { if (p.mesh) this.scene.remove(p.mesh); }
    for (const pr of this.projectiles) { if (pr.mesh) this.scene.remove(pr.mesh); }
    for (const s of this.suns) { if (s.mesh) this.scene.remove(s.mesh); }
    for (const lm of this.lawnMowers) { if (lm.mesh) this.scene.remove(lm.mesh); }
    // Clear arrays
    this.entities = [];
    this.zombies = [];
    this.plants = [];
    this.projectiles = [];
    this.suns = [];
    this.lawnMowers = [];
    // Recreate tiles
    this.tiles = [];
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 9; c++) {
        const tile = new Tile(this.scene, r, c);
        this.tiles.push(tile);
        this.entities.push(tile);
      }
    }
    // Recreate lawn mowers
    for (let r = 0; r < 5; r++) {
      const lm = new LawnMower(this.scene, r);
      this.lawnMowers.push(lm);
      this.entities.push(lm);
    }
    // Reset game state for current level
    this.sun = 50;
    document.getElementById('sun-amount').textContent = this.sun;
    this.selectedPlant = null;
    this.shovelMode = false;
    this.wave = 1;
    this.waveTimer = 0;
    this.zombiesSpawned = 0;
    this.zombiesPerWave = 3;
    this.spawnTimer = 0;
    this.sunDropTimer = 2;
    this.zombiesKilledInWave = 0;
    this.waveBarProgress = 0;
    this.flagsTriggered = [false, false];
    this._applyLevelConfig();
    for (const type in this.plantCooldownTimers) this.plantCooldownTimers[type] = 0;
    this._applyInitialCooldowns();
    this._setupWaveBar();
    this._deselectPlant();
    this._deselectShovel();
    this._clearHoverPreview();
    this.resetCamera();
    this.clock.getDelta(); // reset clock
    // Start with ready-set-plant
    this._playReadySetPlant();
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  getObjectAt(screenX, screenY) {
    const mouse = new THREE.Vector2(
      (screenX / window.innerWidth) * 2 - 1,
      -(screenY / window.innerHeight) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);
    const meshes = this.entities.map(e => e.mesh).filter(m => m);
    const intersects = raycaster.intersectObjects(meshes, true);
    if (intersects.length > 0) {
      return this.entities.find(e => e.mesh === intersects[0].object || e.mesh === intersects[0].object.parent);
    }
    return null;
  }

  onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  _createTrees() {
    const treeMat = (color, s) => new THREE.MeshPhongMaterial({ color, shininess: s || 20 });
    const makeTree = (x, z, scale) => {
      const s = scale || 1;
      const group = new THREE.Group();
      // Trunk
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15 * s, 0.22 * s, 1.8 * s, 8), treeMat(0x6B4226));
      trunk.position.y = 0.9 * s;
      group.add(trunk);
      // Foliage layers (3 stacked cones)
      const colors = [0x2D7A2D, 0x339933, 0x2A8A2A];
      for (let i = 0; i < 3; i++) {
        const foliage = new THREE.Mesh(new THREE.ConeGeometry((1.1 - i * 0.2) * s, (1.2 - i * 0.15) * s, 8), treeMat(colors[i], 15));
        foliage.position.y = (1.6 + i * 0.7) * s;
        foliage.castShadow = true;
        group.add(foliage);
      }
      group.position.set(x, 0, z);
      this.scene.add(group);
    };

    const rng = () => Math.random();

    // Trees along top edge (behind lawn) - only to the right of house
    for (let x = -9; x <= 13; x += 2.5 + rng() * 1.5) {
      makeTree(x + rng() * 0.8, -7 - rng() * 1.5, 0.7 + rng() * 0.6);
    }
    // Trees along bottom edge (in front of lawn) - only to the right of house
    for (let x = -9; x <= 13; x += 2.5 + rng() * 1.5) {
      makeTree(x + rng() * 0.8, 7 + rng() * 1.5, 0.7 + rng() * 0.6);
    }
    // Trees along right edge
    for (let z = -7; z <= 7; z += 2.5 + rng() * 1.5) {
      makeTree(13 + rng() * 1.5, z + rng() * 0.8, 0.7 + rng() * 0.6);
    }
  }

  _generatePlantIcons() {
    const types = ['peashooter', 'sunflower', 'wallnut', 'snowpea', 'repeater', 'potato_mine', 'chomper'];
    const size = 128;
    const iconRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    iconRenderer.setSize(size, size);
    const iconScene = new THREE.Scene();
    const iconCam = new THREE.PerspectiveCamera(40, 1, 0.1, 20);
    iconCam.position.set(-1.4, 0.5, 2.0);
    iconCam.lookAt(0, 0.2, 0);
    const amb = new THREE.AmbientLight(0xffffff, 0.8);
    iconScene.add(amb);
    const dl = new THREE.DirectionalLight(0xffffff, 1);
    dl.position.set(2, 4, 3);
    iconScene.add(dl);

    for (const type of types) {
      // Create a temporary plant to grab its mesh
      const tempPlant = new Plant(iconScene, type, 0, 0);
      // Center the mesh - adjust chomper to show full plant
      const yOff = type === 'sunflower' ? -0.15 : type === 'chomper' ? -0.15 : type === 'wallnut' ? -0.1 : 0;
      tempPlant.mesh.position.set(0, yOff, 0);
      tempPlant.mesh.rotation.set(0, 0, 0);
      // Zoom out camera for chomper to avoid top cutoff
      if (type === 'chomper') {
        iconCam.position.set(-1.4, 0.6, 1.9);
        iconCam.lookAt(0, 0.25, 0);
      } else {
        iconCam.position.set(-1.4, 0.5, 2.0);
        iconCam.lookAt(0, 0.2, 0);
      }
      iconRenderer.render(iconScene, iconCam);
      const dataURL = iconRenderer.domElement.toDataURL();
      // Remove temp plant from icon scene
      iconScene.remove(tempPlant.mesh);

      // Update button
      const btn = document.querySelector(`[data-plant="${type}"]`);
      if (btn) {
        const label = btn.innerHTML.split('<br>');
        const imgH = 52;
        const imgStyle = 'width:38px;height:' + imgH + 'px;display:block;margin:0 auto;position:relative;z-index:10;object-fit:contain;';
        btn.innerHTML = `<div style="height:${imgH}px;display:flex;align-items:flex-end;justify-content:center;flex:1;"><img src="${dataURL}" style="${imgStyle}"></div><div style="background:rgba(200,240,200,0.85);margin:2px -6px -4px -6px;padding:2px 2px;border-radius:0 0 7px 7px;"><span style="display:inline-flex;align-items:center;justify-content:center;line-height:1;font-size:13px;color:#222;">${label[2]}</span></div>`;
      }
    }
    iconRenderer.dispose();
  }

  _generateSunIcon() {
    const size = 256;
    const iconRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    iconRenderer.setSize(size, size);
    iconRenderer.setPixelRatio(1);
    const iconScene = new THREE.Scene();
    const iconCam = new THREE.PerspectiveCamera(40, 1, 0.1, 20);
    iconCam.position.set(0, 0, 2.5);
    iconCam.lookAt(0, 0, 0);
    const amb = new THREE.AmbientLight(0xffffff, 0.8);
    iconScene.add(amb);
    const dl = new THREE.DirectionalLight(0xffffff, 1);
    dl.position.set(2, 4, 3);
    iconScene.add(dl);
    const tempSun = new Sun(iconScene, 0, 0, 0, false);
    tempSun.mesh.position.set(0, 0, 0);
    tempSun.mesh.rotation.set(0, 0, 0);
    iconRenderer.render(iconScene, iconCam);
    this._sunDataURL = iconRenderer.domElement.toDataURL();
    const canvas = document.getElementById('sun-icon');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => { ctx.drawImage(img, 0, 0, 128, 128); };
    img.src = this._sunDataURL;
    iconScene.remove(tempSun.mesh);
    iconRenderer.dispose();
    // Replace ☀️ emojis in plant buttons with sun icon
    document.querySelectorAll('.plant-btn').forEach(btn => {
      btn.innerHTML = btn.innerHTML.replace(/☀️/g, `<img src="${this._sunDataURL}" style="width:22px;height:22px;vertical-align:middle;margin-left:2px;">`);
    });
  }

  _generateZombieHeadIcon() {
    const size = 64;
    const iconRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    iconRenderer.setSize(size, size);
    const iconScene = new THREE.Scene();
    const iconCam = new THREE.PerspectiveCamera(40, 1, 0.1, 20);
    iconCam.position.set(0, 0.1, 1.5);
    iconCam.lookAt(0, 0.1, 0);
    const amb = new THREE.AmbientLight(0xffffff, 0.8);
    iconScene.add(amb);
    const dl = new THREE.DirectionalLight(0xffffff, 1);
    dl.position.set(2, 4, 3);
    iconScene.add(dl);
    // Create a temp zombie and extract just the head
    const tempZ = new Zombie(iconScene, 0, 0);
    // Hide everything except head (child 1)
    for (let i = 0; i < tempZ.mesh.children.length; i++) {
      if (i !== 1) tempZ.mesh.children[i].visible = false;
    }
    tempZ.mesh.position.set(0, -0.55, 0);
    tempZ.mesh.rotation.set(0, -Math.PI / 4, 0);
    // Force full opacity
    tempZ._setOpacity(tempZ.mesh, 1);
    iconRenderer.render(iconScene, iconCam);
    this._zombieHeadDataURL = iconRenderer.domElement.toDataURL();
    iconScene.remove(tempZ.mesh);
    iconRenderer.dispose();
    // Set the wave-head to use the rendered image
    const headEl = document.getElementById('wave-head');
    headEl.innerHTML = `<img src="${this._zombieHeadDataURL}" style="width:36px;height:36px;">`;
  }

  _generateStartScreenCharacters() {
    const size = 256;
    const iconRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    iconRenderer.setSize(size, size);
    const iconScene = new THREE.Scene();
    const iconCam = new THREE.PerspectiveCamera(35, 1, 0.1, 20);
    const amb = new THREE.AmbientLight(0xffffff, 0.8);
    iconScene.add(amb);
    const dl = new THREE.DirectionalLight(0xffffff, 1);
    dl.position.set(2, 4, 3);
    iconScene.add(dl);

    // Render peashooter
    const tempPlant = new Plant(iconScene, 'peashooter', 0, 0);
    tempPlant.mesh.position.set(0, -0.15, 0);
    tempPlant.mesh.rotation.set(0, 0.3, 0);
    iconCam.position.set(-1.2, 0.7, 3.5);
    iconCam.lookAt(0, 0.35, 0);
    iconRenderer.render(iconScene, iconCam);
    const peaURL = iconRenderer.domElement.toDataURL();
    iconScene.remove(tempPlant.mesh);

    // Render zombie
    const tempZ = new Zombie(iconScene, 0, 0);
    tempZ.mesh.position.set(0, -0.25, 0);
    tempZ.mesh.rotation.set(0, -0.3, 0);
    tempZ._setOpacity(tempZ.mesh, 1);
    iconCam.position.set(1.0, 0.7, 3.5);
    iconCam.lookAt(0, 0.35, 0);
    iconRenderer.render(iconScene, iconCam);
    const zombieURL = iconRenderer.domElement.toDataURL();
    iconScene.remove(tempZ.mesh);
    iconRenderer.dispose();

    const peaImg = document.getElementById('start-peashooter');
    const zImg = document.getElementById('start-zombie');
    if (peaImg) peaImg.src = peaURL;
    if (zImg) zImg.src = zombieURL;
  }

  _drawShovelIcon() {
    const canvas = document.getElementById('shovel-icon');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Draw an angled shovel (~25 degrees tilted right)
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(0.45 + Math.PI); // point bottom-left
    ctx.translate(-w / 2, -h / 2);

    const cx = w / 2;
    const padTop = 6;
    const padBot = 8;

    // === BLADE (spade shape at top) ===
    const bladeTop = padTop;
    const bladeBot = padTop + 24;
    const bladeGrad = ctx.createLinearGradient(0, bladeTop, 0, bladeBot);
    bladeGrad.addColorStop(0, '#999999');
    bladeGrad.addColorStop(0.15, '#DDDDDD');
    bladeGrad.addColorStop(0.5, '#BBBBBB');
    bladeGrad.addColorStop(1, '#888888');
    ctx.fillStyle = bladeGrad;
    ctx.beginPath();
    ctx.moveTo(cx, bladeTop);  // pointed tip
    ctx.bezierCurveTo(cx + 6, bladeTop + 2, cx + 14, bladeTop + 8, cx + 14, bladeTop + 14);
    ctx.lineTo(cx + 12, bladeBot);
    ctx.lineTo(cx - 12, bladeBot);
    ctx.lineTo(cx - 14, bladeTop + 14);
    ctx.bezierCurveTo(cx - 14, bladeTop + 8, cx - 6, bladeTop + 2, cx, bladeTop);
    ctx.closePath();
    ctx.fill();

    // Blade edge highlight
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx - 13, bladeTop + 12);
    ctx.bezierCurveTo(cx - 13, bladeTop + 7, cx - 5, bladeTop + 1, cx, bladeTop);
    ctx.bezierCurveTo(cx + 5, bladeTop + 1, cx + 13, bladeTop + 7, cx + 13, bladeTop + 12);
    ctx.stroke();

    // Blade center ridge
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, bladeTop + 3);
    ctx.lineTo(cx, bladeBot - 2);
    ctx.stroke();

    // Blade shadow at bottom
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.moveTo(cx - 12, bladeBot);
    ctx.lineTo(cx + 12, bladeBot);
    ctx.lineTo(cx + 11, bladeBot - 3);
    ctx.lineTo(cx - 11, bladeBot - 3);
    ctx.closePath();
    ctx.fill();

    // === COLLAR (metal socket) ===
    const collarTop = bladeBot;
    const collarBot = collarTop + 5;
    const collarGrad = ctx.createLinearGradient(0, collarTop, 0, collarBot);
    collarGrad.addColorStop(0, '#777777');
    collarGrad.addColorStop(0.5, '#999999');
    collarGrad.addColorStop(1, '#666666');
    ctx.fillStyle = collarGrad;
    ctx.beginPath();
    ctx.moveTo(cx - 6, collarTop);
    ctx.lineTo(cx + 6, collarTop);
    ctx.lineTo(cx + 5, collarBot);
    ctx.lineTo(cx - 5, collarBot);
    ctx.closePath();
    ctx.fill();
    // Rivet dots
    ctx.fillStyle = '#AAAAAA';
    ctx.beginPath();
    ctx.arc(cx - 3, collarTop + 2.5, 1, 0, Math.PI * 2);
    ctx.arc(cx + 3, collarTop + 2.5, 1, 0, Math.PI * 2);
    ctx.fill();

    // === WOODEN SHAFT ===
    const shaftTop = collarBot;
    const shaftBot = h - padBot - 8;
    const shaftW = 4;
    const shaftGrad = ctx.createLinearGradient(cx - shaftW, 0, cx + shaftW, 0);
    shaftGrad.addColorStop(0, '#7A5518');
    shaftGrad.addColorStop(0.25, '#B8892E');
    shaftGrad.addColorStop(0.5, '#D4A843');
    shaftGrad.addColorStop(0.75, '#B8892E');
    shaftGrad.addColorStop(1, '#7A5518');
    ctx.fillStyle = shaftGrad;
    ctx.beginPath();
    ctx.roundRect(cx - shaftW, shaftTop, shaftW * 2, shaftBot - shaftTop, 2);
    ctx.fill();

    // Wood grain lines
    ctx.strokeStyle = 'rgba(90,55,10,0.25)';
    ctx.lineWidth = 0.6;
    for (let y = shaftTop + 4; y < shaftBot - 2; y += 6) {
      ctx.beginPath();
      ctx.moveTo(cx - shaftW + 1, y);
      ctx.lineTo(cx + shaftW - 1, y + 1);
      ctx.stroke();
    }

    // === T-GRIP HANDLE ===
    const gripY = shaftBot;
    const gripH = 6;
    const gripW = 11;
    const gripGrad = ctx.createLinearGradient(0, gripY, 0, gripY + gripH);
    gripGrad.addColorStop(0, '#8B6520');
    gripGrad.addColorStop(0.5, '#C49838');
    gripGrad.addColorStop(1, '#7A5518');
    ctx.fillStyle = gripGrad;
    ctx.beginPath();
    ctx.roundRect(cx - gripW, gripY, gripW * 2, gripH, 3);
    ctx.fill();

    // Grip highlight
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.roundRect(cx - gripW + 2, gripY + 1, gripW * 2 - 4, 2, 1);
    ctx.fill();

    ctx.restore();
  }

  _setupWaveBar() {
    const flagsEl = document.getElementById('wave-flags');
    flagsEl.innerHTML = '';
    this.flagsTriggered = [false, false];
    const flagPositions = this.flagPositions;
    for (const pct of flagPositions) {
      const flag = document.createElement('div');
      flag.className = 'wave-flag';
      flag.style.left = (100 - pct) + '%';
      // Draw a simple flag: pole + triangular flag
      flag.innerHTML = `<svg width="18" height="24" viewBox="0 0 18 24" style="display:block;">
        <line x1="3" y1="2" x2="3" y2="23" stroke="#5a3a1a" stroke-width="2" stroke-linecap="round"/>
        <polygon points="4,2 17,6 4,10" fill="#cc2222" stroke="#991111" stroke-width="0.5"/>
        <circle cx="3" cy="2" r="1.5" fill="#daa520"/>
      </svg>`;
      flagsEl.appendChild(flag);
    }
  }

  _checkFlagTriggers() {
    const progressPct = this.waveBarProgress * 100;
    for (let i = 0; i < this.flagPositions.length; i++) {
      if (!this.flagsTriggered[i] && progressPct >= this.flagPositions[i] - 2) {
        this.flagsTriggered[i] = true;
        const isFinal = (i === this.flagPositions.length - 1);
        this._showWaveAnnouncement(isFinal ? 'FINAL WAVE!' : 'A huge wave of\nzombies is approaching!');
        // Spawn a burst of zombies
        const cfg = this.levelConfigs[Math.min(this.level - 1, 9)];
        const burstCount = isFinal ? cfg.burstFinal : cfg.burstNormal;
        for (let j = 0; j < burstCount; j++) {
          setTimeout(() => {
            if (this.isRunning) this._spawnBurstZombie(isFinal);
          }, j * 800);
        }
      }
    }
  }

  _spawnBurstZombie(isFinal) {
    const row = Math.floor(Math.random() * 5);
    const x = 10 + Math.random() * 3;
    const cfg = this.levelConfigs[Math.min(this.level - 1, 9)];
    let type = 'normal';
    const roll = Math.random();
    const burstCone = isFinal ? cfg.coneChance * 1.5 : cfg.coneChance;
    const burstBucket = isFinal ? cfg.bucketChance * 1.5 : cfg.bucketChance;
    if (roll < burstBucket) type = 'buckethead';
    else if (roll < burstBucket + burstCone) type = 'conehead';
    const z = new Zombie(this.scene, row, x, type);
    const speedBonus = (this.level - 1) * 0.03;
    z.baseSpeed = 0.4 + speedBonus;
    z.speed = z.baseSpeed;
    this.zombies.push(z);
    this.entities.push(z);
  }

  _showWaveAnnouncement(text) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:100;';
    const msg = document.createElement('div');
    msg.innerHTML = text.replace('\n', '<br>');
    const color = text.includes('FINAL') ? '#ff2222' : '#ff6600';
    msg.style.cssText = `font-family:Fredoka,Arial,sans-serif;font-weight:700;font-size:48px;color:${color};text-shadow:3px 3px 6px rgba(0,0,0,0.8),-1px -1px 3px rgba(0,0,0,0.5);transform:scale(0);transition:transform 0.5s cubic-bezier(0.17,0.67,0.3,1.3),opacity 0.8s;opacity:1;text-align:center;line-height:1.2;`;
    overlay.appendChild(msg);
    document.getElementById('ui-layer').appendChild(overlay);
    requestAnimationFrame(() => { msg.style.transform = 'scale(1)'; });
    setTimeout(() => {
      msg.style.opacity = '0';
      msg.style.transform = 'scale(1.2)';
      setTimeout(() => overlay.remove(), 1000);
    }, 4000);
  }

  _updateWaveBarSmooth(dt) {
    // Progress within current level
    const spawnInterval = this.wave <= 1 ? 12 : this.wave <= 2 ? 8 : this.wave <= 3 ? 6 : this.wave <= 5 ? 4 : 3;
    const waveDuration = this.zombiesPerWave * spawnInterval;
    const timeElapsed = this.zombiesSpawned * spawnInterval + Math.max(0, this.spawnTimer);
    const waveProgress = waveDuration > 0 ? Math.min(1, timeElapsed / waveDuration) : 0;
    
    let targetProgress = ((this.wave - 1) + waveProgress) / this.wavesInLevel;
    targetProgress = Math.min(targetProgress, 1);
    
    // Never go backwards
    if (targetProgress < this.waveBarProgress) {
      targetProgress = this.waveBarProgress;
    }
    
    // Smoothly lerp toward target
    this.waveBarProgress += (targetProgress - this.waveBarProgress) * Math.min(1, dt * 3);
    
    const fillEl = document.getElementById('wave-bar-fill');
    const headEl = document.getElementById('wave-head');
    const leftLabel = document.getElementById('wave-label-left');
    fillEl.style.width = (this.waveBarProgress * 100) + '%';
    const headPct = 100 - this.waveBarProgress * 100;
    headEl.style.left = headPct + '%';

    // Update level label
    const levelLabel = document.getElementById('wave-level-label');
    if (levelLabel) levelLabel.textContent = 'Level ' + this.level;
    // Hide labels
    const rightLabel = document.getElementById('wave-label-right');
    if (rightLabel) rightLabel.textContent = '';
  }

  _updateAmbientEffects(dt) {
    // Animate clouds
    if (this._clouds) {
      for (const c of this._clouds) {
        c.mesh.position.x += c.speed * dt;
        if (c.mesh.position.x > 80) c.mesh.position.x = -80;
      }
    }
    // Animate grass blades swaying
    if (this._grassBlades) {
      for (const g of this._grassBlades) {
        g.phase += dt * g.speed;
        g.mesh.rotation.x = Math.sin(g.phase) * 0.15;
        g.mesh.rotation.z = Math.cos(g.phase * 0.7) * 0.08;
      }
    }
    // Animate butterflies
    if (this._butterflies) {
      for (const b of this._butterflies) {
        b.phase += dt * 1.5;
        b.mesh.position.x = b.cx + Math.sin(b.phase) * b.radius;
        b.mesh.position.z = b.cz + Math.cos(b.phase * 0.7) * b.radius;
        b.mesh.position.y = 1.5 + Math.sin(b.phase * 2) * 0.5;
        // Wing flapping
        const flap = Math.sin(b.phase * 12) * 0.8;
        b.wingL.rotation.y = flap;
        b.wingR.rotation.y = -flap;
        b.mesh.rotation.y = b.phase;
      }
    }
    // Animate sky sun rays
    if (this._skySunGroup) {
      this._skySunGroup.rotation.z += dt * 0.08;
      // Pulse glow
      const pulse = 1 + Math.sin(Date.now() * 0.001) * 0.08;
      this._skySunGroup.children[1].scale.setScalar(pulse);
      this._skySunGroup.children[2].scale.setScalar(pulse * 1.05);
    }
    // Animate dust/pollen
    if (this._dustParticles) {
      this._dustTime += dt;
      const pos = this._dustParticles.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i);
        y += dt * 0.2;
        if (y > 6) y = 0.5;
        pos.setY(i, y);
        pos.setX(i, pos.getX(i) + Math.sin(this._dustTime + i) * dt * 0.1);
      }
      pos.needsUpdate = true;
    }
  }

  _applyInitialCooldowns() {
    for (const type in this.plantCooldownTimers) {
      if (type !== 'sunflower') {
        this.plantCooldownTimers[type] = this.plantCooldowns[type];
        this._updateCooldownUI(type);
      }
    }
  }

  _applyLevelConfig() {
    const cfg = this.levelConfigs[Math.min(this.level - 1, 9)];
    this.wavesInLevel = cfg.waves;
    this.zombiesPerWave = cfg.baseZombies + 1 + Math.floor((this.level - 1) * 1.2);
  }

  _showLevelComplete() {
    const isLastLevel = this.level >= 10;
    const overlay = document.createElement('div');
    overlay.id = 'level-complete';
    overlay.style.cssText = 'pointer-events:auto;position:absolute;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:radial-gradient(ellipse at center,rgba(0,30,0,0.7) 0%,rgba(0,0,0,0.92) 100%);z-index:50;animation:gameoverBgFade 0.8s ease forwards;';
    const inner = document.createElement('div');
    inner.style.cssText = 'background:linear-gradient(165deg,rgba(20,60,20,0.97) 0%,rgba(10,35,10,0.98) 50%,rgba(15,25,10,0.98) 100%);border-radius:24px;padding:32px 44px 36px;text-align:center;box-shadow:0 0 100px rgba(60,180,60,0.3),0 0 0 1px rgba(100,255,100,0.15),inset 0 1px 0 rgba(255,255,255,0.08);max-width:420px;width:90%;overflow:hidden;animation:gameoverSlideIn 0.6s cubic-bezier(0.17,0.67,0.3,1.15) forwards;transform:translateY(40px);opacity:0;';

    const trophy = document.createElement('div');
    trophy.style.cssText = 'font-size:72px;margin-bottom:8px;animation:gameoverZombieBob 2s ease-in-out infinite;';
    if (isLastLevel) {
      trophy.textContent = '🏆';
    } else {
      // Use peashooter image
      const peaIcon = document.querySelector('[data-plant="peashooter"] img');
      if (peaIcon) {
        trophy.innerHTML = `<img src="${peaIcon.src}" style="width:72px;height:72px;">`;
      } else {
        trophy.textContent = '🌱';
      }
    }
    inner.appendChild(trophy);

    const title = document.createElement('h1');
    title.style.cssText = 'font-size:36px;font-weight:600;color:#44DD44;text-shadow:0 0 30px rgba(60,200,60,0.6),0 2px 4px rgba(0,0,0,0.8);margin:0 0 10px;letter-spacing:3px;';
    title.textContent = isLastLevel ? 'YOU WIN!' : 'LEVEL COMPLETE!';
    inner.appendChild(title);

    const divider = document.createElement('div');
    divider.style.cssText = 'width:80px;height:2px;background:linear-gradient(90deg,transparent,rgba(100,255,100,0.6),transparent);margin:0 auto 14px;';
    inner.appendChild(divider);

    const desc = document.createElement('p');
    desc.style.cssText = 'color:rgba(255,255,255,0.6);font-size:15px;margin:0 0 6px;font-weight:400;line-height:1.5;';
    desc.textContent = isLastLevel ? 'You defended your lawn against all 10 levels!' : `Level ${this.level} cleared!`;
    inner.appendChild(desc);

    const stats = document.createElement('div');
    stats.style.cssText = 'color:rgba(200,255,200,0.7);font-size:13px;margin:0 0 22px;font-weight:400;';
    const plantsAlive = this.plants.filter(p => p.alive).length;
    stats.textContent = `Plants surviving: ${plantsAlive}`;
    inner.appendChild(stats);

    if (!isLastLevel) {
      const nextBtn = document.createElement('button');
      nextBtn.style.cssText = 'display:block;width:100%;font-size:19px;padding:14px 0;background:linear-gradient(180deg,#44BB44 0%,#228822 100%);color:white;border:none;border-radius:50px;cursor:pointer;font-family:Fredoka,Arial,sans-serif;font-weight:600;letter-spacing:3px;box-shadow:0 4px 24px rgba(60,180,60,0.5),inset 0 1px 0 rgba(255,255,255,0.18);transition:all 0.2s ease;margin-bottom:10px;';
      nextBtn.textContent = `NEXT LEVEL (${this.level + 1})`;
      nextBtn.onmouseenter = () => { nextBtn.style.background = 'linear-gradient(180deg,#55CC55 0%,#33AA33 100%)'; nextBtn.style.transform = 'translateY(-2px)'; };
      nextBtn.onmouseleave = () => { nextBtn.style.background = 'linear-gradient(180deg,#44BB44 0%,#228822 100%)'; nextBtn.style.transform = ''; };
      nextBtn.onclick = () => { overlay.remove(); this.nextLevel(); };
      inner.appendChild(nextBtn);
    }

    const menuBtn = document.createElement('button');
    menuBtn.style.cssText = 'display:block;width:100%;font-size:14px;padding:10px 0;background:transparent;color:rgba(255,255,255,0.45);border:2px solid rgba(255,255,255,0.15);border-radius:50px;cursor:pointer;font-family:Fredoka,Arial,sans-serif;font-weight:500;letter-spacing:2px;transition:all 0.2s ease;';
    menuBtn.textContent = isLastLevel ? 'PLAY AGAIN' : 'MAIN MENU';
    menuBtn.onclick = () => { overlay.remove(); this.returnToMenu(); };
    inner.appendChild(menuBtn);

    overlay.appendChild(inner);
    document.getElementById('ui-layer').appendChild(overlay);
  }

  nextLevel() {
    this.level++;
    // Remove all dynamic entities from scene
    for (const e of this.entities) { if (e.mesh) this.scene.remove(e.mesh); }
    for (const z of this.zombies) { if (z.mesh) this.scene.remove(z.mesh); }
    for (const p of this.plants) { if (p.mesh) this.scene.remove(p.mesh); }
    for (const pr of this.projectiles) { if (pr.mesh) this.scene.remove(pr.mesh); }
    for (const s of this.suns) { if (s.mesh) this.scene.remove(s.mesh); }
    for (const lm of this.lawnMowers) { if (lm.mesh) this.scene.remove(lm.mesh); }
    this.entities = [];
    this.zombies = [];
    this.plants = [];
    this.projectiles = [];
    this.suns = [];
    this.lawnMowers = [];
    this.tiles = [];
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 9; c++) {
        const tile = new Tile(this.scene, r, c);
        this.tiles.push(tile);
        this.entities.push(tile);
      }
    }
    for (let r = 0; r < 5; r++) {
      const lm = new LawnMower(this.scene, r);
      this.lawnMowers.push(lm);
      this.entities.push(lm);
    }
    this.sun = 50;
    document.getElementById('sun-amount').textContent = this.sun;
    this.selectedPlant = null;
    this.shovelMode = false;
    this.wave = 1;
    this.waveTimer = 0;
    this.zombiesSpawned = 0;
    this.spawnTimer = 0;
    this.sunDropTimer = 2;
    this.zombiesKilledInWave = 0;
    this.waveBarProgress = 0;
    this.flagsTriggered = [false, false];
    this._applyLevelConfig();
    for (const type in this.plantCooldownTimers) this.plantCooldownTimers[type] = 0;
    this._applyInitialCooldowns();
    this._setupWaveBar();
    // Immediately update level label and progress bar
    const levelLabel = document.getElementById('wave-level-label');
    if (levelLabel) levelLabel.textContent = 'Level ' + this.level;
    const fillEl = document.getElementById('wave-bar-fill');
    if (fillEl) fillEl.style.width = '0%';
    const headEl = document.getElementById('wave-head');
    if (headEl) headEl.style.left = '100%';
    this._deselectPlant();
    this._deselectShovel();
    this._clearHoverPreview();
    this.resetCamera();
    this.clock.getDelta();
    this._playReadySetPlant();
  }

  returnToMenu() {
    this.isRunning = false;
    // Remove all dynamic entities from scene
    for (const e of this.entities) { if (e.mesh) this.scene.remove(e.mesh); }
    for (const z of this.zombies) { if (z.mesh) this.scene.remove(z.mesh); }
    for (const p of this.plants) { if (p.mesh) this.scene.remove(p.mesh); }
    for (const pr of this.projectiles) { if (pr.mesh) this.scene.remove(pr.mesh); }
    for (const s of this.suns) { if (s.mesh) this.scene.remove(s.mesh); }
    for (const lm of this.lawnMowers) { if (lm.mesh) this.scene.remove(lm.mesh); }
    this.entities = [];
    this.zombies = [];
    this.plants = [];
    this.projectiles = [];
    this.suns = [];
    this.lawnMowers = [];
    this.tiles = [];
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 9; c++) {
        const tile = new Tile(this.scene, r, c);
        this.tiles.push(tile);
        this.entities.push(tile);
      }
    }
    for (let r = 0; r < 5; r++) {
      const lm = new LawnMower(this.scene, r);
      this.lawnMowers.push(lm);
      this.entities.push(lm);
    }
    this.level = 1;
    this.sun = 50;
    document.getElementById('sun-amount').textContent = this.sun;
    this.selectedPlant = null;
    this.shovelMode = false;
    this.wave = 1;
    this.waveTimer = 0;
    this.zombiesSpawned = 0;
    this.spawnTimer = 0;
    this.sunDropTimer = 2;
    this.zombiesKilledInWave = 0;
    this.waveBarProgress = 0;
    this.flagsTriggered = [false, false];
    this._applyLevelConfig();
    for (const type in this.plantCooldownTimers) this.plantCooldownTimers[type] = 0;
    this._setupWaveBar();
    const levelLabel = document.getElementById('wave-level-label');
    if (levelLabel) levelLabel.textContent = 'Level 1';
    const fillEl = document.getElementById('wave-bar-fill');
    if (fillEl) fillEl.style.width = '0%';
    const headEl = document.getElementById('wave-head');
    if (headEl) headEl.style.left = '100%';
    this._deselectPlant();
    this._deselectShovel();
    this._clearHoverPreview();
    this.resetCamera();
    this.clock.getDelta();
    // Remove any lingering overlays
    const lc = document.getElementById('level-complete');
    if (lc) lc.remove();
    document.getElementById('game-over').style.display = 'none';
    document.getElementById('start-wave-btn').style.display = 'none';
    document.getElementById('wave-bar-container').style.display = 'flex';
    this.sandboxMode = false;
    // Show start screen
    document.getElementById('start-screen').style.display = 'flex';
  }

  resetCamera() {
    this.cameraTarget.set(0, 0, 0);
    this.camera.position.set(-2, 14, 16);
    this.camera.lookAt(0, 0, 0);
    this.cameraSpherical.setFromVector3(this.camera.position.clone().sub(this.cameraTarget));
  }

  start() {
    const loop = () => {
      requestAnimationFrame(loop);
      this.update();
      this.render();
    };
    loop();
  }
}
