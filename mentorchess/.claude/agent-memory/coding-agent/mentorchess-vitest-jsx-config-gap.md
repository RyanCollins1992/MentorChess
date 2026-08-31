---
name: mentorchess-vitest-jsx-config-gap
description: vitest.config.js was missing esbuild.jsx:'automatic', so no .test.jsx file could ever run (ReferenceError: React is not defined) — fixed 2026-06-20
metadata:
  type: project
---

Before 2026-06-20, `vitest.config.js` in the mentorchess repo had no `esbuild.jsx` setting. All existing tests were `.test.js` (core/store logic only) — there were zero `.test.jsx` component tests anywhere in the repo, so this gap was latent and undiscovered.

Symptom: any test file rendering JSX (even a trivial `<div>hi</div>`) fails with `ReferenceError: React is not defined`, even though no source `.jsx` file in the project imports React directly (the Vite build works fine via `@vitejs/plugin-react`'s automatic-runtime Babel transform). Vitest's own esbuild-based transform for test files doesn't pick up that Babel transform and falls back to the classic JSX runtime, which emits bare `React.createElement` calls with no import.

**Fix:** added `esbuild: { jsx: 'automatic' }` to the `test` config's parent object in `vitest.config.js` (sibling to `plugins`/`resolve`/`test`, not nested inside `test`). Confirmed working with vite@8.0.16 + vitest@3.2.6 + @vitejs/plugin-react@6.0.2 + react@19.2.6.

**How to apply:** if a future `.test.jsx`/`.test.tsx` file throws `React is not defined`, check `vitest.config.js` for this setting before assuming the test itself is wrong — this is a project-config issue, not a test-authoring mistake. See [[project-mentorchess-overview]] for repo structure and [[mentorchess-preexisting-lint-errors]] for the separate (unrelated) lint-baseline gotcha.
