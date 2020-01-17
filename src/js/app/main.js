// Global imports -
import {
  BoxBufferGeometry,
  BoxGeometry,
  Clock,
  Color,
  DoubleSide,
  FogExp2,
  LoadingManager,
  Mesh,
  MeshBasicMaterial,
  MeshDepthMaterial,
  MeshLambertMaterial,
  ParametricBufferGeometry,
  PlaneBufferGeometry,
  RGBADepthPacking,
  Scene,
  SphereBufferGeometry,
  Vector3
} from 'three';
import TWEEN from 'tween.js';

// Local imports -
// Components
import Renderer from './components/renderer';
import Camera from './components/camera';
import Light from './components/light';
import Controls from './components/controls';

// Helpers
import Cloth from './helpers/cloth';
import Geo from './helpers/geometry';
import GUIHelper from './helpers/guiHelper';
import Particle from './helpers/particle';
import Stats from './helpers/stats';

// Model
import Texture from './model/texture';
import Model from './model/model';

// Managers
import Interaction from './managers/interaction';
import DatGUI from './managers/datGUI';

// data
import Config from '../data/config';

var GRAVITY = 9.81;

// This class instantiates and ties all of the components together, starts the loading process and renders the main loop
export default class Main {
  constructor(container) {
    // Set container property to container element
    this.container = container;

    this.initEngine();

    this.init();

    this.createEnvironment();

    this.controleCube();

    // Start render which does not wait for model fully loaded
    this.render();
  }

  controleCube() {
    this.createCube();
    this.drag = 0.01;
    const cube = this.gui.addFolder('Cube');
    this.cubeRed.position.set(0.01, 25.01, 0.01);
    cube.add(this.cubeRed.position, 'x', -5.0, 5.0).step(0.01).listen();
    cube.add(this.cubeRed.position, 'y', 5.0, 25.0).step(0.01).listen();
    cube.add(this.cubeRed.position, 'z', -5.0, 5.0).step(0.01).listen();
    cube.add(this, 'drag', -5.0, 5.0).step(0.01).listen();
    //gui.add(controlObject.quaternion, 'x', -1.0, 1.0).step(0.01).listen();
    cube.open();
  }

  initEngine() {
    // Start Three clock
    this.clock = new Clock();

    // Main scene creation
    this.scene = new Scene();
    this.scene.background = new Color(Config.fog.color);
    this.scene.fog = new FogExp2(Config.fog.color, Config.fog.near, Config.fog.far);

    // GUI
    // eslint-disable-next-line no-undef
    this.gui = new dat.GUI();

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

    // Check existence of Textures
    if (GUIHelper.checkObjectIsEmpty(Config.texture, this.container)) return;

    // Start loading the textures and then go on to load the model after the texture Promises have resolved
    this.texture.load().then(() => {
      this.manager = new LoadingManager();

      // Check existence of Models
      if (GUIHelper.checkObjectIsEmpty(Config.model, this.container)) return;

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
      Project: 1,
      SphereSize: 1,
      Movement: 0,
      Bounce: 0.3,
      ParticleNumber: 100,
      ParticleFreq: 25,
      NodeMass: 1,
      Ball: false,
      Wind: false,
      Reset: false,
      Bomb: false
    };

    const maxParticles = 5000;

    const project = this.gui.addFolder('Project Settings');
    project.add(this.params, 'Project', {
      'Particles & Cloth': 1,
      Animation: 2
    });
    project.open();
    const settings = this.gui.addFolder('Settings');
    settings.add(this.params, 'SphereSize', 0.1, 2, 0.1);
    settings.add(this.params, 'Movement', {
      'Simple Euler': 0,
      'Semi Euler': 1,
      Verlet: 2
    });
    settings.add(this.params, 'Bounce', 0.1, 1, 0.1);
    settings.add(this.params, 'ParticleNumber', 100, maxParticles, 100);
    settings.add(this.params, 'ParticleFreq', 1, 100, 2);
    settings.add(this.params, 'NodeMass', 1, 10, 0.5);
    settings.open();
    const controls = this.gui.addFolder('Controls');
    controls.add(this.params, 'Ball');
    controls.add(this.params, 'Wind');
    controls.add(this.params, 'Bomb');
    controls.add(this.params, 'Reset');
    controls.open();
    this.guimenu = [];
    this.guimenu.push(project, settings, controls);

    this.deltaSum = 0;
    this.particles = [];
    this.aliveParticles = 0;
    for (let nParticle = 0; nParticle < maxParticles; nParticle++) {
      this.particles[nParticle] = new Particle(0, 100, 0, 1, this.scene);
    }

    this.pins = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  }

  createEnvironment() {
    const base = new Geo(this.scene);
    base.make('plane')(140, 140, 10, 10);
    base.placePlane(new Vector3(0, 0, 0), new Vector3(0.1, 1, 0));

    const sphere = new Geo(this.scene);
    sphere.make('sphere')(10);
    sphere.placeSphere([0, -2, -6.5]);

    const triangle = new Geo(this.scene);
    triangle.make('triangle')(
      new Vector3(11, 30, 20),
      new Vector3(0, 15, -5),
      new Vector3(-11, 30, 20)
    );
    triangle.placeTriangle();

    this.geometries = [];
    this.geometries.push(base, sphere, triangle);

    var restDistance = 2.5;
    var xSegs = 10;
    var ySegs = 10;
    this.cloth = new Cloth(xSegs, ySegs, restDistance);

    // cloth material
    var clothMaterial = new MeshLambertMaterial({
      side: DoubleSide,
      alphaTest: 0.5,
      wireframe: true
    });
    // cloth geometry
    this.clothGeometry = new ParametricBufferGeometry(this.cloth.clothFunction, this.cloth.w, this.cloth.h);
    // cloth mesh
    this.clothObject = new Mesh(this.clothGeometry, clothMaterial);

    this.clothObject.position.set(-50, 21.5, 0);
    this.clothObject.castShadow = true;
    this.scene.add(this.clothObject);
    this.clothObject.customDepthMaterial = new MeshDepthMaterial({
      depthPacking: RGBADepthPacking,
      alphaTest: 0.5
    });

    // Ball
    this.ballSize = 4;
    const ballGeo = new SphereBufferGeometry(this.ballSize, 32, 16);
    const ballMaterial = new MeshLambertMaterial();
    this.ball = new Mesh(ballGeo, ballMaterial);
    this.ball.castShadow = true;
    this.ball.receiveShadow = true;
    this.ball.visible = false;
    this.scene.add(this.ball);

    // Poles
    const poleGeo = new BoxBufferGeometry(0.5, 37.5, 0.5);
    const poleMat = new MeshLambertMaterial();
    const pole1 = new Mesh(poleGeo, poleMat);
    pole1.position.x = -12.5 + this.clothObject.position.x;
    pole1.position.y = 15;
    pole1.receiveShadow = true;
    pole1.castShadow = true;
    this.scene.add(pole1);

    const pole2 = new Mesh(poleGeo, poleMat);
    pole2.position.x = 12.5 + this.clothObject.position.x;
    pole2.position.y = 15;
    pole2.receiveShadow = true;
    pole2.castShadow = true;
    this.scene.add(pole2);

    const topBar = new Mesh(new BoxBufferGeometry(25.5, 0.5, 0.5), poleMat);
    topBar.position.x = 0 + this.clothObject.position.x;
    topBar.position.y = 34;
    topBar.receiveShadow = true;
    topBar.castShadow = true;
    this.scene.add(topBar);

    this.bars = [];
    this.bars.push(pole1, pole2, topBar);

    this.gravity = new Vector3(0, -GRAVITY, 0).multiplyScalar(this.params.NodeMass);
    this.windForce = new Vector3(0, 0, 0);
    this.ballPosition = new Vector3(0, 0, 0);
    this.ballSize = 4; //40
  }

  createCube() {
    const geo = new PlaneBufferGeometry(200, 200, 8, 8);
    const mat = new MeshBasicMaterial({
      color: 0x000000,
      side: DoubleSide
    });
    this.rigidPlane = new Mesh(geo, mat);
    this.rigidPlane.rotateX(-Math.PI / 2);

    this.scene.add(this.rigidPlane);

    const cubeGeometry = new BoxGeometry(10, 10, 10);
    const cubeMaterial = new MeshBasicMaterial({
      wireframe: true
    });
    cubeMaterial.color = new Color('red');
    this.cubeRed = new Mesh(cubeGeometry, cubeMaterial);
    this.cubeRed.name = 'cubeRed';

    this.scene.add(this.cubeRed);

    this.cube = {
      m: 1, // Cube mass in kg
      rho: 1.2, // Density of air.
      cubeDrag: 1.05, // Drag for ball is 0.47. Cube is 1.05
      A: 60 / 1e4, // Surface area for cube is 6a^2
      vx: 0,
      ax: 0,
      vy: 0,
      ay: 0,
      vz: 0,
      az: 0,
      e: -1.5, // Coefficient of restitution ("bounciness")
      height: 10,
      r: 4
    };
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
          const randX = Math.random() * (0.3 + 0.3 + 1) - 0.3;
          const randZ = Math.random() * (0.3 + 0.3 + 1) - 0.3;
          const randv = Math.random() * (4 + 4 + 1) - 4;
          particle.setPosition(randX, 40, randZ);
          particle.setVelocity(randX, 20, randv);
          particle.setForce(0, -10, 0);
          particle.setLifetime(50);
          particle.prevPosition = particle.currPosition.clone().sub(particle.velocity.clone().multiplyScalar(delta));

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
    GUIHelper.updateButtons(this.gui);
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
    GUIHelper.updateButtons(this.gui);
  }

  satisfyConstraints(p1, p2, distance) {
    var diff = new Vector3();
    diff.subVectors(p2.position, p1.position);
    var currentDist = diff.length();
    if (currentDist === 0) return; // prevents division by 0
    var correction = diff.multiplyScalar(1 - distance / currentDist);
    var correctionHalf = correction.multiplyScalar(0.5);
    p1.position.add(correctionHalf);
    p2.position.sub(correctionHalf);
  }

  simulate(time, delta) {
    //WIND Aerodynamics forces

    if (this.params.Wind) {
      var tmpForce = new Vector3();
      var normal = new Vector3();
      var indices = this.clothGeometry.index;

      for (var i = 0; i < indices.count; i += 2) {
        for (var j = 0; j < 2; j++) {
          var indx = indices.getX(i + j);
          normal.fromBufferAttribute(this.clothGeometry.attributes.normal, indx);
          tmpForce
            .copy(normal)
            .normalize()
            .multiplyScalar(normal.dot(this.windForce));
          this.cloth.particles[indx].addForce(tmpForce);
        }
      }
    }
    this.gravity = new Vector3(0, -GRAVITY, 0).multiplyScalar(this.params.NodeMass);

    this.cloth.particles.map(particle => {
      particle.addForce(this.gravity);
      particle.integrate(delta * delta * delta);
    });

    // Start Constraints
    this.cloth.constraints.map(constraint => {
      this.satisfyConstraints(constraint[0], constraint[1], constraint[2]);
    });

    // Ball Constraints
    if (this.params.Ball) {
      this.ball.visible = true;
      this.ballPosition.z = -Math.sin(time / 600) * 9;
      this.ballPosition.x = Math.cos(time / 400) * 5;
      this.cloth.particles.map(({
        position
      }) => {
        var diff = new Vector3();

        diff.subVectors(position, this.ballPosition);
        if (diff.length() < this.ballSize) {
          // collided
          diff.normalize().multiplyScalar(this.ballSize);
          position.copy(this.ballPosition).add(diff);
        }
      });
    } else {
      this.ball.visible = false;
    }

    // Floor Constraints
    this.cloth.particles.map(({
      position
    }) => {
      if (position.y < -25) {
        position.y = -25;
      }
    });

    this.pins.map(pin => {
      var p = this.cloth.particles[pin];
      p.position.copy(p.original);
      p.previous.copy(p.original);
    });
  }

  visibilityProject(show) {
    this.clothObject.visible = show;
    this.geometries.map(({
      mesh
    }) => (mesh.visible = show));
    this.bars.map(mesh => (mesh.visible = show));
    this.particles.map(particle => (particle.particle.visible = show));
    this.params.Ball && show ? this.ball.visible = show : this.ball.visible = false
    this.cubeRed.visible = !show;
    this.rigidPlane.visible = !show;
  }

  renderProj1(time, delta) {
    this.visibilityProject(true);
    if (this.params.Reset) this.resetGuiParticles(delta);
    if (this.params.Bomb) this.bomb(delta);

    var windStrength = Math.cos(time / 7000) * 10;
    this.windForce.set(Math.sin(time / 2000), Math.cos(time / 3000), Math.sin(time / 1000));
    this.windForce.normalize();
    this.windForce.multiplyScalar(windStrength);

    this.simulate(time, delta);

    for (var i = 0, il = this.cloth.particles.length; i < il; i++) {
      var v = this.cloth.particles[i].position;
      this.clothGeometry.attributes.position.setXYZ(i, v.x, v.y, v.z);
    }

    this.clothGeometry.attributes.position.needsUpdate = true;
    this.clothGeometry.computeVertexNormals();

    this.ball.position.copy(this.ballPosition);
    this.ball.position.add(this.clothObject.position);

    this.geometries.map(({
      geo,
      mesh
    }) => {
      if (geo.type === 'SphereGeometry') {
        mesh.scale.set(this.params.SphereSize, this.params.SphereSize, this.params.SphereSize);
        geo.collRadius = geo.radius * this.params.SphereSize;
        return;
      }
    });

    this.particleFountain(delta);

    this.particles
      .filter(particle => {
        if (particle.lifetime > 0) {
          return true;
        }
        return false;
      })
      .map(particle => {
        particle.setBouncing(this.params.Bounce);
        particle.updateParticle(delta, this.params.Movement);

        this.geometries.map(geometry => {
          geometry.checkCollision(particle);
        });

        particle.render();
      });
  }

  renderProj2(time, delta) {
    this.visibilityProject(false);

    var forcey = 0;

    /* Gravity of Earth */
    forcey += this.cube.m * 9.81;

    /* Air resistance force; this would affect both x- and y-directions, but we're only looking at the y-axis in this example. */
    // https://en.wikipedia.org/wiki/Drag_(physics)
    var drag = -0.5 * this.cube.rho * this.cube.cubeDrag * this.cube.A * this.cube.vy * this.cube.vy;
    this.drag = drag;
    forcey += drag;

    /* Verlet integration for the y-direction */
    var dx = this.cube.vx * delta + (0.5 * this.cube.ax * delta * delta);
    var dy = this.cube.vy * delta + (0.5 * this.cube.ay * delta * delta);
    var dz = this.cube.vz * delta + (0.5 * this.cube.az * delta * delta);

    if (this.cubeRed.position.y + this.cube.r <= this.cube.height && this.cube.vy > 0) {
      /* This is a simplification of impulse-momentum collision response. e should be a negative number, which will change the velocity's direction. */
      this.cube.vy *= this.cube.e;
      /* Move the ball back a little bit so it's not still "stuck" in the wall. */
      this.cubeRed.position.y = this.cube.height - this.cube.r;
    } else {
      /* The following line is because the math assumes meters but we're assuming 1 cm per pixel, so we need to scale the results */
      this.cubeRed.position.x -= dx;
      this.cubeRed.position.y -= dy;
      this.cubeRed.position.z -= dz;
      var newAccelY = forcey / this.cube.m;
      var avgAccelY = 0.5 * (newAccelY + this.cube.ay);
      this.cube.vy += avgAccelY * delta;
      
      var tempy = this.cubeRed.position.y - forcey / 100;
      tempy >= 5 ? this.cubeRed.position.y = tempy : this.cubeRed.position.y = 5;
    }
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
    const delta = this.clock.getDelta();

    // Call any vendor or module frame updates here
    TWEEN.update();
    this.controls.threeControls.update();

    if (this.params.Project == 1) {
      this.renderProj1(time, delta);
    } else if (this.params.Project == 2) {
      this.renderProj2(time, delta);
    }

    // RAF
    requestAnimationFrame(this.render.bind(this)); // Bind the main class instead of window object
  }
}
