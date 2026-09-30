# Registro de cambios

[Français](CHANGELOG.md) · [English](CHANGELOG.en.md) · [Español](CHANGELOG.es.md) · [Deutsch](CHANGELOG.de.md)

## [Sin publicar]

## [1.3.2] - 2026-09-30

### Corregido

- Coordenadas CSS, del contenedor y de la imagen unificadas; selección con desplazamiento automático de la página corregida; metadatos de texto ajustados al DPR y a las reducciones.
- El ensamblado ya no sobrescribe las partes capturadas; elementos fijos y adherentes reevaluados en cada tesela, incluidos cambios de posición y elementos inicialmente fuera de pantalla.
- PDF: texto recopilado por tesela; palabras cubiertas, invisibles o parcialmente recortadas omitidas; recorte y censura alineados con los píxeles; capas antiguas con coordenadas no verificadas omitidas.
- Editor: URL largas contenidas, ajuste al ancho disponible, foco de texto conservado, deshacer nativo en campos, numeración tras rehacer y consolidación asíncrona del historial corregidos.
- Capturas conservadas mientras el editor permanece abierto y eliminadas al cerrarlo; caducidad de capturas huérfanas y transferencias abandonadas; asociaciones reconstruidas al despertar.

### Mantenimiento y validación

- Tiempos de estabilización y recopilación de texto limitados; dependencias transitivas corregidas; pruebas con píxeles reales, cuatro escalas y extracción de PDF generados.

## [1.3.1] - 2026-09-28

### Añadido

- Herramienta Resaltador (`H`) semitransparente en el editor con atajo, ayuda integrada y traducciones.
- División y paginación automática de capturas largas para impresión/PDF en tranches con encabezados repetidos y capa de texto indexable por página.
- Desplazamiento automático extendido a contenedores internos con ensamblado de la región por teselas.
- Marcas de tiempo de exportación en formato local estandarizado `AAAA-MM-DD_HH-mm`.

### Corregido

- Capa de texto del PDF: los bloques de enlaces `<a>` vuelven a exportarse como hipervínculos activos (se respeta el campo `url`).
- Selección con desplazamiento: un arrastre fino (ancho o alto > 10 px) ya confirma la zona al soltar el puntero.
- Internacionalización: la clave `statusZone` se incluye en el paquete de mensajes (etiqueta para lectores de pantalla).
- Ayuda: atajo de la herramienta Forma corregido (`S` en lugar de `R`).
- Editor: recargar la página conserva la captura (la confirmación ya no elimina la imagen; limpieza al cerrar la pestaña o al caducar).
- Impresión/PDF: las URL de origen no HTTP(S) se muestran como texto simple en lugar de un enlace vacío.
- Popup: si falla la apertura de la página de atajos, ahora se muestra el error.
- Historial: el aplanado tras 100 operaciones conserva la capa de texto; deshacer un distintivo restaura su contador.
- Nombres de archivo: truncado por puntos de código (emojis preservados); opciones de fondo de texto y errores del informe HTML traducidos en los 4 idiomas.

### Modificado y Rendimiento

- Robustez de teselas: reintentos con backoff ante limitación de `captureVisibleTab` (sin reintentar cambios de pestaña).
- Rendimiento: clasificación de elementos anclados en caché por intento, prefiltros de layout antes del cálculo de estilos, barridos deduplicados.
- Extracción de texto: visibilidad real con `checkVisibility` (opacidad heredada respetada).
- Almacenamiento: caché de memoria IndexedDB realmente LRU y limitada.
- Mantenimiento: lista única de archivos compartida entre empaquetado y validación; caché interna del almacenamiento no expuesta.

## [1.3.0] - 2026-09-25

### Añadido

- Desplazamiento automático continuo (*drag-to-scroll*) durante la selección por ratón, permitiendo capturar más allá del área visible mediante ensamblado de múltiples teselas.
- Exportación a PDF con texto vectorial indexable (`Ctrl+F`), seleccionable e hipervínculos `<a>` activos superpuestos a la captura.
- Eliminación automática del texto bajo áreas censuradas (color sólido o desenfoque) para garantizar la privacidad en el PDF.
- Paleta de anotación vectorial enriquecida : flechas (`tool-arrow`), formas geométricas (`tool-shape`), texto (`tool-text`) y distintivos numéricos de paso (`tool-step`) 1, 2, 3... con botón de reinicio.
- Guía de usuario y ayuda integrada fuera de línea (`help.html`) accesible desde el botón `?` en popup y editor.
- Atajos de teclado adicionales en el editor: `A` (flecha), `S` (forma), `T` (texto), `P` (paso).
- Cobertura de pruebas ampliada: 36 pruebas unitarias y 14 pruebas de extremo a extremo (Playwright E2E).

### Corregido

- Resolución fiable del atajo de teclado en la ventana emergente: soporte híbrido (Promise y callback) para `chrome.commands.getAll`, evitando el falso estado «No configurado» cuando `Alt+Shift+C` está activo.
- Conformidad con Manifest V3: eliminación de la clave `description` no válida en `_execute_action` dentro de `manifest.json`.
- Archivo de distribución completo: inclusión garantizada de `help.html` y `help.js` en el ZIP de distribución con validación estricta.
- Rendimiento del editor: eliminación del redimensionamiento innecesario del lienzo en cada renderizado, conservando los contextos de dibujo.
- Sincronización atómica de versiones: comprobación estricta de la integridad de `package-lock.json` antes de escribir en disco.
- Validación PNG más estricta: comprobación de la firma completa de 8 bytes y de la cabecera `IHDR` antes de leer las dimensiones.
- Accesibilidad del editor: navegación por teclado añadida a la barra de herramientas desplazable (`tabindex="0"`).
- Resiliencia en el dibujo: limpieza garantizada del estado del puntero ante `lostpointercapture` y `pointercancel`.

### Cambiado

- Refactorización modular interna de los scripts de captura (`content-dom.js`, `content-transfer.js`, `content-capture.js`) y del editor (`editor-operations.js`, `editor-export.js`) para facilitar el mantenimiento sin cambios funcionales.

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

[Sin publicar]: https://github.com/ScioNos/Scionos-Capture/compare/v1.3.2...HEAD
[1.3.2]: https://github.com/ScioNos/Scionos-Capture/compare/v1.3.1...v1.3.2
[1.3.1]: https://github.com/ScioNos/Scionos-Capture/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/ScioNos/Scionos-Capture/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/ScioNos/Scionos-Capture/compare/v1.1.1...v1.2.0
[1.1.1]: https://github.com/ScioNos/Scionos-Capture/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/ScioNos/Scionos-Capture/releases/tag/v1.1.0
[1.0.0]: https://github.com/ScioNos/Scionos-Capture/releases/tag/v1.0.0
