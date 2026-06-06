class Sun extends GameObject3D {
  constructor(scene, x, y, z, fromPlant) {
    super(scene);
    this.name = 'Sun';
    this.lifetime = 9;
    this.collected = false;
    this.fromPlant = fromPlant;
    this.fadeOut = 0;
    this.collectTarget = null;
    this.collectTimer = 0;
    this.collectStart = null;
    if (fromPlant) {
      // Spawn at sunflower, move up
      this.position.set(x, y, z);
      this.targetY = y + 1.2;
      this.moveDir = 1; // up
    } else {
      // Sky sun, fall down
      this.position.set(x, y, z);
      this.targetY = 0.8;
      this.moveDir = -1; // down
    }
    this.createMesh();
  }
  createMesh() {
    const group = new THREE.Group();
    const phong = (color, opts = {}) => new THREE.MeshPhongMaterial({ color, shininess: opts.shininess || 50, emissive: opts.emissive || 0x000000, emissiveIntensity: opts.ei || 0, specular: opts.specular || 0x222222 });

    // Glowing core sphere
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.28, 18, 18), phong(0xFFDD33, { shininess: 80, emissive: 0xFFAA00, ei: 0.6, specular: 0xFFFF88 }));
    group.add(core);

    // Inner glow layer
    const innerGlow = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 14), phong(0xFFEE66, { shininess: 30, emissive: 0xFFCC00, ei: 0.4 }));
    innerGlow.material.transparent = true;
    innerGlow.material.opacity = 0.4;
    group.add(innerGlow);

    // Cute face - big sparkly eyes
    for (let side = -1; side <= 1; side += 2) {
      const eyeW = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 10), phong(0xffffff, { shininess: 90 }));
      eyeW.position.set(side * 0.09, 0.04, 0.22);
      eyeW.scale.set(1, 1.15, 0.8);
      group.add(eyeW);
      const iris = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), phong(0xDD8800, { shininess: 60 }));
      iris.position.set(side * 0.09, 0.03, 0.27);
      group.add(iris);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 6), phong(0x221100));
      pupil.position.set(side * 0.09, 0.03, 0.29);
      group.add(pupil);
      // Sparkle
      const hl = new THREE.Mesh(new THREE.SphereGeometry(0.015, 4, 4), phong(0xffffff, { emissive: 0xffffff, ei: 0.9 }));
      hl.position.set(side * 0.07, 0.06, 0.295);
      group.add(hl);
    }

    // Rosy cheeks
    for (let side = -1; side <= 1; side += 2) {
      const blush = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), phong(0xFF9966, { shininess: 10, emissive: 0xFF6633, ei: 0.15 }));
      blush.position.set(side * 0.15, -0.02, 0.2);
      blush.scale.set(1.3, 0.7, 0.4);
      group.add(blush);
    }

    // Cute smile
    const smile = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.015, 8, 12, Math.PI), phong(0xCC8800));
    smile.position.set(0, -0.06, 0.24);
    smile.rotation.x = Math.PI;
    smile.rotation.z = Math.PI;
    group.add(smile);

    // Simple rounded petals
    const petalCount = 5;
    for (let i = 0; i < petalCount; i++) {
      const petal = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 12), phong(0xFFDD00, { shininess: 40, emissive: 0xFFAA00, ei: 0.3 }));
      const a = (i / petalCount) * Math.PI * 2;
      const r = 0.3;
      petal.position.set(Math.cos(a) * r, Math.sin(a) * r, 0);
      petal.scale.set(1.2, 1.2, 0.5);
      group.add(petal);
    }

    this.mesh = group;
    this.mesh.position.copy(this.position);
    if (this.fromPlant) {
      this.mesh.scale.setScalar(0.01);
      this.growTimer = 0;
      this.growDuration = 0.5;
    }
    this.scene.add(this.mesh);
  }

  _setMeshOpacity(opacity) {
    this.mesh.traverse(child => {
      if (child.isMesh && child.material) {
        child.material.transparent = true;
        child.material.depthWrite = opacity > 0.99;
        child.material.opacity = Math.min(opacity, child.material.opacity !== undefined ? opacity : 1);
        child.material.emissiveIntensity = (child.material.userData._origEI !== undefined ? child.material.userData._origEI : (child.material.userData._origEI = child.material.emissiveIntensity)) * opacity;
        child.material.needsUpdate = true;
      }
    });
  }

  update(dt) {
    if (!this.alive) return;

    // Collected: fly to sun UI
    if (this.collected) {
      this.collectTimer += dt;
      const duration = 0.5;
      const t = Math.min(this.collectTimer / duration, 1);
      const ease = t * t * (3 - 2 * t); // smoothstep
      // Lerp 3D position toward a point near camera (top-left)
      this.position.x = this.collectStart.x + (this.collectTarget.x - this.collectStart.x) * ease;
      this.position.y = this.collectStart.y + (this.collectTarget.y - this.collectStart.y) * ease;
      this.position.z = this.collectStart.z + (this.collectTarget.z - this.collectStart.z) * ease;
      this.mesh.scale.setScalar(1 - ease * 0.7);
      this._setMeshOpacity(1 - ease * 0.5);
      if (t >= 1) this.destroy();
      super.update(dt);
      return;
    }

    // Grow animation for sunflower suns
    if (this.fromPlant && this.growTimer !== undefined && this.growTimer < this.growDuration) {
      this.growTimer += dt;
      const t = Math.min(this.growTimer / this.growDuration, 1);
      this.mesh.scale.setScalar(t);
    }

    // Move toward target
    if (this.moveDir > 0) {
      // Moving up (sunflower sun)
      if (this.position.y < this.targetY) {
        this.position.y += 0.8 * dt;
        if (this.position.y > this.targetY) this.position.y = this.targetY;
      }
    } else {
      // Falling down (sky sun)
      if (this.position.y > this.targetY) {
        this.position.y -= 1.5 * dt;
        if (this.position.y < this.targetY) this.position.y = this.targetY;
      }
    }

    this.rotation.y += dt * 2;
    this.lifetime -= dt;

    // Fade out during last 2 seconds
    if (this.lifetime <= 2) {
      const opacity = Math.max(0, this.lifetime / 2);
      this._setMeshOpacity(opacity);
    }

    if (this.lifetime <= 0) this.destroy();
    super.update(dt);
  }

  collect() {
    if (this.collected) return;
    this.collected = true;
    this.collectTimer = 0;
    this.collectStart = this.position.clone();

    // Compute a 3D target near the sun UI (top-left of screen)
    const sunCounter = document.getElementById('sun-counter');
    const rect = sunCounter.getBoundingClientRect();
    const ndcX = ((rect.left + rect.width / 2) / window.innerWidth) * 2 - 1;
    const ndcY = -((rect.top + rect.height / 2) / window.innerHeight) * 2 + 1;
    const target = new THREE.Vector3(ndcX, ndcY, 0.5);
    target.unproject(window.game.camera);
    // Place target partway between camera and unprojected point
    const cam = window.game.camera.position;
    const dir = target.sub(cam).normalize();
    this.collectTarget = cam.clone().add(dir.multiplyScalar(3));

    window.game.sun += 25;
    document.getElementById('sun-amount').textContent = window.game.sandboxMode ? '∞' : window.game.sun;
    const sc = document.getElementById('sun-counter');
    sc.classList.remove('pulse');
    void sc.offsetWidth;
    sc.classList.add('pulse');
  }
}
