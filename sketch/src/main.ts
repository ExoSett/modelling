import './styles.css';
import { DEFAULT_MODEL, DIMENSIONS_METRES, LIMITS, type SketchModel } from './model/model';
import { createSketchXml, parseSketchXml } from './model/xml';
import { SketchRenderer } from './scene/renderer';

function element<T extends HTMLElement>(id: string): T {
  const result = document.getElementById(id);
  if (!result) throw new Error(`Missing required element #${id}.`);
  return result as T;
}

const canvas = element<HTMLCanvasElement>('viewport');
const widthInput = element<HTMLInputElement>('cells-wide');
const heightInput = element<HTMLInputElement>('cells-high');
const fileInput = element<HTMLInputElement>('xml-file');
const status = element<HTMLOutputElement>('status');
const modelSize = element<HTMLElement>('model-size');
const webglError = element<HTMLElement>('webgl-error');

let model: SketchModel = { ...DEFAULT_MODEL };
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

function readInputs(): SketchModel | undefined {
  if (!widthInput.checkValidity() || !heightInput.checkValidity()) return undefined;
  const cellsWide = widthInput.valueAsNumber;
  const cellsHigh = heightInput.valueAsNumber;
  if (!Number.isInteger(cellsWide) || !Number.isInteger(cellsHigh)) return undefined;
  return { cellsWide, cellsHigh };
}

function rebuildFromInputs(): void {
  const next = readInputs();
  if (!next || !renderer) return;
  model = next;
  renderer.setModel(model);
  updateFacts();
  announce(`${model.cellsWide} wide × ${model.cellsHigh} high`);
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

element<HTMLButtonElement>('load-xml').addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', async () => {
  const file = fileInput.files?.[0];
  if (!file || !renderer) return;
  try {
    const loaded = parseSketchXml(await file.text());
    model = loaded;
    widthInput.value = String(model.cellsWide);
    heightInput.value = String(model.cellsHigh);
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
  updateFacts();
  announce(`${DEFAULT_MODEL.cellsWide} wide × ${DEFAULT_MODEL.cellsHigh} high`);
} catch (error) {
  console.error(error);
  webglError.hidden = false;
  announce('The 3D view is unavailable.', true);
}

widthInput.min = String(LIMITS.minWide);
widthInput.max = String(LIMITS.maxWide);
heightInput.min = String(LIMITS.minHigh);
heightInput.max = String(LIMITS.maxHigh);
