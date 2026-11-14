<p align="center">
  <img src="images/icon128.png" width="88" height="88" alt="Scionos Capture logo">
</p>

<h1 align="center">Scionos Capture</h1>

<p align="center"><strong>Capture a page. Build a document.<br>Keep your data on your device.</strong></p>

<p align="center">A local extension for Chrome and Microsoft Edge, from screenshots to a project library.</p>

[Français](README.md) · [English](README.en.md) · [Deutsch](README.de.md) · [Español](README.es.md)

[![Version](https://img.shields.io/badge/version-1.5.0-blue)](https://github.com/ScioNos/Scionos-Capture/releases/tag/v1.5.0) [![Checks](https://github.com/ScioNos/Scionos-Capture/actions/workflows/ci.yml/badge.svg)](https://github.com/ScioNos/Scionos-Capture/actions/workflows/ci.yml) [![MIT License](https://img.shields.io/badge/licence-MIT-green)](LICENSE) ![Chrome and Edge](https://img.shields.io/badge/Chrome_%26_Edge-Manifest_V3-4285F4)

**[Download version 1.5.0](https://github.com/ScioNos/Scionos-Capture/releases/tag/v1.5.0)** · **[View the Chrome Web Store listing](https://chromewebstore.google.com/detail/modfkdhgnhbfilpfanjginilabajchbe)** · **[Get help](https://github.com/ScioNos/Scionos-Capture/issues)**

<!-- source-version --> **Version 1.5.0 is available on GitHub.** The Chrome Web Store listing update is being prepared; its version may differ from the repository.

![Scionos Capture 1.5.0 editor: image annotation and a horizontal composition preview](store-assets/screenshot-real-1-composition-v1.5.0.png)

*Actual version 1.5.0 interface, with local demonstration content.*

## From web page to document

Create a visual explanation, document a problem or save a useful excerpt. Scionos Capture brings selection, annotation, composition and reopening projects together in one extension.

| Capture precisely | Explain and compose | Find your work |
| --- | --- | --- |
| Full page, visible area, selection, scrolling area or element capture with a click. | Drawing, text, arrows and masks; multiple images with titles and captions. | Portable projects and a local library with search, rename and duplicate. |

**No account, telemetry or processing server.** Images and metadata stay on your device. You decide what to save and share.

## Install in minutes

### From GitHub — version 1.5.0

1. Download `scionos-capture-v1.5.0.zip` from the [v1.5.0 release](https://github.com/ScioNos/Scionos-Capture/releases/tag/v1.5.0).
2. Verify its checksum using the supplied `.sha256` file, then extract the archive.
3. Open `chrome://extensions` or `edge://extensions` and enable **Developer mode**.
4. Choose **Load unpacked** and select the extracted folder containing the manifest.
5. Pin Scionos Capture to the toolbar and open a regular web page.

The [Chrome Web Store listing](https://chromewebstore.google.com/detail/modfkdhgnhbfilpfanjginilabajchbe) lets you install from the store. Check the version offered there: GitHub releases and Google review follow separate processes.

## Three ways to work

### 1. Capture the right area

Choose one of five modes, adjust the selection with handles or coordinates, then confirm. Element selection lets you move to a parent or child element. A **3, 5 or 10-second** delay, cancellable with **Escape**, gives you time to prepare a menu or temporary state.

Define a scrolling area with two points or the keyboard. It keeps the selected visible width and stitches supported sections vertically.

<details>
<summary>View selection tools and settings</summary>

![Adjustable selection: handles, coordinates and confirmation before capture](store-assets/screenshot-real-4-selection-v1.5.0.png)

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

![Export dialog: PDF layout, margins, orientation and pagination](store-assets/screenshot-real-3-export-v1.5.0.png)

</details>

### 3. Save and find your projects

The library keeps projects **when you explicitly save them**, even after the editor closes. Browse thumbnails, search by title or source, then reopen, rename, duplicate, export or delete a project.

Choose a retention period of **0, 7, 30 or 90 days** and a quota of **64 to 1,024 MiB** — **256 MiB** by default. **0 days** means no automatic expiration. A portable file lets you keep a separate copy outside the library.

![Local library: saved projects, actions and retention settings](store-assets/screenshot-real-2-bibliotheque-v1.5.0.png)

## Privacy and control over your data

- **Local processing.** The extension does not send your screenshots, URLs or browsing data to ScioNos or any third party. No remote code is executed.
- **Storage on your terms.** Temporary captures and chunks are cleaned up according to their lifecycle. Library projects follow your chosen retention period; separately saved files remain your responsibility.
- **Solid masks for secrets.** Blur is a visual effect. When saving a project, masks and crops become irreversible; affected annotations are conservatively removed. After cropping, earlier annotations are flattened to preserve their appearance and order.
- **Review before sharing.** Projects and exports may contain images, titles, captions, sources and dates.

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
- Images exceeding **16 million pixels** or **16,384 px per side** may be reduced. Unsupported rotations, skews and perspective transforms are explicitly rejected.
- Searchable PDF text is retained only when its visibility can be verified. Imported images and images restored from a project provide no reliable text layer; uncertain words are omitted from the text layer while the image is preserved.
- Apply or cancel pending edits before exporting.

## Develop and contribute

The interface and help are available in **French, English, German and Spanish**. The project uses Manifest V3 and has no external JavaScript runtime dependencies.

Recommended prerequisite: **Node.js 24**. Core checks remain compatible with Node.js 20.

```bash
npm ci
npm run verify
```

`verify` checks syntax, lint, HTML, unit tests, translations, packaging and browser/accessibility regressions. `npm run test:native` tests all five modes in installed Chrome and Edge with real captures and disposable profiles, without using personal profiles. `npm run package` generates the archive and its checksum in `dist/`.

Version sync: `npm run version:sync -- 1.5.0`; in PowerShell: `npm.cmd run version:sync -- 1.5.0`.

<!-- local-package --> Local archive: `scionos-capture-v1.5.0.zip` · SHA-256: `scionos-capture-v1.5.0.zip.sha256`.

[Contribute](CONTRIBUTING.en.md) · [Changelog](CHANGELOG.en.md) · [Release notes](RELEASE_NOTES.md) · [Report an issue](https://github.com/ScioNos/Scionos-Capture/issues) · [Report a vulnerability](SECURITY.en.md)

---

Developed by **eyelo SA, Switzerland**, under the **ScioNos** brand. [Website](https://scionos.ch) · [Contact](mailto:info@eyelo.ch) · [MIT License](LICENSE)
