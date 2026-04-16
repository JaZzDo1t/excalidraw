# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
yarn start                        # Dev server (excalidraw-app)
yarn test:app                     # Run all tests (vitest, watch mode)
yarn test:app --watch=false       # Run all tests once
yarn test:app path/to/file        # Run a single test file
yarn test:update                  # Run tests + update snapshots
yarn test:typecheck               # TypeScript type checking (tsc)
yarn test:code                    # ESLint (--max-warnings=0)
yarn fix                          # Auto-fix formatting + linting
yarn build:packages               # Build all packages (common -> math -> element -> excalidraw)
```

## Monorepo Structure

Yarn workspaces monorepo. Packages have a strict dependency order:

```
@excalidraw/common        (constants, types, utilities)
    └── @excalidraw/math  (2D geometry: vectors, points, distances, rotations)
        └── @excalidraw/element  (element model, Scene, Store, mutations, rendering)
            └── @excalidraw/excalidraw  (React component library, UI, actions)
                └── excalidraw-app/  (full web app at excalidraw.com)

@excalidraw/utils         (standalone export utilities: PNG, SVG, clipboard)
```

Path aliases resolve `@excalidraw/*` to source directories (see `vitest.config.mts`), so imports like `@excalidraw/element/types` resolve to `packages/element/src/types` during dev/test.

## Architecture

### Element Model (`@excalidraw/element`)

Elements are **readonly objects** with properties: `id`, `type`, `x`, `y`, `width`, `height`, `angle`, styling props, and metadata (`version`, `versionNonce`, `isDeleted`, `index`).

Key patterns:
- **Soft deletion**: Elements set `isDeleted: true` rather than being removed from arrays (supports undo/collaboration)
- **Fractional indexing**: Element ordering uses string `index` property for conflict-free multiplayer reordering
- **Version tracking**: `version` + `versionNonce` enable deterministic conflict resolution
- **Bound elements**: Arrows/text bind to shapes; bindings update automatically on container changes
- **Mutation**: Use `mutateElement(element, updates)` for direct mutation or `newElementWith(element, updates)` for immutable copies

### Scene & Store (`@excalidraw/element`)

- **Scene**: Container for elements. Provides `getNonDeletedElements()`, `getSelectedElements()`, element lookups by ID. Emits change callbacks via `addCallback()`. Uses `sceneNonce` for cache invalidation.
- **Store**: Change tracking for collaboration. Uses `CaptureUpdateAction` enum (`IMMEDIATELY | NEVER | EVENTUALLY`) to control when changes propagate.

### State Management (`@excalidraw/excalidraw`)

Hybrid approach:
- **AppState**: Large state object (active tool, selection, zoom, scroll, current styling, viewport)
- **Jotai atoms**: Fine-grained reactive state in an isolated store (`jotai-scope`) to prevent leaks with host app atoms
- **React contexts**: `ExcalidrawAPIContext`, `ExcalidrawAppStateContext`, `ExcalidrawActionManagerContext`, etc.
- **Selectors**: `useAppStateValue(selector)` for subscribing to specific state slices

### Action System (`packages/excalidraw/actions/`)

40+ action files. Each action has `name`, `label`, `handler(elements, appState)`, and `predicate`. ActionManager dispatches them. New features typically add a new action file.

### Rendering Pipeline (`packages/excalidraw/renderer/`)

- **staticScene.ts**: Canvas 2D rendering of grid, elements, links
- **interactiveScene.ts**: Selection handles, snap lines, transform handles, remote cursors
- **staticSvgScene.ts**: SVG export rendering
- Uses **RoughJS** for the hand-drawn visual style
- **ShapeCache** caches expensive shape computations; `Renderer` class memoizes visible element filtering

### Main App Component

`packages/excalidraw/components/App.tsx` (~14K lines) is the central orchestrator handling all event handlers, rendering loop, gesture handling, keyboard shortcuts, collaboration state, undo/redo, and file I/O.

## Coding Conventions

- **TypeScript only** for new code. Prefer `const`/`readonly`. Use `?.` and `??` operators.
- **Performance-first**: Prefer solutions without allocation; trade RAM for fewer CPU cycles.
- **Math types**: Always use the `Point` type from `@excalidraw/math` instead of `{ x, y }`.
- **React**: Functional components with hooks. CSS modules for styling.
- **Naming**: PascalCase for components/interfaces/types, camelCase for variables/functions, ALL_CAPS for constants.

## Testing

- Vitest with jsdom environment, canvas mocking (`vitest-canvas-mock`)
- Test helpers in `packages/excalidraw/tests/`: `api.ts` and `ui.ts` provide DOM queries, `Keyboard`/`Pointer` event simulation, element selection utilities
- `setupTests.ts` configures IndexedDB polyfill and mocked `throttleRAF` for deterministic tests
- Always run `yarn test:app` after modifications and fix any failures
