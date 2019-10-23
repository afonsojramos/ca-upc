import * as THREE from 'three';

import Material from './material';

import Config from '../../data/config';

// This helper class can be used to create and then place geometry in the scene
export default class Geometry {
  constructor(scene) {
    this.scene = scene;
    this.geo = null;
  }

  make(type) {
    if (type === 'plane') {
      return (width, height, widthSegments = 1, heightSegments = 1) => {
        this.geo = new THREE.PlaneGeometry(width, height, widthSegments, heightSegments);
      };
    }

    if (type === 'sphere') {
      return (radius, widthSegments = 32, heightSegments = 32) => {
        this.geo = new THREE.SphereGeometry(radius, widthSegments, heightSegments);
        this.geo.radius = radius;
        this.geo.collRadius = radius;
      };
    }

    if (type === 'triangle') {
      return (point1, point2, point3) => {
        this.geo = new THREE.Geometry();
        this.triangle = new THREE.Triangle(point1, point2, point3);
        this.geo.vertices.push(this.triangle.a);
        this.geo.vertices.push(this.triangle.b);
        this.geo.vertices.push(this.triangle.c);

        // Calculate triangle characteristics
        this.normal = new THREE.Vector3();
        this.triangle.getNormal(this.normal);
        this.geo.faces.push(new THREE.Face3(0, 1, 2, this.normal));
        this.geo.computeFaceNormals();
        this.dconst = -this.normal.clone().dot(point1);
      };
    }
  }

  placeSphere(position, rotation) {
    // Create mesh with the geometry
    const material = new Material(0x00ff00).standard;
    material.opacity = 0.8;
    material.transparent = true;
    this.mesh = new THREE.Mesh(this.geo, material);

    // Positions Sphere
    this.mesh.position.set(...position);
    if (rotation) this.mesh.rotation.set(...rotation);

    if (Config.shadow.enabled) {
      this.mesh.receiveShadow = true;
    }

    // Add mesh to scene
    this.scene.add(this.mesh);
  }

  placeTriangle() {
    // Create mesh with the geometry
    const material = new THREE.MeshLambertMaterial({
      color: 0xff0000,
      side: THREE.DoubleSide
    });
    this.mesh = new THREE.Mesh(this.geo, material);
    this.mesh.receiveShadow = true;
    this.mesh.castShadow = true;

    // Load the Triangle Plane
    this.plane = new THREE.Plane();
    this.triangle.getPlane(this.plane);

    // Add mesh to scene
    this.scene.add(this.mesh);
  }

  placePlane(point, dir) {
    // Create plane
    this.position = point;
    const plane = new THREE.Plane();
    plane.setFromNormalAndCoplanarPoint(dir, point).normalize();
    this.normal = dir;
    this.dconst = -dir.dot(point);

    // Align the geometry to the plane
    const coplanarPoint = plane.coplanarPoint(point);
    const focalPoint = new THREE.Vector3().copy(coplanarPoint).add(plane.normal);
    this.geo.lookAt(focalPoint);

    // Create mesh with the geometry
    const planeMaterial = new THREE.MeshLambertMaterial({
      color: 0xffff00,
      side: THREE.DoubleSide
    });
    this.mesh = new THREE.Mesh(this.geo, planeMaterial);

    // Add mesh to scene
    this.scene.add(this.mesh);
  }

  checkCollision(particle) {
    const { currPosition, prevPosition, velocity, bouncing } = particle;

    if (this.geo.type == 'PlaneGeometry') {
      const dist = this.normal.clone().dot(currPosition) + this.dconst;

      dist < 0 && this.collide({ currPosition, velocity, bouncing }, dist);
    } else if (this.geo.type == 'SphereGeometry' && currPosition.distanceTo(this.mesh.position) < this.geo.collRadius) {
      const intersection = this.getSphereIntersectionPoint(currPosition, prevPosition);
      this.dconst = -this.normal.clone().dot(intersection);
      const dist = this.normal.clone().dot(currPosition) + this.dconst;

      this.collide({ currPosition, velocity, bouncing }, dist);
    } else if (this.geo.type == 'Geometry') {
      const dist = this.normal.clone().dot(currPosition) + this.dconst;
      const intersection = this.intersecSegment(currPosition, prevPosition);

      if (intersection) {
        // three.js has barycentric product funcion built-in, but opted to do it from scratch
        const barycentricValue =
          this.getBarycentricProduct(intersection, this.geo.vertices[1], this.geo.vertices[2]) +
          this.getBarycentricProduct(this.geo.vertices[0], intersection, this.geo.vertices[2]) +
          this.getBarycentricProduct(this.geo.vertices[0], this.geo.vertices[1], intersection) -
          this.getBarycentricProduct(this.geo.vertices[0], this.geo.vertices[1], this.geo.vertices[2]);

        barycentricValue < 1 && dist < 0 && this.collide({ currPosition, velocity, bouncing }, dist);
      }
    }
  }

  collide({ currPosition, velocity, bouncing }, dist) {
    currPosition.sub(this.normal.clone().multiplyScalar((1 + bouncing) * dist));

    const dtVelocity = this.normal.clone().dot(velocity) + this.dconst;
    velocity.sub(this.normal.clone().multiplyScalar((1 + bouncing) * dtVelocity));
  }

  getMirrorPoint({ prevPosition }) {
    return prevPosition - 2 * (this.normal.clone().dot(prevPosition) + this.dconst) * this.normal;
  }

  getSphereIntersectionPoint(currentPosition, prevPosition) {
    const vectorDelta = currentPosition.clone().sub(prevPosition);
    const a = vectorDelta.clone().dot(vectorDelta);
    const b = 2 * vectorDelta.clone().dot(prevPosition.clone().sub(this.mesh.position));
    const c =
      this.mesh.position.clone().dot(this.mesh.position) +
      prevPosition.clone().dot(prevPosition) -
      2 * prevPosition.clone().dot(this.mesh.position) -
      this.geo.collRadius * this.geo.collRadius;

    const exp = b * b - 4 * a * c;
    const alpha1 = ((-b + Math.sqrt(exp)) / 2) * a;
    const alpha2 = ((-b - Math.sqrt(exp)) / 2) * a;
    var alpha;

    if (alpha1 >= 0 && alpha1 <= 1 && alpha2 >= 0 && alpha2 <= 1) {
      alpha = Math.min(alpha1, alpha2);
    } else if (alpha1 >= 0 && alpha1 <= 1) {
      alpha = alpha1;
    } else if (alpha2 >= 0 && alpha2 <= 1) {
      alpha = alpha2;
    } else {
      console.log("Segment doesn't intersect the sphere! Check the collision detection code!");
    }

    const intersection = prevPosition.clone().add(vectorDelta.multiplyScalar(alpha));
    // normal at intersection point
    this.normal = intersection
      .clone()
      .subVectors(intersection, this.mesh.position)
      .normalize();

    return intersection;
  }

  distPoint2Plane(point) {
    return point.clone().dot(this.normal) + this.dconst;
  }

  intersecSegment(currPosition, prevPosition) {
    if (this.distPoint2Plane(currPosition) * this.distPoint2Plane(prevPosition) > 0) return false;
    const r = (-this.dconst - this.normal.dot(currPosition)) / this.normal.dot(prevPosition.clone().sub(currPosition));
    const intersectionPoint = currPosition
      .clone()
      .multiplyScalar(1 - r)
      .add(prevPosition.clone().multiplyScalar(r));

    return intersectionPoint;
  }

  getBarycentricProduct(v1, v2, v3) {
    const barycentricProduct =
      v2
        .clone()
        .sub(v1)
        .cross(v3.clone().sub(v1))
        .length() / 2;
    return barycentricProduct;
  }

  isOutOfBounds(point) {
    if (this.geo.type == 'PlaneGeometry') {
      if (
        /* If b,c,d,e are a rectangle and a is coplanar with them, you need only check that ⟨b,c−b⟩≤⟨a,c−b⟩≤⟨c,c−b⟩ and ⟨b,e−b⟩≤⟨a,e−b⟩≤⟨e,e−b⟩ (where ⟨,⟩ denotes scalar product). */
        point.x > this.mesh.position.x + this.geo.width ||
        point.x < this.mesh.position.x - this.geo.width ||
        point.z > this.mesh.position.z + this.geo.width ||
        point.z < this.mesh.position.z - this.geo.width
      )
        return true;
    }
  }
}
