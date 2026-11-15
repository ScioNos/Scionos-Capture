# Scionos Capture 1.5.1

**Version 1.5.1 release / GitHub Release 1.5.1 / Release GitHub 1.5.1 / GitHub-Release 1.5.1**

[Français](#français) · [English](#english) · [Español](#español) · [Deutsch](#deutsch)

## Français

Scionos Capture 1.5.1 améliore la confidentialité des sources partagées et la robustesse des imports, projets et exports.

- **Sources :** dans le panneau Document, `sanitized` retire par défaut requête et fragment d’URL ; `none` omet les sources et `full` les conserve. Le choix s’applique aux projets et exports. Les identifiants HTTP(S) sont toujours retirés. Les sources retirées à la sauvegarde ne sont pas récupérables. La bibliothèque exporte toujours en mode `sanitized`, même les anciens projets.
- **Images et projets :** un instantané PNG par image dans les exports et projets, vignettes de bibliothèque générées directement, nettoyage tenant compte d’une impression en cours. Renommage des métadonnées avec une validation du codec, PNG conservés ; lecture v1/v2 et écriture v2 maintenues.
- **Imports :** PNG/JPEG/WebP au-delà de 16 millions de pixels ou de 16 384 px par côté refusés avant décodage, au lieu d’être réduits. Cumul inchangé à 32 millions de pixels.
- **Confidentialité :** diagnostic local sur activation explicite, sans télémétrie ni nouvelle permission. Chemins d’URL, images, titres, légendes et dates peuvent rester sensibles : vérifiez-les avant partage. Utilisez un masque solide pour les secrets.

La version 1.5.0 reste disponible sur le [Chrome Web Store](https://chromewebstore.google.com/detail/modfkdhgnhbfilpfanjginilabajchbe). La mise à jour 1.5.1 a été soumise à l’examen Google et attend son approbation ; la fiche Store affichera la nouvelle version après publication par Google. GitHub publie cette release v1.5.1. L’archive validée contient 36 fichiers ; SHA-256 `cd9a63914d4d407862494ef50d35b706e11653d704b0f09173796d794f442564` (également fourni dans le fichier `.sha256` joint).

## English

Scionos Capture 1.5.1 improves shared-source privacy and the robustness of imports, projects and exports.

- **Sources:** in the Document panel, default `sanitized` removes URL query and fragment; `none` omits sources and `full` retains them. The choice applies to projects and exports. HTTP(S) credentials are always removed. Sources removed on save cannot be recovered. The library always exports using `sanitized`, including older projects.
- **Images and projects:** one PNG snapshot per image in exports and projects, directly generated library thumbnails, cleanup that accounts for printing in progress. Metadata rename with one codec validation, preserving PNGs; v1/v2 reading and v2 writing retained.
- **Imports:** PNG/JPEG/WebP above 16 million pixels or 16,384 px per side rejected before decoding instead of being reduced. Total limit unchanged at 32 million pixels.
- **Privacy:** local opt-in diagnostics, without telemetry or new permissions. URL paths, images, titles, captions and dates may remain sensitive: review them before sharing. Use solid masks for secrets.

Version 1.5.0 remains available on the [Chrome Web Store](https://chromewebstore.google.com/detail/modfkdhgnhbfilpfanjginilabajchbe). The 1.5.1 update has been submitted for Google review and awaits approval; the Store listing will show it after Google publishes it. GitHub publishes this v1.5.1 release. The verified archive contains 36 files; SHA-256 `cd9a63914d4d407862494ef50d35b706e11653d704b0f09173796d794f442564` (also provided in the attached `.sha256` file).

## Español

Scionos Capture 1.5.1 mejora la privacidad de las fuentes compartidas y la robustez de las importaciones, los proyectos y las exportaciones.

- **Fuentes:** en el panel Documento, `sanitized` por defecto elimina consulta y fragmento de URL; `none` omite las fuentes y `full` las conserva. Se aplica a proyectos y exportaciones. Las credenciales HTTP(S) siempre se eliminan. Las fuentes eliminadas al guardar no se recuperan. La biblioteca siempre exporta con `sanitized`, incluidos proyectos antiguos.
- **Imágenes y proyectos:** una instantánea PNG por imagen en exportaciones y proyectos, miniaturas de biblioteca generadas directamente y limpieza que tiene en cuenta una impresión en curso. Cambio de nombre de metadatos con una validación del códec, PNG conservados; lectura v1/v2 y escritura v2 mantenidas.
- **Importaciones:** PNG/JPEG/WebP por encima de 16 millones de píxeles o 16.384 px por lado rechazados antes de decodificar, en vez de reducirse. Límite acumulado sin cambios en 32 millones de píxeles.
- **Privacidad:** diagnóstico local de activación voluntaria, sin telemetría ni nuevos permisos. Rutas de URL, imágenes, títulos, leyendas y fechas pueden seguir siendo sensibles: revísalos antes de compartir. Usa máscaras sólidas para secretos.

La versión 1.5.0 sigue disponible en [Chrome Web Store](https://chromewebstore.google.com/detail/modfkdhgnhbfilpfanjginilabajchbe). La actualización 1.5.1 se ha enviado a revisión de Google y espera aprobación; la ficha de la tienda la mostrará cuando Google la publique. GitHub publica esta versión v1.5.1. El archivo validado contiene 36 elementos; SHA-256 `cd9a63914d4d407862494ef50d35b706e11653d704b0f09173796d794f442564` (también incluido en el archivo `.sha256` adjunto).

## Deutsch

Version 1.5.1 verbessert den Datenschutz für Quellen, Bildimporte sowie die Verarbeitung lokaler Projekte und Exporte.

- **Quellen:** im Bereich Dokument entfernt Standard `sanitized` URL-Abfrage und Fragment; `none` lässt Quellen weg und `full` behält sie bei. Gilt für Projekte und Exporte. HTTP(S)-Zugangsdaten werden immer entfernt. Beim Speichern entfernte Quellen sind nicht wiederherstellbar. Die Bibliothek exportiert immer mit `sanitized`, auch ältere Projekte.
- **Bilder und Projekte:** ein PNG-Abbild pro Bild in Exporten und Projekten, direkt erzeugte Bibliotheksvorschaubilder und Bereinigung unter Berücksichtigung laufender Druckvorgänge. Metadaten umbenennen mit einer Codec-Validierung, PNGs beibehalten; v1/v2 lesen und v2 schreiben bleibt erhalten.
- **Importe:** PNG/JPEG/WebP über 16 Millionen Pixel oder 16.384 px pro Seite vor dem Dekodieren ablehnen statt verkleinern. Gesamtlimit unverändert bei 32 Millionen Pixel.
- **Datenschutz:** lokale, ausdrücklich aktivierte Diagnose ohne Telemetrie oder neue Berechtigungen. URL-Pfade, Bilder, Titel, Bildunterschriften und Datumsangaben können vertraulich bleiben: vor dem Teilen prüfen. Geheimnisse deckend maskieren.

Version 1.5.0 bleibt im [Chrome Web Store](https://chromewebstore.google.com/detail/modfkdhgnhbfilpfanjginilabajchbe) verfügbar. Die Aktualisierung 1.5.1 wurde zur Google-Prüfung eingereicht und wartet auf die Genehmigung; der Store-Eintrag zeigt sie nach der Veröffentlichung durch Google. GitHub veröffentlicht dieses v1.5.1-Release. Das Archiv enthält 36 Dateien; SHA-256 `cd9a63914d4d407862494ef50d35b706e11653d704b0f09173796d794f442564`.
