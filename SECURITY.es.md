# Seguridad

[Français](SECURITY.md) · [English](SECURITY.en.md) · [Español](SECURITY.es.md) · [Deutsch](SECURITY.de.md)

Política actualizada el 17 de noviembre de 2026 para la versión 1.5.2 — versión GitHub preparada. La línea compatible es `1.5.x`. La publicación GitHub [v1.5.2](https://github.com/ScioNos/Scionos-Capture/releases/tag/v1.5.2) está prevista; el estado actual de Chrome Web Store no está confirmado y aquí no se realiza ningún envío de la 1.5.2 a la tienda.

No abras una issue pública para una vulnerabilidad explotable. Usa el [informe privado de GitHub](https://github.com/ScioNos/Scionos-Capture/security/advisories/new) o contacta con `info@eyelo.ch` e incluye versión, impacto, pasos y una prueba no destructiva cuando sea posible.

El objetivo es responder en 3 días laborables y dar una evaluación inicial en 7. La divulgación coordinada ocurre después de disponer de una corrección.

Las capturas, incluidos los mosaicos de un área desplazable, permanecen en el origen local. No se ejecutan scripts remotos y el nuevo modo no añade permisos. Las huérfanas caducan tras quince minutos. Usa máscara sólida para secretos; el desenfoque no es una eliminación criptográfica.

La capa de búsqueda del PDF conserva solo palabras completas cuya visibilidad puede verificarse. Las palabras inciertas se omiten de esa capa y se conserva la imagen capturada. También se omiten las capas antiguas con coordenadas no verificadas. Usa censura sólida para proteger píxeles confidenciales; el desenfoque es solo visual.

Aplica o cancela los cambios pendientes antes de exportar. El desenfoque es un efecto visual; usa una máscara sólida para secretos.

## Protecciones de la versión 1.5.2

Las correcciones cubren interrupciones de arrastre y el `pointerId` activo, miniaturas internas del editor y vista previa de composición reconstruidas, política de fuentes en cada informe HTML y retirada del módulo antiguo de exportación del paquete (35 archivos). Impresión/PDF se limita a 32 millones de píxeles acumulados, 128 MiB de blobs acumulados y 200 páginas. Exportar un proyecto portátil mantiene los cambios marcados como sin guardar; el mensaje solo confirma la solicitud de descarga. Validación 1.5.2: `npm run verify:release` completado con éxito — 133 pruebas unitarias, 126 pruebas de navegador, cinco modos en Chrome 157.0.8103.79 y en Edge 157.0.4341.60, tres repeticiones de rendimiento y diez escenarios PDF. Resultados y entorno: [revisión de dependencias y validación](DEPENDENCY_REVIEW_1.5.2.md).
