# Scionos Capture 1.5.1

**La version 1.5.1 a été soumise au Chrome Web Store et attend l’examen Google ; aucune release GitHub 1.5.1 / Version 1.5.1 submitted to the Chrome Web Store and pending Google review; no GitHub 1.5.1 release / Versión 1.5.1 enviada a Chrome Web Store y pendiente de revisión de Google; sin release de GitHub 1.5.1 / Version 1.5.1 beim Chrome Web Store eingereicht und wartet auf Google-Prüfung; kein GitHub-Release 1.5.1.**

[Français](#français) · [English](#english) · [Español](#español) · [Deutsch](#deutsch)

## Français

Cette préparation corrige le traitement des sources, des images importées et des projets locaux.

- **Sources :** dans le panneau Document, `sanitized` retire par défaut requête et fragment d’URL ; `none` omet les sources et `full` les conserve. Le choix s’applique aux projets et exports. Les identifiants HTTP(S) sont toujours retirés. Les sources retirées à la sauvegarde ne sont pas récupérables. La bibliothèque exporte toujours en mode `sanitized`, même les anciens projets.
- **Images et projets :** un instantané PNG par image dans les exports et projets, vignettes de bibliothèque générées directement, nettoyage tenant compte d’une impression en cours. Renommage des métadonnées avec une validation du codec, PNG conservés ; lecture v1/v2 et écriture v2 maintenues.
- **Imports :** PNG/JPEG/WebP au-delà de 16 millions de pixels ou de 16 384 px par côté refusés avant décodage, au lieu d’être réduits. Cumul inchangé à 32 millions de pixels.
- **Confidentialité :** diagnostic local sur activation explicite, sans télémétrie ni nouvelle permission. Chemins d’URL, images, titres, légendes et dates peuvent rester sensibles : vérifiez-les avant partage. Utilisez un masque solide pour les secrets.

La version 1.5.0 est publiée sur le [Chrome Web Store](https://chromewebstore.google.com/detail/modfkdhgnhbfilpfanjginilabajchbe) et GitHub. Le package 1.5.1 a été soumis à l’examen Google ; la console indique « En attente d’examen ». La fiche publique affiche encore la 1.5.0 tant que la revue n’est pas terminée. L’archive soumise est `scionos-capture-v1.5.1.zip`, SHA-256 `c9ffb73d1276037c95620b764c19864b94ccf4e7ffb447ec114942cb8c9ef2c9`. La release GitHub reste en 1.5.0.

## English

This preparation updates source handling, imported images and local projects.

- **Sources:** in the Document panel, default `sanitized` removes URL query and fragment; `none` omits sources and `full` retains them. The choice applies to projects and exports. HTTP(S) credentials are always removed. Sources removed on save cannot be recovered. The library always exports using `sanitized`, including older projects.
- **Images and projects:** one PNG snapshot per image in exports and projects, directly generated library thumbnails, cleanup that accounts for printing in progress. Metadata rename with one codec validation, preserving PNGs; v1/v2 reading and v2 writing retained.
- **Imports:** PNG/JPEG/WebP above 16 million pixels or 16,384 px per side rejected before decoding instead of being reduced. Total limit unchanged at 32 million pixels.
- **Privacy:** local opt-in diagnostics, without telemetry or new permissions. URL paths, images, titles, captions and dates may remain sensitive: review them before sharing. Use solid masks for secrets.

Version 1.5.0 is published on the [Chrome Web Store](https://chromewebstore.google.com/detail/modfkdhgnhbfilpfanjginilabajchbe) and GitHub. Package 1.5.1 has been submitted for Google review; the dashboard reports “Pending review.” The public listing still shows 1.5.0 while review is in progress. Submitted archive: `scionos-capture-v1.5.1.zip`, SHA-256 `c9ffb73d1276037c95620b764c19864b94ccf4e7ffb447ec114942cb8c9ef2c9`. The GitHub release remains at 1.5.0.

## Español

Esta preparación actualiza el tratamiento de fuentes, imágenes importadas y proyectos locales.

- **Fuentes:** en el panel Documento, `sanitized` por defecto elimina consulta y fragmento de URL; `none` omite las fuentes y `full` las conserva. Se aplica a proyectos y exportaciones. Las credenciales HTTP(S) siempre se eliminan. Las fuentes eliminadas al guardar no se recuperan. La biblioteca siempre exporta con `sanitized`, incluidos proyectos antiguos.
- **Imágenes y proyectos:** una instantánea PNG por imagen en exportaciones y proyectos, miniaturas de biblioteca generadas directamente y limpieza que tiene en cuenta una impresión en curso. Cambio de nombre de metadatos con una validación del códec, PNG conservados; lectura v1/v2 y escritura v2 mantenidas.
- **Importaciones:** PNG/JPEG/WebP por encima de 16 millones de píxeles o 16.384 px por lado rechazados antes de decodificar, en vez de reducirse. Límite acumulado sin cambios en 32 millones de píxeles.
- **Privacidad:** diagnóstico local de activación voluntaria, sin telemetría ni nuevos permisos. Rutas de URL, imágenes, títulos, leyendas y fechas pueden seguir siendo sensibles: revísalos antes de compartir. Usa máscaras sólidas para secretos.

La versión 1.5.0 está publicada en [Chrome Web Store](https://chromewebstore.google.com/detail/modfkdhgnhbfilpfanjginilabajchbe) y GitHub. El paquete 1.5.1 se ha enviado a revisión de Google; el panel indica «Pendiente de revisión». La ficha pública todavía muestra la 1.5.0 mientras se completa la revisión. Archivo enviado: `scionos-capture-v1.5.1.zip`, SHA-256 `c9ffb73d1276037c95620b764c19864b94ccf4e7ffb447ec114942cb8c9ef2c9`. GitHub sigue en la versión 1.5.0.

## Deutsch

Diese Vorbereitung aktualisiert Quellenbehandlung, importierte Bilder und lokale Projekte.

- **Quellen:** im Bereich Dokument entfernt Standard `sanitized` URL-Abfrage und Fragment; `none` lässt Quellen weg und `full` behält sie bei. Gilt für Projekte und Exporte. HTTP(S)-Zugangsdaten werden immer entfernt. Beim Speichern entfernte Quellen sind nicht wiederherstellbar. Die Bibliothek exportiert immer mit `sanitized`, auch ältere Projekte.
- **Bilder und Projekte:** ein PNG-Abbild pro Bild in Exporten und Projekten, direkt erzeugte Bibliotheksvorschaubilder und Bereinigung unter Berücksichtigung laufender Druckvorgänge. Metadaten umbenennen mit einer Codec-Validierung, PNGs beibehalten; v1/v2 lesen und v2 schreiben bleibt erhalten.
- **Importe:** PNG/JPEG/WebP über 16 Millionen Pixel oder 16.384 px pro Seite vor dem Dekodieren ablehnen statt verkleinern. Gesamtlimit unverändert bei 32 Millionen Pixel.
- **Datenschutz:** lokale, ausdrücklich aktivierte Diagnose ohne Telemetrie oder neue Berechtigungen. URL-Pfade, Bilder, Titel, Bildunterschriften und Datumsangaben können vertraulich bleiben: vor dem Teilen prüfen. Geheimnisse deckend maskieren.

Version 1.5.0 ist im [Chrome Web Store](https://chromewebstore.google.com/detail/modfkdhgnhbfilpfanjginilabajchbe) und auf GitHub veröffentlicht. Paket 1.5.1 wurde zur Google-Prüfung eingereicht; das Dashboard meldet „Prüfung ausstehend“. Während der Prüfung zeigt der öffentliche Eintrag noch Version 1.5.0. Eingereichtes Archiv: `scionos-capture-v1.5.1.zip`, SHA-256 `c9ffb73d1276037c95620b764c19864b94ccf4e7ffb447ec114942cb8c9ef2c9`. GitHub bleibt bei Version 1.5.0.
