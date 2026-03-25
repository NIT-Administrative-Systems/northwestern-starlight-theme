# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.1] - 2026-03-25

### Fixed

- Scrollbar gutter reserved space on splash pages, leaving a gap next to the topbar. Now only applied on pages with a scrollbar.
- Mermaid toolbar buttons use Northwestern purple focus rings instead of the browser default.
- Mermaid fullscreen close button dropped the red danger style and matches the other overlay buttons.

### Changed

- Mermaid overlay buttons sized and styled to match the header theme toggle.

### Added

- Fullscreen mermaid viewer supports touch: one-finger pan, pinch-to-zoom, two-finger pan.
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

[Unreleased]: https://github.com/NIT-Administrative-Systems/northwestern-starlight-theme/compare/v1.1.1...HEAD
[1.1.1]: https://github.com/NIT-Administrative-Systems/northwestern-starlight-theme/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/NIT-Administrative-Systems/northwestern-starlight-theme/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/NIT-Administrative-Systems/northwestern-starlight-theme/releases/tag/v1.0.0
