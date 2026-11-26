# Registro de cambios

[Français](CHANGELOG.md) · [English](CHANGELOG.en.md) · [Español](CHANGELOG.es.md) · [Deutsch](CHANGELOG.de.md)

## [Sin publicar]

### Preparación de 1.5.3 — 26 de noviembre de 2026

**Calificación local final de 1.5.3 superada; versión sin publicar.** Campaña completa superada: 178 pruebas unitarias, 179 E2E, cinco modos nativos en Chrome 158.0.8127.37 y Edge 158.0.4370.33, tres interrupciones por navegador, tres repeticiones de rendimiento y diez escenarios PDF. Los controles Linux también pasan con los mínimos exactos Node 22.22.0 y 24.8.0 (178 pruebas unitarias cada uno). Véase el [informe de consolidación](RAPPORT_CONSOLIDATION_1.5.3.md). CI remota, commit/PR y archivo definitivo siguen pendientes; sin publicación GitHub ni envío a la tienda. Se conservan los enlaces públicos de 1.5.2.

- Cancelación de exportaciones: Cancelar y Escape impiden publicar el resultado incluso después de iniciar la instantánea, durante la rasterización PDF o las bandas solo imagen; ocho escenarios específicos superados cubren limpieza de URL temporales y reintento.

- Captura: comprobaciones de pestaña activa, ventana y navegación antes y después de la adquisición, con una sonda vinculada al `documentId`. La URL y el título se fijan al inicio de la sesión.
- PDF: `captureVisibleTab` no aporta pruebas de correspondencia entre los píxeles capturados y el DOM. Incluso con estados observados idénticos antes y después puede pasar inadvertido un cambio transitorio, por lo que se omite todo texto fuente derivado del DOM en las capturas nativas. El texto de las anotaciones del usuario se representa en los píxeles; los títulos, leyendas y bandas de página siguen siendo buscables fuera del modo solo imagen.
- PDF solo imagen: opción del panel Documento, traducida a los cuatro idiomas y guardada con los ajustes del proyecto. Elimina las capas de texto buscable y también rasteriza encabezados y pies de página. Los píxeles visibles aún pueden contener secretos; este modo no sustituye una máscara sólida.
- Proyectos: manifiesto limitado a 1 MiB de JSON UTF-8 (incluidos los escapes) y archivo ZIP STORE a 128 MiB, con cabeceras y directorio incluidos. Una comprobación previa rechaza los excesos antes de copiar o crear instantáneas; el códec comprueba también los tamaños finales codificados. Los historiales de anotaciones Deshacer/Rehacer comparten además un presupuesto total de 1 MiB de JSON bruto UTF-8, con una reserva por estado. El historial de composición de títulos y leyendas también se limita a 50 estados y 1 MiB compartido de JSON UTF-8; los cambios de ajustes PDF y política de fuentes se comprueban antes de modificar el estado.
- Capturas: presupuesto de 180 segundos comprobado de forma cooperativa en los puntos de control y un máximo de 256 porciones. No es una interrupción preventiva a los 180 segundos; las páginas demasiado largas se rechazan.
- Recursos: el presupuesto acumulado de 32 millones de píxeles incluye los originales conservados tras recortar; Deshacer/Rehacer sigue limitado por ese presupuesto. Como máximo hay dos instantáneas simultáneas en curso hasta finalizar la exportación, la copia al portapapeles o el guardado. Los Canvas propios de estas operaciones se reducen a 1 × 1 en `finally`, conservando las superficies de entrada.
- Anotaciones: 1.000 por imagen y 5.000 por documento; 10.000 puntos por trazo y 100.000 por documento. Historial global limitado a 100 estados, 100.000 puntos y 5.000 operaciones, además del presupuesto JSON compartido.
- Almacenamiento: retirada de la caché de capturas para evitar datos obsoletos entre contextos; cierre de conexiones IndexedDB abandonadas. La eliminación total transaccional ya presente en el árbol local se integra y conserva, con reversión completa en caso de error.
- Importaciones: validación estricta de los datos de transparencia PNG `tRNS`. Se conserva la lectura de proyectos v1/v2 y la escritura v2. Sin nuevos permisos ni telemetría.
- Interfaz: corrección del solapamiento de la barra de herramientas; los controles de anotación permanecen agrupados en la misma barra de 56 px, sin desplazar el lienzo ni alterar el arrastre. Se retiran los estados inertes `historyRevision`, `historyConsolidation` y `redoOperations`.
- Compatibilidad: mínimo del manifiesto Chrome/Edge 106 en lugar de 102; CSS `:has()` requiere Chrome 105 y `documentId` Chrome 106. Este mínimo se identifica mediante análisis estático; las únicas ejecuciones nativas acreditadas son en Chrome/Edge 158, sin ejecución demostrada en Chrome/Edge 106.
- Herramientas: `@axe-core/playwright` 4.14.1, `html-validate` 11.22.1, override de `minimatch` 11.0.9; override inactivo de `glob` retirado. Doce actualizaciones transitivas compatibles aplicadas; Actions de GitHub fijadas por SHA de commit. Véanse la [revisión de dependencias](DEPENDENCY_REVIEW_1.5.3.md) y la [revisión de transitivas](DEPENDENCY_TRANSITIVES_1.5.3.md).
- Biblioteca: reutilización limitada de tarjetas y miniaturas. Las mediciones comparativas anteriores y sus límites constan en el [informe](RAPPORT_CONSOLIDATION_1.5.3.md); no demuestran una aceleración general. El procesamiento por lotes no está implementado.

## [1.5.2] — 2026-11-17

**Candidata 1.5.2 corregida localmente para la tienda.** La publicación GitHub mantiene su etiqueta y archivo anterior; no contiene estas nuevas correcciones. No se ha enviado a la tienda. Véase [el informe de preparación](STORE_READINESS_1.5.2.md).

- Selecciones: seguimiento del puntero activo, exclusión de punteros secundarios y limpieza de gestos interrumpidos.
- Captura: restauración de elementos ocultos incluso si falla su preparación.
- Biblioteca: eliminación global atómica, con rechazo de listas obsoletas y reversión completa en caso de error.
- Arrastres en el editor: seguimiento del `pointerId` activo y gestión de interrupciones del gesto.
- Miniaturas internas del editor y vista previa de composición: reconstrucción al reabrir el proyecto para incluir las anotaciones.
- Botón «Exportar proyecto»: se mantiene el estado de cambios sin guardar; el mensaje indica que se ha solicitado la descarga sin garantizar que el navegador haya guardado el archivo.
- Informes HTML: aplicación de la política de fuentes en todo el generador, eliminando siempre las credenciales HTTP(S).
- Impresión/PDF: límites acumulados de 32 millones de píxeles y 128 MiB de blobs, con un máximo de 200 páginas.
- Paquete: módulo antiguo `editor-export.js` retirado, con 35 archivos de distribución.
- Herramientas de prueba actualizadas: axe-core/Playwright 4.14.0, Playwright Test 1.65.1, fake-indexeddb 6.2.8 y PDF.js 6.5.438. ESLint y HTML-Validate migrados a @eslint/js 10.0.1, eslint 10.15.0 y html-validate 11.21.1. Node.js requerido: ^22.22.0 o >=24.8.0; la matriz CI tiene como objetivo Node.js 22.22.0 y 24.8.0, sin ejecución en GitHub acreditada para esta migración. Detalles: [migración mayor de dependencias](MAJOR_DEPENDENCY_MIGRATION.md).
- Accesibilidad: el nombre accesible del selector de idioma incluye su código visible, comprobado en los cuatro idiomas.

Validaciones históricas de 1.5.2: véanse la [revisión de dependencias](DEPENDENCY_REVIEW_1.5.2.md) y el [informe de la candidata corregida para la tienda](STORE_READINESS_1.5.2.md). Estos resultados corresponden a estados anteriores y no califican la 1.5.3.

## [1.5.1] — publicada en GitHub

La versión 1.5.1 está publicada en GitHub. El estado actual de Chrome Web Store y su versión distribuida no están confirmados; deben comprobarse en el panel.

### Privacidad y robustez

- Política de fuentes en el panel Documento: sanitized por defecto elimina consulta y fragmento, none omite las fuentes, full las conserva; las credenciales HTTP(S) siempre se eliminan. Se aplica a proyectos y exportaciones; las fuentes eliminadas al guardar no se recuperan. La biblioteca siempre exporta con sanitized, incluidos los proyectos antiguos.
- Las rutas de URL, títulos, leyendas, fechas y píxeles aún pueden ser sensibles; diagnóstico local de activación voluntaria, sin telemetría. Permisos sin cambios.
- Exportaciones y proyectos: una instantánea PNG por imagen; miniaturas de biblioteca generadas directamente y limpieza que tiene en cuenta una impresión en curso.
- Importaciones PNG/JPEG/WebP: rechazo antes de decodificar por encima de 16 millones de píxeles o 16.384 px por lado, en vez de reducir; límite acumulado sin cambios en 32 millones de píxeles.
- Se mantiene la lectura de proyectos v1/v2 y la escritura v2; cambio de nombre solo en metadatos con una validación del códec, conservando los PNG.

## [1.5.0] - 2026-11-14

### Añadido

- Composición de varias imágenes con importación local o pegado, reordenación, disposición vertical/horizontal, títulos, leyendas y pasos numerados.
- Exportaciones PNG, JPEG, WebP, HTML, Markdown/ZIP, PDF e impresión con ajustes de calidad y presentación.
- Anotaciones editables individualmente y proyectos portátiles `.scionos` v2, con apertura de proyectos v1 aplanados y aplicación irreversible de máscaras/recortes al guardar.
- Biblioteca local duradera con guardado explícito, búsqueda, cambio de nombre, duplicación, eliminación, retención configurable y cuota limitada.
- Acceso más visible a la ayuda y visualización de la versión cargada.

### Corregido

- Los guardados simultáneos de la biblioteca conservan el orden de los clics y la identidad del documento, incluso si se abre otro proyecto durante la codificación.
- Las anotaciones movidas o duplicadas fuera de la imagen se guardan y reabren con coordenadas acotadas.

## [1.4.0] - 2026-11-10

### Añadido

- Quinto modo, Capturar un elemento: resaltado al pasar el cursor, selección padre/hijo y captura de la parte visible o del contenido completo de un contenedor desplazable.
- Confirmación de selección con tiradores, campos X/Y/ancho/alto y controles de teclado.
- Captura inmediata o retardo de 3, 5 o 10 segundos guardado localmente, con cuenta atrás cancelable después de confirmar la selección.
- Interfaz y ayuda en francés, inglés, español y alemán. El selector de elementos no recorre el contenido de iframes.

### Corregido

- Los avisos visibles dentro de un contenedor fijo de altura cero, incluido el aviso de cookies de X.com, ya no se repiten en cada fragmento; se conservan una sola vez al final de la imagen.
- Añadir contenido al final de un feed dinámico, como X.com, ya no interrumpe una selección limitada. Se mantienen las comprobaciones de ancho, ventana y reducción de altura; la captura de página completa sigue siendo estricta.

## [1.3.3] - 2026-10-05

- Capturas: ensamblado rectangular común, selecciones horizontales sin estiramiento y coordenadas correctas en contenedores trasladados o escalados; rechazo explícito de transformaciones complejas no compatibles.
- Selección: desplazamiento automático en los bordes del contenedor elegido, origen horizontal y ancho bloqueados en el modo vertical, selección sobre diálogos modales.
- Ensamblado: pie fijo completo incluso si el último fragmento es más corto; restauración al cancelar y respuestas tardías ignoradas.
- Privacidad: texto cubierto por descendientes omitido del PDF; máscaras libres continuas entre puntos distantes y con un solo clic.
- Exportaciones: aplicar o cancelar cambios pendientes antes de exportar; PNG, HTML, portapapeles y PDF usan píxeles y metadatos de la misma revisión.
- HTML: imagen integrada una sola vez, tamaño final verificado en bytes, desplazamiento de imágenes largas y zoom 100 % corregidos; extracción limitada a 1.500 bloques.
- Mantenimiento: versión 1.3.3 separada de las descargas publicadas, sincronización `--unreleased`, revisión de Markdown y regresiones con píxeles reales, PDF y cuatro DPR.

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

[Sin publicar]: https://github.com/ScioNos/Scionos-Capture/compare/v1.5.2...HEAD
[1.3.3]: https://github.com/ScioNos/Scionos-Capture/compare/v1.3.2...v1.3.3
[1.3.2]: https://github.com/ScioNos/Scionos-Capture/compare/v1.3.1...v1.3.2
[1.3.1]: https://github.com/ScioNos/Scionos-Capture/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/ScioNos/Scionos-Capture/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/ScioNos/Scionos-Capture/compare/v1.1.1...v1.2.0
[1.1.1]: https://github.com/ScioNos/Scionos-Capture/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/ScioNos/Scionos-Capture/releases/tag/v1.1.0
[1.0.0]: https://github.com/ScioNos/Scionos-Capture/releases/tag/v1.0.0

[1.5.0]: https://github.com/ScioNos/Scionos-Capture/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/ScioNos/Scionos-Capture/compare/v1.3.3...v1.4.0

[1.5.1]: https://github.com/ScioNos/Scionos-Capture/releases/tag/v1.5.1

[1.5.2]: https://github.com/ScioNos/Scionos-Capture/compare/v1.5.1...v1.5.2
