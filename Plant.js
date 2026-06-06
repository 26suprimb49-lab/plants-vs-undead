class Plant extends GameObject3D {
  constructor(scene, type, row, col) {
    super(scene);
    this.name = 'Plant';
    this.type = type;
    this.row = row;
    this.col = col;
    this.hp = type === 'wallnut' ? 1800 : 200;
    this.repeaterSecondShot = 0;
    this.mineArmed = false;
    this.mineArmTimer = 0;
    this.chomperState = 'idle'; // idle, lunging, chewing
    this.chomperTimer = 0;
    this.chomperLungeTarget = null;
    this.maxHp = this.hp;
    this.shootTimer = 0;
    this.sunTimer = 0;
    this.firstSunProduced = false;
    this.shootAnim = 0;
    this.hitFlash = 0;
    this.position.set(col * 2 - 8, type === 'potato_mine' ? 0.1 : 0.6, row * 2 - 4);
    this.createMesh();
  }

  createMesh() {
    const group = new THREE.Group();
    const phong = (color, opts = {}) => new THREE.MeshPhongMaterial({ color, shininess: opts.shininess || 40, emissive: opts.emissive || 0x000000, emissiveIntensity: opts.ei || 0, specular: opts.specular || 0x222222 });

    if (this.type === 'peashooter') {
      this._buildPeashooter(group, phong, false);
    } else if (this.type === 'snowpea') {
      this._buildPeashooter(group, phong, true);
    } else if (this.type === 'sunflower') {
      this._buildSunflower(group, phong);
    } else if (this.type === 'wallnut') {
      this._buildWallnut(group, phong);
    } else if (this.type === 'repeater') {
      this._buildRepeater(group, phong);
    } else if (this.type === 'potato_mine') {
      this._buildPotatoMine(group, phong);
    } else if (this.type === 'chomper') {
      this._buildChomper(group, phong);
    }

    group.castShadow = true;
    this.rotation.y = Math.PI / 2;
    this.mesh = group;
    this.mesh.position.copy(this.position);
    this.scene.add(this.mesh);
  }

  _addCuteEyes(group, phong, x, y, z, eyeSize, isIce) {
    for (let side = -1; side <= 1; side += 2) {
      // Big white eye
      const eyeW = new THREE.Mesh(new THREE.SphereGeometry(eyeSize, 14, 14), phong(0xffffff, { shininess: 90 }));
      eyeW.position.set(side * x, y, z);
      eyeW.scale.set(1, 1.15, 0.9);
      group.add(eyeW);
      // Large colored iris
      const irisColor = isIce ? 0x44AAEE : 0x33AA55;
      const iris = new THREE.Mesh(new THREE.SphereGeometry(eyeSize * 0.6, 10, 10), phong(irisColor, { shininess: 60 }));
      iris.position.set(side * x, y - eyeSize * 0.05, z + eyeSize * 0.6);
      group.add(iris);
      // Dark pupil
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(eyeSize * 0.32, 8, 8), phong(0x111122));
      pupil.position.set(side * x, y - eyeSize * 0.05, z + eyeSize * 0.78);
      group.add(pupil);
      // Big sparkle highlight
      const hl1 = new THREE.Mesh(new THREE.SphereGeometry(eyeSize * 0.2, 6, 6), phong(0xffffff, { emissive: 0xffffff, ei: 0.8 }));
      hl1.position.set(side * (x - eyeSize * 0.2), y + eyeSize * 0.25, z + eyeSize * 0.85);
      group.add(hl1);
      // Small secondary sparkle
      const hl2 = new THREE.Mesh(new THREE.SphereGeometry(eyeSize * 0.1, 4, 4), phong(0xffffff, { emissive: 0xffffff, ei: 0.8 }));
      hl2.position.set(side * (x + eyeSize * 0.15), y - eyeSize * 0.15, z + eyeSize * 0.85);
      group.add(hl2);
      // Cute curved eyelid line on top
      const lid = new THREE.Mesh(new THREE.TorusGeometry(eyeSize * 0.85, eyeSize * 0.06, 6, 12, Math.PI * 0.6), phong(0x228833));
      lid.position.set(side * x, y + eyeSize * 0.5, z + eyeSize * 0.2);
      lid.rotation.z = Math.PI;
      lid.rotation.x = -0.15;
      group.add(lid);
    }
  }

  _addRosyCheeks(group, phong, x, y, z, size) {
    // Blush removed for cleaner look
  }

  _addCuteSmile(group, phong, y, z, size, color) {
    const smile = new THREE.Mesh(new THREE.TorusGeometry(size, size * 0.2, 8, 14, Math.PI), phong(color || 0x1A5A1A));
    smile.position.set(0, y, z);
    smile.rotation.x = Math.PI;
    smile.rotation.z = Math.PI;
    group.add(smile);
    // Little tongue
    const tongue = new THREE.Mesh(new THREE.SphereGeometry(size * 0.45, 6, 6), phong(0xFF7788, { shininess: 50 }));
    tongue.position.set(0, y - size * 0.3, z + 0.01);
    tongue.scale.set(1, 0.6, 0.5);
    group.add(tongue);
  }

  _buildCutePot(group, phong) {
    // Rounded cute pot
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.22, 0.2, 14), phong(0xCC8855, { shininess: 30 }));
    pot.position.y = -0.4;
    group.add(pot);
    const potRim = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.04, 8, 14), phong(0xDD9966));
    potRim.position.y = -0.3;
    potRim.rotation.x = Math.PI / 2;
    group.add(potRim);
    // Cute face on pot - tiny closed eyes
    for (let side = -1; side <= 1; side += 2) {
      const potEye = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.01, 6, 8, Math.PI), phong(0x664422));
      potEye.position.set(side * 0.1, -0.37, 0.23);
      potEye.rotation.z = Math.PI;
      group.add(potEye);
    }
    const potSmile = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.008, 6, 8, Math.PI), phong(0x664422));
    potSmile.position.set(0, -0.42, 0.23);
    potSmile.rotation.x = Math.PI;
    potSmile.rotation.z = Math.PI;
    group.add(potSmile);
    // Dirt with little sprouts
    const dirt = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.04, 12), phong(0x5A3A1A));
    dirt.position.y = -0.29;
    group.add(dirt);
  }

  _buildPeashooter(group, phong, isIce) {
    const headColor = isIce ? 0x7BD4F0 : 0x44DD44;
    const headDark = isIce ? 0x55AAC8 : 0x33BB33;
    const stemColor = isIce ? 0x3A99AA : 0x22AA22;
    const leafColor = isIce ? 0x55BBCC : 0x33CC33;
    const tubeColor = isIce ? 0x66C0DD : 0x33CC33;
    const lipColor = isIce ? 0x44A0BB : 0x22AA22;

    this._buildCutePot(group, phong);

    // Chubby curved stem
    const stemCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.28, 0),
      new THREE.Vector3(0.04, 0.05, 0.02),
      new THREE.Vector3(0.01, 0.3, 0)
    ]);
    const stem = new THREE.Mesh(new THREE.TubeGeometry(stemCurve, 14, 0.1, 10, false), phong(stemColor));
    group.add(stem);

    // Cute puffy leaves
    for (let i = 0; i < 3; i++) {
      const leafGrp = new THREE.Group();
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), phong(leafColor, { shininess: 30 }));
      leaf.scale.set(1.8, 0.4, 1.2);
      leafGrp.add(leaf);
      // Leaf highlight
      const leafHl = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), phong(0xFFFFFF, { emissive: 0xFFFFFF, ei: 0.1 }));
      leafHl.position.set(0.05, 0.04, 0.02);
      leafHl.scale.set(1.5, 0.3, 1);
      leafGrp.add(leafHl);
      const angle = (i / 3) * Math.PI * 2 + 0.3;
      leafGrp.position.set(Math.cos(angle) * 0.16, -0.1 + i * 0.12, Math.sin(angle) * 0.06);
      leafGrp.rotation.z = Math.cos(angle) * 0.5;
      leafGrp.rotation.y = angle;
      group.add(leafGrp);
    }

    // Big round cute head (chibi proportions)
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.45, 20, 20), phong(headColor, { shininess: 55, specular: isIce ? 0x446688 : 0x228822 }));
    head.position.y = 0.6;
    head.scale.set(1, 0.95, 0.95);
    group.add(head);

    // Adorable big eyes with sparkles
    this._addCuteEyes(group, phong, 0.17, 0.7, 0.32, 0.14, isIce);

    // Rosy cheeks
    this._addRosyCheeks(group, phong, 0.3, 0.55, 0.25, 0.09);

    // Cute little smile
    this._addCuteSmile(group, phong, 0.5, 0.4, 0.07, isIce ? 0x2277AA : 0x1A6A1A);

    // Cute short stubby cannon tube (rounded)
    const tubeOuter = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.21, 0.5, 14), phong(tubeColor, { shininess: 50 }));
    tubeOuter.rotation.x = Math.PI / 2;
    tubeOuter.position.set(0, 0.5, 0.58);
    group.add(tubeOuter);

    // Inner tube opening
    const tubeInner = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.12, 12), phong(0x0A2A0A));
    tubeInner.rotation.x = Math.PI / 2;
    tubeInner.position.set(0, 0.5, 0.82);
    group.add(tubeInner);

    // Puffy lip ring
    const lip = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.05, 10, 16), phong(lipColor, { shininess: 60 }));
    lip.position.set(0, 0.5, 0.82);
    group.add(lip);

    // Cute sprout on top
    const sproutStem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.02, 0.15, 6), phong(leafColor));
    sproutStem.position.set(0, 1.05, -0.05);
    group.add(sproutStem);
    for (let side = -1; side <= 1; side += 2) {
      const sl = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), phong(leafColor));
      sl.scale.set(1.6, 0.35, 1);
      sl.position.set(side * 0.08, 1.1, -0.05);
      sl.rotation.z = -side * 0.5;
      group.add(sl);
    }

    // Ice crystals for snow pea (cute star shapes)
    if (isIce) {
      for (let i = 0; i < 6; i++) {
        const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.05, 0), phong(0xDDEEFF, { shininess: 120, specular: 0xAABBDD, emissive: 0x6699CC, ei: 0.2 }));
        const a = (i / 6) * Math.PI * 2;
        crystal.position.set(Math.cos(a) * 0.4, 0.75 + Math.sin(i * 1.3) * 0.1, Math.sin(a) * 0.4);
        crystal.rotation.set(i, i * 0.7, 0);
        group.add(crystal);
      }
      // Snowflake sparkles on tube
      for (let i = 0; i < 4; i++) {
        const spark = new THREE.Mesh(new THREE.OctahedronGeometry(0.025, 0), phong(0xEEF4FF, { shininess: 100, emissive: 0x88BBEE, ei: 0.3 }));
        spark.position.set((Math.random() - 0.5) * 0.2, 0.5 + (Math.random() - 0.5) * 0.1, 0.55 + Math.random() * 0.2);
        group.add(spark);
      }
    }
  }

  _buildSunflower(group, phong) {
    this._buildCutePot(group, phong);

    // Gentle curvy stem
    const stemCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.28, 0),
      new THREE.Vector3(0.05, 0, 0.03),
      new THREE.Vector3(-0.03, 0.25, 0)
    ]);
    const stem = new THREE.Mesh(new THREE.TubeGeometry(stemCurve, 12, 0.08, 10, false), phong(0x22AA22));
    group.add(stem);

    // Heart-shaped leaves
    for (let i = 0; i < 3; i++) {
      const leafGrp = new THREE.Group();
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), phong(0x33CC33, { shininess: 25 }));
      leaf.scale.set(2, 0.35, 1.3);
      leafGrp.add(leaf);
      const leafHl = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), phong(0xFFFFFF, { emissive: 0xFFFFFF, ei: 0.08 }));
      leafHl.position.set(0.04, 0.04, 0.02);
      leafHl.scale.set(1.5, 0.3, 1);
      leafGrp.add(leafHl);
      const a = (i / 3) * Math.PI * 2 + 0.5;
      leafGrp.position.set(Math.cos(a) * 0.13, -0.2 + i * 0.15, Math.sin(a) * 0.05);
      leafGrp.rotation.z = Math.cos(a) * 0.6;
      leafGrp.rotation.y = a;
      group.add(leafGrp);
    }

    // Cute round face center (chocolate brown, smooth)
    const center = new THREE.Mesh(new THREE.SphereGeometry(0.32, 20, 20), phong(0x9B6630, { shininess: 25 }));
    center.position.y = 0.58;
    center.scale.z = 0.65;
    group.add(center);

    // Clean face center (no seeds)

    // Petals - fewer, chunkier layers
    const petalLayers = [
      { count: 8, radius: 0.5, size: 0.18, color: 0xFFD700, zOff: -0.03 },
      { count: 7, radius: 0.4, size: 0.14, color: 0xFFE44D, zOff: 0.0 },
      { count: 6, radius: 0.32, size: 0.11, color: 0xFFF07A, zOff: 0.02 }
    ];
    for (const layer of petalLayers) {
      for (let i = 0; i < layer.count; i++) {
        const petal = new THREE.Mesh(new THREE.SphereGeometry(layer.size, 10, 8), phong(layer.color, { shininess: 35 }));
        petal.scale.set(1.1, 1.5, 0.8);
        const a = (i / layer.count) * Math.PI * 2;
        petal.position.set(Math.cos(a) * layer.radius, 0.58 + Math.sin(a) * layer.radius, layer.zOff);
        petal.rotation.z = a;
        group.add(petal);
      }
    }

    // Big cute eyes with sparkles
    this._addCuteEyes(group, phong, 0.1, 0.63, 0.22, 0.1, false);

    // Rosy cheeks
    this._addRosyCheeks(group, phong, 0.19, 0.53, 0.23, 0.07);

    // Simple cute smile
    const smile = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.015, 8, 12, Math.PI), phong(0x3A1808));
    smile.position.set(0, 0.48, 0.26);
    smile.rotation.z = Math.PI;
    group.add(smile);
  }

  _buildRepeater(group, phong) {
    const headColor = 0x33BB33;
    const stemColor = 0x228822;
    const leafColor = 0x33CC33;
    const tubeColor = 0x2EAA2E;
    const lipColor = 0x22AA22;

    this._buildCutePot(group, phong);

    // Thicker curved stem
    const stemCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.28, 0),
      new THREE.Vector3(0.05, 0.05, 0.02),
      new THREE.Vector3(0.01, 0.3, 0)
    ]);
    const stem = new THREE.Mesh(new THREE.TubeGeometry(stemCurve, 14, 0.12, 10, false), phong(stemColor));
    group.add(stem);

    // Leaves
    for (let i = 0; i < 4; i++) {
      const leafGrp = new THREE.Group();
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), phong(leafColor, { shininess: 30 }));
      leaf.scale.set(1.8, 0.4, 1.2);
      leafGrp.add(leaf);
      const angle = (i / 4) * Math.PI * 2 + 0.3;
      leafGrp.position.set(Math.cos(angle) * 0.18, -0.1 + i * 0.1, Math.sin(angle) * 0.07);
      leafGrp.rotation.z = Math.cos(angle) * 0.5;
      leafGrp.rotation.y = angle;
      group.add(leafGrp);
    }

    // Bigger, chunkier head (darker green = tougher)
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.48, 20, 20), phong(headColor, { shininess: 55, specular: 0x228822 }));
    head.position.y = 0.62;
    head.scale.set(1.05, 1, 0.95);
    group.add(head);

    // Eyes - slightly more aggressive
    this._addCuteEyes(group, phong, 0.18, 0.72, 0.34, 0.14, false);
    this._addCuteSmile(group, phong, 0.52, 0.42, 0.08, 0x1A6A1A);

    // Single cannon tube
    const tubeOuter = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.55, 14), phong(tubeColor, { shininess: 50 }));
    tubeOuter.rotation.x = Math.PI / 2;
    tubeOuter.position.set(0, 0.52, 0.62);
    group.add(tubeOuter);

    const tubeInner = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.12, 12), phong(0x0A2A0A));
    tubeInner.rotation.x = Math.PI / 2;
    tubeInner.position.set(0, 0.52, 0.88);
    group.add(tubeInner);

    const lip = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.05, 10, 16), phong(lipColor, { shininess: 60 }));
    lip.position.set(0, 0.52, 0.88);
    group.add(lip);

    // Dark green leaves (PvZ-style)
    const dkLeafColor = 0x1A7A1A;
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? -1 : 1;
      const leafGrp = new THREE.Group();
      const lf = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), phong(dkLeafColor, { shininess: 25 }));
      lf.scale.set(2.2, 0.35, 1.4);
      leafGrp.add(lf);
      // Leaf vein
      const vein = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.35, 4), phong(0x126012));
      vein.rotation.z = Math.PI / 2;
      vein.position.set(0.05, 0.02, 0);
      leafGrp.add(vein);
      leafGrp.position.set(side * 0.35, 0.25, 0.1);
      leafGrp.rotation.z = side * 0.8;
      leafGrp.rotation.y = side * 0.4;
      group.add(leafGrp);
    }

    // Cute sprout on top
    const sproutStem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.025, 0.18, 6), phong(leafColor));
    sproutStem.position.set(0, 1.1, -0.05);
    group.add(sproutStem);
    for (let side = -1; side <= 1; side += 2) {
      const sl = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), phong(leafColor));
      sl.scale.set(1.6, 0.35, 1);
      sl.position.set(side * 0.09, 1.16, -0.05);
      sl.rotation.z = -side * 0.5;
      group.add(sl);
    }
  }

  _buildChomper(group, phong) {
    this._buildCutePot(group, phong);

    // Thick curved stem
    const stemCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.28, 0),
      new THREE.Vector3(0.06, 0.1, 0.02),
      new THREE.Vector3(-0.02, 0.35, 0)
    ]);
    const stem = new THREE.Mesh(new THREE.TubeGeometry(stemCurve, 14, 0.13, 10, false), phong(0x228822));
    group.add(stem);

    // Dark green leaves
    const dkLeaf = 0x1A7A1A;
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? -1 : 1;
      const leafGrp = new THREE.Group();
      const lf = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), phong(dkLeaf, { shininess: 25 }));
      lf.scale.set(2.2, 0.35, 1.4);
      leafGrp.add(lf);
      const vein = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.35, 4), phong(0x126012));
      vein.rotation.z = Math.PI / 2;
      vein.position.set(0.05, 0.02, 0);
      leafGrp.add(vein);
      leafGrp.position.set(side * 0.35, 0.1, 0.05);
      leafGrp.rotation.z = side * 0.9;
      leafGrp.rotation.y = side * 0.3;
      group.add(leafGrp);
    }

    // Head - large bulbous purple-green
    const headColor = 0x6B2D8B;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 20), phong(headColor, { shininess: 45 }));
    head.position.set(0, 0.75, 0.15);
    head.scale.set(1.1, 0.9, 1.0);
    group.add(head);

    // Spots on head
    const spotColor = 0x8B45AB;
    for (let i = 0; i < 6; i++) {
      const spot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), phong(spotColor));
      const a = (i / 6) * Math.PI * 2;
      spot.position.set(Math.cos(a) * 0.35, 0.85 + Math.sin(a) * 0.15, 0.15 + Math.sin(a * 2) * 0.1);
      group.add(spot);
    }

    // Upper jaw pivot (anchored at back of mouth)
    const upperPivot = new THREE.Group();
    upperPivot.position.set(0, 0.77, -0.1);
    group.add(upperPivot);
    const upperJaw = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), phong(headColor, { shininess: 40 }));
    upperJaw.position.set(0, 0, 0.3);
    upperJaw.rotation.x = -0.3;
    upperJaw.scale.set(1.1, 0.7, 1.2);
    upperPivot.add(upperJaw);
    this._upperJaw = upperJaw;
    this._upperPivot = upperPivot;

    // Lower jaw pivot (anchored at back of mouth)
    const lowerPivot = new THREE.Group();
    lowerPivot.position.set(0, 0.73, -0.1);
    group.add(lowerPivot);
    const lowerJaw = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5), phong(0x5A2070, { shininess: 40 }));
    lowerJaw.position.set(0, 0, 0.3);
    lowerJaw.rotation.x = 0.3;
    lowerJaw.scale.set(1.05, 0.6, 1.15);
    lowerPivot.add(lowerJaw);
    this._lowerJaw = lowerJaw;
    this._lowerPivot = lowerPivot;

    // SOLID mouth interior - dark sphere filling the gap
    const mouthMat = new THREE.MeshPhongMaterial({ color: 0x1A0020, side: THREE.DoubleSide, shininess: 5 });
    const innerMouth = new THREE.Mesh(new THREE.SphereGeometry(0.38, 14, 14), mouthMat);
    innerMouth.position.set(0, 0.75, 0.15);
    innerMouth.scale.set(1.0, 0.5, 1.0);
    group.add(innerMouth);

    // Solid back wall
    const backWall = new THREE.Mesh(new THREE.CircleGeometry(0.35, 16), mouthMat);
    backWall.position.set(0, 0.75, -0.1);
    group.add(backWall);

    // Solid palate (top)
    const palate = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.6), new THREE.MeshPhongMaterial({ color: 0x330033, side: THREE.DoubleSide }));
    palate.position.set(0, 0.88, 0.2);
    palate.rotation.x = Math.PI / 2.5;
    group.add(palate);

    // Solid floor
    const mouthFloor = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.6), new THREE.MeshPhongMaterial({ color: 0x330033, side: THREE.DoubleSide }));
    mouthFloor.position.set(0, 0.62, 0.2);
    mouthFloor.rotation.x = -Math.PI / 2.5;
    group.add(mouthFloor);

    // Tongue
    const tongue = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), phong(0xFF5577, { shininess: 50 }));
    tongue.position.set(0, 0.62, 0.25);
    tongue.scale.set(1.2, 0.4, 1.3);
    group.add(tongue);

    // Upper teeth - pointing downward from upper jaw lip edge
    for (let i = -2; i <= 2; i++) {
      const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.25, 6), phong(0xFFFFF0, { shininess: 80 }));
      tooth.position.set(i * 0.13, -0.12, 0.35 + Math.abs(i) * 0.02);
      tooth.rotation.x = Math.PI;
      upperJaw.add(tooth);
    }

    // Lower teeth - pointing upward from lower jaw lip edge
    for (let i = -3; i <= 3; i++) {
      const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.18, 6), phong(0xFFFFF0, { shininess: 80 }));
      tooth.position.set(i * 0.09, 0.12, 0.33 + Math.abs(i) * 0.015);
      tooth.rotation.x = 0;
      lowerJaw.add(tooth);
    }

    // Eyes
    this._addCuteEyes(group, phong, 0.2, 0.95, 0.25, 0.12, false);
  }

  _buildPotatoMine(group, phong) {
    // Buried dirt mound base
    const dirtMound = new THREE.Mesh(new THREE.SphereGeometry(0.4, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), phong(0x5A3A1A, { shininess: 10 }));
    dirtMound.position.y = -0.45;
    dirtMound.scale.set(1.4, 0.5, 1.4);
    group.add(dirtMound);

    // Dirt crumbles around base
    for (let i = 0; i < 8; i++) {
      const crumb = new THREE.Mesh(new THREE.SphereGeometry(0.06 + Math.random() * 0.05, 6, 6), phong(0x4A2E12));
      const a = (i / 8) * Math.PI * 2;
      crumb.position.set(Math.cos(a) * (0.4 + Math.random() * 0.15), -0.42, Math.sin(a) * (0.4 + Math.random() * 0.15));
      group.add(crumb);
    }

    // Main potato body - lumpy brown potato shape
    const bodyMat = phong(0xB8860B, { shininess: 15 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 16), bodyMat);
    body.position.y = 0.05;
    body.scale.set(1.1, 0.85, 1.0);
    group.add(body);

    // Lumps on body for potato texture
    const lumpPositions = [
      { x: 0.25, y: 0.1, z: 0.2, s: 0.12 },
      { x: -0.3, y: 0.0, z: 0.15, s: 0.1 },
      { x: 0.15, y: -0.1, z: -0.25, s: 0.11 },
      { x: -0.2, y: 0.15, z: -0.2, s: 0.09 },
      { x: 0.0, y: 0.2, z: 0.3, s: 0.1 },
      { x: -0.1, y: -0.05, z: 0.35, s: 0.08 },
    ];
    for (const l of lumpPositions) {
      const lump = new THREE.Mesh(new THREE.SphereGeometry(l.s, 8, 8), phong(0xA57B0B, { shininess: 10 }));
      lump.position.set(l.x, l.y, l.z);
      group.add(lump);
    }

    // Dark spots (potato eyes)
    for (let i = 0; i < 5; i++) {
      const spot = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), phong(0x3A2005));
      const a = Math.random() * Math.PI * 2;
      const ph = Math.random() * Math.PI * 0.6 + 0.2;
      spot.position.set(
        Math.sin(ph) * Math.cos(a) * 0.43,
        0.05 + Math.cos(ph) * 0.34,
        Math.sin(ph) * Math.sin(a) * 0.42
      );
      group.add(spot);
    }

    // Angry/sleepy eyes (PvZ potato mine has heavy-lidded angry eyes)
    for (let side = -1; side <= 1; side += 2) {
      // White eye
      const eyeW = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 12), phong(0xffffff, { shininess: 80 }));
      eyeW.position.set(side * 0.15, 0.15, 0.36);
      eyeW.scale.set(1, 0.85, 0.7);
      group.add(eyeW);
      // Dark iris
      const iris = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 10), phong(0x222222));
      iris.position.set(side * 0.15, 0.14, 0.4);
      group.add(iris);
      // Pupil
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), phong(0x000000));
      pupil.position.set(side * 0.15, 0.14, 0.42);
      group.add(pupil);
      // Sparkle
      const hl = new THREE.Mesh(new THREE.SphereGeometry(0.018, 5, 5), phong(0xffffff, { emissive: 0xffffff, ei: 0.8 }));
      hl.position.set(side * 0.13, 0.17, 0.43);
      group.add(hl);
      // Heavy angry eyelid (droopy top)
      const lid = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.45), phong(0x9A7209, { shininess: 10 }));
      lid.position.set(side * 0.15, 0.18, 0.35);
      lid.rotation.x = 0.3;
      lid.scale.set(1, 0.8, 0.7);
      group.add(lid);
    }

    // Grumpy frown mouth
    const frown = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.02, 8, 12, Math.PI), phong(0x3A2005));
    frown.position.set(0, -0.02, 0.4);
    frown.rotation.z = Math.PI;
    group.add(frown);

    // Red light/fuse on top (the warning indicator)
    this._mineLight = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), new THREE.MeshPhongMaterial({ color: 0x666666, shininess: 60, emissive: 0x000000 }));
    this._mineLight.position.set(0, 0.38, 0.05);
    group.add(this._mineLight);

    // Small fuse wire
    const fuse = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.12, 6), phong(0x333333));
    fuse.position.set(0, 0.32, 0.05);
    group.add(fuse);
  }

  _spawnExplosion() {
    const pos = this.position.clone();
    const scene = this.scene;
    const group = new THREE.Group();
    group.position.copy(pos);
    scene.add(group);

    // Fiery core flash
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xFFFF00, transparent: true, opacity: 1 });
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), coreMat);
    group.add(core);

    // Orange fireball
    const fireMat = new THREE.MeshBasicMaterial({ color: 0xFF6600, transparent: true, opacity: 0.9 });
    const fireball = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), fireMat);
    group.add(fireball);

    // Red outer glow
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xFF2200, transparent: true, opacity: 0.6 });
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 8), glowMat);
    group.add(glow);

    // Dark smoke ring (low poly)
    const smokeMat = new THREE.MeshBasicMaterial({ color: 0x332211, transparent: true, opacity: 0.5 });
    const smoke = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.25, 5, 8), smokeMat);
    smoke.rotation.x = Math.PI / 2;
    group.add(smoke);

    // Dirt chunks flying out (few for performance)
    const chunks = [];
    for (let i = 0; i < 4; i++) {
      const size = 0.06 + Math.random() * 0.08;
      const chunkMat = new THREE.MeshBasicMaterial({ color: Math.random() > 0.5 ? 0x5A3A1A : 0x8B6914, transparent: true });
      const chunk = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), chunkMat);
      const angle = Math.random() * Math.PI * 2;
      const upVel = 1.5 + Math.random() * 2;
      const outVel = 0.8 + Math.random() * 1.5;
      chunk.userData.vel = new THREE.Vector3(
        Math.cos(angle) * outVel,
        upVel,
        Math.sin(angle) * outVel
      );
      chunk.position.set(0, 0.2, 0);
      group.add(chunk);
      chunks.push(chunk);
    }

    // Brief flash light
    const light = new THREE.PointLight(0xFF8800, 4, 5);
    light.position.set(0, 1, 0);
    group.add(light);

    let elapsed = 0;
    const duration = 1.2;
    const animate = () => {
      const dt = 0.016;
      elapsed += dt;
      const t = elapsed / duration;

      // Expand and fade spheres
      const expand = 1 + t * 2;
      core.scale.setScalar(expand * 0.8);
      fireball.scale.setScalar(expand);
      glow.scale.setScalar(expand * 1.2);
      smoke.scale.setScalar(1 + t * 2);
      smoke.position.y = t * 2;

      coreMat.opacity = Math.max(0, 1 - t * 2);
      fireMat.opacity = Math.max(0, 0.9 - t * 1.5);
      glowMat.opacity = Math.max(0, 0.6 - t * 0.8);
      smokeMat.opacity = Math.max(0, 0.5 - t * 0.5);
      light.intensity = Math.max(0, 8 * (1 - t * 1.5));

      // Animate chunks
      for (const c of chunks) {
        c.position.add(c.userData.vel.clone().multiplyScalar(dt));
        c.userData.vel.y -= 9.8 * dt;
        c.material.opacity = Math.max(0, 1 - t);
        c.material.transparent = true;
      }

      if (elapsed < duration) {
        requestAnimationFrame(animate);
      } else {
        scene.remove(group);
      }
    };
    requestAnimationFrame(animate);
  }

  _getMineTarget() {
    const zombies = window.game.zombies;
    for (const z of zombies) {
      if (!z.alive || z.dying || z.row !== this.row) continue;
      const dist = Math.abs(z.position.x - this.position.x);
      if (dist < 0.8) return z;
    }
    return null;
  }

  _getChomperTarget() {
    const zombies = window.game.zombies;
    let closest = null;
    let closestDist = 3.5;
    for (const z of zombies) {
      if (!z.alive || z.dying || z.row !== this.row) continue;
      const dist = z.position.x - this.position.x;
      if (dist > -0.5 && dist < closestDist) {
        closestDist = dist;
        closest = z;
      }
    }
    return closest;
  }

  _updateChomper(dt) {
    if (this.chomperState === 'idle') {
      // Look for nearby zombie
      const target = this._getChomperTarget();
      if (target) {
        this.chomperState = 'lunging';
        this.chomperTimer = 0;
        this.chomperLungeTarget = target;
      }
    } else if (this.chomperState === 'lunging') {
      this.chomperTimer += dt;
      // Lunge forward animation (0.3s)
      const t = Math.min(this.chomperTimer / 0.3, 1);
      const lunge = Math.sin(t * Math.PI) * 0.8;
      this.mesh.position.x = this.position.x + lunge;
      // Close mouth: rotate upper jaw down, lower jaw up
      const jawClose = t;
      if (this._upperPivot) this._upperPivot.rotation.x = -jawClose * 0.5;
      if (this._lowerPivot) this._lowerPivot.rotation.x = jawClose * 0.5;
      if (t >= 1) {
        // Kill the zombie instantly
        if (this.chomperLungeTarget && this.chomperLungeTarget.alive && !this.chomperLungeTarget.dying) {
          // Instantly remove zombie (eaten!)
          this.chomperLungeTarget.dying = true;
          this.chomperLungeTarget.destroy();
        }
        this.chomperLungeTarget = null;
        this.chomperState = 'chewing';
        this.chomperTimer = 0;
      }
    } else if (this.chomperState === 'chewing') {
      this.chomperTimer += dt;
      // Very dramatic chewing - big snapping jaw movements
      const chewCycle = Math.sin(this.chomperTimer * 10);
      const chewSnap = Math.pow(Math.abs(chewCycle), 0.4) * Math.sign(chewCycle);
      if (this._upperPivot) {
        this._upperPivot.rotation.x = -0.08 + chewSnap * 0.15;
      }
      if (this._lowerPivot) {
        this._lowerPivot.rotation.x = 0.08 - chewSnap * 0.15;
      }
      // Head bobs up and down while chewing
      this.mesh.position.y = this.position.y + Math.sin(this.chomperTimer * 8) * 0.12;
      // Body sways gently
      this.mesh.rotation.z = Math.sin(this.chomperTimer * 6) * 0.05;
      // Chewing takes 18 seconds
      if (this.chomperTimer >= 18) {
        this.chomperState = 'idle';
        this.chomperTimer = 0;
        // Reset jaw positions
        if (this._upperPivot) { this._upperPivot.rotation.x = 0; }
        if (this._lowerPivot) { this._lowerPivot.rotation.x = 0; }
      }
      // Return to original x position
      this.mesh.position.x += (this.position.x - this.mesh.position.x) * dt * 5;
    }
  }

  _addWallnutDamage(stage) {
    // Remove shell bumps (they look like white circles)
    const bumpsToRemove = this.mesh.children.filter(c => c.userData.isBump);
    bumpsToRemove.forEach(c => this.mesh.remove(c));

    const crackMat = new THREE.MeshBasicMaterial({ color: 0x1A0800 });
    const deepMat = new THREE.MeshBasicMaterial({ color: 0x0A0200 });

    // Use flat planes sitting on the surface for maximum visibility
    const addCrack = (points, width, mat) => {
      const curve = new THREE.CatmullRomCurve3(points);
      const tube = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 8, width, 4, false),
        mat || crackMat
      );
      tube.userData.isCrack = true;
      this.mesh.add(tube);
    };

    if (stage >= 1) {
      // Big diagonal crack from upper-right to lower-left
      addCrack([
        new THREE.Vector3(0.25, 0.72, 0.52),
        new THREE.Vector3(0.12, 0.58, 0.60),
        new THREE.Vector3(0.0, 0.42, 0.62),
        new THREE.Vector3(-0.12, 0.28, 0.58)
      ], 0.025, deepMat);
      // Branch from main crack
      addCrack([
        new THREE.Vector3(0.12, 0.58, 0.61),
        new THREE.Vector3(0.22, 0.50, 0.58),
        new THREE.Vector3(0.30, 0.40, 0.52)
      ], 0.018, crackMat);
      // Second crack on left side
      addCrack([
        new THREE.Vector3(-0.10, 0.70, 0.54),
        new THREE.Vector3(-0.20, 0.55, 0.58),
        new THREE.Vector3(-0.25, 0.38, 0.54)
      ], 0.022, deepMat);
      // Small branch
      addCrack([
        new THREE.Vector3(-0.20, 0.55, 0.59),
        new THREE.Vector3(-0.30, 0.50, 0.50)
      ], 0.015, crackMat);
    }
    if (stage >= 2) {
      // Massive center vertical crack
      addCrack([
        new THREE.Vector3(0.0, 0.80, 0.56),
        new THREE.Vector3(0.03, 0.60, 0.64),
        new THREE.Vector3(-0.02, 0.40, 0.64),
        new THREE.Vector3(0.0, 0.20, 0.56)
      ], 0.032, deepMat);
      // Big right crack
      addCrack([
        new THREE.Vector3(0.35, 0.65, 0.42),
        new THREE.Vector3(0.28, 0.52, 0.52),
        new THREE.Vector3(0.20, 0.35, 0.56),
        new THREE.Vector3(0.10, 0.22, 0.58)
      ], 0.026, deepMat);
      // Branching from center
      addCrack([
        new THREE.Vector3(0.03, 0.60, 0.64),
        new THREE.Vector3(0.15, 0.62, 0.60),
        new THREE.Vector3(0.25, 0.58, 0.55)
      ], 0.018, crackMat);
      addCrack([
        new THREE.Vector3(-0.02, 0.40, 0.64),
        new THREE.Vector3(-0.15, 0.35, 0.60),
        new THREE.Vector3(-0.28, 0.32, 0.52)
      ], 0.018, crackMat);
      // Bottom left web crack
      addCrack([
        new THREE.Vector3(-0.25, 0.38, 0.55),
        new THREE.Vector3(-0.35, 0.30, 0.48),
        new THREE.Vector3(-0.38, 0.20, 0.40)
      ], 0.022, deepMat);
      // Extra spiderweb from center
      addCrack([
        new THREE.Vector3(0.0, 0.50, 0.64),
        new THREE.Vector3(-0.10, 0.55, 0.62),
        new THREE.Vector3(-0.22, 0.58, 0.56)
      ], 0.015, crackMat);
      addCrack([
        new THREE.Vector3(0.0, 0.50, 0.64),
        new THREE.Vector3(0.08, 0.45, 0.64),
        new THREE.Vector3(0.18, 0.42, 0.60)
      ], 0.015, crackMat);
    }
  }

  _buildWallnut(group, phong) {
    // Cute chubby walnut body
    const bodyMat = phong(0xD4B87A, { shininess: 30, specular: 0x665533 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.65, 22, 22), bodyMat);
    body.position.y = 0.38;
    body.scale.set(1, 1.05, 0.88);
    group.add(body);

    // Soft shell ridges
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const ridge = new THREE.Mesh(
        new THREE.TorusGeometry(0.55, 0.015, 6, 22, Math.PI),
        phong(0xBB9955)
      );
      ridge.position.y = 0.38;
      ridge.rotation.y = a;
      group.add(ridge);
    }

    // Shell texture bumps (subtle)
    for (let i = 0; i < 10; i++) {
      const bump = new THREE.Mesh(new THREE.SphereGeometry(0.035 + Math.random() * 0.015, 6, 6), phong(0xC4A86A));
      bump.userData.isBump = true;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.6 + 0.2;
      bump.position.set(
        Math.sin(phi) * Math.cos(theta) * 0.61,
        0.38 + Math.cos(phi) * 0.55,
        Math.sin(phi) * Math.sin(theta) * 0.54
      );
      group.add(bump);
    }

    // Cute top cap
    const topCap = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), phong(0x9A7A38));
    topCap.position.y = 0.95;
    topCap.scale.set(1, 0.4, 1);
    group.add(topCap);

    // Big determined but CUTE eyes
    for (let side = -1; side <= 1; side += 2) {
      const eyeW = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 12), phong(0xffffff, { shininess: 90 }));
      eyeW.position.set(side * 0.21, 0.5, 0.5);
      eyeW.scale.set(1, 1.1, 0.85);
      group.add(eyeW);
      const iris = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 10), phong(0x774422, { shininess: 50 }));
      iris.position.set(side * 0.21, 0.49, 0.58);
      group.add(iris);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), phong(0x111111));
      pupil.position.set(side * 0.21, 0.49, 0.61);
      group.add(pupil);
      // Big sparkles
      const hl1 = new THREE.Mesh(new THREE.SphereGeometry(0.025, 5, 5), phong(0xffffff, { emissive: 0xffffff, ei: 0.8 }));
      hl1.position.set(side * 0.19, 0.54, 0.62);
      group.add(hl1);
      const hl2 = new THREE.Mesh(new THREE.SphereGeometry(0.013, 4, 4), phong(0xffffff, { emissive: 0xffffff, ei: 0.8 }));
      hl2.position.set(side * 0.23, 0.46, 0.62);
      group.add(hl2);
      // Cute determined brows (rounded, not angry)
      const brow = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 8), phong(0x7B5A28));
      brow.position.set(side * 0.21, 0.62, 0.52);
      brow.rotation.z = side * 0.25;
      brow.rotation.x = 0.2;
      brow.scale.set(1.8, 1, 0.6);
      group.add(brow);
    }

    // Rosy cheeks
    this._addRosyCheeks(group, phong, 0.34, 0.38, 0.52, 0.09);

    // Cute determined pout
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.028, 8, 14, Math.PI), phong(0x5A3A18));
    mouth.position.set(0, 0.28, 0.62);
    group.add(mouth);


  }

  update(dt) {
    super.update(dt);
    if (!this.alive) return;
    // Gentle bobbing
    this.mesh.position.y = this.position.y + Math.sin(Date.now() * 0.003) * 0.05;
    if (this.type === 'peashooter' || this.type === 'snowpea') {
      this.shootTimer += dt;
      if (this.shootTimer >= 1.5) {
        if (this.hasZombieInLane()) {
          this.shootTimer = 0;
          this.shootAnim = 1;
          this.shoot();
        }
      }
    }
    if (this.type === 'repeater') {
      this.shootTimer += dt;
      if (this.repeaterSecondShot > 0) {
        this.repeaterSecondShot -= dt;
        if (this.repeaterSecondShot <= 0) {
          this.shootAnim = 1;
          this.shoot();
        }
      }
      if (this.shootTimer >= 1.5) {
        if (this.hasZombieInLane()) {
          this.shootTimer = 0;
          this.shootAnim = 1;
          this.shoot();
          this.repeaterSecondShot = 0.15;
        }
      }
    }
    if (this.type === 'potato_mine') {
      if (!this.mineArmed) {
        this.mineArmTimer += dt;
        // Takes 14 seconds to arm
        if (this.mineArmTimer >= 14) {
          this.mineArmed = true;
          this._minePopTimer = 0;
          // Light turns red when armed
          if (this._mineLight) {
            this._mineLight.material.color.setHex(0xFF0000);
            this._mineLight.material.emissive.setHex(0xFF0000);
            this._mineLight.material.emissiveIntensity = 0.8;
          }
        } else {
          // Blink the light dimly while arming
          if (this._mineLight) {
            const blink = Math.sin(Date.now() * 0.005) > 0;
            this._mineLight.material.emissive.setHex(blink ? 0x664400 : 0x000000);
            this._mineLight.material.emissiveIntensity = blink ? 0.3 : 0;
          }
        }
      }
      // Check for zombie contact only when armed
      if (this.mineArmed) {
        // Armed - blink red
        if (this._mineLight) {
          const blink = Math.sin(Date.now() * 0.01) > 0;
          this._mineLight.material.emissiveIntensity = blink ? 1.0 : 0.3;
        }
        // Pop up from underground in 0.5s
        if (this._minePopTimer !== undefined && this._minePopTimer < 0.5) {
          this._minePopTimer += dt;
          const popT = Math.min(this._minePopTimer / 0.5, 1);
          // Ease out bounce
          const eased = popT < 0.7 ? (popT / 0.7) * 1.15 : 1.15 - (popT - 0.7) / 0.3 * 0.15;
          this.position.y = 0.1 + eased * 0.5;
        } else {
          this.position.y = 0.6;
        }
      } else {
        // Stay underground while not armed
        this.position.y = 0.1;
      }
      if (this.mineArmed) {
        const target = this._getMineTarget();
        if (target) {
          // EXPLODE! Damage all zombies in radius
          const zombies = window.game.zombies;
          for (const z of zombies) {
            if (!z.alive || z.dying) continue;
            const dx = z.position.x - this.position.x;
            const dz = z.position.z - this.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < 2.0) {
              z.explodeDeath();
            }
          }
          // Dramatic explosion effect
          this._spawnExplosion();
          // Self-destruct
          const tile = window.game.getTile(this.row, this.col);
          if (tile) tile.plant = null;
          this.destroy();
        }
      }
    }
    if (this.type === 'chomper') {
      this._updateChomper(dt);
    }
    if (this.type === 'sunflower') {
      this.sunTimer += dt;
      const sunInterval = this.firstSunProduced ? 12 : 5;
      // Glow only in the last 3 seconds before producing sun
      const timeLeft = sunInterval - this.sunTimer;
      const glowProgress = timeLeft <= 3 ? 1 - (timeLeft / 3) : 0;
      const glowIntensity = glowProgress * glowProgress * (3 - 2 * glowProgress) * 0.8;
      this.mesh.traverse(child => {
        if (child.isMesh && child.material && child.material.emissive) {
          if (child.userData._sfBaseEmissive === undefined) {
            child.userData._sfBaseEmissive = child.material.emissive.getHex();
            child.userData._sfBaseEI = child.material.emissiveIntensity;
          }
          child.material.emissive.setHex(glowIntensity > 0.1 ? 0xFFDD00 : child.userData._sfBaseEmissive);
          child.material.emissiveIntensity = child.userData._sfBaseEI + glowIntensity;
        }
      });
      if (this.sunTimer >= sunInterval) {
        this.firstSunProduced = true;
        this.sunTimer = 0;
        // Reset glow
        this.mesh.traverse(child => {
          if (child.isMesh && child.material && child.userData._sfBaseEmissive !== undefined) {
            child.material.emissive.setHex(child.userData._sfBaseEmissive);
            child.material.emissiveIntensity = child.userData._sfBaseEI;
          }
        });
        const sun = new Sun(this.scene, this.position.x, this.position.y + 0.5, this.position.z, true);
        window.game.entities.push(sun);
        window.game.suns.push(sun);
      }
      // Happy sway
      this.mesh.rotation.z = Math.sin(Date.now() * 0.003) * 0.1;
    }
    // Shoot animation (recoil)
    if ((this.type === 'peashooter' || this.type === 'snowpea' || this.type === 'repeater') && this.shootAnim > 0) {
      this.shootAnim -= dt * 4;
      if (this.shootAnim < 0) this.shootAnim = 0;
      const recoil = Math.sin(this.shootAnim * Math.PI) * 0.15;
      this.mesh.position.x = this.position.x - recoil;
      const puff = 1 + Math.sin(this.shootAnim * Math.PI) * 0.15;
      if (this.mesh.children[9]) this.mesh.children[9].scale.set(puff, puff * 0.95, puff * 0.95);
    }
    // Hit flash
    if (this.hitFlash > 0) {
      this.hitFlash -= dt * 5;
      if (this.hitFlash < 0) this.hitFlash = 0;
      const flash = this.hitFlash > 0.5;
      this._traverseFlash(this.mesh, flash);
    }
    // Damage visuals for wallnut
    if (this.type === 'wallnut' && this.mesh.children[0]) {
      const ratio = this.hp / this.maxHp;
      let newStage = ratio < 0.33 ? 2 : (ratio < 0.66 ? 1 : 0);
      if (this._wallnutStage === undefined) this._wallnutStage = 0;
      if (newStage !== this._wallnutStage) {
        this._wallnutStage = newStage;
        if (newStage === 2) {
          this.mesh.children[0].material.color.setHex(0x9B7924);
        } else if (newStage === 1) {
          this.mesh.children[0].material.color.setHex(0xB0904A);
        }
        // Remove old crack meshes
        const toRemove = this.mesh.children.filter(c => c.userData.isCrack);
        toRemove.forEach(c => this.mesh.remove(c));
        // Add cracks and dents
        this._addWallnutDamage(newStage);
        // Deform body to look crumpled
        if (newStage >= 1) {
          this.mesh.children[0].scale.set(1 - newStage * 0.04, 1.05 - newStage * 0.05, 0.88 - newStage * 0.03);
        }
        // Re-store original colors after texture change
        this._clearOrigColors(this.mesh);
        this._storeOrigColors(this.mesh);
      }
      if (newStage === 2) {
        this.mesh.rotation.z = Math.sin(Date.now() * 0.01) * 0.06;
      } else if (newStage === 1) {
        this.mesh.rotation.z = Math.sin(Date.now() * 0.005) * 0.03;
      }
    }
  }

  hasZombieInLane() {
    return window.game.zombies.some(z => z.alive && !z.dying && z.row === this.row && z.position.x > this.position.x);
  }

  shoot() {
    const isFrozen = this.type === 'snowpea';
    const p = new Projectile(this.scene, this.position.x + 0.5, this.position.y + 0.5, this.position.z, this.row, isFrozen);
    window.game.entities.push(p);
    window.game.projectiles.push(p);
  }

  _traverseFlash(obj, flash) {
    obj.children.forEach(c => {
      if (c.material && c.userData.origColor !== undefined) {
        c.material.color.setHex(flash ? 0xffffff : c.userData.origColor);
      }
      if (c.children && c.children.length > 0) this._traverseFlash(c, flash);
    });
  }

  _storeOrigColors(obj) {
    obj.children.forEach(c => {
      if (c.material && c.userData.origColor === undefined) {
        c.userData.origColor = c.material.color.getHex();
      }
      if (c.children && c.children.length > 0) this._storeOrigColors(c);
    });
  }

  _clearOrigColors(obj) {
    obj.children.forEach(c => {
      if (c.material) {
        c.userData.origColor = undefined;
      }
      if (c.children && c.children.length > 0) this._clearOrigColors(c);
    });
  }

  takeDamage(dmg) {
    this.hp -= dmg;
    this.hitFlash = 1;
    this._storeOrigColors(this.mesh);
    if (this.hp <= 0) {
      const tile = window.game.getTile(this.row, this.col);
      if (tile) tile.plant = null;
      this.destroy();
    }
  }
}
