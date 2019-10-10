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

  detectColision({ currPosition, prevPosition }) {
    if (this.geo.type == 'PlaneGeometry') {
      if (
        (prevPosition.x > this.mesh.position.x && currPosition.x < this.mesh.position.x) ||
        (prevPosition.y > this.mesh.position.y && currPosition.y < this.mesh.position.y) ||
        (prevPosition.z > this.mesh.position.z && currPosition.z < this.mesh.position.z) ||
        (prevPosition.x < this.mesh.position.x && currPosition.x > this.mesh.position.x) ||
        (prevPosition.y < this.mesh.position.y && currPosition.y > this.mesh.position.y) ||
        (prevPosition.z < this.mesh.position.z && currPosition.z > this.mesh.position.z)
      )
        return true;
    } else if (this.geo.type == 'SphereGeometry') {
      var distance = Math.sqrt(
        (currPosition.x - this.mesh.position.x) * (currPosition.x - this.mesh.position.x) +
          (currPosition.y - this.mesh.position.y) * (currPosition.y - this.mesh.position.y) +
          (currPosition.z - this.mesh.position.z) * (currPosition.z - this.mesh.position.z)
      );
      return distance < this.geo.collRadius;
    } else if (this.geo.type == 'Geometry') {
      if (currPosition.y < this.mesh.position.y) return true;
    }
  }

    this.scene.add(mesh);
  }
}
