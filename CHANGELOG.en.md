# Changelog

[Français](CHANGELOG.md) · [English](CHANGELOG.en.md) · [Español](CHANGELOG.es.md) · [Deutsch](CHANGELOG.de.md)

Format inspired by [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and Semantic Versioning.

## [Unreleased]

## [1.3.0] - 2026-09-25

### Added

- Continuous auto-scroll (*drag-to-scroll*) for selection captures, expanding capture beyond visible viewport with seamless multi-tile stitching.
- Searchable PDF export with transparent vector text layer (`Ctrl+F`), selectable text, and clickable `<a>` links.
- Automatic text pruning under censored areas (solid color or blur) to guarantee privacy in exported PDFs.
- Vector annotation palette: directional arrows (`tool-arrow`), rectangle/ellipse shapes (`tool-shape`), canvas text annotations (`tool-text`), and numbered step badges (`tool-step`) with 1, 2, 3... auto-increment and quick reset.
- Offline user guide and help page (`help.html`) accessible via `?` button from popup and editor.
- Additional editor shortcuts: `A` (arrow), `S` (shape), `T` (text), `P` (step).
- Expanded test suite: 36 unit tests and 14 end-to-end (Playwright E2E) tests.

### Fixed

- Reliable keyboard shortcut resolution in the popup: hybrid Promise and callback handling for `chrome.commands.getAll`, resolving the false "Not configured" state when `Alt+Shift+C` is active.
- Manifest V3 compliance: removed invalid `description` key under `_execute_action` in `manifest.json`.
- Complete distribution archive: guaranteed inclusion of `help.html` and `help.js` in the distribution ZIP with strict validation checks.
- Editor performance: removed unnecessary canvas dimension resets on every render pass, preserving drawing contexts during active edits on large captures.
- Atomic version synchronization: fail-fast verification of `package-lock.json` integrity prior to writing any files to disk.
- Stricter PNG validation: enforce full 8-byte PNG signature and `IHDR` chunk verification before reading dimensions.
- Editor accessibility: keyboard focusability added to the scrollable toolbar (`tabindex="0"`).
- Drawing gesture resilience: guaranteed pointer capture state cleanup upon `lostpointercapture` and `pointercancel`.

### Changed

- Internally refactored capture scripts (`content-dom.js`, `content-transfer.js`, `content-capture.js`) and editor scripts (`editor-operations.js`, `editor-export.js`) into focused files without changing capture flows or transfer formats.

## [1.2.0] - 2026-09-22

### Added

- Default keyboard shortcut updated to `Alt+Shift+C` with a direct shortcut settings button in the extension popup.
- Drag-to-select selection overlay with a "To bottom" quick action to instantly expand selection to the bottom of the container.
- Automatic page title inclusion in exported filenames with precise timestamps.
- Multi-page A4/PDF paged printing with clean slice computation avoiding abrupt page cuts.
- IndexedDB memory cache (LRU) and injection ping probe preventing redundant content script re-injections.
- Version synchronization scripts, strict release packaging validation, and Playwright browser caching in CI.

### Fixed

- Dynamic hiding of stationary input bars (e.g., ChatGPT, Claude, Notion, Messenger) positioned with `position: absolute` outside the scrolling container, visible only on the final tile.
- Scoped page dimension stabilization restricted to the scrolling zone (`range`) to avoid whole-page layout shifts.
- Fixed selection cropping with classic scrollbars and fractional display scaling.
- Reliably restore scroll positions and `scroll-behavior` styles after capture cancellation, restart, or failure.
- Atomically persist IndexedDB chunks and transfer metadata to prevent partially persisted transfer states.
- Added incremental editor rasterization and asynchronous HTML/print exports with a size guard.
- Added strict Chrome version validation, synchronized security policies, and explicit asset-generator failures.

## [1.1.1] - 2026-09-15

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

[Unreleased]: https://github.com/ScioNos/Scionos-Capture/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/ScioNos/Scionos-Capture/compare/v1.1.1...v1.2.0
[1.1.1]: https://github.com/ScioNos/Scionos-Capture/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/ScioNos/Scionos-Capture/releases/tag/v1.1.0
[1.0.0]: https://github.com/ScioNos/Scionos-Capture/releases/tag/v1.0.0
