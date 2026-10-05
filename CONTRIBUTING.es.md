# Contribuir a Scionos Capture

[Français](CONTRIBUTING.md) · [English](CONTRIBUTING.en.md) · [Español](CONTRIBUTING.es.md) · [Deutsch](CONTRIBUTING.de.md)

No adjuntes capturas con datos personales, credenciales o secretos.

1. Crea una rama `fix/...`, `feat/...` o `docs/...`.
2. Usa Node.js 24 y ejecuta `npm ci`.
3. Mantén cero dependencias de ejecución y justifica las de desarrollo.
4. Ejecuta `npm run verify` antes de la pull request.
5. Prueba manualmente Chrome y Edge.

Comprueba los cuatro modos, incluidos los dos puntos, el desplazamiento, los fragmentos parciales y los campos geométricos del área desplazable. Cubre también páginas altas y anchas, DPR, cambio de pestaña, Deshacer/Rehacer, recorte, máscara, copia, PNG/PDF, zoom, teclado y cuatro idiomas. Añade cada nueva cadena a todos los `_locales/*/messages.json` y mantén los permisos mínimos, documentados y validados.

Se recomienda Node.js 24 para la verificación completa, incluida la extracción PDF con PDF.js 6.3.289 (solo para pruebas). Las comprobaciones principales siguen siendo compatibles con Node.js 20.

Sincroniza una versión no publicada con `npm run version:sync -- 1.3.3 --unreleased`; en PowerShell usa `npm.cmd run version:sync -- 1.3.3 --unreleased`. Los enlaces de descarga publicados se conservan.

Aplica o cancela los cambios pendientes antes de exportar. El desenfoque es un efecto visual; usa una máscara sólida para secretos. Se admiten contenedores trasladados y escalados. Las rotaciones, inclinaciones y perspectivas no compatibles producen un error explícito.

`npm run test:native` verifica los cuatro modos en Chrome y Edge instalados, con capturas reales y perfiles temporales. La acción de la extensión concede `activeTab`; no se usan perfiles personales.
