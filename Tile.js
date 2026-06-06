class Tile extends GameObject3D {
  constructor(scene, row, col) {
    super(scene);
    this.name = 'Tile';
    this.row = row;
    this.col = col;
    this.plant = null;
    this.position.set(col * 2 - 8, 0.05, row * 2 - 4);
    this.createMesh();
  }
  createMesh() {
    const geo = new THREE.BoxGeometry(1.8, 0.1, 1.8);
    const light = (this.row + this.col) % 2 === 0;
    const mat = new THREE.MeshLambertMaterial({ color: light ? 0x5da840 : 0x4a8c30 });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.copy(this.position);
    this.mesh.receiveShadow = true;
    this.scene.add(this.mesh);
  }
}
