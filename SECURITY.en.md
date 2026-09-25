# Security

[Français](SECURITY.md) · [English](SECURITY.en.md) · [Español](SECURITY.es.md) · [Deutsch](SECURITY.de.md)

## Supported versions

The latest release receives security updates. The actively supported line is `1.3.x` (the `1.2.0` release is being prepared).

## Reporting a vulnerability

Do not open a public issue for a security vulnerability. Use [private GitHub vulnerability reporting](https://github.com/ScioNos/Scionos-Capture/security/advisories/new) or contact `info@eyelo.ch` with the version, impact, reproduction steps, and a non-destructive proof of concept if available.

We aim to acknowledge reports within 3 business days and provide an initial assessment within 7 business days. Coordinated disclosure follows the availability of a fix.

Captures, including scrolling-area tiles, remain in the local extension origin. No remote script runs and scrolling capture adds no permission. Orphaned captures expire after fifteen minutes and are purged on the next wake if the browser was suspended. Use a solid mask for secrets; blur is not cryptographic deletion.
