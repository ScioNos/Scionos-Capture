# Scionos Capture

[Français](README.md) · [English](README.en.md) · [Español](README.es.md) · [Deutsch](README.de.md)

A fully local Chrome and Edge screenshot extension. Capture the viewport, a selection, a scrolling area, or a complete page, then draw, mask, crop, and export as PNG, interactive HTML, or PDF.

## Features

- Visible, selected, scrolling-area, and two-dimensional full-page capture.
- Vertical scrolling areas defined with two points or keyboard X/Y/width/height fields.
- Local editor with drawing, solid masking, visual blur, crop, Undo/Redo, keyboard geometry, and 20–300% zoom.
- Responsive, keyboard-accessible UI in French, English, Spanish, and German.
- Automatic browser language with a manual flag menu override.
- No server, account, telemetry, advertising, or screenshot transfer.

## Installation

Download `scionos-capture-v1.3.2.zip` from the [v1.3.2 release](https://github.com/ScioNos/Scionos-Capture/releases/tag/v1.3.2), optionally verify the `.sha256` file, and extract it. Open `chrome://extensions` or `edge://extensions`, enable **Developer mode**, choose **Load unpacked**, and select the extracted folder.

To work from source, clone the repository, run `npm ci`, and load the project root as an unpacked extension.

## Usage and shortcuts

Choose **Full page**, **Visible area**, **Selected area**, or **Scrolling area**. For a scrolling area, click the first corner, scroll vertically, and click the opposite corner. `Escape` cancels, **Start over** clears the first point, and X/Y/width/height fields provide a keyboard alternative. The suggested browser shortcut is `Alt+Shift+C`; the popup displays the shortcut actually configured.

In the editor, `V`, `D`, `M`, and `C` select tools; `Ctrl+Z`/`Ctrl+Y` undo and redo; `+`, `-`, and `0` control zoom. Use a solid mask for secrets—blur is visual only.

## Permissions and privacy

`activeTab` and `scripting` capture only after an explicit action; `storage` keeps language and temporary editor mapping; `unlimitedStorage` prevents quota failures for large local images; `alarms` expires temporary captures.

Transfer chunks remain only in local IndexedDB and are deleted after assembly or fifteen minutes of inactivity (on the next wake-up if the browser is suspended). The final capture is retained while a matching editor is open, including reloads and beyond fifteen minutes. It is deleted when the last editor closes; without an editor, it becomes eligible for cleanup fifteen minutes after creation. See [PRIVACY.en.md](PRIVACY.en.md) and [SECURITY.en.md](SECURITY.en.md).

## Known limitations

Permanent infinite-scroll pages have no determinable end. A scrolling area is limited to the visible width at the first point and is not stitched horizontally. Continuously changing or sticky content may differ between tiles. Browser internal pages and extension stores cannot be injected. Images above 16 million pixels or 16,384 px per side are reduced automatically.

## Development

Use Node.js 24, then run `npm ci` and `npm run verify`. Verification includes syntax, lint, HTML, unit/integration tests, manifest/locales, packaging, Chromium E2E, and Axe. See [CONTRIBUTING.en.md](CONTRIBUTING.en.md), [CHANGELOG.en.md](CHANGELOG.en.md), and the [MIT License](LICENSE).

### PDF — 1.3.2

The searchable PDF layer retains only complete words whose visibility can be verified. Uncertain words are omitted from that layer while the captured image is preserved. Legacy layers with unverified coordinates are also omitted. Use solid censorship to protect confidential pixels; blur is only a visual effect.

Node.js 24 is recommended for full verification, including PDF extraction with PDF.js 6.3.289 (test dependency only). Core checks remain compatible with Node.js 20.
