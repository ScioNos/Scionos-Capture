<p align="center">
  <img src="images/icon128.png" width="88" height="88" alt="Scionos Capture logo">
</p>

<h1 align="center">Scionos Capture</h1>

<p align="center"><strong>Capture a page. Build a document.<br>Keep your data on your device.</strong></p>

<p align="center">A local extension for Chrome and Microsoft Edge, from screenshots to a project library.</p>

[Français](README.md) · [English](README.en.md) · [Deutsch](README.de.md) · [Español](README.es.md)

[![Version](https://img.shields.io/badge/version-1.5.3-blue)](https://github.com/ScioNos/Scionos-Capture) [![Checks](https://github.com/ScioNos/Scionos-Capture/actions/workflows/ci.yml/badge.svg)](https://github.com/ScioNos/Scionos-Capture/actions/workflows/ci.yml) [![MIT License](https://img.shields.io/badge/licence-MIT-green)](LICENSE) ![Chrome and Edge](https://img.shields.io/badge/Chrome_%26_Edge-Manifest_V3-4285F4)

**[Download version 1.5.2](https://github.com/ScioNos/Scionos-Capture/releases/tag/v1.5.2)** · **[View the Chrome Web Store listing](https://chromewebstore.google.com/detail/modfkdhgnhbfilpfanjginilabajchbe)** · **[Get help](https://github.com/ScioNos/Scionos-Capture/issues)**

<!-- source-version --> **1.5.3 — in preparation, unpublished.** The existing GitHub release keeps its tag and earlier archive; it does not contain these new fixes. No Store submission performed. See [the readiness report](STORE_READINESS_1.5.2.md).

## 1.5.3 preparation — November 26, 2026

**Local preparation, not published.** Final test validation is still in progress; results and limitations will be recorded in the [consolidation report](CONSOLIDATION_1.5.3.md). No GitHub release or Store submission is performed. Public 1.5.2 links and archives still refer to the existing publication.

- Capture: check the active tab, window and navigation before and after acquisition, with a probe tied to `documentId`. The URL and title are fixed at the start of the session.
- PDF: invalidate the text layer for DOM/CSSOM mutations, inaccessible CSS stylesheets, media changes or animations; exclude white-on-white text and omit text under blend modes or image backgrounds when visibility is uncertain (the invisible-on-white `SECRET_BLEND` regression was confirmed and fixed). These checks do not prove an absolute pixel/text match when a transient CSSOM change is restored between observations. Omission of text is preferred when uncertain; review the pixels and use a solid mask for secrets.
- Captures: a 180-second budget checked cooperatively at checkpoints, and at most 256 portions. This is not a preemptive interruption at 180 seconds; excessively long pages are rejected.
- Resources: a cumulative 32-million-pixel budget includes originals retained after cropping; Undo/Redo remains bounded by this budget. At most two snapshots are in flight simultaneously, until export, clipboard copying or saving finishes. Canvas surfaces owned by these operations are reduced to 1 × 1 in `finally`, preserving input surfaces.
- Annotations: 1,000 per image and 5,000 per document; 10,000 points per stroke and 100,000 per document. Global history is limited to 100 states, 100,000 points and 5,000 operations.
- Storage: remove the capture cache to avoid stale data across contexts; close abandoned IndexedDB connections. Transactional full deletion already present in the local tree is integrated and preserved, with complete rollback on failure.
- Imports: strictly validate PNG `tRNS` transparency data. Project v1/v2 reading and v2 writing are retained. No new permission or telemetry.
- Interface: fix toolbar overlap; annotation controls stay grouped in the same 56 px toolbar, without canvas shifts or drag offsets. Inert `historyRevision`, `historyConsolidation` and `redoOperations` state is removed.
- Compatibility: manifest minimum Chrome/Edge 106 instead of 102; CSS `:has()` requires Chrome 105 and `documentId` requires Chrome 106. This minimum is identified by static analysis; the only attested native runs concern Chrome/Edge 158, with no demonstrated run on Chrome/Edge 106.
- Tools: `@axe-core/playwright` 4.14.1, `html-validate` 11.22.1, `minimatch` override 11.0.9; remove the inactive `glob` override and update Actions. See the [dependency review](DEPENDENCY_REVIEW_1.5.3.md).
- Library: bounded card and thumbnail reuse is implemented; performance gain measurement remains in progress. Batch processing targeted for 1.6 is not implemented.

## Version 1.5.2 — fixes and reliability

- Selections: track the active pointer, ignore secondary pointers and clean up interrupted gestures.
- Capture: restore hidden elements even when their preparation throws.
- Library: atomic bulk deletion, rejecting stale snapshots and rolling back the entire operation on failure.
- Editor drags: track the active `pointerId` and handle gesture interruptions.
- Internal editor thumbnails and composition preview: reconstruct them when reopening a project to include annotations.
- The “Export project” button: keep the unsaved-changes state; the message says the download was requested without guaranteeing that the browser saved the file.
- HTML reports: apply source policy throughout the generator, always removing HTTP(S) credentials.
- Print/PDF: cumulative limits of 32 million pixels and 128 MiB of blobs, with a maximum of 200 pages.
- Package: legacy `editor-export.js` module removed, leaving 35 distribution files.


![Scionos Capture 1.5.2 editor: image annotation and a horizontal composition preview](store-assets/screenshot-real-1-composition-v1.5.2.png)

*Actual version 1.5.2 interface, with local demonstration content.*

## From web page to document

Create a visual explanation, document a problem or save a useful excerpt. Scionos Capture brings selection, annotation, composition and reopening projects together in one extension.

| Capture precisely | Explain and compose | Find your work |
| --- | --- | --- |
| Full page, visible area, selection, scrolling area or element capture with a click. | Drawing, text, arrows and masks; multiple images with titles and captions. | Portable projects and a local library with search, rename and duplicate. |

**No account, telemetry or processing server.** Images and metadata stay on your device. You decide what to save and share.

## Install in minutes

### Download from GitHub — version 1.5.2

1. Download `scionos-capture-v1.5.2.zip` from the [v1.5.2 release](https://github.com/ScioNos/Scionos-Capture/releases/tag/v1.5.2).
2. Verify its checksum using the supplied `.sha256` file, then extract the archive.
3. Open `chrome://extensions` or `edge://extensions` and enable **Developer mode**.
4. Choose **Load unpacked** and select the extracted folder containing the manifest.
5. Pin Scionos Capture to the toolbar and open a regular web page.

An existing [Chrome Web Store listing](https://chromewebstore.google.com/detail/modfkdhgnhbfilpfanjginilabajchbe) is available. Its distributed version and review status must be confirmed in the dashboard; no 1.5.2 Store submission is performed here.

## Three ways to work

### 1. Capture the right area

Choose one of five modes, adjust the selection with handles or coordinates, then confirm. Element selection lets you move to a parent or child element. A **3, 5 or 10-second** delay, cancellable with **Escape**, gives you time to prepare a menu or temporary state.

Define a scrolling area with two points or the keyboard. It keeps the selected visible width and stitches supported sections vertically.

<details>
<summary>View selection tools and settings</summary>

![Adjustable selection: handles, coordinates and confirmation before capture](store-assets/screenshot-real-4-selection-v1.5.2.png)

</details>

### 2. Annotate and compose

Import or paste multiple images, reorder them and choose a vertical or horizontal layout. Add titles, captions and numbered steps; adjust spacing, margins and background.

In the editor, select and edit supported annotations. Drawing, highlighter, arrows, shapes, text and numbered markers help explain; solid masks protect confidential information. Undo/Redo and zoom let you refine the result.

| What you need | Options |
| --- | --- |
| An image to share | PNG, JPEG or WebP, copy to clipboard. |
| A document to read | Standalone HTML report or Markdown with its images in a ZIP. |
| A printed version | Print/PDF, with margins, orientation, scale and headers/footers. |
| Work to resume later | Portable `.scionos` v2 project; v1 projects can be opened with flattened annotations. |

<details>
<summary>View export and layout settings</summary>

![Export dialog: PDF layout, margins, orientation and pagination](store-assets/screenshot-real-3-export-v1.5.2.png)

</details>

### 3. Save and find your projects

The library keeps projects **when you explicitly save them**, even after the editor closes. Browse thumbnails, search by title or source, then reopen, rename, duplicate, export or delete a project.

Choose a retention period of **0, 7, 30 or 90 days** and a quota of **64 to 1,024 MiB** — **256 MiB** by default. **0 days** means no automatic expiration. A portable file lets you keep a separate copy outside the library.

![Local library: saved projects, actions and retention settings](store-assets/screenshot-real-2-bibliotheque-v1.5.2.png)

## Privacy and control over your data

- **Local processing.** The extension does not send your screenshots, URLs or browsing data to ScioNos or any third party. No remote code is executed.
- **Storage on your terms.** Temporary captures and chunks are cleaned up according to their lifecycle. Library projects follow your chosen retention period; separately saved files remain your responsibility.
- **Solid masks for secrets.** Blur is a visual effect. When saving a project, masks and crops become irreversible; affected annotations are conservatively removed. After cropping, earlier annotations are flattened to preserve their appearance and order.
- **Source controls.** In the Document panel, `sanitized` removes URL query parameters and fragments by default; `none` omits sources and `full` retains them. Credentials embedded in HTTP(S) URLs are always removed. This choice applies to projects and exports; sources removed on save cannot be restored. Library exports always use `sanitized`, including for older projects.
- **Review before sharing.** URL paths, images, titles, captions and dates may still be sensitive. Diagnostics are local and opt-in, without telemetry.

Read the [privacy policy](PRIVACY.en.md) and [security model](SECURITY.en.md).

<details>
<summary>Understand permissions and temporary storage</summary>

| Permission | Purpose |
| --- | --- |
| `activeTab` and `scripting` | Capture the selected tab and inject tools after an explicit action. |
| `storage` | Remember language, delay, library preferences and temporary associations. |
| `unlimitedStorage` | Store large images and projects locally; the library retains its application quota. |
| `alarms` | Clean up expired temporary data and projects whose retention period has ended. |

Chunks stay in local IndexedDB and are deleted after assembly or fifteen minutes of inactivity. A final capture remains available while a matching editor is open, including after a reload. It is deleted when the last editor closes; without an editor, it becomes eligible for cleanup fifteen minutes after creation. A suspended browser may defer cleanup until it wakes.

</details>

## What to know

- Internal browser pages and extension stores are protected against injection.
- Animated, virtualized or endless content may remain incomplete. Some fixed or `sticky` elements may vary between sections.
- The selector does not traverse iframe contents or closed shadow roots.
- PNG, JPEG and WebP imports exceeding **16 million pixels** or **16,384 px per side** are rejected before decoding instead of being reduced. The total composition limit remains **32 million pixels**. Unsupported rotations, skews and perspective transforms are explicitly rejected.
- Searchable PDF text is retained only when its visibility can be verified. Imported images and images restored from a project provide no reliable text layer; uncertain words are omitted from the text layer while the image is preserved.
- Apply or cancel pending edits before exporting.

## Develop and contribute

The interface and help are available in **French, English, German and Spanish**. The project uses Manifest V3 and has no external JavaScript runtime dependencies.

Prerequisite: **Node.js `^22.22.0 || >=24.8.0`**, with **Node.js 24.8+ recommended** for development and test tools.

```bash
npm ci
npm run verify
```

`verify` checks syntax, lint, HTML, unit tests, translations, packaging and browser/accessibility regressions. `npm run test:native` tests all five modes in installed Chrome and Edge with real captures and disposable profiles, without using personal profiles. `npm run package` generates the archive and its checksum in `dist/`.

Version sync for GitHub publication: `npm run version:sync -- 1.5.2`; in PowerShell: `npm.cmd run version:sync -- 1.5.2`. This command also changes package version files; run it only as part of their coordinated update.

Corrected local package: `dist/scionos-capture-v1.5.2.zip`, 35 files. The candidate checksum is recorded in [the Store report](STORE_READINESS_1.5.2.md) and the adjacent `.sha256` file; it differs from the existing GitHub archive.

<!-- local-package --> Local archive : `scionos-capture-v1.5.3.zip` · SHA-256 : `scionos-capture-v1.5.3.zip.sha256`.

[Contribute](CONTRIBUTING.en.md) · [Changelog](CHANGELOG.en.md) · [Release notes](RELEASE_NOTES.md) · [Report an issue](https://github.com/ScioNos/Scionos-Capture/issues) · [Report a vulnerability](SECURITY.en.md)

---

Developed by **eyelo SA, Switzerland**, under the **ScioNos** brand. [Website](https://scionos.ch) · [Contact](mailto:info@eyelo.ch) · [MIT License](LICENSE)

Candidate validation: 136 unit tests and 136 browser tests passed, five native modes in Chrome and Edge, three performance repetitions and ten PDF scenarios. Details, limits and final checksum: [Store readiness](STORE_READINESS_1.5.2.md).
