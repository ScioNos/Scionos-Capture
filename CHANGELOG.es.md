# Registro de cambios

[Français](CHANGELOG.md) · [English](CHANGELOG.en.md) · [Español](CHANGELOG.es.md) · [Deutsch](CHANGELOG.de.md)

## [Sin publicar]

## [1.3.0] - 2026-09-25

### Añadido

- Desplazamiento automático continuo (*drag-to-scroll*) durante la selección por ratón, permitiendo capturar más allá del área visible mediante ensamblado de múltiples teselas.
- Exportación a PDF con texto vectorial indexable (`Ctrl+F`), seleccionable e hipervínculos `<a>` activos superpuestos a la captura.
- Eliminación automática del texto bajo áreas censuradas (color sólido o desenfoque) para garantizar la privacidad en el PDF.
- Paleta de anotación vectorial enriquecida : flechas (`tool-arrow`), formas geométricas (`tool-shape`), texto (`tool-text`) y distintivos numéricos de paso (`tool-step`) 1, 2, 3... con botón de reinicio.
- Guía de usuario y ayuda integrada fuera de línea (`help.html`) accesible desde el botón `?` en popup y editor.
- Atajos de teclado adicionales en el editor: `A` (flecha), `S` (forma), `T` (texto), `P` (paso).

### Corregido

- Resolución fiable del atajo de teclado en la ventana emergente: soporte híbrido (Promise y callback) para `chrome.commands.getAll`, evitando el falso estado «No configurado» cuando `Alt+Shift+C` está activo.
- Conformidad con Manifest V3: eliminación de la clave `description` no válida en `_execute_action` dentro de `manifest.json`.

## [1.2.0] - 2026-09-22

### Añadido

- Atajo de teclado predeterminado actualizado a `Alt+Shift+C` con botón de acceso directo a la configuración de atajos en la ventana emergente.
- Selección por arrastrar con acción rápida «Hasta abajo» para extender instantáneamente el área seleccionada al fondo del contenedor.
- Nombres de archivo automáticos con el título de la página y marca de tiempo precisa.
- Impresión y exportación a PDF multipágina A4 con corte limpio de tramas.
- Caché en memoria IndexedDB (LRU) y sonda ping de inyección para evitar reinyecciones innecesarias del script de contenido.
- Scripts de sincronización de versiones, validación estricta de paquetes y almacenamiento en caché de Playwright en CI.

### Corregido

- Ocultación dinámica de barras de entrada de texto fijas (ej. ChatGPT, Claude, Notion, Messenger) con `position: absolute` fuera del contenedor, mostrándose únicamente en la última tesela.
- Estabilización acotada de la página a la zona desplazable (`range`) para evitar saltos globales de maquetación.
- Corrección del recorte de selecciones con barras de desplazamiento clásicas y escalado fraccionario.
- Restauración fiable de las posiciones de desplazamiento y de los estilos `scroll-behavior` tras cancelar, reiniciar o fallar una captura.
- Persistencia atómica en IndexedDB de fragmentos y metadatos de transferencia para evitar estados parciales.
- Rasterización incremental del editor y exportaciones HTML/impresión asíncronas con límite de tamaño.
- Validación estricta de versiones Chrome, políticas de seguridad sincronizadas y fallos explícitos en los generadores de recursos.

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

[Sin publicar]: https://github.com/ScioNos/Scionos-Capture/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/ScioNos/Scionos-Capture/compare/v1.1.1...v1.2.0
[1.1.1]: https://github.com/ScioNos/Scionos-Capture/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/ScioNos/Scionos-Capture/releases/tag/v1.1.0
[1.0.0]: https://github.com/ScioNos/Scionos-Capture/releases/tag/v1.0.0
