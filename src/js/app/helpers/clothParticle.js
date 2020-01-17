import {
  Vector3
} from 'three';

var DAMPING = 0.03;
var DRAG = 1 - DAMPING;

export default class ClothParticle {
  constructor(x, y, z, clothFunction) {
    this.position = new Vector3();
    this.previous = new Vector3();
    this.original = new Vector3();
    this.force = new Vector3(0, 0, 0); // acceleration
    this.tmp = new Vector3();
    this.tmp2 = new Vector3();
    // init
    clothFunction(x, y, this.position); // position
    clothFunction(x, y, this.previous); // previous
    clothFunction(x, y, this.original);
  }
  // Force -> Acceleration
  addForce(force) {
    this.force.add(this.tmp2.copy(force).multiplyScalar(100));
  }
  // Performs Verlet integration
  integrate(delta) {
    var newPos = this.position
      .clone()
      .sub(this.previous)
      .multiplyScalar(DRAG)
      .add(this.position)
      .add(this.force.multiplyScalar(delta));
    this.previous = this.position;
    this.position = newPos;
    this.force.set(0, 0, 0);
  }
}
