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

    this.init();

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
    const base = new Geometry(this.scene);
    base.make('plane')(100, 100, 10, 10);
    base.place([0, -2, 0], [Math.PI / 1.9, 0, 0]);

    const sphere = new Geometry(this.scene);
    sphere.make('sphere')(10);
    sphere.place([0, -2, -6.5], [Math.PI / 2, 0, 0], 0.8, 0x00ff00);

    const triangle = new Geometry(this.scene);
    const point1 = new THREE.Vector3(11, -2, 6);
    const point2 = new THREE.Vector3(0, 15, -5);
    const point3 = new THREE.Vector3(-11, -2, 6);
    triangle.make('triangle')(point1, point2, point3);
  }

  particleFountain() {
    this.particles = [];
    for (let i = 0; i < 100; i++) {
      var randX = Math.floor(Math.random() * (5 + 5 + 1)) - 5;
      var randZ = Math.floor(Math.random() * (5 + 5 + 1)) - 5;
      this.particles[i] = new Particle(randX, 40, randZ, 1, this.scene);
      var randv = Math.random(this.clock.getDelta()) * (-2 + 5 + 1) - 5;
      this.particles[i].setVelocity(0, randv, 0);
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

    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].updateParticle(delta, 'EulerOrig');
    }
    // RAF
    requestAnimationFrame(this.render.bind(this)); // Bind the main class instead of window object
  }
}
