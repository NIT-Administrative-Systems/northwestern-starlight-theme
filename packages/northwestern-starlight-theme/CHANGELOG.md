# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.4.1] - 2026-03-31

### Fixed

- Replaced `astro-og-canvas` + `canvaskit-wasm` with `satori` + `@resvg/resvg-wasm`. pnpm users no longer need `canvaskit-wasm` as a direct dependency.
- Larger OG text: title 48→56px, description 28→32px, logo 60→80px.
- Separate vertical (60px) and horizontal (220px) OG padding to avoid clipping.
- Optimized generated Open Graph PNGs to reduce file size while preserving branded text and image rendering quality.
- Asides use a 3px left accent stripe instead of a 1px box border, matching the blockquote and card accent patterns.

### Added

- OG images for changelog version pages with multi-line titles (e.g., "Changelog / 1.4.0").
- JSON-LD structured data on each page.

## [1.4.0] - 2026-03-31

### Added

- **Open Graph image generation**: builds a branded 1200x630 PNG per docs page. Favicon logo, page title, and description on Northwestern purple with a light purple accent border. Slack, Teams, and social media link previews use these images.
  - Enabled by default. Set `site` in your Astro config. pnpm users: run `pnpm add canvaskit-wasm` to enable (build skips OG gracefully without it).
  - Disable with `ogImage: false`.
  - Adds `og:image`, `og:image:type`, `og:image:width`, `og:image:height`, `og:image:alt`, `og:logo`, `twitter:image`, and `twitter:image:alt` meta tags to every page. Overrides `twitter:card` to `summary_large_image`.
  - New dependency: `astro-og-canvas`.

## [1.3.2] - 2026-03-30

### Fixed

- H1/H2 now use Noto Serif (`--nu-font-display`), H3–H6 use Poppins (`--nu-font-heading`). Sizes, weights, and colors match the [Department 4.0 stylesheet](https://common.northwestern.edu/dept/4.0/css/styles.css).
- Poppins 400 loaded the Light file instead of Regular. Poppins 500 (Medium) added from v4 CDN.
- Table headers now use `--nu-purple-100` with white text.
- Table striping moved to odd rows (`#f9f6ff`); dark mode uses `rgb(78 42 132 / 10%)`.
- `--nu-purple-surface` corrected to `#f9f6ff`, `--nu-purple-surface-subtle` to `#f3f0f7`.
- Blockquote background uses `#f9f6ff` instead of translucent purple.
- Horizontal rules use 3px `--nu-purple-10` instead of 1px gray.
- List markers use `--nu-purple-100` instead of `--nu-purple-40`.

## [1.3.1] - 2026-03-27

### Fixed

- Tooltips on mobile rendered outside the viewport near screen edges. Horizontal position now clamps with 8px padding; arrow shifts to track the trigger.
- Tooltips stayed visible while scrolling on touch devices. Dismisses when the trigger moves 50px from its open position or leaves the viewport.
- Tapping a tooltip after scroll-dismiss had no effect. Trigger now blurs on scroll-dismiss so the next tap re-focuses.
- Tooltips near the top of the page overlapped Starlight's fixed header and "On this page" dropdown. Flips to bottom when space above is insufficient (100px header safe zone).

## [1.3.0] - 2026-03-26

### Added

- **Property Table component suite**: `<PropertyTable>`, `<Property>`, `<PropertyGroup>`, `<Expandable>`.
  - See the [documentation](https://starlight-theme.entapp.northwestern.edu/components/property-table) for more information.
- **Tooltip component suite**: `<Tooltip>`, `<Glossary>`, `<Term>`.
  - See the [documentation](https://starlight-theme.entapp.northwestern.edu/components/tooltip) for more information.
- **Keyboard component**: `<Kbd>`.
  - See the [documentation](https://starlight-theme.entapp.northwestern.edu/components/kbd) for more information.
- Fullscreen Mermaid overlay: scale animation, dot grid background, pan momentum on drag release, toast notifications on copy.
- `@media (prefers-contrast: more)`: heavier borders, system colors for focus rings.
- `@media (prefers-reduced-transparency: reduce)`: solid surfaces replace translucent backgrounds.
- `CONTRIBUTING.md` with development setup, conventions, and PR process.
- JSDoc comments on public TypeScript interfaces.

### Fixed

- Code block line numbers in dark mode had 2.85:1 contrast. Bumped from `#6e6e6e` to `#999` (4.6:1).
- Code block copy button icon in dark mode used `--nu-purple-100` on hover. Switched to `--nu-purple-40`.
- Wide tables overflowed into the sidebar. A [rehype](https://github.com/rehypejs/rehype) plugin now wraps each `<table>` in a scrollable `<div>` at build time.
- Reopening the fullscreen viewer after Escape showed a blue focus ring around the entire viewport.
- Mermaid hover toolbar sat unevenly relative to the diagram container border.
- Fullscreen close button used `rgb(255 255 255 / 20%)` while the theme toggle used `15%`. Both use `15%` now.
- Mobile sidebar: theme toggle and GitHub icon were white-on-white in light mode.
- Mobile sidebar: theme toggle was taller than wide; GitHub icon sat below it.
- Copy buttons did nothing on HTTP (insecure contexts). Added `document.execCommand("copy")` fallback.
- Clicking copy twice during the success animation duplicated the check icon. Debounced per button.
- iOS Safari toggled the URL bar when copying in the fullscreen viewer. The fallback textarea now appends inside the overlay.
- Mouse-opening the fullscreen viewer put a focus ring on the first control. Keyboard opens focus the first button; mouse opens focus the overlay container (no visible ring, Tab still works).
- Zoom in/out/reset buttons hidden on mobile (pinch-to-zoom covers it).
- Mermaid user overrides dropped on client-side theme toggle. Runtime configs now include merged user config.
- Mermaid lazy-rendered diagrams used stale theme after toggle. Observer callback now reads live theme mode.
- Mermaid pinch-to-zoom anchored to viewport center instead of pinch midpoint.
- Mermaid `MutationObservers` accumulated on view transitions. Previous observer now disconnected before creating a new one.
- Mermaid render race on rapid theme toggles. Per-container version tracking discards stale async completions.
- Mermaid fullscreen close could fire twice during animation. Added guard against double-close.
- Mermaid `diagramSources` `Map` leaked detached DOM nodes across view transitions. Switched to `WeakMap`.
- Tooltip event listeners duplicated on Astro view transitions. Added `WeakSet` idempotency guard.
- Tooltip Popover API called without feature detection. Added fallback for unsupported browsers.
- Tooltip positioning drifted on scroll. Now repositions via scroll listener while visible.
- Sidebar active item border shifted text. All sidebar links now reserve space with a transparent left border.
- Search modal focus ring used browser default blue. Now uses `--nu-focus-ring`.
- Site title clipped on mobile. Added fluid font sizing with `clamp()` and ellipsis overflow.

### Changed

- Fullscreen controls bar uses Starlight's `--sl-nav-pad-x` and `--sl-menu-button-size` so the close button aligns with the hamburger menu on mobile.
- Removed right padding on active sidebar headings that broke nested heading alignment.

## [1.2.0] - 2026-03-25

### Added

- Fullscreen Mermaid viewer: wheel zoom and double-click zoom anchor to the pointer position.
- Zoom level badge (e.g. `84%`) in the fullscreen viewer.
- GFM footnote styles: superscript `[n]` reference markers, footnotes section with separator, styled `↩︎` back-references.

### Fixed

- Mermaid diagrams sometimes breaking on Firefox and Safari. The toolbar script read `textContent` after `astro-mermaid` had already rendered SVG into the element. Reads `data-diagram` first now.
- Horizontal rules in dark mode used `--nu-purple-140`, which was invisible against the background. Switched to `--nu-border-color`.

### Accessibility

- Fullscreen Mermaid overlay: `role="dialog"`, `aria-modal`, focus trap, focus restore on close.
- White focus rings on overlay controls, theme toggle, and menu button (all sit on dark backgrounds where the purple ring was invisible).
- Inline Mermaid toolbar buttons use a solid accent outline on focus instead of the near-invisible shadow ring.

## [1.1.1] - 2026-03-25

### Fixed

- Scrollbar gutter reserved space on splash pages, leaving a gap next to the topbar. Now only applied on pages with a scrollbar.
- Mermaid toolbar buttons use Northwestern purple focus rings instead of the browser default.
- Mermaid fullscreen close button dropped the red danger style and matches the other overlay buttons.

### Changed

- Mermaid overlay buttons sized and styled to match the header theme toggle.

### Added

- Fullscreen Mermaid viewer supports touch: one-finger pan, pinch-to-zoom, two-finger pan.
- Mermaid toolbar stays visible on touch devices (`hover: none`) since hover is unavailable.
- SVG downloads use descriptive filenames derived from the site title, page slug, and diagram type (e.g., `northwestern-starlight-theme_examples-mermaid-flowchart.svg`).

## [1.1.0] - 2026-03-25

### Added

- Automatic favicon shipped with the theme, applied without touching `public/`. Override with `favicon` in Starlight config.
- `homepage.imageWidth` option for hero image size. Defaults to `500px`; set higher for wide lockup images.

### Fixed

- `showTitle: false` now works in the centered hero layout (previously only worked in split layout).
- Search result titles and headings no longer appear white-on-white in light mode. The `.header a` selector was too broad and bled into Pagefind's search modal.
- Search input focus ring uses Northwestern purple instead of the browser default.

### Changed

- Release workflow uses npm trusted publishing (OIDC) instead of long-lived tokens.

## [1.0.0] - 2026-03-25

- Initial public release
- Northwestern Purple color palette mapped to Starlight's accent system
- Akkurat Pro (body) and Poppins (headings) loaded from Northwestern CDN
- Styled tables, badges, asides, cards, tabs, and code blocks
- Mermaid diagram support with Northwestern colors and fullscreen viewer
- OpenAPI plugin compatibility with method badge preservation
- Reduced motion support for transitions

[Unreleased]: https://github.com/NIT-Administrative-Systems/northwestern-starlight-theme/compare/v1.4.1...HEAD
[1.4.1]: https://github.com/NIT-Administrative-Systems/northwestern-starlight-theme/compare/v1.4.0...v1.4.1
[1.4.0]: https://github.com/NIT-Administrative-Systems/northwestern-starlight-theme/compare/v1.3.2...v1.4.0
[1.3.2]: https://github.com/NIT-Administrative-Systems/northwestern-starlight-theme/compare/v1.3.1...v1.3.2
[1.3.1]: https://github.com/NIT-Administrative-Systems/northwestern-starlight-theme/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/NIT-Administrative-Systems/northwestern-starlight-theme/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/NIT-Administrative-Systems/northwestern-starlight-theme/compare/v1.1.1...v1.2.0
[1.1.1]: https://github.com/NIT-Administrative-Systems/northwestern-starlight-theme/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/NIT-Administrative-Systems/northwestern-starlight-theme/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/NIT-Administrative-Systems/northwestern-starlight-theme/releases/tag/v1.0.0
