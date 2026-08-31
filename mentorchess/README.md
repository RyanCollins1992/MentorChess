# React + Vite

## Dependency notes

- **`stockfish`** (npm dependency) is never imported by source code. It is kept because it is the source of the engine assets in `public/stockfish/` — `stockfish-18-lite-single.js`/`.wasm` there are byte-identical copies of `node_modules/stockfish/bin/`. There is no copy script; the files were placed manually. To regenerate or upgrade the engine, copy the desired build out of `node_modules/stockfish/bin/` into `public/stockfish/` (the app loads it same-origin via `new Worker(...)`).
- **`playwright`** (devDependency) has no checked-in spec files or npm scripts; it is used for ad-hoc/exploratory e2e verification scripts run directly with `node` from inside the project directory.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
