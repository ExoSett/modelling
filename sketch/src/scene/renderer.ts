import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { CameraState, SketchModel } from '../model/model';
import { buildBuilding, disposeBuilding } from './building';
import { buildExampleModule, MODULE_TRAVEL } from './example-module';

export class SketchRenderer {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(38, 1, 0.05, 1000);
  private readonly renderer: THREE.WebGLRenderer;
  private readonly controls: OrbitControls;
  private readonly resizeObserver: ResizeObserver;
  private readonly sun = new THREE.DirectionalLight(0xffffff, 3.2);
  private building?: THREE.Group;
  private requestedFrame?: number;

  private example?: ReturnType<typeof buildExampleModule>;
  private showExample = true;
  private hasFacade = false;
  private withdrawn = false;
  private motion?: { start: number; from: number; to: number };
  private demonstrationBounds?: THREE.Box3;
  onExampleChange?: () => void;

  exampleState(): { visible: boolean; withdrawn: boolean; moving: boolean } {
    return {
      visible: this.showExample && !this.hasFacade,
      withdrawn: this.withdrawn,
      moving: !!this.motion,
    };
  }

  showModule(show: boolean): void {
    this.showExample = show;
    this.motion = undefined;
    this.withdrawn = false;
    this.demonstrationBounds = undefined;
    if (this.example) {
      this.example.group.visible = show && !this.hasFacade;
      this.example.module.position.y = 0;
    }
    this.fitShadowCamera();
    this.requestRender();
    this.onExampleChange?.();
  }

  moveModule(): void {
    if (!this.example || !this.exampleState().visible || this.motion || !this.building) return;
    // Fit the whole travel once, then keep the camera steady during movement.
    const module = this.example.module;
    const previousY = module.position.y;
    module.position.y = 0;
    const bounds = new THREE.Box3().setFromObject(this.building);
    module.position.y = -MODULE_TRAVEL;
    bounds.union(new THREE.Box3().setFromObject(this.building));
    module.position.y = previousY;
    this.demonstrationBounds = bounds;
    this.fitShadowCamera();
    this.fitView(this.camera.position.clone().sub(this.controls.target).normalize());
    this.withdrawn = !this.withdrawn;
    const to = this.withdrawn ? -MODULE_TRAVEL : 0;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) module.position.y = to;
    else this.motion = { start: performance.now(), from: previousY, to };
    this.requestRender();
    this.onExampleChange?.();
  }

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0xf5f5f3, 1);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.camera.up.set(0, 0, 1);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.screenSpacePanning = false;
    this.controls.addEventListener('change', () => this.requestRender());

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x858585, 2.4));
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.025;
    this.scene.add(this.sun, this.sun.target);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(180, 180),
      new THREE.MeshStandardMaterial({ color: 0xededeb, roughness: 1 }),
    );
    ground.receiveShadow = true;
    ground.position.z = -0.12;
    this.scene.add(ground);

    const grid = new THREE.GridHelper(180, 90, 0xb8b8b5, 0xd2d2cf);
    grid.rotation.x = Math.PI / 2;
    grid.position.z = -0.1;
    this.scene.add(grid);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas.parentElement ?? canvas);
    this.resize();
  }

  setModel(model: SketchModel, cameraState?: CameraState, reframe = false): void {
    const previousCenter = this.building
      ? (this.demonstrationBounds ?? new THREE.Box3().setFromObject(this.building)).getCenter(
          new THREE.Vector3(),
        )
      : undefined;
    if (this.building) {
      this.scene.remove(this.building);
      disposeBuilding(this.building);
    }
    this.motion = undefined;
    this.withdrawn = false;
    this.demonstrationBounds = undefined;
    this.hasFacade = !!model.facade;
    this.building = buildBuilding(model);
    this.example = buildExampleModule();
    this.example.group.visible = this.showExample && !this.hasFacade;
    this.building.children[0]!.children[0]!.add(this.example.group);
    this.scene.add(this.building);
    this.fitShadowCamera();

    if (reframe && previousCenter) {
      const direction = this.camera.position.clone().sub(this.controls.target).normalize();
      const panOffset = this.controls.target.clone().sub(previousCenter);
      this.fitView(direction, panOffset);
    } else if (cameraState) this.setCameraState(cameraState);
    else this.resetView();
    this.onExampleChange?.();
  }

  private fitShadowCamera(): void {
    if (!this.building) return;
    const sphere = (
      this.demonstrationBounds ?? new THREE.Box3().setFromObject(this.building)
    ).getBoundingSphere(new THREE.Sphere());
    const radius = Math.max(sphere.radius, 3);
    const lightOffset = new THREE.Vector3(-16, -20, 28).normalize().multiplyScalar(radius * 2.5);
    const extent = radius * 1.2;

    this.sun.target.position.copy(sphere.center);
    this.sun.position.copy(sphere.center).add(lightOffset);
    this.sun.shadow.camera.left = -extent;
    this.sun.shadow.camera.right = extent;
    this.sun.shadow.camera.top = extent;
    this.sun.shadow.camera.bottom = -extent;
    this.sun.shadow.camera.near = Math.max(radius * 0.1, 0.5);
    this.sun.shadow.camera.far = radius * 5;
    this.sun.shadow.camera.updateProjectionMatrix();
    this.sun.shadow.needsUpdate = true;
  }

  resetView(): void {
    this.fitView(new THREE.Vector3(1, -1.25, 0.85).normalize());
  }

  private fitView(viewDirection: THREE.Vector3, panOffset = new THREE.Vector3()): void {
    if (!this.building) return;
    // Discard pending orbit/pan inertia before applying the retained view.
    const damping = this.controls.enableDamping;
    this.controls.enableDamping = false;
    this.controls.update();
    this.controls.enableDamping = damping;
    const box = this.demonstrationBounds ?? new THREE.Box3().setFromObject(this.building);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    // Enclose the building around the retained orbit target, including a user's pan.
    const radius = Math.max(sphere.radius + panOffset.length(), 3);
    const verticalFov = THREE.MathUtils.degToRad(this.camera.fov);
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * this.camera.aspect);
    const fittingFov = Math.min(verticalFov, horizontalFov);
    const distance = (radius / Math.sin(fittingFov / 2)) * 1.08;
    this.controls.target.copy(sphere.center).add(panOffset);
    this.camera.position.copy(this.controls.target).addScaledVector(viewDirection, distance);
    this.camera.near = Math.max(radius / 100, 0.05);
    this.camera.far = radius * 25;
    this.camera.updateProjectionMatrix();
    this.controls.minDistance = radius * 0.25;
    this.controls.maxDistance = Math.max(radius * 8, distance * 1.1);
    this.controls.update();
    this.requestRender();
  }

  cameraState(): CameraState {
    return {
      position: this.vectorData(this.camera.position),
      target: this.vectorData(this.controls.target),
    };
  }

  setCameraState(state: CameraState): void {
    this.camera.position.set(state.position.x, state.position.y, state.position.z);
    this.controls.target.set(state.target.x, state.target.y, state.target.z);
    this.controls.update();
    this.requestRender();
  }

  downloadPng(filename: string): void {
    this.render();
    this.canvas.toBlob((blob) => {
      if (!blob) throw new Error('The browser could not create the PNG image.');
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  }

  private resize(): void {
    const width = Math.max(this.canvas.clientWidth, 1);
    const height = Math.max(this.canvas.clientHeight, 1);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    // Resizing must not advance residual orbit damping on an otherwise idle view.
    // Active gestures continue through their existing animation-frame requests.
    this.render();
  }

  private requestRender(): void {
    if (this.requestedFrame !== undefined) return;
    this.requestedFrame = requestAnimationFrame(() => {
      this.requestedFrame = undefined;
      if (this.motion && this.example) {
        const t = Math.min((performance.now() - this.motion.start) / 1800, 1);
        const eased = t * t * (3 - 2 * t);
        this.example.module.position.y = THREE.MathUtils.lerp(
          this.motion.from,
          this.motion.to,
          eased,
        );
        if (t === 1) {
          this.motion = undefined;
          this.onExampleChange?.();
        } else this.requestRender();
      }
      this.controls.update();
      this.render();
    });
  }

  private render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  private vectorData(vector: THREE.Vector3): { x: number; y: number; z: number } {
    return { x: vector.x, y: vector.y, z: vector.z };
  }
}
