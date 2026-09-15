# Privacy policy

[Français](PRIVACY.md) · [English](PRIVACY.en.md) · [Español](PRIVACY.es.md) · [Deutsch](PRIVACY.de.md)

Last updated: August 23, 2026.

**Publisher:** eyelo SA (UID: CHE-108.174.302), Vaud, Switzerland — Brand **ScioNos** ([scionos.ch](https://scionos.ch)) — Contact: info@eyelo.ch

Scionos Capture locally processes screenshot pixels, the captured page title and URL, and the language preference. Every capture is explicitly initiated by the user.

Scrolling-area capture processes several visible portions of the same page and stitches them locally. It adds no permission, network destination, or data category.

No screenshot, URL, or browsing data is sent to eyelo SA, ScioNos, or any third party. The extension has no account, telemetry, advertising, or remote library.

The capture and the chunks required for transfer are temporarily stored in IndexedDB. Chunks are deleted after assembly or within fifteen minutes. The final capture is deleted as soon as the editor decodes it, with a fifteen-minute expiry retained only as a safety fallback.

The selected language is kept in `chrome.storage.local`. The editor-tab mapping uses `chrome.storage.session` and ends with the browser session. Users can remove all local data from the extension management page or by uninstalling the extension.

For privacy inquiries: info@eyelo.ch. For vulnerabilities, use [SECURITY.en.md](SECURITY.en.md).
