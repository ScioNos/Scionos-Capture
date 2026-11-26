<p align="center">
  <img src="images/icon128.png" width="88" height="88" alt="Logo de Scionos Capture">
</p>

<h1 align="center">Scionos Capture</h1>

<p align="center"><strong>Captura una página. Compón un documento.<br>Mantén tus datos en tu dispositivo.</strong></p>

<p align="center">Una extensión local para Chrome y Microsoft Edge, desde la captura hasta la biblioteca de proyectos.</p>

[Français](README.md) · [English](README.en.md) · [Deutsch](README.de.md) · [Español](README.es.md)

[![Versión](https://img.shields.io/badge/version-1.5.3-blue)](https://github.com/ScioNos/Scionos-Capture) [![Verificación](https://github.com/ScioNos/Scionos-Capture/actions/workflows/ci.yml/badge.svg)](https://github.com/ScioNos/Scionos-Capture/actions/workflows/ci.yml) [![Licencia MIT](https://img.shields.io/badge/licence-MIT-green)](LICENSE) ![Chrome y Edge](https://img.shields.io/badge/Chrome_%26_Edge-Manifest_V3-4285F4)

**[Descargar la versión 1.5.2](https://github.com/ScioNos/Scionos-Capture/releases/tag/v1.5.2)** · **[Ver la ficha de Chrome Web Store](https://chromewebstore.google.com/detail/modfkdhgnhbfilpfanjginilabajchbe)** · **[Obtener ayuda](https://github.com/ScioNos/Scionos-Capture/issues)**

<!-- source-version --> **1.5.3 — en preparación, no publicada.** La publicación GitHub mantiene su etiqueta y archivo anterior; no contiene estas nuevas correcciones. No se ha enviado a la tienda. Véase [el informe de preparación](STORE_READINESS_1.5.2.md).

## Preparación de 1.5.3 — 26 de noviembre de 2026

**Preparación local, sin publicar.** La validación final de las pruebas sigue en curso; los resultados y límites se documentarán en el [informe de consolidación](CONSOLIDATION_1.5.3.md). No se realiza ninguna publicación en GitHub ni envío a la tienda. Los enlaces públicos y archivos de 1.5.2 siguen correspondiendo a la publicación existente.

- Captura: comprobaciones de pestaña activa, ventana y navegación antes y después de la adquisición, con una sonda vinculada al `documentId`. La URL y el título se fijan al inicio de la sesión.
- PDF: invalidación de la capa de texto ante mutaciones DOM/CSSOM, hojas CSS inaccesibles, cambios de medios o animaciones; exclusión del texto blanco sobre blanco y omisión del texto con modos de fusión o fondos de imagen si su visibilidad es incierta (regresión `SECRET_BLEND` invisible sobre blanco confirmada y corregida). Estas comprobaciones no demuestran una correspondencia absoluta entre píxeles y texto cuando un cambio CSSOM transitorio se revierte entre observaciones. Ante la duda se prefiere omitir el texto; revisa los píxeles y usa una máscara sólida para secretos.
- Capturas: presupuesto de 180 segundos comprobado de forma cooperativa en los puntos de control y un máximo de 256 porciones. No es una interrupción preventiva a los 180 segundos; las páginas demasiado largas se rechazan.
- Recursos: el presupuesto acumulado de 32 millones de píxeles incluye los originales conservados tras recortar; Deshacer/Rehacer sigue limitado por ese presupuesto. Como máximo hay dos instantáneas simultáneas en curso hasta finalizar la exportación, la copia al portapapeles o el guardado. Los Canvas propios de estas operaciones se reducen a 1 × 1 en `finally`, conservando las superficies de entrada.
- Anotaciones: 1.000 por imagen y 5.000 por documento; 10.000 puntos por trazo y 100.000 por documento. Historial global limitado a 100 estados, 100.000 puntos y 5.000 operaciones.
- Almacenamiento: retirada de la caché de capturas para evitar datos obsoletos entre contextos; cierre de conexiones IndexedDB abandonadas. La eliminación total transaccional ya presente en el árbol local se integra y conserva, con reversión completa en caso de error.
- Importaciones: validación estricta de los datos de transparencia PNG `tRNS`. Se conserva la lectura de proyectos v1/v2 y la escritura v2. Sin nuevos permisos ni telemetría.
- Interfaz: corrección del solapamiento de la barra de herramientas; los controles de anotación permanecen agrupados en la misma barra de 56 px, sin desplazar el lienzo ni alterar el arrastre. Se retiran los estados inertes `historyRevision`, `historyConsolidation` y `redoOperations`.
- Compatibilidad: mínimo del manifiesto Chrome/Edge 106 en lugar de 102; CSS `:has()` requiere Chrome 105 y `documentId` Chrome 106. Este mínimo se identifica mediante análisis estático; las únicas ejecuciones nativas acreditadas son en Chrome/Edge 158, sin ejecución demostrada en Chrome/Edge 106.
- Herramientas: `@axe-core/playwright` 4.14.1, `html-validate` 11.22.1, override de `minimatch` 11.0.9; retirada del override inactivo de `glob` y actualización de Actions. Véase la [revisión de dependencias](DEPENDENCY_REVIEW_1.5.3.md).
- Biblioteca: reutilización limitada de tarjetas y miniaturas implementada; medición de la mejora de rendimiento todavía en curso. El procesamiento por lotes previsto para 1.6 no está implementado.

## Versión 1.5.2 — correcciones y fiabilidad

- Selecciones: seguimiento del puntero activo, exclusión de punteros secundarios y limpieza de gestos interrumpidos.
- Captura: restauración de elementos ocultos incluso si falla su preparación.
- Biblioteca: eliminación global atómica, con rechazo de listas obsoletas y reversión completa en caso de error.
- Arrastres en el editor: seguimiento del `pointerId` activo y gestión de interrupciones del gesto.
- Miniaturas internas del editor y vista previa de composición: reconstrucción al reabrir el proyecto para incluir las anotaciones.
- Botón «Exportar proyecto»: se mantiene el estado de cambios sin guardar; el mensaje indica que se ha solicitado la descarga sin garantizar que el navegador haya guardado el archivo.
- Informes HTML: aplicación de la política de fuentes en todo el generador, eliminando siempre las credenciales HTTP(S).
- Impresión/PDF: límites acumulados de 32 millones de píxeles y 128 MiB de blobs, con un máximo de 200 páginas.
- Paquete: módulo antiguo `editor-export.js` retirado, con 35 archivos de distribución.


![Editor de Scionos Capture 1.5.2: anotación de una imagen y vista previa de una composición horizontal](store-assets/screenshot-real-1-composition-v1.5.2.png)

*Interfaz real de la versión 1.5.0, con contenido de demostración local.*

## De la página web al documento

Prepara una explicación visual, documenta un problema o conserva un fragmento útil. Scionos Capture reúne la selección, la anotación, la composición y la reanudación de proyectos en una sola extensión.

| Capturar con precisión | Explicar y componer | Recuperar tu trabajo |
| --- | --- | --- |
| Página completa, área visible, selección, área desplazable o elemento con un clic. | Dibujo, texto, flechas y máscaras; varias imágenes con títulos y leyendas. | Proyectos portátiles y biblioteca local con búsqueda, cambio de nombre y duplicación. |

**Sin cuenta, telemetría ni servidor de procesamiento.** Las imágenes y los metadatos permanecen en tu dispositivo. Tú decides qué guardas y compartes.

## Instalar en pocos minutos

### Descargar desde GitHub — versión 1.5.2

1. Descarga `scionos-capture-v1.5.2.zip` de la [versión v1.5.2](https://github.com/ScioNos/Scionos-Capture/releases/tag/v1.5.2).
2. Verifica su suma de comprobación con el archivo `.sha256` incluido y extrae el archivo comprimido.
3. Abre `chrome://extensions` o `edge://extensions` y activa el **Modo de desarrollador**.
4. Elige **Cargar descomprimida** y selecciona la carpeta extraída que contiene el manifiesto.
5. Fija Scionos Capture en la barra de herramientas y abre una página web normal.

Existe una [ficha de Chrome Web Store](https://chromewebstore.google.com/detail/modfkdhgnhbfilpfanjginilabajchbe). Su versión distribuida y su estado de revisión deben confirmarse en el panel; aquí no se realiza ningún envío de la 1.5.2 a la tienda.

## Tres formas de trabajar

### 1. Capturar el área adecuada

Elige uno de los cinco modos, ajusta la selección con tiradores o coordenadas y confirma. La selección de elementos permite pasar al elemento padre o hijo. Un retardo de **3, 5 o 10 segundos**, cancelable con **Escape**, te da tiempo para preparar un menú o un estado temporal.

Puedes definir un área desplazable con dos puntos o mediante el teclado. Mantiene el ancho visible elegido y ensambla verticalmente las partes compatibles.

<details>
<summary>Ver la selección y sus ajustes</summary>

![Selección ajustable: tiradores, coordenadas y confirmación antes de capturar](store-assets/screenshot-real-4-selection-v1.5.2.png)

</details>

### 2. Anotar y componer

Importa o pega varias imágenes, cambia su orden y elige una disposición vertical u horizontal. Añade títulos, leyendas y pasos numerados; ajusta el espaciado, los márgenes y el fondo.

En el editor, selecciona y modifica las anotaciones compatibles. Dibujo, resaltador, flechas, formas, texto y marcadores numerados ayudan a explicar; las máscaras sólidas protegen la información confidencial. Deshacer/Rehacer y el zoom permiten afinar el resultado.

| Resultado deseado | Opciones |
| --- | --- |
| Una imagen para compartir | PNG, JPEG o WebP, copia al portapapeles. |
| Un documento para consultar | Informe HTML autónomo o Markdown con sus imágenes en un ZIP. |
| Una versión impresa | Impresión/PDF, con márgenes, orientación, escala y encabezados/pies de página. |
| Un trabajo para retomar | Proyecto portátil `.scionos` v2; lectura de proyectos v1 con anotaciones aplanadas. |

<details>
<summary>Ver los ajustes de exportación y presentación</summary>

![Diálogo de exportación: presentación PDF, márgenes, orientación y paginación](store-assets/screenshot-real-3-export-v1.5.2.png)

</details>

### 3. Guardar y encontrar tus proyectos

La biblioteca conserva los proyectos **cuando los guardas explícitamente**, incluso después de cerrar el editor. Recorre las miniaturas, busca por título o fuente y vuelve a abrir, renombra, duplica, exporta o elimina un proyecto.

Elige una duración de **0, 7, 30 o 90 días** y una cuota de **64 a 1.024 MiB** — **256 MiB** por defecto. **0 días** significa sin caducidad automática. Un archivo portátil permite conservar una copia separada de la biblioteca.

![Biblioteca local: proyectos guardados, acciones y ajustes de conservación](store-assets/screenshot-real-2-bibliotheque-v1.5.2.png)

## Privacidad y control de los datos

- **Procesamiento local.** La extensión no transmite tus capturas, URL ni datos de navegación a ScioNos ni a terceros. No se ejecuta código remoto.
- **Conservación a tu elección.** Las capturas temporales y los fragmentos se limpian según su ciclo de vida. Los proyectos de la biblioteca siguen la retención elegida; los archivos guardados por separado quedan bajo tu responsabilidad.
- **Máscaras sólidas para los secretos.** El desenfoque es un efecto visual. Al guardar un proyecto, las máscaras y los recortes se vuelven irreversibles; las anotaciones afectadas se eliminan de forma conservadora. Tras un recorte, las anotaciones anteriores se aplanan para preservar su aspecto y orden.
- **Control de fuentes.** En el panel Documento, `sanitized` elimina por defecto los parámetros de consulta y fragmentos de las URL; `none` omite las fuentes y `full` las conserva. Las credenciales incluidas en las URL HTTP(S) siempre se eliminan. La elección se aplica a proyectos y exportaciones; una fuente eliminada al guardar no se puede recuperar. La exportación desde la biblioteca siempre usa `sanitized`, incluso para proyectos antiguos.
- **Revisión antes de compartir.** Las rutas de las URL, imágenes, títulos, leyendas y fechas aún pueden ser sensibles. El diagnóstico es local y de activación voluntaria, sin telemetría.

Consulta la [política de privacidad](PRIVACY.es.md) y el [modelo de seguridad](SECURITY.es.md).

<details>
<summary>Entender los permisos y el almacenamiento temporal</summary>

| Permiso | Uso |
| --- | --- |
| `activeTab` y `scripting` | Capturar la pestaña elegida e inyectar las herramientas tras una acción explícita. |
| `storage` | Recordar idioma, retardo, preferencias de la biblioteca y asociaciones temporales. |
| `unlimitedStorage` | Guardar localmente imágenes y proyectos grandes; la biblioteca mantiene su cuota de aplicación. |
| `alarms` | Limpiar los datos temporales caducados y los proyectos cuyo plazo de conservación haya terminado. |

Los fragmentos permanecen en IndexedDB local y se eliminan tras el ensamblado o quince minutos de inactividad. Una captura final sigue disponible mientras haya un editor correspondiente abierto, incluso después de recargar. Se elimina al cerrar el último editor; sin editor, puede limpiarse quince minutos después de su creación. Un navegador suspendido puede aplazar la limpieza hasta que se reactive.

</details>

## Lo que conviene saber

- Las páginas internas del navegador y las tiendas de extensiones están protegidas contra la inyección.
- El contenido animado, virtualizado o sin fin puede quedar incompleto. Algunos elementos fijos o `sticky` pueden variar entre las partes.
- El selector no recorre el interior de los iframes ni los shadow roots cerrados.
- Las importaciones PNG, JPEG y WebP que superen **16 millones de píxeles** o **16.384 px por lado** se rechazan antes de decodificar, en vez de reducirse. El límite acumulado de composición sigue siendo de **32 millones de píxeles**. Las rotaciones, inclinaciones y transformaciones de perspectiva no compatibles se rechazan explícitamente.
- El texto de búsqueda de un PDF solo se conserva cuando su visibilidad puede verificarse. Las imágenes importadas y restauradas de un proyecto no aportan una capa de texto fiable; las palabras inciertas se omiten de la capa textual, sin eliminar la imagen.
- Aplica o cancela los cambios pendientes antes de exportar.

## Desarrollar y contribuir

La interfaz y la ayuda están disponibles en **francés, inglés, alemán y español**. El proyecto utiliza Manifest V3 y no tiene dependencias externas de JavaScript en tiempo de ejecución.

Requisito: **Node.js `^22.22.0 || >=24.8.0`**, con **Node.js 24.8+ recomendado** para las herramientas de desarrollo y pruebas.

```bash
npm ci
npm run verify
```

`verify` comprueba sintaxis, lint, HTML, pruebas unitarias, traducciones, paquete y regresiones del navegador y de accesibilidad. `npm run test:native` prueba los cinco modos en Chrome y Edge instalados con capturas reales y perfiles temporales, sin usar perfiles personales. `npm run package` genera el archivo comprimido y su suma de comprobación en `dist/`.

Sincronización de versión para la publicación GitHub: `npm run version:sync -- 1.5.2`; en PowerShell: `npm.cmd run version:sync -- 1.5.2`. Este comando también modifica los archivos de versión del paquete; ejecútalo solo dentro de su actualización coordinada.

Paquete local corregido: `dist/scionos-capture-v1.5.2.zip`, 35 archivos. La suma de esta candidata consta en [el informe](STORE_READINESS_1.5.2.md) y en el archivo `.sha256` adjunto; difiere del archivo GitHub existente.

<!-- local-package --> Archivo local : `scionos-capture-v1.5.3.zip` · SHA-256 : `scionos-capture-v1.5.3.zip.sha256`.

[Contribuir](CONTRIBUTING.es.md) · [Cambios](CHANGELOG.es.md) · [Notas de versión](RELEASE_NOTES.md) · [Informar de un problema](https://github.com/ScioNos/Scionos-Capture/issues) · [Informar de una vulnerabilidad](SECURITY.es.md)

---

Desarrollado por **eyelo SA, Suiza**, bajo la marca **ScioNos**. [Sitio web](https://scionos.ch) · [Contacto](mailto:info@eyelo.ch) · [Licencia MIT](LICENSE)

Validación de esta candidata: 136 pruebas unitarias y 136 pruebas de navegador superadas, cinco modos nativos en Chrome y Edge, tres repeticiones de rendimiento y diez escenarios PDF. Detalles, límites y suma final: [preparación para la tienda](STORE_READINESS_1.5.2.md).
