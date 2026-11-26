# Seguridad

[Français](SECURITY.md) · [English](SECURITY.en.md) · [Español](SECURITY.es.md) · [Deutsch](SECURITY.de.md)

## Preparación de 1.5.3 — 26 de noviembre de 2026

**Preparación local, sin publicar.** La validación final de las pruebas sigue en curso; los resultados y límites se documentarán en el [informe de consolidación](CONSOLIDATION_1.5.3.md). No se realiza ninguna publicación en GitHub ni envío a la tienda. Los enlaces públicos y archivos de 1.5.2 siguen correspondiendo a la publicación existente.

La línea compatible sigue siendo `1.5.x`; 1.5.3 está en preparación. Las instrucciones de notificación privada y los plazos de respuesta siguientes siguen vigentes. Los límites de recursos reducen la carga admitida sin garantizar de forma absoluta que no se agote la memoria.

- Captura: comprobaciones de pestaña activa, ventana y navegación antes y después de la adquisición, con una sonda vinculada al `documentId`. La URL y el título se fijan al inicio de la sesión.
- PDF: invalidación de la capa de texto ante mutaciones DOM/CSSOM, hojas CSS inaccesibles, cambios de medios o animaciones; exclusión del texto blanco sobre blanco y omisión del texto con modos de fusión o fondos de imagen si su visibilidad es incierta (regresión `SECRET_BLEND` invisible sobre blanco confirmada y corregida). Estas comprobaciones no demuestran una correspondencia absoluta entre píxeles y texto cuando un cambio CSSOM transitorio se revierte entre observaciones. Ante la duda se prefiere omitir el texto; revisa los píxeles y usa una máscara sólida para secretos.
- Capturas: presupuesto de 180 segundos comprobado de forma cooperativa en los puntos de control y un máximo de 256 porciones. No es una interrupción preventiva a los 180 segundos; las páginas demasiado largas se rechazan.
- Recursos: el presupuesto acumulado de 32 millones de píxeles incluye los originales conservados tras recortar; Deshacer/Rehacer sigue limitado por ese presupuesto. Como máximo hay dos instantáneas simultáneas en curso hasta finalizar la exportación, la copia al portapapeles o el guardado. Los Canvas propios de estas operaciones se reducen a 1 × 1 en `finally`, conservando las superficies de entrada.
- Anotaciones: 1.000 por imagen y 5.000 por documento; 10.000 puntos por trazo y 100.000 por documento. Historial global limitado a 100 estados, 100.000 puntos y 5.000 operaciones.
- Almacenamiento: retirada de la caché de capturas para evitar datos obsoletos entre contextos; cierre de conexiones IndexedDB abandonadas. La eliminación total transaccional ya presente en el árbol local se integra y conserva, con reversión completa en caso de error.
- Importaciones: validación estricta de los datos de transparencia PNG `tRNS`. Se conserva la lectura de proyectos v1/v2 y la escritura v2. Sin nuevos permisos ni telemetría.
- Compatibilidad: mínimo del manifiesto Chrome/Edge 106 en lugar de 102; CSS `:has()` requiere Chrome 105 y `documentId` Chrome 106. Este mínimo se identifica mediante análisis estático; las únicas ejecuciones nativas acreditadas son en Chrome/Edge 158, sin ejecución demostrada en Chrome/Edge 106.
- Herramientas: `@axe-core/playwright` 4.14.1, `html-validate` 11.22.1, override de `minimatch` 11.0.9; retirada del override inactivo de `glob` y actualización de Actions. Véase la [revisión de dependencias](DEPENDENCY_REVIEW_1.5.3.md).

Política actualizada el 17 de noviembre de 2026 para la versión 1.5.2 — publicada en GitHub. La línea compatible es `1.5.x`. La versión [v1.5.2](https://github.com/ScioNos/Scionos-Capture/releases/tag/v1.5.2) está publicada en GitHub; el estado actual de Chrome Web Store no está confirmado y aquí no se realiza ningún envío de la 1.5.2 a la tienda.

No abras una issue pública para una vulnerabilidad explotable. Usa el [informe privado de GitHub](https://github.com/ScioNos/Scionos-Capture/security/advisories/new) o contacta con `info@eyelo.ch` e incluye versión, impacto, pasos y una prueba no destructiva cuando sea posible.

El objetivo es responder en 3 días laborables y dar una evaluación inicial en 7. La divulgación coordinada ocurre después de disponer de una corrección.

Las capturas, incluidos los mosaicos de un área desplazable, permanecen en el origen local. No se ejecutan scripts remotos y el nuevo modo no añade permisos. Las huérfanas caducan tras quince minutos. Usa máscara sólida para secretos; el desenfoque no es una eliminación criptográfica.

La capa de búsqueda del PDF conserva solo palabras completas cuya visibilidad puede verificarse. Las palabras inciertas se omiten de esa capa y se conserva la imagen capturada. También se omiten las capas antiguas con coordenadas no verificadas. Usa censura sólida para proteger píxeles confidenciales; el desenfoque es solo visual.

Aplica o cancela los cambios pendientes antes de exportar. El desenfoque es un efecto visual; usa una máscara sólida para secretos.

## Protecciones de la versión 1.5.2

Las correcciones cubren interrupciones de arrastre y el `pointerId` activo, miniaturas internas del editor y vista previa de composición reconstruidas, política de fuentes en cada informe HTML y retirada del módulo antiguo de exportación del paquete (35 archivos). Impresión/PDF se limita a 32 millones de píxeles acumulados, 128 MiB de blobs acumulados y 200 páginas. Exportar un proyecto portátil mantiene los cambios marcados como sin guardar; el mensaje solo confirma la solicitud de descarga. Validación 1.5.2: `npm run verify:release` completado con éxito — 133 pruebas unitarias, 126 pruebas de navegador, cinco modos en Chrome 157.0.8103.79 y en Edge 157.0.4341.60, tres repeticiones de rendimiento y diez escenarios PDF. Resultados y entorno: [revisión de dependencias y validación](DEPENDENCY_REVIEW_1.5.2.md).
