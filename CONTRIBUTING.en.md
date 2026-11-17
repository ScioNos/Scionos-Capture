# Contributing to Scionos Capture

[Français](CONTRIBUTING.md) · [English](CONTRIBUTING.en.md) · [Español](CONTRIBUTING.es.md) · [Deutsch](CONTRIBUTING.de.md)

Never attach screenshots containing personal data, credentials, or secrets.

1. Create a `fix/...`, `feat/...`, or `docs/...` branch.
2. Use Node.js 24.8+ and run `npm ci`.
3. Keep runtime dependencies at zero and justify development dependencies.
4. Run `npm run verify` before opening a pull request.
5. Reload and manually test the extension in Chrome and Edge.

Test all five capture modes, including the scrolling area's two points, scrolling, partial slices, and geometry fields. Also cover tall and wide pages, DPR, tab switching, Undo/Redo, crop, mask, copy, PNG/PDF, zoom, keyboard access, and all four languages. Add every new string to all `_locales/*/messages.json` files. Keep manifest permissions minimal, documented, and validated.

Development and test dependencies require Node.js `^22.22.0 || >=24.8.0`; Node.js 24.8+ is recommended. PDF.js 6.5.438 is used only for PDF extraction tests. CI checks Node.js 22.22.0 and 24.8.0.

Version sync for GitHub publication: `npm run version:sync -- 1.5.2`; in PowerShell: `npm.cmd run version:sync -- 1.5.2`. This command also changes package version files; run it only as part of their coordinated update.

Apply or cancel pending edits before any export. Blur remains a visual effect; use a solid mask for secrets. Translated and scaled capture containers are supported. Unsupported rotations, skews and perspective transforms produce an explicit error.

`npm run test:native` checks all five modes in installed Chrome and Edge, using real captures and temporary profiles. The extension action grants `activeTab`; personal profiles are not used.

Version 1.5.2 validation: `npm run verify:release` passed — 133 unit tests, 126 browser tests, five modes each in Chrome 157.0.8103.79 and Edge 157.0.4341.60, three performance repetitions and ten PDF scenarios. Results and environment: [dependency review and validation](DEPENDENCY_REVIEW_1.5.2.md).

For future releases, `npm run verify:release` runs `verify`, native browser trials and general and PDF performance measurements. Record the results for the checked deliverable.
