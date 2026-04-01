# Contributing

Development setup, conventions, and PR process for the Northwestern Starlight Theme.

## Prerequisites

| Tool    | Version |
| ------- | ------- |
| Node.js | 22+     |
| pnpm    | 10+     |

## Setup

Clone the repo and install dependencies:

```bash
git clone git@github.com:NIT-Administrative-Systems/northwestern-starlight-theme.git
cd northwestern-starlight-theme
pnpm install
```

Start the docs site for local development:

```bash
pnpm docs:dev
```

Runs at `http://localhost:4321`. CSS and TypeScript changes hot-reload.

## Project structure

```
packages/northwestern-starlight-theme/
  index.ts                   # Main Starlight plugin entry point
  config.ts                  # Recommended Astro config helper
  mermaid.ts                 # Northwestern-branded Mermaid color palettes
  expressive-code.ts         # Expressive Code defaults for manual setups
  src/
    config-schema.ts         # Runtime validation and friendly config errors
    og/                      # OG image rendering + endpoint
    rehype-table-scroll.ts   # Rehype plugin: wraps tables in scroll containers at build time
    components/              # Astro component overrides and custom components
    styles/                  # CSS organized by concern
      layers.css             # @layer starlight, northwestern
      variables.css          # Design tokens (--nu-* prefix)
      typography.css         # Font imports, text utilities
      theme.css              # Starlight CSS variable mappings
      content.css            # Markdown prose (links, lists, figures, badges, asides, buttons)
      navigation.css         # Sidebar, topbar, menu
      mermaid-toolbar.css    # Fullscreen viewer overlay UI
      openapi.css            # OpenAPI schema styling
      a11y.css               # High contrast + reduced transparency overrides
      components/            # Scoped component styles
        blockquotes.css      # Blockquote styling
        cards.css            # Card components
        code.css             # Expressive Code blocks
        footnotes.css        # GFM footnote references and section
        mermaid.css          # Mermaid SVG structural overrides
        steps.css            # Steps component
        tables.css           # Table styling with scroll wrapper
        tabs.css             # Tab components
        utility-surfaces.css # File tree, pagination, banner
    scripts/
      mermaid/               # Fullscreen viewer and toolbar system
        index.ts             # Barrel — public API re-exports
        toolbar.ts           # Entry point: lifecycle, toolbar injection, observers
        render.ts            # Source registry, runtime adapter, render scheduler
        fullscreen.ts        # Coordinator: wires overlay, pan-zoom, focus, controls
        overlay.ts           # Overlay DOM construction
        pan-zoom.ts          # Pan/zoom interaction controller with momentum
        focus.ts             # Focus trap, keyboard shortcuts
        ui.ts                # Icons, buttons, toast, clipboard, download helpers
docs/                        # Astro documentation site (uses the theme)
tests/                       # Playwright test suite
```

### CSS layers

Theme CSS goes in `@layer northwestern`, which sits above Starlight's base styles without `!important`. Layer order in `layers.css`:

```css
@layer starlight, northwestern;
```

Use `--nu-*` custom properties from `variables.css` for colors, spacing, and transitions. Don't add raw hex values for Northwestern brand colors.

### Mermaid integration

All client-side mermaid code lives in `src/scripts/mermaid/`. Seven modules:

- **`toolbar.ts`** — entry point. Injects hover toolbars, listens for theme/page-load events, delegates to the other modules.
- **`render.ts`** — source registry, mermaid runtime adapter, viewport-aware render scheduler.
- **`fullscreen.ts`** — coordinator that wires overlay construction, pan/zoom, focus, and controls dispatch.
- **`overlay.ts`** — builds the overlay DOM tree (dialog shell, controls bar, viewport, zoom badge).
- **`pan-zoom.ts`** — interaction controller: wheel zoom, mouse drag, touch pan/pinch, double-click zoom, momentum.
- **`focus.ts`** — focus trap (Tab cycling), keyboard shortcuts, modality-aware initial focus.
- **`ui.ts`** — icon paths, button factories, toast notifications, clipboard, SVG download.

`index.ts` is a barrel that re-exports the public API (`renderAllDiagrams`, `openFullscreen`, `diagramSources`).

`mermaid.ts` (at the package root, not in `scripts/`) generates the Northwestern color palettes using `khroma`.

## Making changes

### CSS

Edit files in `src/styles/`. The docs site hot-reloads. Run the full lint and build check:

```bash
pnpm verify
```

Auto-fix lint issues:

```bash
pnpm fix
```

### TypeScript

The package ships TypeScript source directly. Astro compiles `.ts` imports at the consumer's build time, so this works out of the box for Starlight users.

The package also emits `.d.ts` files for the public surface. TypeScript consumer compatibility is checked with a dedicated smoke test in `tests/consumer-types/`.

> [!NOTE]
> Consumers outside the Astro ecosystem would need a TypeScript-aware bundler (Vite, esbuild, tsup) to import this package. Starlight is the only supported consumer today, so this is a deliberate tradeoff: source publishing keeps the DX simple (edit, save, hot-reload) and avoids a build/watch step during development.

Useful commands:

```bash
pnpm build:types           # Emit package declarations
pnpm test:consumer-types   # Smoke-test the built package from a fresh TS fixture
pnpm verify                # Fix formatting/lint issues, check deps, build docs
```

### Testing

The repo has two test layers:

- [Vitest](https://vitest.dev/) for unit tests around config helpers, Mermaid behavior, OG rendering helpers, and other package internals
- [Playwright](https://playwright.dev/) with [@axe-core/playwright](https://github.com/dequelabs/axe-core-npm/tree/develop/packages/playwright) for browser and accessibility coverage against the docs site

```bash
pnpm test                    # Run all Vitest unit tests
pnpm test:consumer-types     # Built-package TS smoke test
pnpm test:e2e                # Full Playwright suite
pnpm test:accessibility      # Axe-core across all routes, light + dark
pnpm test:mermaid            # Fullscreen viewer interactions
pnpm test:theme              # Theme toggle behavior
```

Run a single test file:

```bash
pnpm exec playwright test tests/e2e/mermaid-toolbar.spec.ts
```

Playwright starts the Astro dev server on its own. Runs against desktop Chromium and mobile Chromium (Pixel 5).

### Test expectations

- Add or update Vitest coverage for behavioral changes in config helpers, runtime validation, OG utilities, or Mermaid internals.
- Add or update Playwright coverage for user-visible behavior changes in the docs site.
- Add or update the consumer type fixture when public TypeScript surfaces change.
- CSS-only changes don't need new tests unless they affect accessibility (axe-core will catch contrast and ARIA issues).
- Accessibility tests run against all doc routes in both light and dark mode. Serious and critical violations fail the build.
- Mermaid toolbar tests cover fullscreen open/close, focus trap, keyboard shortcuts, zoom, and focus restoration.

## Code style

### Formatting

[Biome](https://biomejs.dev/) handles TypeScript and JSON formatting. [Stylelint](https://stylelint.io/) handles CSS with [recess property ordering](https://github.com/stormwarning/stylelint-config-recess-order).

- 4-space indentation, 120-character line width
- Double quotes, always semicolons, trailing commas
- CSS properties ordered by recess convention (position, display, box model, typography, visual)

### CSS

- Use `@layer northwestern` for all theme styles
- Use `--nu-*` custom properties for colors, not raw hex values
- Support both light and dark mode via `data-theme` attribute and `:root:not([data-theme="light"])` selectors
- Scope styles to Starlight's existing classes (`.sl-markdown-content`, `.expressive-code`, etc.)

### Commits

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add footnote reference styles
fix: mermaid rendering race condition on Firefox
a11y: add focus trap to fullscreen overlay
refactor: split mermaid-toolbar into focused modules
docs: add footnote examples to style guide
```

Keep the subject line under 70 characters. A body is optional; use one if the "why" isn't obvious from the subject.

## Pull requests

1. Fork the repo and create a branch from `main`
2. Make your changes and run `pnpm verify`
3. Run `pnpm test`
4. Run `pnpm test:consumer-types` if you changed public config/types/exports
5. Run the relevant Playwright command when your change affects browser behavior or accessibility
6. Push your branch and open a PR against `main`

CI runs unit tests, the consumer type smoke test, lint, dependency checks, docs build, accessibility tests, and a compatibility matrix (Starlight 0.32 minimum + latest). All checks must pass.

> [!NOTE]
> Open a draft PR if you want early feedback on an approach before finishing the implementation.

### CSS changes

Include screenshots in the PR description. Show both light and dark mode if both are affected.

### New features

Open an issue first. The theme follows Northwestern's brand guidelines, so not all changes will be accepted.

## Releases

Maintainers trigger releases through the GitHub Actions release workflow. It now runs `pnpm verify`, unit tests, and the consumer type smoke test before versioning, tagging, and publishing to npm with provenance.

The changelog follows [Keep a Changelog](https://keepachangelog.com/) format. Update `packages/northwestern-starlight-theme/CHANGELOG.md` as part of your PR if your changes are user-facing.

## Questions?

Open an issue on [GitHub](https://github.com/NIT-Administrative-Systems/northwestern-starlight-theme/issues).
