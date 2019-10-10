// Global imports -
import * as THREE from 'three';
import TWEEN from 'tween.js';

// Local imports -
// Components
import Renderer from './components/renderer';
import Camera from './components/camera';
import Light from './components/light';
import Controls from './components/controls';

// Helpers
import Geometry from './helpers/geometry';
import Stats from './helpers/stats';
import Particle from './helpers/particle';

// Model
import Texture from './model/texture';
import Model from './model/model';

// Managers
import Interaction from './managers/interaction';
import DatGUI from './managers/datGUI';

// data
import Config from '../data/config';
// -- End of imports

// This class instantiates and ties all of the components together, starts the loading process and renders the main loop
export default class Main {
  constructor(container) {
    // Set container property to container element
    this.container = container;

    this.params = {
      sphereSize: 1,
      movement: 0
    };

    this.init();
    var gui = new dat.GUI();

    gui.add(this.params, 'sphereSize', 0.1, 2, 0.1);
    gui.add(this.params, 'movement', { 'Simple Euler': 0, 'Semi Euler': 1, Verlet: 2 });

    this.createEnvironment();

    this.particleFountain();

    // Start render which does not wait for model fully loaded
    this.render();
  }

  init() {
    // Start Three clock
    this.clock = new THREE.Clock();

    // Main scene creation
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(Config.fog.color, Config.fog.near);

    // Get Device Pixel Ratio first for retina
    if (window.devicePixelRatio) {
      Config.dpr = window.devicePixelRatio;
    }

    // Main renderer constructor
    this.renderer = new Renderer(this.scene, this.container);

    // Components instantiations
    this.camera = new Camera(this.renderer.threeRenderer);
    this.controls = new Controls(this.camera.threeCamera, this.container);
    this.light = new Light(this.scene);

    // Create and place lights in scene
    const lights = ['ambient', 'directional', 'point', 'hemi'];
    lights.forEach(light => this.light.place(light));

    // Set up rStats if dev environment
    if (Config.isDev && Config.isShowingStats) {
      this.stats = new Stats(this.renderer);
      this.stats.setUp();
    }

    // Instantiate texture class
    this.texture = new Texture();

    // Start loading the textures and then go on to load the model after the texture Promises have resolved
    if (!this.textures) {
      this.container.querySelector('#loading').style.display = 'none';
      Config.isLoaded = true;
      return;
    }
    this.texture.load().then(() => {
      this.manager = new THREE.LoadingManager();

      // Textures loaded, load model
      this.model = new Model(this.scene, this.manager, this.texture.textures);
      this.model.load();

      // onProgress callback
      this.manager.onProgress = (item, loaded, total) => {
        console.log(`${item}: ${loaded} ${total}`);
      };

      // All loaders done now
      this.manager.onLoad = () => {
        // Set up interaction manager with the app now that the model is finished loading
        new Interaction(
          this.renderer.threeRenderer,
          this.scene,
          this.camera.threeCamera,
          this.controls.threeControls
        );

        // Add dat.GUI controls if dev
        if (Config.isDev) {
          new DatGUI(this, this.model.obj);
        }

        // Everything is now fully loaded
        Config.isLoaded = true;
        this.container.querySelector('#loading').style.display = 'none';
      };
    });
  }

  createEnvironment() {
    /* this.base = new Geometry(this.scene);
    this.base.make('plane')(100, 100, 10, 10);
    this.base.makePlane(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.1, 1, 0));

    this.sphere = new Geometry(this.scene);
    this.sphere.make('sphere')(10);
    this.sphere.place([0, -2, -6.5], [Math.PI / 2, 0, 0], 0.8, 0x00ff00); */

    this.triangle = new Geometry(this.scene);
    this.triangle.make('triangle')(
      new THREE.Vector3(11, -2, 6),
      new THREE.Vector3(0, 15, -5),
      new THREE.Vector3(-11, -2, 6)
    );
    this.triangle.place([0, 0, 0], [0, 0, 0], 1, 0xff0000);
  }

  particleFountain() {
    this.particles = [];
    for (let i = 0; i < 100; i++) {
      const randX = Math.floor(Math.random() * (7 + 7 + 1)) - 7;
      const randZ = Math.floor(Math.random() * (7 + 7 + 1)) - 7;
      this.particles[i] = new Particle(randX, 40, randZ, 1, this.scene);
      const randv = Math.random(this.clock.getDelta()) * (5 + 5 + 1) - 5;
      this.particles[i].setVelocity(0, randv, 0);
      this.particles[i].setForce(0, -10, 0);
    }
  }

  render() {
    // Render rStats if Dev
    if (Config.isDev && Config.isShowingStats) {
      Stats.start();
    }

    // Call render function and pass in created scene and camera
    this.renderer.render(this.scene, this.camera.threeCamera);

    // rStats has finished determining render call now
    if (Config.isDev && Config.isShowingStats) {
      Stats.end();
    }

    // Delta time is sometimes needed for certain updates
    const delta = this.clock.getDelta();

    // Call any vendor or module frame updates here
    TWEEN.update();
    this.controls.threeControls.update();

    if (this.sphere) {
      this.sphere.mesh.scale.set(
        this.params.sphereSize,
        this.params.sphereSize,
        this.params.sphereSize
      );
      this.sphere.geo.collRadius = this.sphere.geo.radius * this.params.sphereSize;
    }

    for (let i = 0; i < this.particles.length; i++) {
      i == 0 && this.particles[i].updateParticle(delta, this.params.movement);
      if (
        (this.base && this.base.detectColision(this.particles[i])) ||
        (this.triangle && i === 0 && this.triangle.detectColision(this.particles[i])) ||
        (this.sphere && this.sphere.detectColision(this.particles[i]))
      ) {
        const randX = Math.floor(Math.random() * (10 + 10 + 1)) - 10;
        const randZ = Math.floor(Math.random() * (10 + 10 + 1)) - 10;
        this.particles[i].setPosition(randX, 40, randZ);
        const randv = Math.random(this.clock.getDelta()) * (10 + 10 + 1) - 10;
        this.particles[i].setVelocity(0, randv, 0);
        /* this.particles[i].setVelocity(
          this.particles[i].velocity.x,
          this.particles[i].velocity.y,
          this.particles[i].velocity.z
        ); */
      }
      /* if (this.base.isOutOfBounds(this.particles[i].currPosition)) {
        const randX = Math.floor(Math.random() * (7 + 7 + 1)) - 7;
        const randZ = Math.floor(Math.random() * (7 + 7 + 1)) - 7;
        this.particles[i].setPosition(randX, 40, randZ);
        const randv = Math.random(this.clock.getDelta()) * (5 + 5 + 1) - 5;
        this.particles[i].setVelocity(0, randv, 0);
      } */
    }

    // RAF
    requestAnimationFrame(this.render.bind(this)); // Bind the main class instead of window object
  }
}
