import type * as THREE from 'three';
import type { SketchModel } from '../model/model';

export interface SketchPresentation {
  group: THREE.Group;
  bounds: THREE.Box3;
  dispose(): void;
}

export interface SketchExtension {
  model: SketchModel;
  greeting: string;
  createPresentation(): SketchPresentation;
}

// Only the selected extension is fetched; ordinary Sketch never imports its scene code.
const extensions: Record<string, () => Promise<SketchExtension>> = {
  '2026xmas': async () => (await import('./2026xmas')).createExtension(),
};

export async function extensionFromUrl(url: URL): Promise<SketchExtension | undefined> {
  const keys = [...url.searchParams.keys()];
  if (keys.length !== 1 || url.searchParams.get(keys[0]!) !== '') return undefined;
  return Object.hasOwn(extensions, keys[0]!) ? extensions[keys[0]!]!() : undefined;
}
