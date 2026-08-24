import './styles.css';
import {
  DIMENSIONS_METRES,
  BUILDING_LAYOUTS,
  FACADE_STYLES,
  ROOF_TYPES,
  LIMITS,
  isFacadeStyleId,
  isBuildingLayout,
  isRoofType,
  allowedRoofTypes,
  normalizedRoofType,
  type SketchModel,
} from './model/model';
import { createSketchXml, parseSketchXml } from './model/xml';
import { modelFromUrl, urlForModel } from './model/url';
import { SketchRenderer } from './scene/renderer';

function element<T extends HTMLElement>(id: string): T {
  const result = document.getElementById(id);
  if (!result) throw new Error(`Missing required element #${id}.`);
  return result as T;
}

const canvas = element<HTMLCanvasElement>('viewport');
const widthInput = element<HTMLInputElement>('cells-wide');
const heightInput = element<HTMLInputElement>('cells-high');
const layoutSelect = element<HTMLSelectElement>('building-layout');
const depthInput = element<HTMLInputElement>('depth');
const depthControl = element<HTMLElement>('depth-control');
const depthRange = element<HTMLElement>('depth-range');
const depthHelp = element<HTMLElement>('depth-help');
const roofSelect = element<HTMLSelectElement>('roof-type');
const roofHelp = element<HTMLElement>('roof-help');
const facadeSelect = element<HTMLSelectElement>('facade-style');
const fileInput = element<HTMLInputElement>('xml-file');
const status = element<HTMLOutputElement>('status');
const modelSize = element<HTMLElement>('model-size');
const webglError = element<HTMLElement>('webgl-error');

let model: SketchModel = modelFromUrl(new URL(window.location.href));
let renderer: SketchRenderer | undefined;

function announce(message: string, error = false): void {
  status.textContent = message;
  status.classList.toggle('error', error);
}

function updateFacts(): void {
  const width = model.cellsWide * DIMENSIONS_METRES.accommodationCell.width;
  const height = model.cellsHigh * DIMENSIONS_METRES.accommodationCell.height;
  modelSize.textContent = `${width.toFixed(1)} × ${height.toFixed(1)} m`;
}

function updateRoofControl(): void {
  const allowed = allowedRoofTypes(model);
  const selected = normalizedRoofType(model);
  roofSelect.replaceChildren();
  for (const roof of ROOF_TYPES.filter((candidate) => allowed.includes(candidate.id))) {
    const option = document.createElement('option');
    option.value = roof.id;
    option.textContent = roof.label;
    roofSelect.append(option);
  }
  roofSelect.value = selected;
  roofSelect.disabled = false;
  roofHelp.textContent = allowed.includes('space-frame')
    ? 'A space frame can cover the complete footprint and void.'
    : 'Choose corrugated metal or a terracotta-tiled gable.';
}

function updateDepthControl(layout = model.layout ?? 'single'): void {
  depthControl.hidden = layout === 'single';
  const minimum = layout === 'quadrangle' ? LIMITS.minQuadrangleDepth : LIMITS.minDoubleDepth;
  const maximum = layout === 'quadrangle' ? LIMITS.maxWide : LIMITS.maxDoubleDepth;
  depthInput.min = String(minimum);
  depthInput.max = String(maximum);
  depthRange.textContent = `${minimum}–${maximum}`;
  depthHelp.textContent =
    layout === 'quadrangle'
      ? 'Sets the width of each side frame pair in cells.'
      : 'At zero, the two accommodation frames share one service frame.';
}

function writeInputs(): void {
  widthInput.value = String(model.cellsWide);
  heightInput.value = String(model.cellsHigh);
  layoutSelect.value = model.layout ?? 'single';
  depthInput.value = String(model.depth ?? 0);
  facadeSelect.value = model.facade?.styleId ?? '';
  updateDepthControl();
  updateRoofControl();
}

function readInputs(): SketchModel | undefined {
  if (
    !widthInput.checkValidity() ||
    !heightInput.checkValidity() ||
    !depthInput.checkValidity() ||
    !isBuildingLayout(layoutSelect.value)
  )
    return undefined;
  const cellsWide = widthInput.valueAsNumber;
  const cellsHigh = heightInput.valueAsNumber;
  if (!Number.isInteger(cellsWide) || !Number.isInteger(cellsHigh)) return undefined;
  const depth = depthInput.valueAsNumber;
  if (!Number.isInteger(depth)) return undefined;
  return {
    cellsWide,
    cellsHigh,
    layout: layoutSelect.value,
    depth,
    facade: model.facade,
    roof: isRoofType(roofSelect.value) ? roofSelect.value : model.roof,
  };
}

for (const layout of BUILDING_LAYOUTS) {
  const option = document.createElement('option');
  option.value = layout.id;
  option.textContent = layout.label;
  layoutSelect.append(option);
}

for (const style of FACADE_STYLES) {
  const option = document.createElement('option');
  option.value = style.id;
  option.textContent = style.label;
  facadeSelect.append(option);
}

function rebuildFromInputs(): void {
  const next = readInputs();
  if (!next || !renderer) return;
  model = next;
  model.roof = normalizedRoofType(model);
  updateDepthControl();
  updateRoofControl();
  renderer.setModel(model);
  updateFacts();
  announce(
    `${BUILDING_LAYOUTS.find((layout) => layout.id === model.layout)?.label}: ${model.cellsHigh} high × ${model.cellsWide} wide${model.layout === 'single' ? '' : ` × ${model.depth} deep`}`,
  );
}

function download(content: string, type: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

for (const input of [widthInput, heightInput]) input.addEventListener('input', rebuildFromInputs);
depthInput.addEventListener('input', () => rebuildFromInputs());
layoutSelect.addEventListener('change', () => {
  if (!isBuildingLayout(layoutSelect.value)) return;
  updateDepthControl(layoutSelect.value);
  depthInput.value = layoutSelect.value === 'quadrangle' ? '1' : '0';
  rebuildFromInputs();
});

roofSelect.addEventListener('change', () => {
  if (!renderer || !isRoofType(roofSelect.value)) return;
  model = { ...model, roof: roofSelect.value };
  renderer.setModel(model, renderer.cameraState());
  announce(`${ROOF_TYPES.find((roof) => roof.id === model.roof)?.label} roof selected`);
});

facadeSelect.addEventListener('change', () => {
  if (!renderer) return;
  const styleId = facadeSelect.value;
  model = {
    ...model,
    facade: isFacadeStyleId(styleId) ? { styleId } : undefined,
  };
  renderer.setModel(model, renderer.cameraState());
  announce(
    model.facade
      ? `${FACADE_STYLES.find((style) => style.id === model.facade?.styleId)?.label} on all cells`
      : 'Façades removed',
  );
});

element<HTMLButtonElement>('reset-view').addEventListener('click', () => {
  renderer?.resetView();
  announce('View reset');
});

element<HTMLButtonElement>('save-xml').addEventListener('click', () => {
  if (!renderer) return;
  const xml = createSketchXml(model, renderer.cameraState());
  download(xml, 'application/xml', `exosett-sketch-${model.cellsWide}x${model.cellsHigh}.xml`);
  announce('XML saved');
});

element<HTMLButtonElement>('save-png').addEventListener('click', () => {
  renderer?.downloadPng(`exosett-sketch-${model.cellsWide}x${model.cellsHigh}.png`);
  announce('PNG downloaded');
});

element<HTMLButtonElement>('copy-link').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(urlForModel(new URL(window.location.href), model).href);
    announce('Link copied');
  } catch {
    announce('The link could not be copied.', true);
  }
});

element<HTMLButtonElement>('load-xml').addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', async () => {
  const file = fileInput.files?.[0];
  if (!file || !renderer) return;
  try {
    const loaded = parseSketchXml(await file.text());
    model = loaded;
    writeInputs();
    renderer.setModel(model, model.camera);
    updateFacts();
    announce(`Loaded ${file.name}`);
  } catch (error) {
    announce(error instanceof Error ? error.message : 'The XML file could not be loaded.', true);
  } finally {
    fileInput.value = '';
  }
});

try {
  renderer = new SketchRenderer(canvas);
  renderer.setModel(model);
  writeInputs();
  updateFacts();
  announce(
    `${BUILDING_LAYOUTS.find((layout) => layout.id === model.layout)?.label}: ${model.cellsHigh} high × ${model.cellsWide} wide${model.layout === 'single' ? '' : ` × ${model.depth} deep`}`,
  );
} catch (error) {
  console.error(error);
  webglError.hidden = false;
  announce('The 3D view is unavailable.', true);
}

widthInput.min = String(LIMITS.minWide);
widthInput.max = String(LIMITS.maxWide);
heightInput.min = String(LIMITS.minHigh);
heightInput.max = String(LIMITS.maxHigh);
