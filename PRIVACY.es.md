# Política de privacidad

[Français](PRIVACY.md) · [English](PRIVACY.en.md) · [Español](PRIVACY.es.md) · [Deutsch](PRIVACY.de.md)

## Preparación de 1.5.3 — 26 de noviembre de 2026

**Preparación local, sin publicar.** La validación final de las pruebas sigue en curso; los resultados y límites se documentarán en el [informe de consolidación](CONSOLIDATION_1.5.3.md). No se realiza ninguna publicación en GitHub ni envío a la tienda. Los enlaces públicos y archivos de 1.5.2 siguen correspondiendo a la publicación existente.

Las comprobaciones de identidad de captura y los metadatos fijados al inicio buscan evitar mezclar páginas o documentos. Retirar la caché no cambia la retención local; IndexedDB sigue siendo la fuente de referencia. El cierre de conexiones abandonadas y la eliminación total transaccional ya existente localmente mejoran la coherencia del almacenamiento. El usuario debe seguir eliminando por separado las exportaciones ya guardadas.

- Captura: comprobaciones de pestaña activa, ventana y navegación antes y después de la adquisición, con una sonda vinculada al `documentId`. La URL y el título se fijan al inicio de la sesión.
- PDF: invalidación de la capa de texto ante mutaciones DOM/CSSOM, hojas CSS inaccesibles, cambios de medios o animaciones; exclusión del texto blanco sobre blanco y omisión del texto con modos de fusión o fondos de imagen si su visibilidad es incierta (regresión `SECRET_BLEND` invisible sobre blanco confirmada y corregida). Estas comprobaciones no demuestran una correspondencia absoluta entre píxeles y texto cuando un cambio CSSOM transitorio se revierte entre observaciones. Ante la duda se prefiere omitir el texto; revisa los píxeles y usa una máscara sólida para secretos.
- Almacenamiento: retirada de la caché de capturas para evitar datos obsoletos entre contextos; cierre de conexiones IndexedDB abandonadas. La eliminación total transaccional ya presente en el árbol local se integra y conserva, con reversión completa en caso de error.
- Importaciones: validación estricta de los datos de transparencia PNG `tRNS`. Se conserva la lectura de proyectos v1/v2 y la escritura v2. Sin nuevos permisos ni telemetría.

Última actualización: 17 de noviembre de 2026 — documentación de la versión 1.5.2.

**Editorial responsable:** eyelo SA (IDE: CHE-108.174.302), Vaud, Suiza — Marca **ScioNos** ([scionos.ch](https://scionos.ch)) — Contacto: info@eyelo.ch

Scionos Capture procesa localmente los píxeles, el título y la URL de la página capturada, además de la preferencia de idioma. El usuario inicia explícitamente cada captura.

La captura de área desplazable procesa varias partes visibles de la misma página y las une localmente. No añade permisos, destinos de red ni categorías de datos.

No se envía ninguna captura, URL ni dato de navegación a eyelo SA, ScioNos o a terceros. No existen cuenta, telemetría, publicidad ni bibliotecas remotas.

Las capturas y sus metadatos de texto permanecen en IndexedDB local. Los fragmentos se eliminan tras el ensamblado o quince minutos de inactividad; un navegador suspendido puede retrasar la limpieza hasta despertar. La captura final se conserva mientras haya una pestaña de editor correspondiente abierta, incluso tras recargar y más allá de quince minutos. Se elimina al cerrar su último editor. Sin editor, puede limpiarse quince minutos después de su creación. Las asociaciones se reconcilian con las pestañas abiertas al despertar y reiniciar el navegador.

El idioma y el retardo de captura (`captureDelaySeconds`, 0, 3, 5 o 10 segundos) se guardan en `chrome.storage.local`. La selección de elementos y la cuenta atrás son locales y no añaden permisos ni destinos de red. La captura diferida requiere una acción explícita y puede cancelarse. El vínculo temporal del editor se guarda en `chrome.storage.session`. El usuario puede borrar los datos almacenados por la extensión desde su gestión o desinstalándola. Debe eliminar por separado los archivos exportados o proyectos guardados en el dispositivo. Contacto de privacidad: info@eyelo.ch. Para vulnerabilidades, consulta [SECURITY.es.md](SECURITY.es.md).

La capa de búsqueda del PDF conserva solo palabras completas cuya visibilidad puede verificarse. Las palabras inciertas se omiten de esa capa y se conserva la imagen capturada. También se omiten las capas antiguas con coordenadas no verificadas. Usa censura sólida para proteger píxeles confidenciales; el desenfoque es solo visual.

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
