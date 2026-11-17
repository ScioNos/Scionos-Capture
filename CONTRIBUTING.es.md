# Contribuir a Scionos Capture

[Français](CONTRIBUTING.md) · [English](CONTRIBUTING.en.md) · [Español](CONTRIBUTING.es.md) · [Deutsch](CONTRIBUTING.de.md)

No adjuntes capturas con datos personales, credenciales o secretos.

1. Crea una rama `fix/...`, `feat/...` o `docs/...`.
2. Usa Node.js 24 y ejecuta `npm ci`.
3. Mantén cero dependencias de ejecución y justifica las de desarrollo.
4. Ejecuta `npm run verify` antes de la pull request.
5. Prueba manualmente Chrome y Edge.

Comprueba los cinco modos, incluidos los dos puntos, el desplazamiento, los fragmentos parciales y los campos geométricos del área desplazable. Cubre también páginas altas y anchas, DPR, cambio de pestaña, Deshacer/Rehacer, recorte, máscara, copia, PNG/PDF, zoom, teclado y cuatro idiomas. Añade cada nueva cadena a todos los `_locales/*/messages.json` y mantén los permisos mínimos, documentados y validados.

Las dependencias de desarrollo y pruebas requieren Node.js 22.13.0 o posterior; se recomienda Node.js 24. PDF.js 6.5.438 se usa solo en las pruebas de extracción PDF. La CI verifica Node.js 22.13.0 y 24.

Sincronización de versión para la publicación GitHub: `npm run version:sync -- 1.5.2`; en PowerShell: `npm.cmd run version:sync -- 1.5.2`. Este comando también modifica los archivos de versión del paquete; ejecútalo solo dentro de su actualización coordinada.

Aplica o cancela los cambios pendientes antes de exportar. El desenfoque es un efecto visual; usa una máscara sólida para secretos. Se admiten contenedores trasladados y escalados. Las rotaciones, inclinaciones y perspectivas no compatibles producen un error explícito.

`npm run test:native` verifica los cinco modos en Chrome y Edge instalados, con capturas reales y perfiles temporales. La acción de la extensión concede `activeTab`; no se usan perfiles personales.

Validación 1.5.2: `npm run verify:release` completado con éxito — 133 pruebas unitarias, 126 pruebas de navegador, cinco modos en Chrome 157.0.8103.79 y en Edge 157.0.4341.60, tres repeticiones de rendimiento y diez escenarios PDF. Resultados y entorno: [revisión de dependencias y validación](DEPENDENCY_REVIEW_1.5.2.md).

Para las próximas versiones, `npm run verify:release` ejecuta las verificaciones, pruebas nativas y mediciones de rendimiento generales y PDF. Registra los resultados del paquete comprobado.
