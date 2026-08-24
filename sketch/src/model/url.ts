import {
  DEFAULT_MODEL,
  isFacadeStyleId,
  isRoofType,
  validateModel,
  type BuildingLayout,
  type SketchModel,
} from './model';

const QUERY_KEYS = ['layout', 'h', 'w', 'd', 'roof', 'accommodation_facade'] as const;
const LAYOUT_FROM_QUERY: Record<string, BuildingLayout> = {
  '1': 'single',
  '2': 'double',
  '4': 'quadrangle',
};
const LAYOUT_TO_QUERY: Record<BuildingLayout, string> = {
  single: '1',
  double: '2',
  quadrangle: '4',
};

export function modelFromUrl(url: URL): SketchModel {
  if (!url.search) return { ...DEFAULT_MODEL };
  const keys = Array.from(url.searchParams.keys());
  if (
    keys.length !== QUERY_KEYS.length ||
    QUERY_KEYS.some((key) => !url.searchParams.has(key)) ||
    keys.some((key) => !QUERY_KEYS.includes(key as (typeof QUERY_KEYS)[number]))
  ) {
    return { ...DEFAULT_MODEL };
  }

  try {
    const layout = LAYOUT_FROM_QUERY[url.searchParams.get('layout') ?? ''];
    const roof = url.searchParams.get('roof') ?? '';
    const facade = url.searchParams.get('accommodation_facade') ?? '';
    if (!layout || !isRoofType(roof) || (facade !== 'none' && !isFacadeStyleId(facade))) {
      return { ...DEFAULT_MODEL };
    }
    const candidate: SketchModel = {
      layout,
      cellsHigh: Number(url.searchParams.get('h')),
      cellsWide: Number(url.searchParams.get('w')),
      depth: Number(url.searchParams.get('d')),
      roof,
      ...(facade === 'none' ? {} : { facade: { styleId: facade } }),
    };
    const validated = validateModel(candidate);
    return validated.roof === roof ? validated : { ...DEFAULT_MODEL };
  } catch {
    return { ...DEFAULT_MODEL };
  }
}

export function urlForModel(baseUrl: URL, model: SketchModel): URL {
  const url = new URL(baseUrl);
  url.search = '';
  url.hash = '';
  const layout = model.layout ?? 'single';
  url.searchParams.set('layout', LAYOUT_TO_QUERY[layout]);
  url.searchParams.set('h', String(model.cellsHigh));
  url.searchParams.set('w', String(model.cellsWide));
  url.searchParams.set('d', String(model.depth ?? (layout === 'quadrangle' ? 1 : 0)));
  url.searchParams.set('roof', model.roof ?? 'none');
  url.searchParams.set('accommodation_facade', model.facade?.styleId ?? 'none');
  return url;
}
