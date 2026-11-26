# Política de privacidad

[Français](PRIVACY.md) · [English](PRIVACY.en.md) · [Español](PRIVACY.es.md) · [Deutsch](PRIVACY.de.md)

## Preparación de 1.5.3 — 26 de noviembre de 2026

**Calificación local final de 1.5.3 superada; versión sin publicar.** Campaña completa superada: 178 pruebas unitarias, 179 E2E, cinco modos nativos en Chrome 158.0.8127.37 y Edge 158.0.4370.33, tres interrupciones por navegador, tres repeticiones de rendimiento y diez escenarios PDF. Los controles Linux también pasan con los mínimos exactos Node 22.22.0 y 24.8.0 (178 pruebas unitarias cada uno). Véase el [informe de consolidación](RAPPORT_CONSOLIDATION_1.5.3.md). CI remota, commit/PR y archivo definitivo siguen pendientes; sin publicación GitHub ni envío a la tienda. Se conservan los enlaces públicos de 1.5.2.

- Cancelación de exportaciones: Cancelar y Escape impiden publicar el resultado incluso después de iniciar la instantánea, durante la rasterización PDF o las bandas solo imagen; ocho escenarios específicos superados cubren limpieza de URL temporales y reintento.

Las comprobaciones de identidad de captura y los metadatos fijados al inicio buscan evitar mezclar páginas o documentos. Retirar la caché no cambia la retención local; IndexedDB sigue siendo la fuente de referencia. El cierre de conexiones abandonadas y la eliminación total transaccional ya existente localmente mejoran la coherencia del almacenamiento. El usuario debe seguir eliminando por separado las exportaciones ya guardadas.

- Captura: comprobaciones de pestaña activa, ventana y navegación antes y después de la adquisición, con una sonda vinculada al `documentId`. La URL y el título se fijan al inicio de la sesión.
- PDF: `captureVisibleTab` no aporta pruebas de correspondencia entre los píxeles capturados y el DOM. Incluso con estados observados idénticos antes y después puede pasar inadvertido un cambio transitorio, por lo que se omite todo texto fuente derivado del DOM en las capturas nativas. El texto de las anotaciones del usuario se representa en los píxeles; los títulos, leyendas y bandas de página siguen siendo buscables fuera del modo solo imagen.
- PDF solo imagen: opción del panel Documento, traducida a los cuatro idiomas y guardada con los ajustes del proyecto. Elimina las capas de texto buscable y también rasteriza encabezados y pies de página. Los píxeles visibles aún pueden contener secretos; este modo no sustituye una máscara sólida.
- Proyectos: manifiesto limitado a 1 MiB de JSON UTF-8 (incluidos los escapes) y archivo ZIP STORE a 128 MiB, con cabeceras y directorio incluidos. Una comprobación previa rechaza los excesos antes de copiar o crear instantáneas; el códec comprueba también los tamaños finales codificados. Los historiales de anotaciones Deshacer/Rehacer comparten además un presupuesto total de 1 MiB de JSON bruto UTF-8, con una reserva por estado. El historial de composición de títulos y leyendas también se limita a 50 estados y 1 MiB compartido de JSON UTF-8; los cambios de ajustes PDF y política de fuentes se comprueban antes de modificar el estado.
- Almacenamiento: retirada de la caché de capturas para evitar datos obsoletos entre contextos; cierre de conexiones IndexedDB abandonadas. La eliminación total transaccional ya presente en el árbol local se integra y conserva, con reversión completa en caso de error.
- Importaciones: validación estricta de los datos de transparencia PNG `tRNS`. Se conserva la lectura de proyectos v1/v2 y la escritura v2. Sin nuevos permisos ni telemetría.

Última actualización: 26 de noviembre de 2026 — documentación de 1.5.3 calificada localmente.

**Editorial responsable:** eyelo SA (IDE: CHE-108.174.302), Vaud, Suiza — Marca **ScioNos** ([scionos.ch](https://scionos.ch)) — Contacto: info@eyelo.ch

Scionos Capture procesa localmente los píxeles, el título y la URL de la página capturada, además de la preferencia de idioma. El usuario inicia explícitamente cada captura.

La captura de área desplazable procesa varias partes visibles de la misma página y las une localmente. No añade permisos, destinos de red ni categorías de datos.

No se envía ninguna captura, URL ni dato de navegación a eyelo SA, ScioNos o a terceros. No existen cuenta, telemetría, publicidad ni bibliotecas remotas.

Las capturas y sus metadatos de texto permanecen en IndexedDB local. Los fragmentos se eliminan tras el ensamblado o quince minutos de inactividad; un navegador suspendido puede retrasar la limpieza hasta despertar. La captura final se conserva mientras haya una pestaña de editor correspondiente abierta, incluso tras recargar y más allá de quince minutos. Se elimina al cerrar su último editor. Sin editor, puede limpiarse quince minutos después de su creación. Las asociaciones se reconcilian con las pestañas abiertas al despertar y reiniciar el navegador.

El idioma y el retardo de captura (`captureDelaySeconds`, 0, 3, 5 o 10 segundos) se guardan en `chrome.storage.local`. La selección de elementos y la cuenta atrás son locales y no añaden permisos ni destinos de red. La captura diferida requiere una acción explícita y puede cancelarse. El vínculo temporal del editor se guarda en `chrome.storage.session`. El usuario puede borrar los datos almacenados por la extensión desde su gestión o desinstalándola. Debe eliminar por separado los archivos exportados o proyectos guardados en el dispositivo. Contacto de privacidad: info@eyelo.ch. Para vulnerabilidades, consulta [SECURITY.es.md](SECURITY.es.md).

En la 1.5.3 calificada localmente, las capturas nativas no aportan una capa de texto fuente derivada del DOM: la API no demuestra su correspondencia con los píxeles. Las imágenes importadas y los proyectos reabiertos no restauran una capa fuente fiable. El texto de las anotaciones del usuario se representa en los píxeles; los títulos, leyendas y bandas de página siguen siendo buscables fuera del modo «PDF solo imagen». Esta opción se guarda en los ajustes del proyecto y también rasteriza encabezados y pies de página. La imagen permanece; protege los píxeles confidenciales con una máscara sólida, ya que el desenfoque es solo visual.

Aplica o cancela los cambios pendientes antes de exportar. El desenfoque es un efecto visual; usa una máscara sólida para secretos.

## Privacidad de la versión 1.5.2

**1.5.2 — publicada en GitHub.** Versión GitHub: [v1.5.2](https://github.com/ScioNos/Scionos-Capture/releases/tag/v1.5.2). El estado actual de Chrome Web Store no está confirmado; aquí no se realiza ningún envío de la 1.5.2 a la tienda.

Las correcciones aplican también la política de fuentes en todo el generador HTML. `sanitized` elimina consulta y fragmento, `none` omite las fuentes y `full` conserva las URL; las credenciales HTTP(S) siempre se eliminan. Las miniaturas internas del editor y la vista previa de composición se reconstruyen desde el proyecto reabierto, incluidas las anotaciones. Exportar un proyecto portátil no elimina el indicador de cambios sin guardar; «descarga solicitada» no confirma la escritura del archivo en disco. Los permisos y el procesamiento local no cambian.

## Privacidad de la versión 1.5.1 — publicada en GitHub; estado de la tienda no confirmado

En el panel Documento, la política de fuentes se aplica a proyectos guardados y exportaciones: sanitized (por defecto) elimina parámetros de consulta y fragmentos de URL, none omite las fuentes y full las conserva. Las credenciales incluidas en las URL HTTP(S) siempre se eliminan, incluso en modo full. Las fuentes eliminadas al guardar no se recuperan; cambiar de modo después no las restaura. La exportación desde la biblioteca siempre aplica sanitized, incluso a proyectos guardados antes de esta versión.

Este filtrado no hace anónimo el documento: rutas de URL, píxeles, títulos, leyendas y fechas aún pueden contener información sensible. Revísalos antes de compartir. Las copias ya exportadas siguen bajo tu control y no cambian al ajustar la política.

El diagnóstico es local y requiere activación explícita; no añade telemetría ni transmisión automática. Los permisos no cambian. Se mantiene la lectura de proyectos v1/v2 y la escritura v2; siguen aplicándose las protecciones irreversibles de máscaras y recortes.

## Alcance de privacidad de la versión 1.5.0

Esta sección describe el alcance de privacidad de la versión publicada 1.5.0.

La importación de archivos de imagen, el pegado solicitado explícitamente desde el portapapeles y la composición de varias imágenes procesan localmente las imágenes elegidas y los títulos, leyendas, pasos y metadatos de fuente/fecha presentes en el documento. Estas operaciones no transfieren datos a un servidor.

La 1.5.0 utiliza el formato portátil local `.scionos` v2 con anotaciones editables individualmente y apertura de proyectos v1, cuyas anotaciones permanecen aplanadas. Al guardar, las máscaras sólidas y los recortes se aplican irreversiblemente a las imágenes conservadas; las anotaciones afectadas se eliminan de forma conservadora. Los archivos importados y los proyectos v1 no tienen una capa de texto fiable. Al guardar después de un recorte, todas las anotaciones anteriores se aplanan para preservar su aspecto y orden.

Las exportaciones PNG, JPEG, WebP, HTML, Markdown/ZIP, PDF y la impresión pueden incluir las imágenes y la información de composición seleccionada. Revisa títulos, fuentes, fechas y contenido antes de compartir un proyecto o una exportación. Los archivos guardados permanecen en el dispositivo en la ubicación elegida; ni la limpieza temporal ni la desinstalación de la extensión los eliminan. El usuario gestiona su conservación, uso compartido y eliminación.

Hay una biblioteca local duradera con guardado explícito: miniaturas, búsqueda, cambio de nombre, duplicación y eliminación. El usuario elige una duración de 0, 7, 30 o 90 días y una cuota de 64 a 1.024 MiB, 256 MiB por defecto; 0 días significa sin expiración automática. Los proyectos locales pueden contener imágenes, anotaciones y metadatos. La máscara sólida sigue siendo necesaria para proteger píxeles confidenciales; el desenfoque es solo visual.
