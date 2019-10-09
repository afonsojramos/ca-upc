import * as THREE from "three";

export default class Particle {
  constructor(x, y, z, size, scene) {
    this.currPosition = { x, y, z };
    this.prevPosition = { x: 0, y: 0, z: 0 };
    this.velocity = { x: 0, y: 0, z: 0 };
    this.force = { x: 0, y: 0, z: 0 };
    this.bouncing = 1;
    this.lifetime = 50;
    this.fixed = false;

    const geometry = new THREE.BoxGeometry(size, size, size);
    const color = 0x44aa88;
    const material = new THREE.MeshPhongMaterial({ color });
    const particle = new THREE.Mesh(geometry, material);
    scene.add(particle);

    particle.position.x = this.currPosition.x;
    particle.position.y = this.currPosition.y;
    particle.position.z = this.currPosition.z;
  }
}
