export const MODEL_NAMESPACE = 'https://www.exosett.com/xml/model';
export const SKETCH_NAMESPACE = 'https://www.exosett.com/xml/app/sketch';
export const FORMAT_VERSION = '0.1.0';

export const LIMITS = {
  minWide: 1,
  maxWide: 20,
  minHigh: 1,
  maxHigh: 10,
  minServiceGap: 0,
  maxServiceGap: 3,
} as const;

// Provisional visual-study values carried over from exosett_cad, not engineering requirements.
export const DIMENSIONS_METRES = {
  accommodationCell: { width: 2.798, depth: 5.918, height: 3.487 },
  serviceCell: { width: 2.798, depth: 1.6, height: 3.487 },
  interFrameGap: 0.3,
  module1CCC: { width: 2.438, depth: 6.058, height: 2.896 },
} as const;

export interface Vector3Data {
  x: number;
  y: number;
  z: number;
}

export interface CameraState {
  position: Vector3Data;
  target: Vector3Data;
}

export const FACADE_STYLES = [
  { id: 'brick-window', label: 'Brick with window', form: 'window', surface: 'brick' },
  { id: 'stone-bars', label: 'Stone with barred window', form: 'barred-window', surface: 'stone' },
  { id: 'timber-balcony', label: 'Timber with balcony', form: 'balcony', surface: 'timber' },
] as const;

export type FacadeStyleId = (typeof FACADE_STYLES)[number]['id'];

export interface FacadeState {
  styleId: FacadeStyleId;
}

export interface SketchModel {
  cellsWide: number;
  cellsHigh: number;
  layout?: BuildingLayout;
  serviceGap?: number;
  facade?: FacadeState;
  roof?: RoofType;
  camera?: CameraState;
}

export const ROOF_TYPES = [
  { id: 'none', label: 'None' },
  { id: 'flat', label: 'Flat' },
  { id: 'gable', label: 'Gable' },
  { id: 'space-frame', label: 'Space frame' },
] as const;

export type RoofType = (typeof ROOF_TYPES)[number]['id'];

export function isRoofType(value: string): value is RoofType {
  return ROOF_TYPES.some((roof) => roof.id === value);
}

export function allowedRoofTypes(model: Pick<SketchModel, 'layout' | 'serviceGap'>): RoofType[] {
  return model.layout === 'quadrangle' || (model.layout === 'double' && (model.serviceGap ?? 0) > 0)
    ? ['none', 'space-frame']
    : ['none', 'flat', 'gable'];
}

export function normalizedRoofType(
  model: Pick<SketchModel, 'layout' | 'serviceGap' | 'roof'>,
): RoofType {
  const allowed = allowedRoofTypes(model);
  return model.roof && allowed.includes(model.roof) ? model.roof : allowed[0]!;
}

export const BUILDING_LAYOUTS = [
  { id: 'single', label: 'One pair' },
  { id: 'double', label: 'Two facing pairs' },
  { id: 'quadrangle', label: 'Four-pair quadrangle' },
] as const;

export type BuildingLayout = (typeof BUILDING_LAYOUTS)[number]['id'];

export function isBuildingLayout(value: string): value is BuildingLayout {
  return BUILDING_LAYOUTS.some((layout) => layout.id === value);
}

export function isFacadeStyleId(value: string): value is FacadeStyleId {
  return FACADE_STYLES.some((style) => style.id === value);
}

export const DEFAULT_MODEL: SketchModel = {
  cellsWide: 5,
  cellsHigh: 3,
  layout: 'single',
  serviceGap: 0,
  roof: 'none',
};

export function validateCellCount(
  value: number,
  minimum: number,
  maximum: number,
  label: string,
): number {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${label} must be a whole number from ${minimum} to ${maximum}.`);
  }
  return value;
}

export function validateModel(model: SketchModel): SketchModel {
  const layout = model.layout ?? 'single';
  if (!isBuildingLayout(layout)) throw new Error('Building layout is unsupported.');
  const serviceGap = validateCellCount(
    model.serviceGap ?? 0,
    LIMITS.minServiceGap,
    LIMITS.maxServiceGap,
    'Service-frame gap',
  );
  return {
    ...model,
    cellsWide: validateCellCount(model.cellsWide, LIMITS.minWide, LIMITS.maxWide, 'Cells wide'),
    cellsHigh: validateCellCount(model.cellsHigh, LIMITS.minHigh, LIMITS.maxHigh, 'Cells high'),
    layout,
    serviceGap,
    roof: normalizedRoofType({ ...model, layout, serviceGap }),
  };
}
