# Scionos Capture

[Français](README.md) · [English](README.en.md) · [Español](README.es.md) · [Deutsch](README.de.md)

![Version](https://img.shields.io/badge/version-1.4.0-blue)

Extensión totalmente local para capturas en Chrome y Edge. Captura el área visible, una selección, una área desplazable o una página completa; después dibuja, oculta, recorta y exporta como PNG, HTML interactivo o PDF.

## Funciones

- Cinco modos: página completa, área visible, zona seleccionada, área desplazable y captura de elementos.
- Tiradores y coordenadas para ajustar la selección antes de confirmarla; navegación entre elemento padre e hijo.
- Captura inmediata o con retardo de 3, 5 o 10 segundos, cuenta atrás cancelable y preferencia local.
- Áreas desplazables verticales definidas con dos puntos o campos X/Y/ancho/alto por teclado.
- Editor local con dibujo, máscara sólida, desenfoque visual, recorte, Deshacer/Rehacer, geometría por teclado y zoom del 20–300 %.
- Interfaz responsive y accesible por teclado en francés, inglés, español y alemán.
- Idioma automático del navegador con selección manual mediante un menú de banderas.
- Sin servidor, cuenta, telemetría, publicidad ni transferencia de capturas.

## Instalación

Descarga `scionos-capture-v1.4.0.zip` de la [versión v1.4.0](https://github.com/ScioNos/Scionos-Capture/releases/tag/v1.4.0), verifica si quieres el archivo `.sha256` y extrae el ZIP. Abre `chrome://extensions` o `edge://extensions`, activa el **Modo de desarrollador**, elige **Cargar descomprimida** y selecciona la carpeta extraída.

Desde el código fuente: clona el repositorio, ejecuta `npm ci` y carga la raíz del proyecto como extensión descomprimida.

## Uso, permisos y privacidad

Elige **Inmediato**, **3**, **5** o **10 segundos** y después **Página completa**, **Área visible**, **Zona seleccionada**, **Área desplazable** o **Capturar un elemento**. En zona seleccionada, dibuja el área, ajusta los tiradores o las coordenadas y confirma con **Capturar**. En elementos, pasa el cursor sobre un bloque, elige padre/hijo si hace falta y su parte visible o el contenido completo de un contenedor realmente desplazable, y haz clic en el bloque. Ajusta las coordenadas y confirma con **Capturar**. El retardo comienza tras confirmar zonas seleccionadas, áreas desplazables y elementos; para página completa y área visible comienza al iniciar. **Escape** cancela la cuenta atrás. Para **Área desplazable**, haz clic en la primera esquina, desplázate verticalmente y elige la opuesta. `Escape` cancela, **Reiniciar** borra el primer punto y los campos X/Y/ancho/alto permiten usar el teclado. El atajo sugerido es `Alt+Shift+C`, pero el popup muestra la configuración real. En el editor, `V`, `D`, `M`, `C`, `Ctrl+Z`, `Ctrl+Y`, `+`, `-` y `0` controlan herramientas, historial y zoom. Usa una máscara sólida para secretos.

`activeTab` y `scripting` actúan solo tras una acción explícita; `storage` conserva idioma, retardo de captura y vínculo temporal; `unlimitedStorage` evita fallos con imágenes grandes; `alarms` caduca las capturas. Los fragmentos permanecen solo en IndexedDB local y se eliminan después del ensamblado o tras quince minutos de inactividad (al despertar si el navegador está suspendido). La captura final se conserva mientras haya un editor correspondiente abierto, incluso tras recargar y más allá de quince minutos. Se elimina al cerrar el último editor; sin editor, puede limpiarse quince minutos después de su creación. Consulta [PRIVACY.es.md](PRIVACY.es.md) y [SECURITY.es.md](SECURITY.es.md).

## Límites y desarrollo

Las páginas infinitas permanentes no tienen un final determinable. El área desplazable se limita al ancho visible del primer punto y no se une horizontalmente. El contenido `sticky` o cambiante puede diferir entre mosaicos. No se pueden inyectar páginas internas ni tiendas de extensiones. El selector de elementos no recorre el contenido de iframes: puede capturar el marco visible, pero no seleccionar sus elementos internos individualmente. Las imágenes superiores a 16 millones de píxeles o 16.384 px por lado se reducen.

Usa Node.js 24, ejecuta `npm ci` y `npm run verify`. Consulta [CONTRIBUTING.es.md](CONTRIBUTING.es.md), [CHANGELOG.es.md](CHANGELOG.es.md) y la [licencia MIT](LICENSE).

### PDF

Aplica o cancela los cambios pendientes antes de exportar. El desenfoque es un efecto visual; usa una máscara sólida para secretos.

Se admiten contenedores trasladados y escalados. Las rotaciones, inclinaciones y perspectivas no compatibles producen un error explícito.

La capa de búsqueda del PDF conserva solo palabras completas cuya visibilidad puede verificarse. Las palabras inciertas se omiten de esa capa y se conserva la imagen capturada. También se omiten las capas antiguas con coordenadas no verificadas. Usa censura sólida para proteger píxeles confidenciales; el desenfoque es solo visual.

Se recomienda Node.js 24 para la verificación completa, incluida la extracción PDF con PDF.js 6.3.289 (solo para pruebas). Las comprobaciones principales siguen siendo compatibles con Node.js 20.

Sincroniza una versión no publicada con `npm run version:sync -- 1.4.0 --unreleased`; en PowerShell usa `npm.cmd run version:sync -- 1.4.0 --unreleased`. Los enlaces de descarga publicados se conservan.

<!-- local-package --> Archivo local : `scionos-capture-v1.4.0.zip` · SHA-256 : `scionos-capture-v1.4.0.zip.sha256`.

`npm run test:native` verifica los cinco modos y una captura diferida en Chrome y Edge instalados, con capturas reales y perfiles temporales. La acción de la extensión concede `activeTab`; no se usan perfiles personales.
