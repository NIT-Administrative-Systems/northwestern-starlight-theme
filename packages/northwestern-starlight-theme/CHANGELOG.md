# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] - 2026-03-25

### Added

- Automatic favicon — the theme ships Northwestern's official favicon and applies it without touching `public/`. Consumers can still override it with their own `favicon` in Starlight config.
- `homepage.imageWidth` option to control hero image size. Defaults to `500px`, useful for wide lockup images that need more space.

### Fixed

- `showTitle: false` now works in the centered hero layout (previously only worked in split layout).
- Search result titles and headings no longer appear white-on-white in light mode. The `.header a` selector was too broad and bled into Pagefind's search modal.
- Search input focus ring now uses the Northwestern purple treatment instead of the browser's default blue outline.

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

[Unreleased]: https://github.com/NIT-Administrative-Systems/northwestern-starlight-theme/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/NIT-Administrative-Systems/northwestern-starlight-theme/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/NIT-Administrative-Systems/northwestern-starlight-theme/releases/tag/v1.0.0
