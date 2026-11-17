# Security

[Français](SECURITY.md) · [English](SECURITY.en.md) · [Español](SECURITY.es.md) · [Deutsch](SECURITY.de.md)

## Supported versions

Policy updated on November 17, 2026 for version 1.5.2 — GitHub release prepared. The supported line is `1.5.x`. GitHub publication [v1.5.2](https://github.com/ScioNos/Scionos-Capture/releases/tag/v1.5.2) is planned; current Chrome Web Store status is unconfirmed and no 1.5.2 Store submission is performed here.

## Reporting a vulnerability

Do not open a public issue for a security vulnerability. Use [private GitHub vulnerability reporting](https://github.com/ScioNos/Scionos-Capture/security/advisories/new) or contact `info@eyelo.ch` with the version, impact, reproduction steps, and a non-destructive proof of concept if available.

We aim to acknowledge reports within 3 business days and provide an initial assessment within 7 business days. Coordinated disclosure follows the availability of a fix.

Captures, including scrolling-area tiles, remain in the local extension origin. No remote script runs and scrolling capture adds no permission. Orphaned captures expire after fifteen minutes and are purged on the next wake if the browser was suspended. Use a solid mask for secrets; blur is not cryptographic deletion.

The searchable PDF layer retains only complete words whose visibility can be verified. Uncertain words are omitted from that layer while the captured image is preserved. Legacy layers with unverified coordinates are also omitted. Use solid censorship to protect confidential pixels; blur is only a visual effect.

Apply or cancel pending edits before any export. Blur remains a visual effect; use a solid mask for secrets.

## Version 1.5.2 safeguards

The fixes cover drag interruptions and the active `pointerId`, reconstructed internal editor thumbnails and composition preview, source policy in every HTML report and removal of the legacy export module from the package (35 files). Print/PDF is bounded by 32 million cumulative pixels, 128 MiB of cumulative blobs and 200 pages. Portable export keeps changes marked as unsaved; its message confirms only a download request. Version 1.5.2 validation: `npm run verify:release` passed — 133 unit tests, 126 browser tests, five modes each in Chrome 157.0.8103.79 and Edge 157.0.4341.60, three performance repetitions and ten PDF scenarios. Results and environment: [dependency review and validation](DEPENDENCY_REVIEW_1.5.2.md).
