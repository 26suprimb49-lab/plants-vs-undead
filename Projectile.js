class Projectile extends GameObject3D {
  constructor(scene, x, y, z, row, frozen) {
    super(scene);
    this.name = 'Projectile';
    this.row = row;
    this.frozen = frozen || false;
    this.speed = 10;
    this.damage = 1;
    this.position.set(x, y, z);
    this.createMesh();
  }
  createMesh() {
    const color = this.frozen ? 0x44ccff : 0x00ff00;
    const geo = new THREE.SphereGeometry(0.12, 6, 6);
    const mat = new THREE.MeshLambertMaterial({ color, emissive: color, emissiveIntensity: 0.3 });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.copy(this.position);
    this.scene.add(this.mesh);
  }
  update(dt) {
    if (!this.alive) return;
    this.position.x += this.speed * dt;
    if (this.position.x > 14) this.destroy();
    // Check zombie collision
    const zombies = window.game.zombies;
    for (const z of zombies) {
      if (!z.alive || z.dying || z.row !== this.row) continue;
      if (Math.abs(this.position.x - z.position.x) < 0.5 && Math.abs(this.position.z - z.position.z) < 0.5) {
        z.takeDamage(this.damage, this.frozen);
        this.destroy();
        return;
      }
    }
    super.update(dt);
  }
}
