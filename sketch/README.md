# ExoSett Sketch

ExoSett Sketch is a lightweight, static browser application for creating and exploring a simple abstract ExoSett frame-pair model. It is the first producer and consumer of the common ExoSett XML format, not the owner of that format.

The initial application asks for the number of accommodation-frame cells wide (1–20) and high (1–7). It renders an empty accommodation frame and its corresponding service frame, supports mouse and touch inspection, and can save or reload XML and download the current view as a PNG. A single optional front-façade style can be applied to every accommodation-frame cell for quick visual studies.

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

Camera and façade-style state are saved in the Sketch application namespace. Core model data remains in the common modelling namespace so other applications can ignore Sketch-specific state. Changing the grid dimensions removes the façade selection.
