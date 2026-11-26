# Security

[Français](SECURITY.md) · [English](SECURITY.en.md) · [Español](SECURITY.es.md) · [Deutsch](SECURITY.de.md)

## 1.5.3 preparation — November 26, 2026

**Final local 1.5.3 qualification passed; unpublished version.** The complete run passes: 178 unit tests, 179 E2E tests, five native modes in Chrome 158.0.8127.37 and Edge 158.0.4370.33, three interruptions per browser, three performance repetitions and ten PDF scenarios. Linux checks also pass on the exact Node 22.22.0 and 24.8.0 minima (178 unit tests each). See the [consolidation report](RAPPORT_CONSOLIDATION_1.5.3.md). Remote CI, commit/PR and definitive archive remain pending; no GitHub publication or Store submission. Public 1.5.2 links are preserved.

- Export cancellation: Cancel and Escape prevent publication even after snapshot creation starts, during PDF rasterization or image-only page bands; temporary URL cleanup and retry are covered by eight passing targeted scenarios.

The supported line remains `1.5.x`; 1.5.3 is in preparation. The private reporting instructions and response targets below still apply. Resource limits reduce the accepted workload without providing an absolute guarantee against memory exhaustion.

- Capture: check the active tab, window and navigation before and after acquisition, with a probe tied to `documentId`. The URL and title are fixed at the start of the session.
- PDF: `captureVisibleTab` provides no evidence that captured pixels match the DOM. Even identical observed states before and after capture can miss a transient change, so all DOM-derived source text is omitted from native captures. User annotation text is rendered into pixels; titles, captions and page bands remain searchable outside image-only mode.
- Image-only PDF: a Document panel option, translated into all four languages and saved with project settings. It removes searchable text layers and rasterizes headers and footers too. Visible pixels may still contain secrets; this mode does not replace a solid mask.
- Projects: the manifest is limited to 1 MiB of UTF-8 JSON (including escapes), and the STORE ZIP archive to 128 MiB including headers and directory. Preflight rejects over-budget states before copies/snapshots; the codec also checks final encoded sizes. Undo/Redo annotation histories additionally share a total 1 MiB budget for raw UTF-8 JSON, with a per-state allowance. Composition history for titles and captions is also limited to 50 states and a shared 1 MiB of UTF-8 JSON; changes to PDF settings and source policy are checked before mutation.
- Captures: a 180-second budget checked cooperatively at checkpoints, and at most 256 portions. This is not a preemptive interruption at 180 seconds; excessively long pages are rejected.
- Resources: a cumulative 32-million-pixel budget includes originals retained after cropping; Undo/Redo remains bounded by this budget. At most two snapshots are in flight simultaneously, until export, clipboard copying or saving finishes. Canvas surfaces owned by these operations are reduced to 1 × 1 in `finally`, preserving input surfaces.
- Annotations: 1,000 per image and 5,000 per document; 10,000 points per stroke and 100,000 per document. Global history is limited to 100 states, 100,000 points and 5,000 operations, in addition to the shared JSON budget.
- Storage: remove the capture cache to avoid stale data across contexts; close abandoned IndexedDB connections. Transactional full deletion already present in the local tree is integrated and preserved, with complete rollback on failure.
- Imports: strictly validate PNG `tRNS` transparency data. Project v1/v2 reading and v2 writing are retained. No new permission or telemetry.
- Compatibility: manifest minimum Chrome/Edge 106 instead of 102; CSS `:has()` requires Chrome 105 and `documentId` requires Chrome 106. This minimum is identified by static analysis; the only attested native runs concern Chrome/Edge 158, with no demonstrated run on Chrome/Edge 106.
- Tools: `@axe-core/playwright` 4.14.1, `html-validate` 11.22.1, `minimatch` override 11.0.9; inactive `glob` override removed. Twelve compatible transitive updates applied; GitHub Actions pinned to commit SHAs. See the [dependency review](DEPENDENCY_REVIEW_1.5.3.md) and [transitive dependency review](DEPENDENCY_TRANSITIVES_1.5.3.md).

## Supported versions

Policy updated on November 26, 2026 for locally qualified 1.5.3, unpublished. The supported line is `1.5.x`. Version [v1.5.2](https://github.com/ScioNos/Scionos-Capture/releases/tag/v1.5.2) is published on GitHub; current Chrome Web Store status is unconfirmed and no 1.5.2 Store submission is performed here.

## Reporting a vulnerability

Do not open a public issue for a security vulnerability. Use [private GitHub vulnerability reporting](https://github.com/ScioNos/Scionos-Capture/security/advisories/new) or contact `info@eyelo.ch` with the version, impact, reproduction steps, and a non-destructive proof of concept if available.

We aim to acknowledge reports within 3 business days and provide an initial assessment within 7 business days. Coordinated disclosure follows the availability of a fix.

Captures, including scrolling-area tiles, remain in the local extension origin. No remote script runs and scrolling capture adds no permission. Orphaned captures expire after fifteen minutes and are purged on the next wake if the browser was suspended. Use a solid mask for secrets; blur is not cryptographic deletion.

For locally qualified 1.5.3, native captures provide no DOM-derived source text layer: the API does not prove its correspondence with the pixels. Imported images and reopened projects do not restore a reliable source text layer. User annotation text is rendered into pixels; titles, captions and page bands remain searchable outside “Image-only PDF” mode. This option is saved in project settings and rasterizes headers and footers too. The image remains present; protect confidential pixels with a solid mask, as blur is only a visual effect.

Apply or cancel pending edits before any export. Blur remains a visual effect; use a solid mask for secrets.

## Version 1.5.2 safeguards

The fixes cover drag interruptions and the active `pointerId`, reconstructed internal editor thumbnails and composition preview, source policy in every HTML report and removal of the legacy export module from the package (35 files). Print/PDF is bounded by 32 million cumulative pixels, 128 MiB of cumulative blobs and 200 pages. Portable export keeps changes marked as unsaved; its message confirms only a download request. Version 1.5.2 validation: `npm run verify:release` passed — 133 unit tests, 126 browser tests, five modes each in Chrome 157.0.8103.79 and Edge 157.0.4341.60, three performance repetitions and ten PDF scenarios. Results and environment: [dependency review and validation](DEPENDENCY_REVIEW_1.5.2.md).
