class LawnMower extends GameObject3D {
  constructor(scene, row) {
    super(scene);
    this.name = 'LawnMower';
    this.row = row;
    this.triggered = false;
    this.position.set(-9.4, 0.3, row * 2 - 4);
    this.createMesh();
  }
  createMesh() {
    const group = new THREE.Group();
    const phong = (color, opts = {}) => new THREE.MeshPhongMaterial({ color, shininess: opts.shininess || 40, specular: opts.specular || 0x222222 });

    // Main body/deck - low flat housing
    const deck = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.18, 0.65), phong(0xCC2222, { shininess: 60 }));
    deck.position.y = 0;
    group.add(deck);
    // Deck edge trim
    const deckTrim = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.04, 0.67), phong(0x991111));
    deckTrim.position.y = -0.08;
    group.add(deckTrim);

    // Engine block on top
    const engine = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.25, 0.35), phong(0x222222, { shininess: 20 }));
    engine.position.set(-0.1, 0.2, 0);
    group.add(engine);
    // Engine cylinder head
    const cylHead = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.2, 8), phong(0x444444, { shininess: 50 }));
    cylHead.position.set(-0.1, 0.38, 0);
    group.add(cylHead);
    // Engine cap
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), phong(0x666666, { shininess: 70 }));
    cap.position.set(-0.1, 0.48, 0);
    cap.scale.y = 0.5;
    group.add(cap);
    // Air filter
    const airFilter = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.08, 8), phong(0x333333));
    airFilter.position.set(0.05, 0.3, 0.12);
    airFilter.rotation.z = Math.PI / 2;
    group.add(airFilter);
    // Exhaust pipe
    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.18, 6), phong(0x555555, { shininess: 60 }));
    exhaust.position.set(-0.25, 0.28, -0.12);
    exhaust.rotation.z = 0.3;
    group.add(exhaust);
    // Pull cord handle
    const cordHandle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, 0.04), phong(0x111111));
    cordHandle.position.set(0.12, 0.32, -0.05);
    group.add(cordHandle);

    // Handle bar - extends upward and back
    const handlePost = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 6), phong(0x444444, { shininess: 50 }));
    handlePost.position.set(-0.35, 0.35, 0);
    handlePost.rotation.z = 0.4;
    group.add(handlePost);
    // Handle grip crossbar
    const handleGrip = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.3, 6), phong(0x222222));
    handleGrip.position.set(-0.55, 0.6, 0);
    handleGrip.rotation.x = Math.PI / 2;
    group.add(handleGrip);
    // Rubber grips
    for (let side = -1; side <= 1; side += 2) {
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.08, 6), phong(0x111111));
      grip.position.set(-0.55, 0.6, side * 0.15);
      grip.rotation.x = Math.PI / 2;
      group.add(grip);
    }

    // Blade housing underneath (circular)
    const bladeHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 0.06, 16), phong(0xAA1111));
    bladeHousing.position.y = -0.11;
    group.add(bladeHousing);

    // Blade (visible underneath)
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.015, 0.04), phong(0x888888, { shininess: 80 }));
    blade.position.y = -0.15;
    group.add(blade);

    // Front wheels (smaller)
    for (let side = -1; side <= 1; side += 2) {
      const wheelGroup = new THREE.Group();
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.04, 12), phong(0x222222));
      wheel.rotation.x = Math.PI / 2;
      wheelGroup.add(wheel);
      // Hub cap
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.05, 8), phong(0x666666, { shininess: 60 }));
      hub.rotation.x = Math.PI / 2;
      wheelGroup.add(hub);
      // Tire tread ring
      const tread = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.015, 6, 12), phong(0x1A1A1A));
      wheelGroup.add(tread);
      wheelGroup.position.set(0.35, -0.12, side * 0.34);
      group.add(wheelGroup);
    }

    // Rear wheels (larger)
    for (let side = -1; side <= 1; side += 2) {
      const wheelGroup = new THREE.Group();
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.05, 12), phong(0x222222));
      wheel.rotation.x = Math.PI / 2;
      wheelGroup.add(wheel);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.06, 8), phong(0x666666, { shininess: 60 }));
      hub.rotation.x = Math.PI / 2;
      wheelGroup.add(hub);
      const tread = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.018, 6, 14), phong(0x1A1A1A));
      wheelGroup.add(tread);
      wheelGroup.position.set(-0.3, -0.1, side * 0.34);
      group.add(wheelGroup);
    }

    // Grass chute on side
    const chute = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.15), phong(0xBB2222));
    chute.position.set(0.15, -0.02, 0.38);
    group.add(chute);

    // Fuel cap
    const fuelCap = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 8), phong(0xDDBB00, { shininess: 70 }));
    fuelCap.position.set(-0.2, 0.33, 0.1);
    group.add(fuelCap);

    this.mesh = group;
    this.mesh.position.copy(this.position);
    this.scene.add(this.mesh);
  }
  trigger() {
    this.triggered = true;
  }
  update(dt) {
    if (!this.alive) return;
    if (this.triggered) {
      this.position.x += 12 * dt;
      // Spin blade
      if (this.mesh.children[16]) {
        this.mesh.children[16].rotation.y += dt * 40;
      }
      for (const z of window.game.zombies) {
        if (z.alive && z.row === this.row && Math.abs(z.position.x - this.position.x) < 1) {
          z.takeDamage(9999, false);
        }
      }
      if (this.position.x > 14) this.destroy();
    }
    super.update(dt);
  }
}
