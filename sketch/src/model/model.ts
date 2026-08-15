export const MODEL_NAMESPACE = 'https://www.exosett.com/xml/model';
export const SKETCH_NAMESPACE = 'https://www.exosett.com/xml/app/sketch';
export const FORMAT_VERSION = '0.1.0';

export const LIMITS = {
  minWide: 1,
  maxWide: 20,
  minHigh: 1,
  maxHigh: 7,
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

export interface SketchModel {
  cellsWide: number;
  cellsHigh: number;
  camera?: CameraState;
}

export const DEFAULT_MODEL: SketchModel = {
  cellsWide: 5,
  cellsHigh: 3,
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
  return {
    ...model,
    cellsWide: validateCellCount(model.cellsWide, LIMITS.minWide, LIMITS.maxWide, 'Cells wide'),
    cellsHigh: validateCellCount(model.cellsHigh, LIMITS.minHigh, LIMITS.maxHigh, 'Cells high'),
  };
}
