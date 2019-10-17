import * as THREE from 'three';

export default class Particle {
  constructor(x, y, z, size, scene) {
    this.currPosition = new THREE.Vector3(x, y, z);
    this.prevPosition = new THREE.Vector3(0, 0, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.force = new THREE.Vector3(0, 0, 0);
    this.bouncing = 0.8;
    this.lifetime = 50;
    this.fixed = false;

    const geometry = new THREE.BoxGeometry(size, size, size);
    const color = new THREE.Color(0xffffff);
    color.setHex(Math.random() * 0xffffff);
    const material = new THREE.MeshPhongMaterial({ color });
    this.particle = new THREE.Mesh(geometry, material);
    this.particle.position.set(this.currPosition.x, this.currPosition.y, this.currPosition.z);
    scene.add(this.particle);
  }

  //setters
  setPosition(x, y, z) {
    this.currPosition = new THREE.Vector3(x, y, z);
  }

  setPreviousPosition(x, y, z) {
    this.prevPosition = new THREE.Vector3(x, y, z);
  }

  setForce(fx, fy, fz) {
    this.force = new THREE.Vector3(fx, fy, fz);
  }

  addForce(fx, fy, fz) {
    this.force.add(fx, fy, fz);
  }

  setVelocity(vx, vy, vz) {
    this.velocity = new THREE.Vector3(vx, vy, vz);
  }

  setBouncing(bouncing) {
    this.bouncing = bouncing;
  }

  setLifetime(lifetime) {
    this.lifetime = lifetime;
  }

  setFixed(fixed) {
    this.fixed = fixed;
  }

  updateParticle(delta, method /*"EulerOrig" "EulerSemi" "Verlet"*/) {
    if (!this.fixed & (this.lifetime > 0)) {
      switch (method) {
        case (method = 0):
          {
            this.prevPosition = this.currPosition.clone();
            this.currPosition.add(this.velocity.clone().multiplyScalar(delta));
            this.velocity.add(this.force.clone().multiplyScalar(delta));
          }
          break;
        case (method = 1):
          {
            // to be implemented
          }
          break;
        case (method = 2):
          {
            // to be implemented
          }
          break;
      }
      this.particle.position.set(this.currPosition.x, this.currPosition.y, this.currPosition.z);
    }
    return;
  }
}
