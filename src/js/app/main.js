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

    this.initEngine();

    this.init();

    this.createEnvironment();

    // Start render which does not wait for model fully loaded
    this.render();
  }

  initEngine() {
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
        new Interaction(this.renderer.threeRenderer, this.scene, this.camera.threeCamera, this.controls.threeControls);

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

  init() {
    this.params = {
      SphereSize: 1,
      Movement: 0,
      ParticleNumber: 1,
      ParticleFreq: 25,
      Reset: false,
      Bomb: false
    };

    const maxParticles = 5000;
    // eslint-disable-next-line no-undef
    this.gui = new dat.GUI();

    const settings = this.gui.addFolder('Settings');
    settings.add(this.params, 'SphereSize', 0.1, 2, 0.1);
    settings.add(this.params, 'Movement', { 'Simple Euler': 0, 'Semi Euler': 1, Verlet: 2 });
    settings.add(this.params, 'ParticleNumber', 100, maxParticles, 100);
    settings.add(this.params, 'ParticleFreq', 1, 100, 2);
    settings.open();
    const controls = this.gui.addFolder('Controls');
    controls.add(this.params, 'Bomb');
    controls.add(this.params, 'Reset');
    controls.open();

    this.deltaSum = 0;
    this.particleFreq = 0.001;
    this.particles = [];
    this.aliveParticles = 0;
    for (let nParticle = 0; nParticle < maxParticles; nParticle++) {
      this.particles[nParticle] = new Particle(0, 100, 0, 1, this.scene);
    }
  }

  createEnvironment() {
    const base = new Geometry(this.scene);
    base.make('plane')(140, 140, 10, 10);
    base.makePlane(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.1, 1, 0));
    base.draw();

    /* const base2 = new Geometry(this.scene);
    base2.make('plane')(140, 140, 10, 10);
    base2.makePlane(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0)); */

    const sphere = new Geometry(this.scene);
    sphere.make('sphere')(10);
    sphere.place([0, -2, -6.5], [Math.PI / 2, 0, 0], 0.8, 0x00ff00);
    sphere.draw();

    const triangle = new Geometry(this.scene);
    triangle.make('triangle')(
      new THREE.Vector3(11, 30, 6),
      new THREE.Vector3(0, 15, -5),
      new THREE.Vector3(-11, 30, 6)
    );
    triangle.makePlane(new THREE.Vector3(0, 0, 0), triangle.normal, [0, 0, 0], 0xff0000);
    triangle.draw();

    /* const base3 = new Geometry(this.scene);
    base3.make('plane')(140, 140, 10, 10);
    base3.makePlane(new THREE.Vector3(0, 0, 0), triangle.normal); */

    this.geometries = [];
    this.geometries.push(base, triangle /* sphere, */ /* triangle */);
  }

  particleFountain(delta) {
    this.deltaSum += delta;

    this.particles
      .filter(particle => {
        if (particle.lifetime > 0) {
          return false;
        }
        return true;
      })
      .map(particle => {
        if (this.aliveParticles < this.params.ParticleNumber && this.deltaSum > 1 / this.params.ParticleFreq) {
          const randX = Math.floor(Math.random() * (0.5 + 0.5 + 1)) - 0.5;
          const randZ = Math.floor(Math.random() * (0.5 + 0.5 + 1)) - 0.5;
          particle.setPosition(0, 40, 0);
          const randv = Math.random(this.clock.getDelta()) * (5 + 5 + 1) - 5;
          const randv2 = Math.random(this.clock.getDelta()) * (5 + 5 + 1) - 5;
          particle.setVelocity(0, 20, 3);
          particle.setForce(0, -10, 0);
          particle.setLifetime(50);
          particle.previousPosition = particle.currPosition
            .clone()
            .sub(particle.velocity.clone().multiplyScalar(delta));

          this.aliveParticles++;
          this.deltaSum = 0;
        } else return;
      });
  }

  resetGuiParticles() {
    this.particles.map(particle => {
      particle.setPosition(100, 100, 100);
      particle.setFixed();
      particle.setLifetime(0);
      particle.render();
    });

    this.aliveParticles = 0;
    this.params.Reset = false;
    this.updateButtons();
  }

  bomb(delta) {
    this.particles.map(particle => {
      const randX = Math.floor(Math.random() * (10 + 10 + 1)) - 10;
      const randY = Math.floor(Math.random() * (40 + 30 + 1)) - 30;
      const randZ = Math.floor(Math.random() * (4 + 4 + 1)) - 4;
      particle.setPosition(randX, randY, randZ);
      const randv = Math.random(this.clock.getDelta()) * (5 + 5 + 1) - 5;
      const randv2 = Math.random(this.clock.getDelta()) * (5 + 5 + 1) - 5;
      particle.setVelocity(randv, 20, randv2);
      particle.setForce(0, -10, 0);
      particle.setLifetime(50);
      particle.previousPosition = particle.currPosition.clone().sub(particle.velocity.clone().multiplyScalar(delta));
    });

    this.params.Bomb = false;
    this.updateButtons();
  }

  updateButtons() {
    Object.keys(this.gui.__folders).map(key => {
      this.gui.__folders[key].__controllers.map(guiObject => {
        guiObject.updateDisplay();
      });
    });
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
    if (this.params.Reset) this.resetGuiParticles(delta);
    if (this.params.Bomb) this.bomb(delta);

    this.particleFountain(delta);

    this.geometries.find(({ geo, mesh }) => {
      if (geo.type === 'SphereGeometry') {
        mesh.scale.set(this.params.SphereSize, this.params.SphereSize, this.params.SphereSize);
        geo.collRadius = geo.radius * this.params.SphereSize;
        return;
      }
    });

    this.particles
      .filter(particle => {
        if (particle.lifetime > 0) {
          return true;
        }
        return false;
      })
      .map(particle => {
        particle.updateParticle(delta, this.params.Movement);

        this.geometries.map(geometry => {
          geometry.collide(particle);
        });

        particle.render();
      });

    // RAF
    requestAnimationFrame(this.render.bind(this)); // Bind the main class instead of window object
  }
}
