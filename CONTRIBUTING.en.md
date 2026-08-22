# Contributing to Scionos Capture

[Français](CONTRIBUTING.md) · [English](CONTRIBUTING.en.md) · [Español](CONTRIBUTING.es.md) · [Deutsch](CONTRIBUTING.de.md)

Never attach screenshots containing personal data, credentials, or secrets.

1. Create a `fix/...`, `feat/...`, or `docs/...` branch.
2. Use Node.js 20 or 24 and run `npm ci`.
3. Keep runtime dependencies at zero and justify development dependencies.
4. Run `npm run verify` before opening a pull request.
5. Reload and manually test the extension in Chrome and Edge.

Test all four capture modes, including the scrolling area's two points, scrolling, partial slices, and geometry fields. Also cover tall and wide pages, DPR, tab switching, Undo/Redo, crop, mask, copy, PNG/PDF, zoom, keyboard access, and all four languages. Add every new string to all `_locales/*/messages.json` files. Keep manifest permissions minimal, documented, and validated.
