import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { CameraState, SketchModel } from '../model/model';
import { buildFramePair, disposeFramePair } from './frame-pair';

export class SketchRenderer {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(38, 1, 0.05, 1000);
  private readonly renderer: THREE.WebGLRenderer;
  private readonly controls: OrbitControls;
  private readonly resizeObserver: ResizeObserver;
  private framePair?: THREE.Group;
  private requestedFrame?: number;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0xf1eee7, 1);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.camera.up.set(0, 0, 1);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.screenSpacePanning = false;
    this.controls.addEventListener('change', () => this.requestRender());

    this.scene.add(new THREE.HemisphereLight(0xfff7e7, 0x748487, 2.4));
    const sun = new THREE.DirectionalLight(0xffffff, 3.2);
    sun.position.set(-16, -20, 28);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 100;
    sun.shadow.camera.left = -35;
    sun.shadow.camera.right = 35;
    sun.shadow.camera.top = 35;
    sun.shadow.camera.bottom = -35;
    this.scene.add(sun);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(180, 180),
      new THREE.MeshStandardMaterial({ color: 0xdedbd2, roughness: 1 }),
    );
    ground.receiveShadow = true;
    ground.position.z = -0.12;
    this.scene.add(ground);

    const grid = new THREE.GridHelper(180, 90, 0xb8b5ad, 0xcecbc3);
    grid.rotation.x = Math.PI / 2;
    grid.position.z = -0.1;
    this.scene.add(grid);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas.parentElement ?? canvas);
    this.resize();
  }

  setModel(model: SketchModel, cameraState?: CameraState): void {
    if (this.framePair) {
      this.scene.remove(this.framePair);
      disposeFramePair(this.framePair);
    }
    this.framePair = buildFramePair(model);
    this.scene.add(this.framePair);

    if (cameraState) this.setCameraState(cameraState);
    else this.resetView();
  }

  resetView(): void {
    if (!this.framePair) return;
    const box = new THREE.Box3().setFromObject(this.framePair);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const radius = Math.max(sphere.radius, 3);
    const verticalFov = THREE.MathUtils.degToRad(this.camera.fov);
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * this.camera.aspect);
    const fittingFov = Math.min(verticalFov, horizontalFov);
    const distance = (radius / Math.sin(fittingFov / 2)) * 1.08;
    const viewDirection = new THREE.Vector3(1, -1.25, 0.85).normalize();
    this.controls.target.copy(sphere.center);
    this.camera.position.copy(sphere.center).addScaledVector(viewDirection, distance);
    this.camera.near = Math.max(radius / 100, 0.05);
    this.camera.far = radius * 25;
    this.camera.updateProjectionMatrix();
    this.controls.minDistance = radius * 0.25;
    this.controls.maxDistance = radius * 8;
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
    this.requestRender();
  }

  private requestRender(): void {
    if (this.requestedFrame !== undefined) return;
    this.requestedFrame = requestAnimationFrame(() => {
      this.requestedFrame = undefined;
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
