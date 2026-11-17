# Privacy policy

[Français](PRIVACY.md) · [English](PRIVACY.en.md) · [Español](PRIVACY.es.md) · [Deutsch](PRIVACY.de.md)

Last updated: November 17, 2026 — version 1.5.2 documentation.

**Publisher:** eyelo SA (UID: CHE-108.174.302), Vaud, Switzerland — Brand **ScioNos** ([scionos.ch](https://scionos.ch)) — Contact: info@eyelo.ch

Scionos Capture locally processes screenshot pixels, the captured page title and URL, and the language preference. Every capture is explicitly initiated by the user.

Scrolling-area capture processes several visible portions of the same page and stitches them locally. It adds no permission, network destination, or data category.

No screenshot, URL, or browsing data is sent to eyelo SA, ScioNos, or any third party. The extension has no account, telemetry, advertising, or remote library.

Captures and their text metadata remain in local IndexedDB. Transfer chunks are deleted after assembly or fifteen minutes of inactivity; a suspended browser may delay cleanup until wake-up. The final capture is retained while a matching editor tab is open, including reloads and beyond fifteen minutes. It is deleted when its last editor closes. Without an editor, it becomes eligible for cleanup fifteen minutes after creation. Associations are reconciled with open tabs on worker wake-up and browser restart.

The selected language and capture delay (`captureDelaySeconds`, 0, 3, 5, or 10 seconds) are kept in `chrome.storage.local`. Element selection and the countdown remain local and add no permission or network destination. Delayed capture starts only after an explicit action and can be cancelled. The editor-tab mapping uses `chrome.storage.session` and ends with the browser session. Users can remove data stored by the extension from the extension management page or by uninstalling it. Users must separately delete exported files or projects saved on the device.

For privacy inquiries: info@eyelo.ch. For vulnerabilities, use [SECURITY.en.md](SECURITY.en.md).

The searchable PDF layer retains only complete words whose visibility can be verified. Uncertain words are omitted from that layer while the captured image is preserved. Legacy layers with unverified coordinates are also omitted. Use solid censorship to protect confidential pixels; blur is only a visual effect.

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
