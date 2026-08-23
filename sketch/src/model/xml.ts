import {
  DIMENSIONS_METRES,
  FORMAT_VERSION,
  isFacadeStyleId,
  isBuildingLayout,
  isRoofType,
  normalizedRoofType,
  LIMITS,
  MODEL_NAMESPACE,
  SKETCH_NAMESPACE,
  type CameraState,
  type SketchModel,
  validateCellCount,
} from './model';
import { pairPlacements } from '../scene/building';

const XMLNS_NAMESPACE = 'http://www.w3.org/2000/xmlns/';

function requiredElement(parent: Document | Element, namespace: string, name: string): Element {
  const element = parent.getElementsByTagNameNS(namespace, name)[0];
  if (!element) throw new Error(`The XML is missing the required ${name} element.`);
  return element;
}

function requiredNumber(element: Element, attribute: string): number {
  const text = element.getAttribute(attribute);
  const value = text === null ? Number.NaN : Number(text);
  if (!Number.isFinite(value))
    throw new Error(`${element.localName}.${attribute} must be a number.`);
  return value;
}

function addDimensions(
  document: Document,
  parent: Element,
  dimensions: { width: number; height: number; depth: number },
): void {
  const element = document.createElementNS(MODEL_NAMESPACE, 'cellDimensions');
  element.setAttribute('width', String(dimensions.width));
  element.setAttribute('height', String(dimensions.height));
  element.setAttribute('depth', String(dimensions.depth));
  element.setAttribute('unit', 'm');
  parent.append(element);
}

function cameraFromXml(document: Document): CameraState | undefined {
  const camera = document.getElementsByTagNameNS(SKETCH_NAMESPACE, 'camera')[0];
  if (!camera) return undefined;

  return {
    position: {
      x: requiredNumber(camera, 'positionX'),
      y: requiredNumber(camera, 'positionY'),
      z: requiredNumber(camera, 'positionZ'),
    },
    target: {
      x: requiredNumber(camera, 'targetX'),
      y: requiredNumber(camera, 'targetY'),
      z: requiredNumber(camera, 'targetZ'),
    },
  };
}

function facadeFromXml(document: Document): SketchModel['facade'] {
  const facade = document.getElementsByTagNameNS(SKETCH_NAMESPACE, 'facade')[0];
  if (!facade) return undefined;

  const styleId = facade.getAttribute('styleRef');
  if (!styleId || !isFacadeStyleId(styleId)) {
    throw new Error('The Sketch facade style is missing or unsupported.');
  }
  return { styleId };
}

function layoutFromXml(document: Document): Pick<SketchModel, 'layout' | 'serviceGap'> {
  const layout = document.getElementsByTagNameNS(SKETCH_NAMESPACE, 'layout')[0];
  if (!layout) return { layout: 'single', serviceGap: 0 };
  const type = layout.getAttribute('type');
  if (!type || !isBuildingLayout(type))
    throw new Error('The Sketch building layout is unsupported.');
  const serviceGap = validateCellCount(
    requiredNumber(layout, 'serviceGap'),
    LIMITS.minServiceGap,
    LIMITS.maxServiceGap,
    'Service-frame gap',
  );
  return { layout: type, serviceGap };
}

function roofFromXml(
  document: Document,
  model: Pick<SketchModel, 'layout' | 'serviceGap'>,
): SketchModel['roof'] {
  const roof = document.getElementsByTagNameNS(SKETCH_NAMESPACE, 'roof')[0];
  if (!roof) return normalizedRoofType(model);
  const type = roof.getAttribute('type');
  if (!type || !isRoofType(type)) throw new Error('The Sketch roof type is unsupported.');
  const normalized = normalizedRoofType({ ...model, roof: type });
  if (normalized !== type) throw new Error('The Sketch roof type is not valid for this layout.');
  return type;
}

export function parseSketchXml(xml: string): SketchModel {
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  const parserError = document.getElementsByTagName('parsererror')[0];
  if (parserError) throw new Error('The selected file is not well-formed XML.');

  const root = document.documentElement;
  if (root.namespaceURI !== MODEL_NAMESPACE || root.localName !== 'exosettModel') {
    throw new Error(`Sketch requires the ExoSett model namespace ${MODEL_NAMESPACE}.`);
  }
  if (root.getAttribute('formatVersion') !== FORMAT_VERSION) {
    throw new Error(`Sketch supports XML format version ${FORMAT_VERSION}.`);
  }

  const framePairs = document.getElementsByTagNameNS(MODEL_NAMESPACE, 'framePair');
  const layout = layoutFromXml(document);
  const expectedPairs = layout.layout === 'single' ? 1 : layout.layout === 'double' ? 2 : 4;
  if (framePairs.length !== expectedPairs)
    throw new Error(`The ${layout.layout} layout requires ${expectedPairs} frame pair(s).`);

  const grid = requiredElement(framePairs[0]!, MODEL_NAMESPACE, 'grid');
  const depth = requiredNumber(grid, 'depthCells');
  if (depth !== 1) throw new Error('This version of Sketch supports a frame depth of one cell.');

  const cellsWide = validateCellCount(
    requiredNumber(grid, 'widthCells'),
    LIMITS.minWide,
    LIMITS.maxWide,
    'Cells wide',
  );
  const cellsHigh = validateCellCount(
    requiredNumber(grid, 'heightCells'),
    LIMITS.minHigh,
    LIMITS.maxHigh,
    'Cells high',
  );
  for (const framePair of Array.from(framePairs).slice(1)) {
    const pairGrid = requiredElement(framePair, MODEL_NAMESPACE, 'grid');
    if (
      requiredNumber(pairGrid, 'widthCells') !== cellsWide ||
      requiredNumber(pairGrid, 'heightCells') !== cellsHigh ||
      requiredNumber(pairGrid, 'depthCells') !== 1
    ) {
      throw new Error('All Sketch frame pairs must use the same grid dimensions.');
    }
  }

  const facade = facadeFromXml(document);
  const roof = roofFromXml(document, layout);
  return {
    cellsWide,
    cellsHigh,
    ...layout,
    ...(facade ? { facade } : {}),
    roof,
    camera: cameraFromXml(document),
  };
}

export function createSketchXml(model: SketchModel, camera: CameraState): string {
  const document = documentForModel(model, camera);
  const serialized = new XMLSerializer().serializeToString(document);
  return `<?xml version="1.0" encoding="UTF-8"?>\n${formatXml(serialized)}\n`;
}

function formatXml(xml: string): string {
  const lines = xml.replace(/></g, '>\n<').split('\n');
  const formatted: string[] = [];
  let depth = 0;

  for (const line of lines) {
    if (line.startsWith('</')) depth -= 1;
    formatted.push(`${'  '.repeat(depth)}${line}`);
    if (
      line.startsWith('<') &&
      !line.startsWith('</') &&
      !line.startsWith('<?') &&
      !line.endsWith('/>') &&
      !line.includes('</')
    ) {
      depth += 1;
    }
  }

  return formatted.join('\n');
}

function documentForModel(model: SketchModel, camera: CameraState): XMLDocument {
  const layoutType = model.layout ?? 'single';
  const serviceGap = model.serviceGap ?? 0;
  const normalizedModel = { ...model, layout: layoutType, serviceGap };
  const roofType = normalizedRoofType(normalizedModel);
  const document = documentImplementation();
  const root = document.documentElement;
  root.setAttributeNS(XMLNS_NAMESPACE, 'xmlns:sketch', SKETCH_NAMESPACE);
  root.setAttribute('formatVersion', FORMAT_VERSION);

  const metadata = document.createElementNS(MODEL_NAMESPACE, 'metadata');
  const title = document.createElementNS(MODEL_NAMESPACE, 'title');
  const pairCount = layoutType === 'single' ? 1 : layoutType === 'double' ? 2 : 4;
  title.textContent = `${model.cellsWide} × ${model.cellsHigh} ExoSett Sketch building (${pairCount} frame pair${pairCount === 1 ? '' : 's'})`;
  metadata.append(title);
  root.append(metadata);

  const framePairs = document.createElementNS(MODEL_NAMESPACE, 'framePairs');
  const width = model.cellsWide * DIMENSIONS_METRES.accommodationCell.width;
  const depth =
    DIMENSIONS_METRES.accommodationCell.depth +
    DIMENSIONS_METRES.interFrameGap +
    DIMENSIONS_METRES.serviceCell.depth;
  for (const [index, pairPlacement] of pairPlacements(normalizedModel).entries()) {
    const framePair = document.createElementNS(MODEL_NAMESPACE, 'framePair');
    framePair.setAttribute('id', `frame-pair-${index + 1}`);
    const placement = document.createElementNS(MODEL_NAMESPACE, 'placement');
    const angle = (pairPlacement.rotation * Math.PI) / 180;
    const localX = -width / 2;
    const localY = -depth / 2;
    const x = pairPlacement.x + localX * Math.cos(angle) - localY * Math.sin(angle);
    const y = pairPlacement.y + localX * Math.sin(angle) + localY * Math.cos(angle);
    for (const [name, value] of Object.entries({ x, y, z: 0, rotation: pairPlacement.rotation })) {
      placement.setAttribute(name, String(Number(value.toFixed(6))));
    }
    placement.setAttribute('unit', 'm');
    const grid = document.createElementNS(MODEL_NAMESPACE, 'grid');
    grid.setAttribute('widthCells', String(model.cellsWide));
    grid.setAttribute('heightCells', String(model.cellsHigh));
    grid.setAttribute('depthCells', '1');
    const accommodation = document.createElementNS(MODEL_NAMESPACE, 'accommodationFrame');
    accommodation.setAttribute('id', `accommodation-frame-${index + 1}`);
    addDimensions(document, accommodation, DIMENSIONS_METRES.accommodationCell);
    const service = document.createElementNS(MODEL_NAMESPACE, 'serviceFrame');
    service.setAttribute('id', `service-frame-${index + 1}`);
    addDimensions(document, service, DIMENSIONS_METRES.serviceCell);
    framePair.append(placement, grid, accommodation, service);
    framePairs.append(framePair);
  }
  root.append(framePairs);

  const moduleTypes = document.createElementNS(MODEL_NAMESPACE, 'moduleTypes');
  const moduleType = document.createElementNS(MODEL_NAMESPACE, 'accommodationModuleType');
  moduleType.setAttribute('id', 'iso-1ccc');
  moduleType.setAttribute('name', 'ISO 668 1CCC 20-foot high-cube envelope');
  const description = document.createElementNS(MODEL_NAMESPACE, 'description');
  description.textContent =
    'Sketch v0.1 module-size assumption; no modules are placed in this model.';
  const dimensions = document.createElementNS(MODEL_NAMESPACE, 'dimensions');
  for (const [name, value] of Object.entries(DIMENSIONS_METRES.module1CCC)) {
    dimensions.setAttribute(name, String(value));
  }
  dimensions.setAttribute('unit', 'm');
  moduleType.append(description, dimensions);
  moduleTypes.append(moduleType);
  root.append(moduleTypes);

  const applications = document.createElementNS(MODEL_NAMESPACE, 'applications');
  const sketchState = document.createElementNS(SKETCH_NAMESPACE, 'sketch:state');
  sketchState.setAttribute('version', '0.1.0');
  const cameraElement = document.createElementNS(SKETCH_NAMESPACE, 'sketch:camera');
  const attributes = {
    positionX: camera.position.x,
    positionY: camera.position.y,
    positionZ: camera.position.z,
    targetX: camera.target.x,
    targetY: camera.target.y,
    targetZ: camera.target.z,
  };
  for (const [name, value] of Object.entries(attributes)) {
    cameraElement.setAttribute(name, String(Number(value.toFixed(6))));
  }
  sketchState.append(cameraElement);
  const layout = document.createElementNS(SKETCH_NAMESPACE, 'sketch:layout');
  layout.setAttribute('type', layoutType);
  layout.setAttribute('serviceGap', String(serviceGap));
  sketchState.append(layout);
  const roof = document.createElementNS(SKETCH_NAMESPACE, 'sketch:roof');
  roof.setAttribute('type', roofType);
  sketchState.append(roof);
  if (model.facade) {
    const facade = document.createElementNS(SKETCH_NAMESPACE, 'sketch:facade');
    facade.setAttribute('styleRef', model.facade.styleId);
    sketchState.append(facade);
  }
  applications.append(sketchState);
  root.append(applications);

  return document;
}

function documentImplementation(): XMLDocument {
  return document.implementation.createDocument(MODEL_NAMESPACE, 'exosettModel', null);
}
