class Zombie extends GameObject3D {
  constructor(scene, row, x, type) {
    super(scene);
    this.type = type || 'normal';
    this.name = 'Zombie';
    this.row = row;
    this.maxHp = this.type === 'buckethead' ? 30 : this.type === 'conehead' ? 20 : 10;
    this.armFallen = false;
    this.headgearDamaged = false;
    this.hp = this.maxHp;
    this.headgearFallen = false;
    this.speed = 0.4;
    this.baseSpeed = 0.4;
    this.damage = 50;
    this.attackTimer = 0;
    this.targetPlant = null;
    this.frozen = false;
    this.frozenTimer = 0;
    this.hitFlash = 0;
    this.position.set(x, 0.75, row * 2 - 4);
    this.createMesh();
  }

  createMesh() {
    const group = new THREE.Group();
    const phong = (color, opts = {}) => new THREE.MeshPhongMaterial({ color, shininess: opts.shininess || 30, emissive: opts.emissive || 0x000000, emissiveIntensity: opts.ei || 0, specular: opts.specular || 0x111111 });

    // === TORSO (child 0) - cute chubby body ===
    const torsoGroup = new THREE.Group();
    // Rounded chubby torso
    const torso = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 14), phong(0x667744));
    torso.scale.set(1.2, 1.3, 0.9);
    torsoGroup.add(torso);
    // Cute tattered shirt
    const shirtFront = new THREE.Mesh(new THREE.SphereGeometry(0.33, 12, 12), phong(0x556B3F));
    shirtFront.scale.set(1.15, 1.25, 0.5);
    shirtFront.position.z = 0.08;
    torsoGroup.add(shirtFront);
    // Tiny adorable tie
    const tie = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.22, 6), phong(0xCC3333));
    tie.position.set(0, -0.05, 0.2);
    tie.rotation.x = 0;
    torsoGroup.add(tie);
    const tieKnot = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), phong(0xCC3333));
    tieKnot.position.set(0, 0.08, 0.22);
    torsoGroup.add(tieKnot);
    // Belt buckle only (no ring)
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.02), phong(0xDDBB33, { shininess: 70 }));
    buckle.position.set(0, -0.32, 0.22);
    torsoGroup.add(buckle);
    // Little patches/rips (cute not scary)
    const patch1 = new THREE.Mesh(new THREE.CircleGeometry(0.04, 6), phong(0x778855));
    patch1.position.set(0.12, 0.1, 0.24);
    torsoGroup.add(patch1);
    const patch2 = new THREE.Mesh(new THREE.CircleGeometry(0.03, 6), phong(0x445533));
    patch2.position.set(-0.08, -0.1, 0.24);
    torsoGroup.add(patch2);
    torsoGroup.position.y = 0;
    group.add(torsoGroup);

    // === HEAD (child 1) - big cute chibi head ===
    const headGroup = new THREE.Group();
    // Big round head (chibi!)
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.38, 18, 18), phong(0x88BB88, { shininess: 20 }));
    head.scale.set(1, 1.05, 0.95);
    headGroup.add(head);
    // Cute round cheeks
    for (let side = -1; side <= 1; side += 2) {
      const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), phong(0x99CC99));
      cheek.position.set(side * 0.25, -0.08, 0.2);
      cheek.scale.set(1, 0.8, 0.5);
      headGroup.add(cheek);
    }
    // Big adorable eyes with sparkles
    for (let side = -1; side <= 1; side += 2) {
      // Big eye white
      const eyeW = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), phong(0xFFFFEE, { shininess: 80 }));
      eyeW.position.set(side * 0.13, 0.06, 0.3);
      eyeW.scale.set(1, 1.15, 0.85);
      headGroup.add(eyeW);
      // Cute yellow-green iris
      const iris = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 10), phong(0xCCBB33, { shininess: 50 }));
      iris.position.set(side * 0.13, 0.05, 0.38);
      headGroup.add(iris);
      // Pupil
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), phong(0x112211));
      pupil.position.set(side * 0.13, 0.05, 0.41);
      headGroup.add(pupil);
      // Big sparkle
      const hl1 = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), phong(0xffffff, { emissive: 0xffffff, ei: 0.8 }));
      hl1.position.set(side * 0.11, 0.1, 0.42);
      headGroup.add(hl1);
      // Small sparkle
      const hl2 = new THREE.Mesh(new THREE.SphereGeometry(0.013, 4, 4), phong(0xffffff, { emissive: 0xffffff, ei: 0.8 }));
      hl2.position.set(side * 0.15, 0.01, 0.42);
      headGroup.add(hl2);
      // Under-eye circles (cute zombie look)
      const underEye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), phong(0x668866));
      underEye.position.set(side * 0.13, -0.02, 0.32);
      underEye.scale.set(1.2, 0.4, 0.3);
      headGroup.add(underEye);
    }
    // Cute button nose
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), phong(0x77AA77));
    nose.position.set(0, -0.02, 0.36);
    headGroup.add(nose);
    // Clean cheeks (no blush)
    // Cute open mouth with tiny teeth
    const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), phong(0x443333));
    mouth.position.set(0, -0.15, 0.3);
    mouth.scale.set(1.3, 0.7, 0.6);
    headGroup.add(mouth);
    // Two cute front teeth
    for (let side = -1; side <= 1; side += 2) {
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.035, 0.015), phong(0xEEEECC));
      tooth.position.set(side * 0.02, -0.13, 0.33);
      headGroup.add(tooth);
    }
    // Sparse occasional hairs
    const hairPositions = [0.2, 1.1, 2.5, 3.8, 4.5];
    for (let i = 0; i < hairPositions.length; i++) {
      const hair = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.005, 0.25 + Math.random() * 0.15, 4), phong(0x3A3A28));
      const a = hairPositions[i];
      hair.position.set(Math.cos(a) * 0.28, 0.35 + Math.random() * 0.08, Math.sin(a) * 0.22 - 0.04);
      hair.rotation.z = (Math.random() - 0.5) * 0.8;
      hair.rotation.x = (Math.random() - 0.5) * 0.5;
      headGroup.add(hair);
    }
    // Cute bandaid on head
    const bandaid = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.02), phong(0xEECC99));
    bandaid.position.set(0.2, 0.15, 0.25);
    bandaid.rotation.z = 0.4;
    headGroup.add(bandaid);
    // Bandaid cross marks
    const bx1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.01, 0.01), phong(0xCC9966));
    bx1.position.set(0.2, 0.15, 0.26);
    bx1.rotation.z = 0.4;
    headGroup.add(bx1);
    const bx2 = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.03, 0.01), phong(0xCC9966));
    bx2.position.set(0.2, 0.15, 0.26);
    bx2.rotation.z = 0.4;
    headGroup.add(bx2);
    // === HEADGEAR ===
    if (this.type === 'conehead') {
      const coneGroup = new THREE.Group();
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.65, 12), phong(0xFF6600, { shininess: 40 }));
      cone.position.y = 0.60;
      coneGroup.add(cone);
      // Square base
      const coneBase = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.06, 0.56), phong(0xDD5500, { shininess: 40 }));
      coneBase.position.y = 0.28;
      coneGroup.add(coneBase);
      // Orange stripes
      const stripe1 = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.02, 6, 16), phong(0xFF8833));
      stripe1.position.y = 0.40;
      stripe1.rotation.x = Math.PI / 2;
      coneGroup.add(stripe1);
      const stripe2 = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.02, 6, 12), phong(0xFF8833));
      stripe2.position.y = 0.60;
      stripe2.rotation.x = Math.PI / 2;
      coneGroup.add(stripe2);
      // Cone tip
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), phong(0xFF5500));
      tip.position.y = 0.92;
      coneGroup.add(tip);
      // Cone base rim
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.025, 6, 16), phong(0xDD5500));
      rim.position.y = 0.28;
      rim.rotation.x = Math.PI / 2;
      coneGroup.add(rim);
      headGroup.add(coneGroup);
    } else if (this.type === 'buckethead') {
      const bucketGroup = new THREE.Group();
      const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.45, 12), phong(0x888888, { shininess: 60, specular: 0x444444 }));
      bucket.position.y = 0.45;
      bucketGroup.add(bucket);
      // Bucket rim
      const bucketRim = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.03, 8, 16), phong(0x777777, { shininess: 70 }));
      bucketRim.position.y = 0.23;
      bucketRim.rotation.x = Math.PI / 2;
      bucketGroup.add(bucketRim);
      // Handle
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.015, 6, 16, Math.PI), phong(0x666666, { shininess: 50 }));
      handle.position.y = 0.55;
      handle.rotation.x = Math.PI;
      bucketGroup.add(handle);
      // Dents/scratches
      const dent = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), phong(0x777777));
      dent.position.set(0.2, 0.4, 0.2);
      dent.scale.set(1, 1, 0.3);
      bucketGroup.add(dent);
      headGroup.add(bucketGroup);
    }
    headGroup.position.y = 0.6;
    group.add(headGroup);

    // === RIGHT ARM (child 2) - stubby cute arm ===
    const rArmGroup = new THREE.Group();
    const rArm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.4, 10), phong(0x88BB88));
    rArm.position.y = -0.15;
    rArmGroup.add(rArm);
    // Cute mitten hand
    const rHand = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), phong(0x88BB88));
    rHand.position.y = -0.38;
    rHand.scale.set(1, 1.1, 0.8);
    rArmGroup.add(rHand);
    // Torn sleeve cuff
    const rCuff = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.015, 6, 10), phong(0x667744));
    rCuff.position.y = 0.02;
    rCuff.rotation.x = Math.PI / 2;
    rArmGroup.add(rCuff);
    rArmGroup.position.set(0.32, 0.1, 0.05);
    group.add(rArmGroup);

    // === LEFT ARM (child 3) ===
    const lArmGroup = new THREE.Group();
    const lArm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.4, 10), phong(0x88BB88));
    lArm.position.y = -0.15;
    lArmGroup.add(lArm);
    const lHand = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), phong(0x88BB88));
    lHand.position.y = -0.38;
    lHand.scale.set(1, 1.1, 0.8);
    lArmGroup.add(lHand);
    const lCuff = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.015, 6, 10), phong(0x667744));
    lCuff.position.y = 0.02;
    lCuff.rotation.x = Math.PI / 2;
    lArmGroup.add(lCuff);
    lArmGroup.position.set(-0.32, 0.1, 0.05);
    group.add(lArmGroup);

    // === RIGHT LEG (child 4) - stubby cute leg ===
    const rLegGroup = new THREE.Group();
    const rLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.28, 10), phong(0x4A4A3A));
    rLeg.position.y = -0.1;
    rLegGroup.add(rLeg);
    // Cute round shoe
    const rShoe = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), phong(0x2A2A22, { shininess: 40 }));
    rShoe.position.set(0, -0.28, 0.03);
    rShoe.scale.set(1, 0.6, 1.4);
    rLegGroup.add(rShoe);
    rLegGroup.position.set(0.13, -0.42, 0);
    group.add(rLegGroup);

    // === LEFT LEG (child 5) ===
    const lLegGroup = new THREE.Group();
    const lLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.28, 10), phong(0x4A4A3A));
    lLeg.position.y = -0.1;
    lLegGroup.add(lLeg);
    const lShoe = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), phong(0x2A2A22, { shininess: 40 }));
    lShoe.position.set(0, -0.28, 0.03);
    lShoe.scale.set(1, 0.6, 1.4);
    lLegGroup.add(lShoe);
    lLegGroup.position.set(-0.13, -0.42, 0);
    group.add(lLegGroup);

    this.mesh = group;
    this.mesh.position.copy(this.position);
    this.rotation.y = -Math.PI / 2;
    this.fadeIn = 1.0;
    this._setOpacity(this.mesh, 0);
    this.scene.add(this.mesh);
  }

  update(dt) {
    if (!this.alive) return;

    // Death fall-forward animation
    if (this.dying) {
      this.deathTimer += dt;
      if (!this.fallInited) {
        this.fallInited = true;
        this.deathY = this.mesh.position.y;
        this.deathRotX = this.mesh.rotation.x;
        this.deathRotY = this.mesh.rotation.y;
        this.deathRotZ = this.mesh.rotation.z;
      }
      // Fall forward (face-down) over 0.6 seconds
      const fallProgress = Math.min(this.deathTimer / 0.6, 1);
      const eased = 1 - Math.pow(1 - fallProgress, 2);
      this.mesh.rotation.set(this.deathRotX, this.deathRotY, this.deathRotZ + eased * (-Math.PI / 2));
      this.mesh.position.y = this.deathY - eased * 0.35;
      // After falling, wait 1 second then fade out
      if (this.deathTimer > 1.6) {
        const fadeProgress = Math.min((this.deathTimer - 1.6) / 0.8, 1);
        this._setOpacity(this.mesh, 1 - fadeProgress);
        if (fadeProgress >= 1) {
          this.destroy();
        }
      }
      return;
    }
    if (this.frozen) {
      this.frozenTimer -= dt;
      if (this.frozenTimer <= 0) {
        this.frozen = false;
        this.speed = this.baseSpeed;
        this._applyFreezeColor(false);
      }
    }

    this.targetPlant = null;
    const tiles = window.game.tiles;
    for (const tile of tiles) {
      if (tile.row === this.row && tile.plant && tile.plant.alive) {
        const px = tile.plant.position.x;
        if (Math.abs(this.position.x - px) < 0.8 && this.position.x > px - 0.3) {
          this.targetPlant = tile.plant;
          break;
        }
      }
    }

    if (this.targetPlant) {
      this.attackTimer += dt;
      const biteCycle = 0.628; // full nom-nom animation cycle
      if (this.attackTimer >= biteCycle) {
        this.attackTimer -= biteCycle;
        this.targetPlant.takeDamage(this.damage);
      }
    } else {
      this.position.x -= this.speed * dt;
      this.attackTimer = 0;
    }

    // Animations
    const spd = this.frozen ? 0.5 : 1;
    const t = Date.now() * 0.005 * spd;
    const rArm = this.mesh.children[2];
    const lArm = this.mesh.children[3];
    const rLeg = this.mesh.children[4];
    const lLeg = this.mesh.children[5];
    const headGrp = this.mesh.children[1];

    if (!this.targetPlant) {
      // Cute waddle walk
      if (rLeg) {
        rLeg.rotation.x = Math.sin(t) * 0.4;
        rLeg.position.y = -0.42 + Math.abs(Math.sin(t)) * 0.05;
      }
      if (lLeg) {
        lLeg.rotation.x = Math.sin(t + Math.PI) * 0.4;
        lLeg.position.y = -0.42 + Math.abs(Math.sin(t + Math.PI)) * 0.05;
      }
      // Arms reach forward and swing cutely
      if (rArm) rArm.rotation.x = -0.5 + Math.sin(t + Math.PI) * 0.3;
      if (lArm) lArm.rotation.x = -0.5 + Math.sin(t) * 0.3;
      // Cute head bobble
      if (headGrp) {
        headGrp.rotation.z = Math.sin(t * 0.7) * 0.1;
        headGrp.rotation.x = Math.sin(t * 0.5) * 0.06;
      }
      // Body waddle
      this.mesh.rotation.z = Math.sin(t) * 0.05;
      this.mesh.position.y = this.position.y + Math.abs(Math.sin(t * 2)) * 0.04;
      // Limp when badly hurt (arm fallen)
      if (this.armFallen) {
        this.mesh.rotation.z = Math.sin(t) * 0.15;
        this.mesh.position.y = this.position.y + Math.abs(Math.sin(t)) * 0.08;
        if (rLeg) rLeg.rotation.x = Math.sin(t) * 0.2;
      }
    } else {
      // Cute nom-nom attack
      const at = Math.sin(Date.now() * 0.01) * 0.6;
      if (rArm) rArm.rotation.x = -0.8 + at;
      if (lArm) lArm.rotation.x = -0.8 - at;
      if (headGrp) {
        headGrp.rotation.x = -0.12 + Math.sin(Date.now() * 0.01) * 0.12;
      }
      this.mesh.rotation.x = 0.04;
    }

    // Fade in
    if (this.fadeIn > 0) {
      this.fadeIn -= dt * 2;
      if (this.fadeIn < 0) this.fadeIn = 0;
      this._setOpacity(this.mesh, 1 - this.fadeIn);
    }

    // Hit flash
    if (this.hitFlash > 0) {
      this.hitFlash -= dt * 5;
      if (this.hitFlash <= 0) {
        this.hitFlash = 0;
        this._traverseFlash(this.mesh, false);
      } else {
        this._traverseFlash(this.mesh, this.hitFlash > 0.2);
      }
    }

    super.update(dt);
  }

  _traverseFlash(obj, flash) {
    obj.children.forEach(c => {
      if (c.material && c.userData.origColor !== undefined) {
        c.material.color.setHex(flash ? 0xffffff : c.userData.origColor);
      }
      if (c.children && c.children.length > 0) {
        this._traverseFlash(c, flash);
      }
    });
  }

  _setOpacity(obj, opacity) {
    if (obj.material) {
      obj.material.transparent = true;
      obj.material.opacity = opacity;
    }
    if (obj.children) obj.children.forEach(c => this._setOpacity(c, opacity));
  }

  _storeOrigColors(obj) {
    obj.children.forEach(c => {
      if (c.material && c.userData.origColor === undefined) {
        c.userData.origColor = c.material.color.getHex();
      }
      if (c.children && c.children.length > 0) {
        this._storeOrigColors(c);
      }
    });
  }

  explodeDeath() {
    if (this.dying) return;
    this.dying = true;
    this.exploding = true;
    this.deathTimer = 0;
    // Scatter body parts violently
    const parts = [];
    while (this.mesh.children.length > 0) {
      const child = this.mesh.children[0];
      this.mesh.remove(child);
      child.position.add(this.mesh.position);
      child.rotation.copy(this.mesh.rotation);
      this.scene.add(child);
      const angle = Math.random() * Math.PI * 2;
      const upVel = 3 + Math.random() * 5;
      const outVel = 2 + Math.random() * 4;
      child.userData.vel = new THREE.Vector3(
        Math.cos(angle) * outVel,
        upVel,
        Math.sin(angle) * outVel
      );
      child.userData.rotVel = new THREE.Vector3(
        (Math.random() - 0.5) * 15,
        (Math.random() - 0.5) * 15,
        (Math.random() - 0.5) * 15
      );
      parts.push(child);
    }
    this.scene.remove(this.mesh);
    const scene = this.scene;
    let elapsed = 0;
    const animate = () => {
      const dt = 0.016;
      elapsed += dt;
      for (const p of parts) {
        p.position.add(p.userData.vel.clone().multiplyScalar(dt));
        p.userData.vel.y -= 12 * dt;
        p.rotation.x += p.userData.rotVel.x * dt;
        p.rotation.y += p.userData.rotVel.y * dt;
        p.rotation.z += p.userData.rotVel.z * dt;
        // Fade out
        const fade = Math.max(0, 1 - elapsed / 1.5);
        p.traverse(c => {
          if (c.material) {
            c.material.transparent = true;
            c.material.opacity = fade;
          }
        });
      }
      if (elapsed < 1.5) {
        requestAnimationFrame(animate);
      } else {
        for (const p of parts) scene.remove(p);
        this.alive = false;
      }
    };
    requestAnimationFrame(animate);
  }

  takeDamage(dmg, freeze) {
    if (this.dying) return;
    this.hp -= dmg;
    if (this.hitFlash > 0) {
      this._traverseFlash(this.mesh, false);
    }
    this.hitFlash = 0.4;
    this._storeOrigColors(this.mesh);
    if (freeze) {
      this.frozen = true;
      this.frozenTimer = 3;
      this.speed = this.baseSpeed * 0.4;
      this._applyFreezeColor(true);
    }
    // Check if headgear should be damaged
    if (!this.headgearDamaged) {
      const shouldDamage = (this.type === 'conehead' && this.hp <= 15) ||
                           (this.type === 'buckethead' && this.hp <= 20);
      if (shouldDamage) {
        this.headgearDamaged = true;
        this._damageHeadgear();
      }
    }
    // Check if headgear should fall off
    if (!this.headgearFallen) {
      const shouldFall = (this.type === 'conehead' && this.hp <= 10) ||
                         (this.type === 'buckethead' && this.hp <= 10);
      if (shouldFall) {
        this.headgearFallen = true;
        this._dropHeadgear();
      }
    }
    // Check if arm should fall off at 5 hp
    if (!this.armFallen && this.hp <= 5 && this.hp > 0) {
      this.armFallen = true;
      this._dropArm();
    }
    if (this.hp <= 0) {
      this.dying = true;
      this.deathTimer = 0;
      this.deathDuration = 0.6;
    }
  }

  _applyFreezeColor(frozen) {
    this.mesh.traverse(c => {
      if (c.isMesh && c.material) {
        if (frozen) {
          if (c.userData._preFreezeColor === undefined) {
            c.userData._preFreezeColor = c.material.color.getHex();
            c.userData._preFreezeEmissive = c.material.emissive ? c.material.emissive.getHex() : 0;
          }
          const orig = c.userData._preFreezeColor;
          const r = ((orig >> 16) & 0xff) / 255;
          const g = ((orig >> 8) & 0xff) / 255;
          const b = (orig & 0xff) / 255;
          c.material = c.material.clone();
          c.material.color.setRGB(r * 0.35, g * 0.45, Math.min(1, b * 0.4 + 0.55));
          c.material.emissive = new THREE.Color(0x224488);
          c.material.emissiveIntensity = 0.25;
        } else {
          if (c.userData._preFreezeColor !== undefined) {
            c.material = c.material.clone();
            c.material.color.setHex(c.userData._preFreezeColor);
            c.material.emissive = new THREE.Color(c.userData._preFreezeEmissive);
            c.material.emissiveIntensity = 0;
            delete c.userData._preFreezeColor;
            delete c.userData._preFreezeEmissive;
          }
        }
      }
    });
    // Re-store orig colors for hit flash
    this._clearOrigColors(this.mesh);
    this._storeOrigColors(this.mesh);
  }

  _clearOrigColors(obj) {
    obj.children.forEach(c => {
      if (c.material) c.userData.origColor = undefined;
      if (c.children && c.children.length > 0) this._clearOrigColors(c);
    });
  }

  _damageHeadgear() {
    const headGroup = this.mesh.children[1];
    if (!headGroup) return;
    const lastChild = headGroup.children[headGroup.children.length - 1];
    if (!lastChild || !lastChild.isGroup) return;
    // Tilt the headgear to look crooked
    lastChild.rotation.z = 0.3;
    lastChild.rotation.x = 0.15;
    if (this.type === 'conehead') {
      // Crumple the cone - squash and bend it
      const cone = lastChild.children[0]; // main cone mesh
      if (cone) {
        cone.scale.set(1.15, 0.7, 0.85); // squashed shorter and wider
        cone.rotation.z = 0.2;
      }
      const coneBase = lastChild.children[1]; // base
      if (coneBase) {
        coneBase.scale.set(1.1, 1.3, 0.9); // warped base
        coneBase.rotation.z = -0.1;
      }
      // Bend the stripes to look crumpled
      if (lastChild.children[2]) lastChild.children[2].scale.set(1.2, 1, 0.8);
      if (lastChild.children[3]) lastChild.children[3].scale.set(0.8, 1, 1.2);
      // Squash the tip
      if (lastChild.children[4]) {
        lastChild.children[4].scale.set(1.5, 0.5, 1.5);
        lastChild.children[4].position.y = 0.72;
      }
    } else if (this.type === 'buckethead') {
      // Crumple the bucket - dent it inward and warp shape
      const bucket = lastChild.children[0]; // main cylinder
      if (bucket) {
        bucket.scale.set(0.85, 0.75, 1.1); // crushed inward on one side
        bucket.rotation.z = 0.15;
        bucket.rotation.x = 0.1;
      }
      const bucketRim = lastChild.children[1]; // rim
      if (bucketRim) {
        bucketRim.scale.set(0.9, 1.3, 1.1); // bent rim
        bucketRim.rotation.z = 0.1;
      }
      // Bend the handle
      if (lastChild.children[2]) {
        lastChild.children[2].scale.set(0.8, 1.2, 1);
        lastChild.children[2].rotation.z = 0.3;
      }
      // Enlarge dent to look like a big crumple
      if (lastChild.children[3]) {
        lastChild.children[3].scale.set(2, 1.5, 0.5);
        lastChild.children[3].position.set(0.15, 0.45, 0.25);
      }
    }
  }

  _dropArm() {
    // Make zombie look visibly hurt - darken skin significantly, change eyes
    this.mesh.traverse(c => {
      if (c.material && c.material.color) {
        const hex = c.material.color.getHex();
        // Darken green skin tones significantly
        if (hex === 0x88BB88 || hex === 0x99CC99 || hex === 0x77AA77) {
          c.material.color.setHex(0x557755);
          c.material.emissive = new THREE.Color(0x111100);
          c.material.emissiveIntensity = 0.3;
        }
        // Make eyes go red to show pain
        if (hex === 0xCCBB33) {
          c.material.color.setHex(0xCC3333);
        }
      }
    });
    // Tilt head droopily
    const headGroup = this.mesh.children[1];
    if (headGroup) {
      headGroup.rotation.z = 0.25;
      headGroup.position.x = 0.05;
    }
    // Drop the right arm (child 2)
    const armGroup = this.mesh.children[2];
    if (!armGroup) return;
    // Get world position BEFORE removing from hierarchy
    this.mesh.updateMatrixWorld(true);
    const worldPos = new THREE.Vector3();
    armGroup.getWorldPosition(worldPos);
    // Add a wound stump where arm was
    const phong = (color) => new THREE.MeshPhongMaterial({ color, shininess: 10 });
    const stump = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), phong(0x556B3F));
    stump.position.set(0.32, 0.1, 0.05);
    stump.scale.set(1, 0.7, 0.7);
    this.mesh.add(stump);
    const wound = new THREE.Mesh(new THREE.CircleGeometry(0.04, 6), phong(0x445533));
    wound.position.set(0.38, 0.1, 0.05);
    wound.rotation.y = Math.PI / 2;
    this.mesh.add(wound);
    this.mesh.remove(armGroup);
    armGroup.position.copy(worldPos);
    this.scene.add(armGroup);
    // Animate falling
    const vel = new THREE.Vector3((Math.random() - 0.5) * 1.5, 2, (Math.random() - 0.5) * 1.5);
    const rotVel = new THREE.Vector3((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10);
    const scene = this.scene;
    let elapsed = 0;
    const animate = () => {
      const dt = 0.016;
      elapsed += dt;
      armGroup.position.add(vel.clone().multiplyScalar(dt));
      vel.y -= 12 * dt;
      armGroup.rotation.x += rotVel.x * dt;
      armGroup.rotation.y += rotVel.y * dt;
      armGroup.rotation.z += rotVel.z * dt;
      if (elapsed > 1.0) {
        const fade = Math.max(0, 1 - (elapsed - 1.0) / 0.5);
        armGroup.traverse(c => {
          if (c.material) { c.material.transparent = true; c.material.opacity = fade; }
        });
      }
      if (elapsed < 1.5) {
        requestAnimationFrame(animate);
      } else {
        scene.remove(armGroup);
      }
    };
    requestAnimationFrame(animate);
  }

  _dropHeadgear() {
    const headGroup = this.mesh.children[1];
    if (!headGroup) return;
    // Headgear is the last child of headGroup
    const lastChild = headGroup.children[headGroup.children.length - 1];
    if (!lastChild || !lastChild.isGroup) return;
    const gear = lastChild;
    headGroup.remove(gear);
    // Position gear in world space
    const worldPos = new THREE.Vector3();
    headGroup.getWorldPosition(worldPos);
    gear.position.copy(worldPos);
    gear.position.y += 0.4;
    this.scene.add(gear);
    // Animate falling off
    const vel = new THREE.Vector3((Math.random() - 0.5) * 2, 3, (Math.random() - 0.5) * 2);
    const rotVel = new THREE.Vector3((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);
    const scene = this.scene;
    let elapsed = 0;
    const animate = () => {
      const dt = 0.016;
      elapsed += dt;
      gear.position.add(vel.clone().multiplyScalar(dt));
      vel.y -= 12 * dt;
      gear.rotation.x += rotVel.x * dt;
      gear.rotation.y += rotVel.y * dt;
      gear.rotation.z += rotVel.z * dt;
      if (elapsed > 1.0) {
        const fade = Math.max(0, 1 - (elapsed - 1.0) / 0.5);
        gear.traverse(c => {
          if (c.material) { c.material.transparent = true; c.material.opacity = fade; }
        });
      }
      if (elapsed < 1.5) {
        requestAnimationFrame(animate);
      } else {
        scene.remove(gear);
      }
    };
    requestAnimationFrame(animate);
  }
}
