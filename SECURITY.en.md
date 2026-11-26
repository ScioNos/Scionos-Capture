# Security

[Français](SECURITY.md) · [English](SECURITY.en.md) · [Español](SECURITY.es.md) · [Deutsch](SECURITY.de.md)

## 1.5.3 preparation — November 26, 2026

**Local preparation, not published.** Final test validation is still in progress; results and limitations will be recorded in the [consolidation report](CONSOLIDATION_1.5.3.md). No GitHub release or Store submission is performed. Public 1.5.2 links and archives still refer to the existing publication.

The supported line remains `1.5.x`; 1.5.3 is in preparation. The private reporting instructions and response targets below still apply. Resource limits reduce the accepted workload without providing an absolute guarantee against memory exhaustion.

- Capture: check the active tab, window and navigation before and after acquisition, with a probe tied to `documentId`. The URL and title are fixed at the start of the session.
- PDF: invalidate the text layer for DOM/CSSOM mutations, inaccessible CSS stylesheets, media changes or animations; exclude white-on-white text and omit text under blend modes or image backgrounds when visibility is uncertain (the invisible-on-white `SECRET_BLEND` regression was confirmed and fixed). These checks do not prove an absolute pixel/text match when a transient CSSOM change is restored between observations. Omission of text is preferred when uncertain; review the pixels and use a solid mask for secrets.
- Captures: a 180-second budget checked cooperatively at checkpoints, and at most 256 portions. This is not a preemptive interruption at 180 seconds; excessively long pages are rejected.
- Resources: a cumulative 32-million-pixel budget includes originals retained after cropping; Undo/Redo remains bounded by this budget. At most two snapshots are in flight simultaneously, until export, clipboard copying or saving finishes. Canvas surfaces owned by these operations are reduced to 1 × 1 in `finally`, preserving input surfaces.
- Annotations: 1,000 per image and 5,000 per document; 10,000 points per stroke and 100,000 per document. Global history is limited to 100 states, 100,000 points and 5,000 operations.
- Storage: remove the capture cache to avoid stale data across contexts; close abandoned IndexedDB connections. Transactional full deletion already present in the local tree is integrated and preserved, with complete rollback on failure.
- Imports: strictly validate PNG `tRNS` transparency data. Project v1/v2 reading and v2 writing are retained. No new permission or telemetry.
- Compatibility: manifest minimum Chrome/Edge 106 instead of 102; CSS `:has()` requires Chrome 105 and `documentId` requires Chrome 106. This minimum is identified by static analysis; the only attested native runs concern Chrome/Edge 158, with no demonstrated run on Chrome/Edge 106.
- Tools: `@axe-core/playwright` 4.14.1, `html-validate` 11.22.1, `minimatch` override 11.0.9; remove the inactive `glob` override and update Actions. See the [dependency review](DEPENDENCY_REVIEW_1.5.3.md).

## Supported versions

Policy updated on November 17, 2026 for version 1.5.2 — published on GitHub. The supported line is `1.5.x`. Version [v1.5.2](https://github.com/ScioNos/Scionos-Capture/releases/tag/v1.5.2) is published on GitHub; current Chrome Web Store status is unconfirmed and no 1.5.2 Store submission is performed here.

## Reporting a vulnerability

Do not open a public issue for a security vulnerability. Use [private GitHub vulnerability reporting](https://github.com/ScioNos/Scionos-Capture/security/advisories/new) or contact `info@eyelo.ch` with the version, impact, reproduction steps, and a non-destructive proof of concept if available.

We aim to acknowledge reports within 3 business days and provide an initial assessment within 7 business days. Coordinated disclosure follows the availability of a fix.

Captures, including scrolling-area tiles, remain in the local extension origin. No remote script runs and scrolling capture adds no permission. Orphaned captures expire after fifteen minutes and are purged on the next wake if the browser was suspended. Use a solid mask for secrets; blur is not cryptographic deletion.

The searchable PDF layer retains only complete words whose visibility can be verified. Uncertain words are omitted from that layer while the captured image is preserved. Legacy layers with unverified coordinates are also omitted. Use solid censorship to protect confidential pixels; blur is only a visual effect.

Apply or cancel pending edits before any export. Blur remains a visual effect; use a solid mask for secrets.

## Version 1.5.2 safeguards

The fixes cover drag interruptions and the active `pointerId`, reconstructed internal editor thumbnails and composition preview, source policy in every HTML report and removal of the legacy export module from the package (35 files). Print/PDF is bounded by 32 million cumulative pixels, 128 MiB of cumulative blobs and 200 pages. Portable export keeps changes marked as unsaved; its message confirms only a download request. Version 1.5.2 validation: `npm run verify:release` passed — 133 unit tests, 126 browser tests, five modes each in Chrome 157.0.8103.79 and Edge 157.0.4341.60, three performance repetitions and ten PDF scenarios. Results and environment: [dependency review and validation](DEPENDENCY_REVIEW_1.5.2.md).
