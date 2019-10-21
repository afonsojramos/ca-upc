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
      color: 0xffeeee,
      side: THREE.DoubleSide
    });
    this.mesh = new THREE.Mesh(this.geo, material);

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

  collide(particle) {
    const { currPosition, prevPosition, velocity, bouncing } = particle;

    switch (this.geo.type) {
      case 'PlaneGeometry': {
        const dist = this.normal.clone().dot(currPosition) + this.dconst;
        if (dist >= 0) break;

        currPosition.sub(this.normal.clone().multiplyScalar((1 + bouncing) * dist));

        const dtVelocity = this.normal.clone().dot(velocity) + this.dconst;
        velocity.sub(this.normal.clone().multiplyScalar((1 + bouncing) * dtVelocity));

        particle.setPreviousPosition(this.getMirrorPoint(particle));

        this.isOutOfBounds(currPosition);
        break;
      }

      case 'SphereGeometry': {
        if (currPosition.distanceTo(this.mesh.position) < this.geo.collRadius) {
          const intersection = this.getSphereIntersectionPoint(currPosition, prevPosition);
          this.dconst = -this.normal.clone().dot(intersection);

          const dist = this.normal.clone().dot(currPosition) + this.dconst;
          currPosition.sub(this.normal.clone().multiplyScalar((1 + bouncing) * dist));

          const dtVelocity = this.normal.clone().dot(velocity) + this.dconst;
          velocity.sub(this.normal.clone().multiplyScalar((1 + bouncing) * dtVelocity));

          particle.setPreviousPosition(this.getMirrorPoint(particle));
        }
        break;
      }

      case 'Geometry': {
        const dist = this.normal.clone().dot(currPosition) + this.dconst;
        const intersection = this.intersectWithPlane(currPosition, prevPosition);

        const barycentricValue =
          this.getBarycentricProduct(intersection, this.geo.vertices[1], this.geo.vertices[2]) +
          this.getBarycentricProduct(this.geo.vertices[0], intersection, this.geo.vertices[2]) +
          this.getBarycentricProduct(this.geo.vertices[0], this.geo.vertices[1], intersection) -
          this.getBarycentricProduct(this.geo.vertices[0], this.geo.vertices[1], this.geo.vertices[2]);

        if (barycentricValue < 0) {
          console.log('triangle coll');
          currPosition.sub(this.normal.clone().multiplyScalar((1 + bouncing) * dist));

          const dtVelocity = this.normal.clone().dot(velocity) + this.dconst;
          velocity.sub(this.normal.clone().multiplyScalar((1 + bouncing) * dtVelocity));

          particle.setPreviousPosition(this.getMirrorPoint(particle));
        }
        break;
      }

      default:
        break;
    }
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

    //u is an alpha from the course slides
    const exp = b * b - 4 * a * c;
    const u1 = ((-b + Math.sqrt(exp)) / 2) * a;
    const u2 = ((-b - Math.sqrt(exp)) / 2) * a;
    var u;

    if (u1 >= 0 && u1 <= 1 && u2 >= 0 && u2 <= 1) {
      u = Math.min(u1, u2);
    } else if (u1 >= 0 && u1 <= 1) {
      u = u1;
    } else if (u2 >= 0 && u2 <= 1) {
      u = u2;
    } else {
      console.log("Segment doesn't intersect the sphere! Check the collision detection code!");
    }

    const intersection = prevPosition.clone().add(vectorDelta.multiplyScalar(u));
    this.normal = intersection
      .clone()
      .subVectors(intersection, this.mesh.position)
      .normalize();

    return intersection;
  }

  intersectWithPlane(currPosition, prevPosition) {
    const diffPlanePoint = new THREE.Vector3();
    diffPlanePoint.subVectors(prevPosition, this.geo.vertices[0]);

    const segment = new THREE.Vector3();
    segment.subVectors(currPosition, prevPosition);

    const a1 = -diffPlanePoint.dot(this.normal) / segment.dot(this.normal);

    const sum1 = new THREE.Vector3();
    sum1.addVectors(diffPlanePoint, this.geo.vertices[0]);
    segment.multiplyScalar(a1);
    return sum1.add(segment);
  }

  distPoint2Plane(point) {
    return point.clone().dot(this.normal) + this.dconst;
  }

  intersecSegment(point1, point2) {
    if (this.distPoint2Plane(point1) * this.distPoint2Plane(point2) > 0) return false;
    const r =
      (-this.dconst - point1.clone().dot(this.normal)) /
      point2
        .clone()
        .sub(point1)
        .dot(this.normal);
    const intersectionPoint = (1 - r) * point1 + r * point2;
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
        point.x > this.mesh.position.x + this.geo.width ||
        point.x < this.mesh.position.x - this.geo.width ||
        point.z > this.mesh.position.z + this.geo.width ||
        point.z < this.mesh.position.z - this.geo.width
      ) {
        return true;
      }
    }
  }
}
