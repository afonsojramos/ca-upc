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
        this.geo.vertices.push(point1);
        this.geo.vertices.push(point2);
        this.geo.vertices.push(point3);
        this.geo.faces.push(new THREE.Face3(0, 1, 2));
        this.geo.faces.push(new THREE.Face3(2, 1, 0));
        this.normal = point2
          .clone()
          .sub(point1)
          .cross(point3.clone().sub(point1))
          .normalize();
        this.dconst = -this.normal.clone().dot(point1);
      };
    }
  }

  place(position, rotation, opacity, color = 0xeeeeee) {
    const material = new Material(color).standard;
    if (opacity) {
      material.opacity = opacity;
      material.transparent = true;
    }
    this.mesh = new THREE.Mesh(this.geo, material);

    this.mesh.position.set(...position);
    this.mesh.rotation.set(...rotation);

    if (Config.shadow.enabled) {
      this.mesh.receiveShadow = true;
    }
    this.scene.add(this.mesh);
  }

  makePlane(point, dir) {
    // Create plane
    this.position = point;
    const plane = new THREE.Plane();
    plane.setFromNormalAndCoplanarPoint(dir, point).normalize();
    this.normal = dir;
    this.dconst = -dir.dot(point);

    // Align the geometry to the plane
    const coplanarPoint = plane.coplanarPoint();
    const focalPoint = new THREE.Vector3().copy(coplanarPoint).add(plane.normal);
    this.geo.lookAt(focalPoint);
    this.geo.translate(coplanarPoint.x, coplanarPoint.y, coplanarPoint.z);

    // Create mesh with the geometry
    const planeMaterial = new THREE.MeshLambertMaterial({
      color: 0xffff00,
      side: THREE.DoubleSide
    });
    this.mesh = new THREE.Mesh(this.geo, planeMaterial);
    this.scene.add(this.mesh);
  }

  detectColision({ currPosition, prevPosition }) {
    if (this.geo.type == 'PlaneGeometry') {
      const dist = this.normal.clone().dot(currPosition) + this.dconst;
      return dist < 0;
    } else if (this.geo.type == 'SphereGeometry') {
      var distance = Math.sqrt(
        (currPosition.x - this.mesh.position.x) * (currPosition.x - this.mesh.position.x) +
          (currPosition.y - this.mesh.position.y) * (currPosition.y - this.mesh.position.y) +
          (currPosition.z - this.mesh.position.z) * (currPosition.z - this.mesh.position.z)
      );
      return distance < this.geo.collRadius;
    } else if (this.geo.type == 'Geometry') {
      const dist = this.normal.clone().dot(currPosition) + this.dconst;
      const intersection = this.intersectWithPlane(currPosition, prevPosition);

      var A1 =
        0.5 *
        this.geo.vertices[1]
          .clone()
          .sub(intersection)
          .cross(this.geo.vertices[2].clone().sub(intersection))
          .length();
      var A2 =
        0.5 *
        intersection
          .clone()
          .sub(this.geo.vertices[0])
          .cross(this.geo.vertices[2].clone().sub(this.geo.vertices[0]))
          .length();
      var A3 =
        0.5 *
        this.geo.vertices[1]
          .clone()
          .sub(this.geo.vertices[0])
          .cross(intersection.clone().sub(this.geo.vertices[0]))
          .length();
      var A4 =
        0.5 *
        this.geo.vertices[1]
          .clone()
          .sub(this.geo.vertices[0])
          .cross(this.geo.vertices[2].clone().sub(this.geo.vertices[0]))
          .length();
      console.log(A1 + A2 + A3 - A4);

      return dist < 0 && A1 + A2 + A3 - A4 >= 0;
    }
  }

  intersectWithSegment(currPosition, prevPosition) {
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
