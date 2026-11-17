# Changelog

[Français](CHANGELOG.md) · [English](CHANGELOG.en.md) · [Español](CHANGELOG.es.md) · [Deutsch](CHANGELOG.de.md)

Format inspired by [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and Semantic Versioning.

## [Unreleased]

## [1.5.2] — 2026-11-17

**1.5.2 — published on GitHub.** GitHub release: [v1.5.2](https://github.com/ScioNos/Scionos-Capture/releases/tag/v1.5.2). Current Chrome Web Store status is unconfirmed; no 1.5.2 Store submission is performed here.

- Editor drags: track the active `pointerId` and handle gesture interruptions.
- Internal editor thumbnails and composition preview: reconstruct them when reopening a project to include annotations.
- The “Export project” button: keep the unsaved-changes state; the message says the download was requested without guaranteeing that the browser saved the file.
- HTML reports: apply source policy throughout the generator, always removing HTTP(S) credentials.
- Print/PDF: cumulative limits of 32 million pixels and 128 MiB of blobs, with a maximum of 200 pages.
- Package: legacy `editor-export.js` module removed, leaving 35 distribution files.
- Updated test tools: axe-core/Playwright 4.14.0, Playwright Test 1.65.1, fake-indexeddb 6.2.8 and PDF.js 6.5.438. ESLint and HTML-Validate migrated to @eslint/js 10.0.1, eslint 10.15.0 and html-validate 11.21.1. Node.js requirement: ^22.22.0 or >=24.8.0; the CI matrix targets Node.js 22.22.0 and 24.8.0, with no GitHub run attested for this migration. Details: [major dependency migration](MAJOR_DEPENDENCY_MIGRATION.md).
- Accessibility: the language selector’s accessible name includes its visible code, checked in all four languages.

Version 1.5.2 validation: `npm run verify:release` passed — 133 unit tests, 126 browser tests, five modes each in Chrome 157.0.8103.79 and Edge 157.0.4341.60, three performance repetitions and ten PDF scenarios. Results and environment: [dependency review and validation](DEPENDENCY_REVIEW_1.5.2.md).

## [1.5.1] — published on GitHub

Version 1.5.1 is published on GitHub. The current Chrome Web Store status and distributed version are unconfirmed; check them in the dashboard.

### Privacy and robustness

- Source policy in the Document panel: default sanitized removes query and fragment, none omits sources, full retains them; HTTP(S) credentials are always removed. The choice applies to projects and exports; sources removed on save cannot be recovered. Library exports always use sanitized, including older projects.
- URL paths, titles, captions, dates and pixels may still be sensitive; local opt-in diagnostics, without telemetry. Permissions are unchanged.
- Exports and projects: one PNG snapshot per image; library thumbnails generated directly and cleanup accounts for printing in progress.
- PNG/JPEG/WebP imports: reject before decoding above 16 million pixels or 16,384 px per side instead of reducing; total composition limit unchanged at 32 million pixels.
- Project v1/v2 reading and v2 writing retained; metadata-only rename with one codec validation, preserving PNGs.

## [1.5.0] - 2026-11-14

### Added

- Multi-image composition with local import or clipboard paste, reordering, vertical/horizontal layout, titles, captions, and numbered steps.
- PNG, JPEG, WebP, HTML, Markdown/ZIP, PDF, and printing exports with quality and presentation settings.
- Individually editable annotations and portable `.scionos` v2 projects, with flattened v1 project support and irreversible mask/crop application on save.
- Durable local library with explicit saving, search, rename, duplication, deletion, configurable retention, and bounded quota.
- More visible help access and display of the version actually loaded.

### Fixed

- Overlapping library saves preserve click order and document identity, including when another project opens during encoding.
- Annotations moved or duplicated beyond image edges remain saveable and reopenable with bounded coordinates.

## [1.4.0] - 2026-11-10

### Added

- Fifth mode, Element capture: hover highlighting, parent/child selection, and capture of the visible part or entire content of a scrolling container.
- Selection confirmation with resize handles, X/Y/width/height fields, and keyboard controls.
- Immediate capture or a locally remembered 3, 5, or 10-second delay, with a cancellable countdown after selection confirmation.
- UI and help in French, English, Spanish, and German. Element selection does not traverse iframe contents.

### Fixed

- Visible banners inside zero-height fixed wrappers, including X.com’s cookie banner, no longer repeat in every capture tile; they are retained once at the bottom of the image.
- Appending content to a dynamic feed, such as X.com, no longer interrupts a bounded selection. Width, viewport, and shrinking-height checks remain; full-page capture stays strict.

## [1.3.3] - 2026-10-05

- Capture: shared rectangular stitching, horizontal selections without stretching, correct coordinates for translated or scaled containers; unsupported complex transforms fail explicitly.
- Selection: auto-scroll at the selected container edges, locked horizontal origin and width in vertical mode, overlays usable above modal dialogs.
- Stitching: retain the complete fixed footer when the final strip is shorter; restore state after cancellation and ignore late responses.
- Privacy: omit text covered by descendants from searchable PDFs; continuous freehand masks across distant points and single clicks.
- Exports: apply or cancel pending edits before exporting; PNG, HTML, clipboard and PDF use pixels and metadata from the same revision.
- HTML: embed the image once, check the final byte size, fix long-image scrolling and 100% zoom; stop text extraction at 1,500 blocks.
- Maintenance: separate version 1.3.3 from published downloads, add `--unreleased` synchronization, verify Markdown, and add real-pixel, PDF and four-DPR regressions.

## [1.3.2] - 2026-09-30

### Fixed

- Unified CSS, container and bitmap coordinates; restored document auto-scroll selection; scaled text metadata for DPR and image reductions.
- Assembly no longer overwrites captured areas; fixed and sticky elements are reassessed on each tile, including position changes and initially offscreen elements.
- PDF: collect text per tile; omit covered, invisible and partially cropped words; align cropping and censorship with bitmap pixels; omit legacy layers with unverified coordinates.
- Editor: contain long URLs, fit the available width, preserve text-input focus and native input undo, advance step numbers after redo, and protect asynchronous history consolidation.
- Keep captures while their editor remains open and delete them on closure; expire orphans and abandoned transfers; reconstruct associations when the worker wakes.

### Maintenance and validation

- Bound stabilization and text-collection budgets; patch transitive dependencies; add real-pixel tests, four scaling factors and extraction from generated PDFs.

## [1.3.1] - 2026-09-28

### Added

- Semi-transparent Highlighter tool (`H`) in the editor with keyboard shortcut, built-in help, and translations.
- Automatic slicing and pagination of tall captures for print/PDF with repeated headers and a searchable text layer per page.
- Auto-scroll extended to internal scroll containers with multi-tile region stitching.
- Local standardized `YYYY-MM-DD_HH-mm` export timestamps.

### Fixed

- Searchable PDF text layer: blocks taken from `<a>` links are exported as clickable hyperlinks again (the `url` field is now honored).
- Scrolling selection: a thin drag (width or height > 10 px) now confirms the region on pointer release.
- Internationalization: the `statusZone` key is included in the content-script message bundle (overlay label for screen readers).
- Help: the Shape tool shortcut is fixed (`S` instead of `R`).
- Editor: reloading the page keeps the capture (the acknowledgement no longer purges the blob; cleanup happens on tab close or expiry).
- Print/PDF: non-HTTP(S) source URLs render as plain text instead of an empty link.
- Popup: a failure to open the shortcuts page now surfaces the error instead of failing silently.
- History: flattening after 100 operations preserves the text layer; undoing a step badge restores its counter.
- Filenames: truncation on code-point boundaries (emojis preserved); text-background options and HTML report errors translated in all 4 languages.

### Changed & Performance

- Tile robustness: backoff retries on `captureVisibleTab` rate limiting (tab switches are not retried).
- Performance: anchored-element classification cached per attempt, layout pre-filters before style recalc, deduplicated container scans.
- Text extraction: real visibility check via `checkVisibility` (inherited opacity honored).
- Storage: truly bounded LRU IndexedDB memory cache.
- Maintenance: single shared release file list for packaging and validation; storage cache internals no longer exposed.

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

[Unreleased]: https://github.com/ScioNos/Scionos-Capture/compare/v1.5.2...HEAD
[1.3.3]: https://github.com/ScioNos/Scionos-Capture/compare/v1.3.2...v1.3.3
[1.3.2]: https://github.com/ScioNos/Scionos-Capture/compare/v1.3.1...v1.3.2
[1.3.1]: https://github.com/ScioNos/Scionos-Capture/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/ScioNos/Scionos-Capture/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/ScioNos/Scionos-Capture/compare/v1.1.1...v1.2.0
[1.1.1]: https://github.com/ScioNos/Scionos-Capture/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/ScioNos/Scionos-Capture/releases/tag/v1.1.0
[1.0.0]: https://github.com/ScioNos/Scionos-Capture/releases/tag/v1.0.0

[1.5.0]: https://github.com/ScioNos/Scionos-Capture/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/ScioNos/Scionos-Capture/compare/v1.3.3...v1.4.0

[1.5.1]: https://github.com/ScioNos/Scionos-Capture/releases/tag/v1.5.1

[1.5.2]: https://github.com/ScioNos/Scionos-Capture/compare/v1.5.1...v1.5.2
