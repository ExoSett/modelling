import {
  DIMENSIONS_METRES,
  FORMAT_VERSION,
  LIMITS,
  MODEL_NAMESPACE,
  SKETCH_NAMESPACE,
  type CameraState,
  type SketchModel,
  validateCellCount,
} from './model';

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
  if (framePairs.length !== 1)
    throw new Error('This version of Sketch supports exactly one frame pair.');

  const grid = requiredElement(framePairs[0]!, MODEL_NAMESPACE, 'grid');
  const depth = requiredNumber(grid, 'depthCells');
  if (depth !== 1) throw new Error('This version of Sketch supports a frame depth of one cell.');

  return {
    cellsWide: validateCellCount(
      requiredNumber(grid, 'widthCells'),
      LIMITS.minWide,
      LIMITS.maxWide,
      'Cells wide',
    ),
    cellsHigh: validateCellCount(
      requiredNumber(grid, 'heightCells'),
      LIMITS.minHigh,
      LIMITS.maxHigh,
      'Cells high',
    ),
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
  const document = documentImplementation();
  const root = document.documentElement;
  root.setAttributeNS(XMLNS_NAMESPACE, 'xmlns:sketch', SKETCH_NAMESPACE);
  root.setAttribute('formatVersion', FORMAT_VERSION);

  const metadata = document.createElementNS(MODEL_NAMESPACE, 'metadata');
  const title = document.createElementNS(MODEL_NAMESPACE, 'title');
  title.textContent = `${model.cellsWide} × ${model.cellsHigh} ExoSett Sketch frame pair`;
  metadata.append(title);
  root.append(metadata);

  const framePairs = document.createElementNS(MODEL_NAMESPACE, 'framePairs');
  const framePair = document.createElementNS(MODEL_NAMESPACE, 'framePair');
  framePair.setAttribute('id', 'frame-pair-1');

  const placement = document.createElementNS(MODEL_NAMESPACE, 'placement');
  for (const [name, value] of Object.entries({ x: 0, y: 0, z: 0, rotation: 0 })) {
    placement.setAttribute(name, String(value));
  }
  placement.setAttribute('unit', 'm');

  const grid = document.createElementNS(MODEL_NAMESPACE, 'grid');
  grid.setAttribute('widthCells', String(model.cellsWide));
  grid.setAttribute('heightCells', String(model.cellsHigh));
  grid.setAttribute('depthCells', '1');

  const accommodation = document.createElementNS(MODEL_NAMESPACE, 'accommodationFrame');
  accommodation.setAttribute('id', 'accommodation-frame-1');
  addDimensions(document, accommodation, DIMENSIONS_METRES.accommodationCell);

  const service = document.createElementNS(MODEL_NAMESPACE, 'serviceFrame');
  service.setAttribute('id', 'service-frame-1');
  addDimensions(document, service, DIMENSIONS_METRES.serviceCell);

  framePair.append(placement, grid, accommodation, service);
  framePairs.append(framePair);
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
  applications.append(sketchState);
  root.append(applications);

  return document;
}

function documentImplementation(): XMLDocument {
  return document.implementation.createDocument(MODEL_NAMESPACE, 'exosettModel', null);
}
