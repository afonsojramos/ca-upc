// Global imports -
import * as THREE from "three";
import TWEEN from "tween.js";

// Local imports -
// Components
import Renderer from "./components/renderer";
import Camera from "./components/camera";
import Light from "./components/light";
import Controls from "./components/controls";

// Helpers
import Geometry from "./helpers/geometry";
import Stats from "./helpers/stats";

// Model
import Texture from "./model/texture";
import Model from "./model/model";

// Managers
import Interaction from "./managers/interaction";
import DatGUI from "./managers/datGUI";

// data
import Config from "../data/config";
// -- End of imports

// This class instantiates and ties all of the components together, starts the loading process and renders the main loop
export default class Main {
  constructor(container) {
    // Set container property to container element
    this.container = container;

    this.init();

    this.particle();

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
    const lights = ["ambient", "directional", "point", "hemi"];
    lights.forEach(light => this.light.place(light));

    // Create and place geo in scene
    this.geometry = new Geometry(this.scene);
    this.geometry.make("plane")(150, 150, 10, 10);
    this.geometry.place([0, -2, 0], [Math.PI / 2, 0, 0]);

    // Set up rStats if dev environment
    if (Config.isDev && Config.isShowingStats) {
      this.stats = new Stats(this.renderer);
      this.stats.setUp();
    }

    // Instantiate texture class
    this.texture = new Texture();

    // Start loading the textures and then go on to load the model after the texture Promises have resolved
    if (!this.textures) {
      this.container.querySelector("#loading").style.display = "none";
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
        this.container.querySelector("#loading").style.display = "none";
      };
    });
  }

  particle() {
    const boxWidth = 1;
    const boxHeight = 1;
    const boxDepth = 1;
    const geometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);

    function makeInstance(scene, geometry, color, x) {
      const material = new THREE.MeshPhongMaterial({ color });

      const cube = new THREE.Mesh(geometry, material);
      scene.add(cube);

      cube.position.x = x;

      return cube;
    }

    this.cubes = [
      makeInstance(this.scene, geometry, 0x44aa88, 0),
      makeInstance(this.scene, geometry, 0x8844aa, -2),
      makeInstance(this.scene, geometry, 0xaa8844, 2)
    ];
  }

  render(time) {
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
    // const delta = this.clock.getDelta();
    time *= 0.001;

    // Call any vendor or module frame updates here
    TWEEN.update();
    this.controls.threeControls.update();

    if (this.cubes)
      this.cubes.forEach((cube, ndx) => {
        const speed = 1 + ndx * 0.1;
        const rot = time * speed;
        cube.position.y -= 0.0001;
        cube.rotation.x = rot;
        cube.rotation.y = rot;
      });

    // RAF
    requestAnimationFrame(this.render.bind(this)); // Bind the main class instead of window object
  }
}
