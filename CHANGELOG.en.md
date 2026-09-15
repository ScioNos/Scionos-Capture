# Changelog

[Français](CHANGELOG.md) · [English](CHANGELOG.en.md) · [Español](CHANGELOG.es.md) · [Deutsch](CHANGELOG.de.md)

Format inspired by [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and Semantic Versioning.

## [Unreleased]

### Fixed

- Orphaned capture lifetime reduced from one hour to fifteen minutes.
- Removed unused and undocumented legacy `OPEN_EDITOR` service worker action.
- Robust detection of internal scrolling containers (e.g., Facebook Messenger chat windows) during scrolling zone capture, preventing parent page background scrolling.
- Anchored floating dock protection (`position: fixed` / `position: sticky`) to prevent accidental hiding during internal surface scrolling.

## [1.1.0] - 2026-09-14

### Added

- Persistent chunked transfer for large screenshots, compatible with Manifest V3.
- Scrolling-area capture inside internal containers and dedicated Windows validation.

### Fixed

- Misalignment with Windows scaling, fractional zoom, and classic scrollbars.
- Repeated fixed or sticky headers, tile seams, and layouts changing during capture.
- Cleanup after editor decoding, interrupted transfers, language fallback, and unsupported-page detection.


## [1.0.0] - 2026-08-22

### Added

- Initial official release of **Scionos Capture** by **eyelo SA** (ScioNos, Switzerland).
- 4 capture modes: Visible tab, Full page (2D grid stitching), Custom region selection, and Multi-screen scrolling area.
- Rich annotation editor: rectangles, ellipses, arrows, text, highlighting, solid blur/redaction, and non-destructive cropping.
- Versatile export: High-res PNG download, direct clipboard copy, printing, and **interactive standalone HTML report export** (embedded viewer with pan/zoom and metadata).
- New official SN brand monogram logo with glowing capture reticle.
- 100% local processing with zero external telemetry, ensuring full GDPR and Swiss nDPA compliance.
- Complete 4-language support: French, English, Spanish, and German.
- Full accessibility support (WCAG, high contrast, keyboard navigation, screen readers).
- Unit tests, integration tests, E2E Chromium tests, and automated packaging.

### Fixed

- Right/bottom tiles, concurrent capture collisions, tab changes, and cleanup after errors.
- Canvas-clipping zoom, non-responsive toolbar, incomplete translations, hard-coded shortcut, contrast, and accessible names.
- Locale descriptions above 132 characters, editor reload data loss, and inaccurate retention wording.

[Unreleased]: https://github.com/ScioNos/Scionos-Capture/compare/v1.1.0...HEAD
[1.0.0]: https://github.com/ScioNos/Scionos-Capture/releases/tag/v1.0.0

[1.1.0]: https://github.com/ScioNos/Scionos-Capture/releases/tag/v1.1.0
