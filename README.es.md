# Scionos Capture

[Français](README.md) · [English](README.en.md) · [Español](README.es.md) · [Deutsch](README.de.md)

Extensión totalmente local para capturas en Chrome y Edge. Captura el área visible, una selección, una área desplazable o una página completa; después dibuja, oculta, recorta y exporta como PNG, HTML interactivo o PDF.

## Funciones

- Captura visible, seleccionada, desplazable y de página completa bidimensional.
- Áreas desplazables verticales definidas con dos puntos o campos X/Y/ancho/alto por teclado.
- Editor local con dibujo, máscara sólida, desenfoque visual, recorte, Deshacer/Rehacer, geometría por teclado y zoom del 20–300 %.
- Interfaz responsive y accesible por teclado en francés, inglés, español y alemán.
- Idioma automático del navegador con selección manual mediante un menú de banderas.
- Sin servidor, cuenta, telemetría, publicidad ni transferencia de capturas.

## Instalación

Descarga `scionos-capture-v1.3.0.zip` de la [versión v1.3.0](https://github.com/ScioNos/Scionos-Capture/releases/tag/v1.3.0), verifica si quieres el archivo `.sha256` y extrae el ZIP. Abre `chrome://extensions` o `edge://extensions`, activa el **Modo de desarrollador**, elige **Cargar descomprimida** y selecciona la carpeta extraída.

Desde el código fuente: clona el repositorio, ejecuta `npm ci` y carga la raíz del proyecto como extensión descomprimida.

## Uso, permisos y privacidad

Elige **Página completa**, **Área visible**, **Zona seleccionada** o **Área desplazable**. Para esta última, haz clic en la primera esquina, desplázate verticalmente y elige la opuesta. `Escape` cancela, **Reiniciar** borra el primer punto y los campos X/Y/ancho/alto permiten usar el teclado. El atajo sugerido es `Alt+Shift+C`, pero el popup muestra la configuración real. En el editor, `V`, `D`, `M`, `C`, `Ctrl+Z`, `Ctrl+Y`, `+`, `-` y `0` controlan herramientas, historial y zoom. Usa una máscara sólida para secretos.

`activeTab` y `scripting` actúan solo tras una acción explícita; `storage` conserva idioma y vínculo temporal; `unlimitedStorage` evita fallos con imágenes grandes; `alarms` caduca las capturas. Los fragmentos permanecen solo en IndexedDB local y se eliminan después del ensamblado o en un máximo de quince minutos. La captura final se elimina cuando el editor la decodifica; la caducidad de quince minutos solo protege las capturas huérfanas. Consulta [PRIVACY.es.md](PRIVACY.es.md) y [SECURITY.es.md](SECURITY.es.md).

## Límites y desarrollo

Las páginas infinitas permanentes no tienen un final determinable. El área desplazable se limita al ancho visible del primer punto y no se une horizontalmente. El contenido `sticky` o cambiante puede diferir entre mosaicos. No se pueden inyectar páginas internas ni tiendas de extensiones. Las imágenes superiores a 16 millones de píxeles o 16.384 px por lado se reducen.

Usa Node.js 20 o 24, ejecuta `npm ci` y `npm run verify`. Consulta [CONTRIBUTING.es.md](CONTRIBUTING.es.md), [CHANGELOG.es.md](CHANGELOG.es.md) y la [licencia MIT](LICENSE).
