# Privacy policy

[Français](PRIVACY.md) · [English](PRIVACY.en.md) · [Español](PRIVACY.es.md) · [Deutsch](PRIVACY.de.md)

## 1.5.3 preparation — November 26, 2026

**Final local 1.5.3 qualification passed; unpublished version.** The complete run passes: 178 unit tests, 179 E2E tests, five native modes in Chrome 158.0.8127.37 and Edge 158.0.4370.33, three interruptions per browser, three performance repetitions and ten PDF scenarios. Linux checks also pass on the exact Node 22.22.0 and 24.8.0 minima (178 unit tests each). See the [consolidation report](RAPPORT_CONSOLIDATION_1.5.3.md). Application commit `3352a12` is proposed in [PR #1](https://github.com/ScioNos/Scionos-Capture/pull/1), open and unmerged; merging requires explicit approval. Linux E2E and Windows scaling passed on that commit; Node 22/24 core checks and the filter passed on `81f7849` after fixing evidence links. See the [PR checks](https://github.com/ScioNos/Scionos-Capture/pull/1/checks) for the latest SHA; no complete success of that latest CI run is claimed yet. Definitive archive: 175,572 bytes, SHA-256 `f863e10d835425c9023cdb716f7f6bdaa5ce191f34982042417312a50a733d81`. No GitHub release or Store submission; public 1.5.2 links are preserved.

- Export cancellation: Cancel and Escape prevent publication even after snapshot creation starts, during PDF rasterization or image-only page bands; temporary URL cleanup and retry are covered by eight passing targeted scenarios.

Capture identity checks and metadata fixed at startup aim to avoid mixing pages or documents. Removing the cache does not change local retention; IndexedDB remains authoritative. Closing abandoned connections and the transactional full deletion already present locally improve storage consistency. Users must still delete previously saved exports separately.

- Capture: check the active tab, window and navigation before and after acquisition, with a probe tied to `documentId`. The URL and title are fixed at the start of the session.
- PDF: `captureVisibleTab` provides no evidence that captured pixels match the DOM. Even identical observed states before and after capture can miss a transient change, so all DOM-derived source text is omitted from native captures. User annotation text is rendered into pixels; titles, captions and page bands remain searchable outside image-only mode.
- Image-only PDF: a Document panel option, translated into all four languages and saved with project settings. It removes searchable text layers and rasterizes headers and footers too. Visible pixels may still contain secrets; this mode does not replace a solid mask.
- Projects: the manifest is limited to 1 MiB of UTF-8 JSON (including escapes), and the STORE ZIP archive to 128 MiB including headers and directory. Preflight rejects over-budget states before copies/snapshots; the codec also checks final encoded sizes. Undo/Redo annotation histories additionally share a total 1 MiB budget for raw UTF-8 JSON, with a per-state allowance. Composition history for titles and captions is also limited to 50 states and a shared 1 MiB of UTF-8 JSON; changes to PDF settings and source policy are checked before mutation.
- Storage: remove the capture cache to avoid stale data across contexts; close abandoned IndexedDB connections. Transactional full deletion already present in the local tree is integrated and preserved, with complete rollback on failure.
- Imports: strictly validate PNG `tRNS` transparency data. Project v1/v2 reading and v2 writing are retained. No new permission or telemetry.

Last updated: November 26, 2026 — documentation for locally qualified 1.5.3.

**Publisher:** eyelo SA (UID: CHE-108.174.302), Vaud, Switzerland — Brand **ScioNos** ([scionos.ch](https://scionos.ch)) — Contact: info@eyelo.ch

Scionos Capture locally processes screenshot pixels, the captured page title and URL, and the language preference. Every capture is explicitly initiated by the user.

Scrolling-area capture processes several visible portions of the same page and stitches them locally. It adds no permission, network destination, or data category.

No screenshot, URL, or browsing data is sent to eyelo SA, ScioNos, or any third party. The extension has no account, telemetry, advertising, or remote library.

Captures and their text metadata remain in local IndexedDB. Transfer chunks are deleted after assembly or fifteen minutes of inactivity; a suspended browser may delay cleanup until wake-up. The final capture is retained while a matching editor tab is open, including reloads and beyond fifteen minutes. It is deleted when its last editor closes. Without an editor, it becomes eligible for cleanup fifteen minutes after creation. Associations are reconciled with open tabs on worker wake-up and browser restart.

The selected language and capture delay (`captureDelaySeconds`, 0, 3, 5, or 10 seconds) are kept in `chrome.storage.local`. Element selection and the countdown remain local and add no permission or network destination. Delayed capture starts only after an explicit action and can be cancelled. The editor-tab mapping uses `chrome.storage.session` and ends with the browser session. Users can remove data stored by the extension from the extension management page or by uninstalling it. Users must separately delete exported files or projects saved on the device.

For privacy inquiries: info@eyelo.ch. For vulnerabilities, use [SECURITY.en.md](SECURITY.en.md).

For locally qualified 1.5.3, native captures provide no DOM-derived source text layer: the API does not prove its correspondence with the pixels. Imported images and reopened projects do not restore a reliable source text layer. User annotation text is rendered into pixels; titles, captions and page bands remain searchable outside “Image-only PDF” mode. This option is saved in project settings and rasterizes headers and footers too. The image remains present; protect confidential pixels with a solid mask, as blur is only a visual effect.

Apply or cancel pending edits before any export. Blur remains a visual effect; use a solid mask for secrets.

## Privacy scope of version 1.5.2

**1.5.2 — published on GitHub.** GitHub release: [v1.5.2](https://github.com/ScioNos/Scionos-Capture/releases/tag/v1.5.2). Current Chrome Web Store status is unconfirmed; no 1.5.2 Store submission is performed here.

The fixes also apply source policy throughout the HTML generator. `sanitized` removes query and fragment, `none` omits sources, and `full` retains URLs; HTTP(S) credentials are always removed. Internal editor thumbnails and the composition preview are reconstructed from the reopened project, including annotations. Portable export does not clear the unsaved-changes indicator; “download requested” does not confirm that the file was written to disk. Permissions and local processing remain unchanged.

## Privacy scope of version 1.5.1 — published on GitHub; Store status unconfirmed

In the Document panel, source policy applies to saved projects and exports: sanitized (default) removes URL query parameters and fragments, none omits sources and full retains them. Credentials embedded in HTTP(S) URLs are always removed, including in full mode. Sources removed on save cannot be recovered; switching modes later does not restore them. Library exports always apply sanitized, including to projects saved before this version.

This filtering does not make the document anonymous: URL paths, pixels, titles, captions and dates may still contain sensitive information. Review them before sharing. Previously exported copies remain under your control and are not changed by a policy adjustment.

Diagnostics are local and require explicit activation; they add no telemetry or automatic transmission. Permissions are unchanged. Project v1/v2 reading and v2 writing are retained; irreversible mask and crop protections still apply.

## Privacy scope of version 1.5.0

This section describes the privacy scope of the published 1.5.0 release.

Importing image files, explicitly requested clipboard pasting, and multi-image composition locally process the selected images and the titles, captions, steps, and source/date metadata present in the document. These operations do not transfer data to a server.

Version 1.5.0 uses the local portable `.scionos` v2 format with individually editable annotations and reopening of v1 projects, whose annotations remain flattened. On saving, solid masks and crops are applied irreversibly to retained images; affected annotations are conservatively removed. Imported files and v1 projects have no reliable text layer. When saving after a crop, all preceding annotations are flattened to preserve their appearance and order.

PNG, JPEG, WebP, HTML, Markdown/ZIP, PDF exports and printing may include the images and selected composition information. Review titles, sources, dates, and content before sharing an export or project. Saved files remain on the device in the location chosen by the user; extension temporary cleanup and uninstalling do not delete them. Users manage their retention, sharing, and deletion.

A durable local library is available with explicit saving: thumbnails, search, rename, duplication and deletion. Users choose 0, 7, 30 or 90 days and a quota from 64 to 1,024 MiB, default 256 MiB; 0 days means no automatic expiration. Locally stored projects may contain images, annotations and metadata. Solid masks remain necessary to protect confidential pixels; blur is visual only.
