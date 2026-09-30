# Privacy policy

[Français](PRIVACY.md) · [English](PRIVACY.en.md) · [Español](PRIVACY.es.md) · [Deutsch](PRIVACY.de.md)

Last updated: September 30, 2026.

**Publisher:** eyelo SA (UID: CHE-108.174.302), Vaud, Switzerland — Brand **ScioNos** ([scionos.ch](https://scionos.ch)) — Contact: info@eyelo.ch

Scionos Capture locally processes screenshot pixels, the captured page title and URL, and the language preference. Every capture is explicitly initiated by the user.

Scrolling-area capture processes several visible portions of the same page and stitches them locally. It adds no permission, network destination, or data category.

No screenshot, URL, or browsing data is sent to eyelo SA, ScioNos, or any third party. The extension has no account, telemetry, advertising, or remote library.

Captures and their text metadata remain in local IndexedDB. Transfer chunks are deleted after assembly or fifteen minutes of inactivity; a suspended browser may delay cleanup until wake-up. The final capture is retained while a matching editor tab is open, including reloads and beyond fifteen minutes. It is deleted when its last editor closes. Without an editor, it becomes eligible for cleanup fifteen minutes after creation. Associations are reconciled with open tabs on worker wake-up and browser restart.

The selected language is kept in `chrome.storage.local`. The editor-tab mapping uses `chrome.storage.session` and ends with the browser session. Users can remove all local data from the extension management page or by uninstalling the extension.

For privacy inquiries: info@eyelo.ch. For vulnerabilities, use [SECURITY.en.md](SECURITY.en.md).

The searchable PDF layer retains only complete words whose visibility can be verified. Uncertain words are omitted from that layer while the captured image is preserved. Legacy layers with unverified coordinates are also omitted. Use solid censorship to protect confidential pixels; blur is only a visual effect.
