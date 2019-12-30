import * as THREE from 'three';

export default class Particle {
  constructor(x, y, z, size, scene) {
    this.currPosition = new THREE.Vector3(x, y, z);
    this.prevPosition = new THREE.Vector3(0, 0, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.force = new THREE.Vector3(0, 0, 0);
    this.bouncing = 0.3;
    this.lifetime = 0;
    this.fixed = false;

    const geometry = new THREE.BoxGeometry(size, size, size);
    const color = new THREE.Color(0xffffff);
    color.setHex(Math.random() * 0xffffff);
    const material = new THREE.MeshPhongMaterial({
      color
    });
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

  updateParticle(delta, method) {
    if (!this.fixed && this.lifetime > 0) {
      // EulerOrig
      if (method == 0) {
        this.prevPosition = this.currPosition.clone();
        this.currPosition.add(this.velocity.clone().multiplyScalar(delta));
        this.velocity.add(this.force.clone().multiplyScalar(delta));
      }
      // EulerSemi
      else if (method == 1) {
        this.prevPosition = this.currPosition.clone();
        this.velocity.add(this.force.clone().multiplyScalar(delta));
        this.currPosition.add(this.velocity.clone().multiplyScalar(delta));
      }
      // Verlet
      else if (method == 2) {
        const pos = this.currPosition.clone();
        this.currPosition = this.currPosition
          .clone()
          .multiplyScalar(2)
          .sub(this.prevPosition)
          .add(this.force.clone().multiplyScalar(delta * delta));
        this.velocity = this.currPosition
          .clone()
          .sub(this.prevPosition)
          .divideScalar(delta);
        this.prevPosition = pos;
      }
    }
    return;
  }

  render() {
    this.particle.position.set(this.currPosition.x, this.currPosition.y, this.currPosition.z);
  }
}
