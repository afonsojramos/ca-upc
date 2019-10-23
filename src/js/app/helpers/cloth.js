import ClothParticle from './clothParticle';

var restDistance = 2.5;
var xSegs = 10;
var ySegs = 10;
var clothFunction = plane(restDistance * xSegs, restDistance * ySegs);

export function plane(width, height) {
  return function(u, v, target) {
    var x = (u - 0.5) * width;
    var y = (v + 0.5) * height - 25;
    var z = 0;
    target.set(x, y, z);
  };
}

export default class Cloth {
  constructor(w, h, restDistance) {
    w = w || 10;
    h = h || 10;
    this.w = w;
    this.h = h;
    this.clothFunction = plane(restDistance * xSegs, restDistance * ySegs);
    var particles = [];
    var constraints = [];
    var u, v;
    // Create particles
    for (v = h; v >= 0; v--) {
      for (u = w; u >= 0; u--) {
        particles.push(new ClothParticle(u / w, v / h, 0, clothFunction));
      }
    }
    // Structural
    for (v = 0; v < h; v++) {
      for (u = 0; u < w; u++) {
        constraints.push([particles[index(u, v)], particles[index(u, v + 1)], restDistance]);
        constraints.push([particles[index(u, v)], particles[index(u + 1, v)], restDistance]);
      }
    }
    for (u = w, v = 0; v < h; v++) {
      constraints.push([particles[index(u, v)], particles[index(u, v + 1)], restDistance]);
    }
    for (v = h, u = 0; u < w; u++) {
      constraints.push([particles[index(u, v)], particles[index(u + 1, v)], restDistance]);
    }
    this.particles = particles;
    this.constraints = constraints;
    function index(u, v) {
      return u + v * (w + 1);
    }
    this.index = index;
  }
}
