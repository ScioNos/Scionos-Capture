# Registro de cambios

[Français](CHANGELOG.md) · [English](CHANGELOG.en.md) · [Español](CHANGELOG.es.md) · [Deutsch](CHANGELOG.de.md)

## [Sin publicar]

## [1.1.1] - 2026-09-15

### Corregido

- Reducción del tiempo de vida de capturas huérfanas de una hora a quince minutos.
- Eliminación de la acción obsoleta `OPEN_EDITOR` del service worker, en desuso y no documentada.
- Detección robusta de contenedores internos con desplazamiento (ej. ventanas de chat de Facebook Messenger) evitando desplazar la página de fondo.
- Protección de elementos flotantes anclados (`position: fixed` / `position: sticky`) para evitar que se oculten durante el desplazamiento interno.

## [1.1.0] - 2026-09-14

### Añadido

- Transferencia persistente por fragmentos para capturas grandes, compatible con Manifest V3.
- Captura de áreas desplazables en contenedores internos y validación específica para Windows.

### Corregido

- Desalineación con escalado de Windows, zoom fraccionario y barras de desplazamiento clásicas.
- Encabezados fijos o adhesivos repetidos, uniones visibles y cambios de diseño durante la captura.
- Limpieza tras cargar el editor, transferencias interrumpidas, idioma de reserva y páginas no compatibles.


## [1.0.0] - 2026-08-22

### Añadido

- Versión oficial inicial de **Scionos Capture** por **eyelo SA** (ScioNos, Suiza).
- 4 modos de captura: Pestaña visible, Página completa (unión 2D), Selección y Área desplazable multipantalla.
- Editor de anotaciones completo: rectángulos, elipses, flechas, texto, resaltado, desenfoque/máscara sólida y recorte no destructivo.
- Exportación versátil: Descarga PNG de alta resolución, copia directa al portapapeles, impresión y **exportación de informes HTML interactivos** (visor con zoom/arrastre y metadatos).
- Nuevo logotipo de monograma oficial SN con visor de captura iluminado.
- Procesamiento 100 % local sin servidores externos, cero telemetría y cumplimiento riguroso de RGPD y nDPA suiza.
- Soporte completo en 4 idiomas: francés, inglés, español y alemán.
- Accesibilidad total (WCAG, alto contraste, navegación por teclado, lectores de pantalla).

[Sin publicar]: https://github.com/ScioNos/Scionos-Capture/compare/v1.1.1...HEAD
[1.1.1]: https://github.com/ScioNos/Scionos-Capture/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/ScioNos/Scionos-Capture/releases/tag/v1.1.0
[1.0.0]: https://github.com/ScioNos/Scionos-Capture/releases/tag/v1.0.0
