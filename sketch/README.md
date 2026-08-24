# ExoSett Sketch

ExoSett Sketch is a lightweight, static browser application for creating and exploring simple abstract ExoSett buildings assembled from frame pairs. It is the first producer and consumer of the common ExoSett XML format, not the owner of that format.

The application asks for the number of accommodation-frame cells high (1–10) and wide (1–20). It can arrange one pair, two pairs separated by a depth of 0–5 cell widths, or four pairs whose side pairs are 1–20 cells wide. A zero-depth two-pair layout uses one shared service frame. Sketch supports mouse and touch inspection, can save or reload XML, download the current view as a PNG, and copy a canonical link to the current model. A single optional front-facade style can be applied to every accommodation-frame cell for quick visual studies.

All modelling, rendering, and file handling happens in the browser. There is no server-side application. The production build is ordinary static HTML, CSS, and JavaScript.

## Development

From this directory:

```sh
npm install
npm run dev
```

Useful checks are:

```sh
npm run check
npm run test:e2e
```

`npm run build` writes the static production application to `dist/`.

`npm run build:embed` writes fixed-name `sketch.js` and `sketch.css` assets to `dist-embed/`. The ExoSett website deployment places those assets in `/design/sketch/assets/`; the website repository owns the surrounding page, navigation, metadata, and footer.

## Technology

- TypeScript without a UI framework
- Three.js for browser-side 3D rendering and orbit controls
- Vite for development and static builds
- Vitest for model and XML tests
- Playwright for desktop and mobile browser smoke tests

The renderer uses the provisional visual-study dimensions currently used by `exosett_cad`: a 2.798 m × 5.918 m × 3.487 m accommodation cell, a 1.6 m service-frame depth, and a 0.3 m inter-frame gap. These are Sketch defaults for an abstract model, not engineering requirements or a universal ExoSett specification. The module-size assumption is the ISO 668 1CCC envelope, although this first view leaves all accommodation cells empty.

Camera, layout controls, and facade-style state are saved in the Sketch application namespace. Each rendered pair and its placement are also written as core model data, allowing other applications to understand the arrangement while ignoring Sketch-specific state. The global facade selection is preserved when the grid dimensions change.
