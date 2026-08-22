# Contribuir a Scionos Capture

[Français](CONTRIBUTING.md) · [English](CONTRIBUTING.en.md) · [Español](CONTRIBUTING.es.md) · [Deutsch](CONTRIBUTING.de.md)

No adjuntes capturas con datos personales, credenciales o secretos.

1. Crea una rama `fix/...`, `feat/...` o `docs/...`.
2. Usa Node.js 20 o 24 y ejecuta `npm ci`.
3. Mantén cero dependencias de ejecución y justifica las de desarrollo.
4. Ejecuta `npm run verify` antes de la pull request.
5. Prueba manualmente Chrome y Edge.

Comprueba los cuatro modos, incluidos los dos puntos, el desplazamiento, los fragmentos parciales y los campos geométricos del área desplazable. Cubre también páginas altas y anchas, DPR, cambio de pestaña, Deshacer/Rehacer, recorte, máscara, copia, PNG/PDF, zoom, teclado y cuatro idiomas. Añade cada nueva cadena a todos los `_locales/*/messages.json` y mantén los permisos mínimos, documentados y validados.
