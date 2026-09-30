# Política de privacidad

[Français](PRIVACY.md) · [English](PRIVACY.en.md) · [Español](PRIVACY.es.md) · [Deutsch](PRIVACY.de.md)

Última actualización: 30 de septiembre de 2026.

**Editorial responsable:** eyelo SA (IDE: CHE-108.174.302), Vaud, Suiza — Marca **ScioNos** ([scionos.ch](https://scionos.ch)) — Contacto: info@eyelo.ch

Scionos Capture procesa localmente los píxeles, el título y la URL de la página capturada, además de la preferencia de idioma. El usuario inicia explícitamente cada captura.

La captura de área desplazable procesa varias partes visibles de la misma página y las une localmente. No añade permisos, destinos de red ni categorías de datos.

No se envía ninguna captura, URL ni dato de navegación a eyelo SA, ScioNos o a terceros. No existen cuenta, telemetría, publicidad ni bibliotecas remotas.

Las capturas y sus metadatos de texto permanecen en IndexedDB local. Los fragmentos se eliminan tras el ensamblado o quince minutos de inactividad; un navegador suspendido puede retrasar la limpieza hasta despertar. La captura final se conserva mientras haya una pestaña de editor correspondiente abierta, incluso tras recargar y más allá de quince minutos. Se elimina al cerrar su último editor. Sin editor, puede limpiarse quince minutos después de su creación. Las asociaciones se reconcilian con las pestañas abiertas al despertar y reiniciar el navegador.

El idioma se guarda en `chrome.storage.local` y el vínculo temporal del editor en `chrome.storage.session`. El usuario puede borrar los datos desde la gestión de extensiones o desinstalando. Contacto de privacidad: info@eyelo.ch. Para vulnerabilidades, consulta [SECURITY.es.md](SECURITY.es.md).

La capa de búsqueda del PDF conserva solo palabras completas cuya visibilidad puede verificarse. Las palabras inciertas se omiten de esa capa y se conserva la imagen capturada. También se omiten las capas antiguas con coordenadas no verificadas. Usa censura sólida para proteger píxeles confidenciales; el desenfoque es solo visual.
