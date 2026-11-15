# Scionos Capture 1.5.1

**La 1.5.0 est publiée sur le Chrome Web Store ; la soumission 1.5.1 attend la reconnexion développeur / Version 1.5.0 is published on the Chrome Web Store; 1.5.1 submission awaits developer reauthentication / La 1.5.0 está publicada en Chrome Web Store; el envío 1.5.1 espera la reautenticación del desarrollador / Version 1.5.0 ist im Chrome Web Store veröffentlicht; die Einreichung von 1.5.1 wartet auf die erneute Entwickler-Anmeldung.**

## Français

- Dans le panneau Document, la politique de sources s’applique aux projets et exports : `sanitized` par défaut retire paramètres de requête et fragments, `none` omet les sources et `full` les conserve. Les identifiants HTTP(S) sont toujours retirés. Les sources supprimées à la sauvegarde ne peuvent pas être restaurées ; la bibliothèque exporte toujours en mode `sanitized`, anciens projets compris.
- Les chemins d’URL, images, titres, légendes et dates peuvent encore être sensibles. Diagnostic local sur activation explicite, sans télémétrie ; permissions inchangées.
- Un instantané PNG par image pour les exports et projets ; vignette de bibliothèque générée directement et nettoyage tenant compte d’une impression en cours. Le renommage modifie les métadonnées avec une validation du codec et préserve les PNG.
- Imports PNG/JPEG/WebP : au-delà de 16 millions de pixels ou de 16 384 px par côté, refus avant décodage au lieu d’une réduction. Le cumul de composition reste à 32 millions de pixels. Lecture des projets v1/v2 et écriture v2 conservées.
- La version 1.5.0 est publiée sur le [Chrome Web Store](https://chromewebstore.google.com/detail/modfkdhgnhbfilpfanjginilabajchbe) et sur GitHub. Le paquet 1.5.1 est validé localement. Sa soumission attend la reconnexion au tableau développeur ; il n’a pas encore été téléversé ni envoyé à Google. La disponibilité dépendra ensuite de l’approbation Google. GitHub reste à la version 1.5.0.

## English

- In the Document panel, source policy applies to projects and exports: default `sanitized` removes query parameters and fragments, `none` omits sources and `full` retains them. HTTP(S) credentials are always removed. Sources removed on save cannot be restored; the library always exports using `sanitized`, including older projects.
- URL paths, images, titles, captions and dates may still be sensitive. Local opt-in diagnostics, without telemetry; permissions unchanged.
- One PNG snapshot per image for exports and projects; directly generated library thumbnails and cleanup that accounts for printing in progress. Rename changes metadata with one codec validation and preserves PNGs.
- PNG/JPEG/WebP imports: above 16 million pixels or 16,384 px per side, reject before decoding instead of reducing. The total composition limit remains 32 million pixels. Project v1/v2 reading and v2 writing retained.
- Version 1.5.0 is published on the [Chrome Web Store](https://chromewebstore.google.com/detail/modfkdhgnhbfilpfanjginilabajchbe) and GitHub. Package 1.5.1 is validated locally. Submission awaits developer-dashboard reauthentication; it has not yet been uploaded or sent to Google. Availability will then depend on Google approval. GitHub remains at version 1.5.0.

## Español

- En el panel Documento, la política de fuentes se aplica a proyectos y exportaciones: `sanitized` por defecto elimina parámetros de consulta y fragmentos, `none` omite las fuentes y `full` las conserva. Las credenciales HTTP(S) siempre se eliminan. Las fuentes eliminadas al guardar no se recuperan; la biblioteca siempre exporta con `sanitized`, incluidos los proyectos antiguos.
- Las rutas de URL, imágenes, títulos, leyendas y fechas aún pueden ser sensibles. Diagnóstico local de activación voluntaria, sin telemetría; permisos sin cambios.
- Una instantánea PNG por imagen para exportaciones y proyectos; miniaturas de biblioteca generadas directamente y limpieza que tiene en cuenta una impresión en curso. El cambio de nombre modifica metadatos con una validación del códec y conserva los PNG.
- Importaciones PNG/JPEG/WebP: por encima de 16 millones de píxeles o 16.384 px por lado, rechazo antes de decodificar, en vez de reducir. El límite acumulado sigue en 32 millones de píxeles. Lectura de proyectos v1/v2 y escritura v2 conservadas.
- La versión 1.5.0 está publicada en [Chrome Web Store](https://chromewebstore.google.com/detail/modfkdhgnhbfilpfanjginilabajchbe) y GitHub. El paquete 1.5.1 está validado localmente. El envío espera una nueva autenticación en el panel de desarrollador; todavía no se ha cargado ni enviado a Google. La disponibilidad dependerá luego de la aprobación de Google. GitHub sigue en la versión 1.5.0.

## Deutsch

- Im Bereich Dokument gilt die Quellenrichtlinie für Projekte und Exporte: Standard `sanitized` entfernt Abfrageparameter und Fragmente, `none` lässt Quellen weg und `full` behält sie bei. HTTP(S)-Zugangsdaten werden immer entfernt. Beim Speichern entfernte Quellen sind nicht wiederherstellbar; die Bibliothek exportiert immer mit `sanitized`, auch ältere Projekte.
- URL-Pfade, Bilder, Titel, Bildunterschriften und Datumsangaben können weiterhin vertraulich sein. Lokale, ausdrücklich aktivierte Diagnose ohne Telemetrie; Berechtigungen unverändert.
- Ein PNG-Abbild pro Bild für Exporte und Projekte; direkt erzeugte Bibliotheksvorschaubilder und Bereinigung unter Berücksichtigung laufender Druckvorgänge. Umbenennen ändert Metadaten mit einer Codec-Validierung und behält PNGs bei.
- PNG-/JPEG-/WebP-Importe: über 16 Millionen Pixel oder 16.384 px pro Seite vor dem Dekodieren ablehnen statt verkleinern. Gesamtlimit weiterhin 32 Millionen Pixel. Projekte v1/v2 bleiben lesbar, geschrieben wird v2.
- Version 1.5.0 ist im [Chrome Web Store](https://chromewebstore.google.com/detail/modfkdhgnhbfilpfanjginilabajchbe) und auf GitHub veröffentlicht. Paket 1.5.1 wurde lokal validiert. Die Einreichung wartet auf eine erneute Anmeldung im Entwickler-Dashboard; es wurde noch nicht hochgeladen oder an Google gesendet. Die Verfügbarkeit hängt anschließend von der Genehmigung durch Google ab. GitHub bleibt bei Version 1.5.0.

---

# Scionos Capture 1.5.0

**Version du 14 novembre 2026 / Release dated November 14, 2026 / Versión del 14 de noviembre de 2026 / Version vom 14. November 2026.**

## Français

**Version 1.5.0.** Cette version livre le périmètre suivant.

- **Composition multi-images :** import de fichiers image locaux ou collage depuis le presse-papiers ; ajout, retrait et réordonnancement des images ; disposition verticale ou horizontale, espacement, fond, titres, légendes et étapes numérotées.
- **Exports et présentation :** PNG, JPEG, WebP, HTML, Markdown accompagné des images dans un ZIP, PDF et impression. Qualité d’image réglable pour les formats concernés ; réglages de marges, orientation, échelle et en-têtes/pieds de page avec titre, source, date et pagination, sous réserve des limites de taille.
- **Annotations éditables :** annotations individuellement éditables et `.scionos` v2 rétrocompatible v1, dont les annotations restent aplaties. À la sauvegarde, masques solides et rognages deviennent irréversibles ; les annotations touchées sont supprimées de manière conservative. À la sauvegarde après rognage, toutes les annotations antérieures sont aplaties pour préserver leur rendu et leur ordre.
- **Bibliothèque locale :** enregistrement explicite et durable, vignettes, recherche, renommage, duplication et suppression ; durée 0, 7, 30 ou 90 jours, quota de 64 à 1 024 Mio (256 Mio par défaut). Le choix 0 jour signifie sans expiration automatique.
- **Aide et version :** accès à l’aide plus visible et affichage du numéro de version réellement chargé.
- Le traitement reste local. Les fichiers exportés et projets sont conservés par l’utilisateur et peuvent contenir images, titres, légendes, sources et dates : vérifiez-les avant partage. Utilisez un masque solide pour les secrets.

## English

**Version 1.5.0.** This release delivers the following scope.

- **Multi-image composition:** import local image files or paste from the clipboard; add, remove, and reorder images; vertical or horizontal layout, spacing, background, titles, captions, and numbered steps.
- **Exports and presentation:** PNG, JPEG, WebP, HTML, Markdown with images in a ZIP, PDF, and printing. Adjustable image quality for the applicable formats; margins, orientation, scale, and headers/footers with title, source, date, and pagination, subject to size limits.
- **Editable annotations:** individually editable annotations and `.scionos` v2 backward compatible with v1, whose annotations remain flattened. On saving, solid masks and crops become irreversible; affected annotations are conservatively removed. When saving after a crop, all preceding annotations are flattened to preserve their appearance and order.
- **Local library:** explicitly saved durable projects, thumbnails, search, rename, duplicate and delete; retention 0, 7, 30 or 90 days, quota 64–1,024 MiB (default 256 MiB). 0 days means no automatic expiration.
- **Help and version:** more visible help access and display of the version actually loaded.
- Processing remains local. Users retain exported files and projects, which may contain images, titles, captions, sources, and dates: review them before sharing. Use a solid mask for secrets.

## Español

**Versión 1.5.0.** Esta versión entrega el siguiente alcance.

- **Composición de varias imágenes:** importar archivos de imagen locales o pegar desde el portapapeles; añadir, eliminar y reordenar imágenes; disposición vertical u horizontal, espaciado, fondo, títulos, leyendas y pasos numerados.
- **Exportación y presentación:** PNG, JPEG, WebP, HTML, Markdown con imágenes en un ZIP, PDF e impresión. Calidad ajustable en los formatos correspondientes; márgenes, orientación, escala y encabezados/pies con título, fuente, fecha y paginación, sujetos a límites de tamaño.
- **Anotaciones editables:** anotaciones editables individualmente y `.scionos` v2 compatible con v1, cuyas anotaciones permanecen aplanadas. Al guardar, las máscaras sólidas y los recortes son irreversibles; las anotaciones afectadas se eliminan de forma conservadora.
- **Biblioteca local:** guardado explícito y duradero, miniaturas, búsqueda, cambio de nombre, duplicación y eliminación; duración 0, 7, 30 o 90 días, cuota de 64 a 1.024 MiB (256 MiB por defecto). 0 días significa sin expiración automática.
- **Ayuda y versión:** acceso más visible a la ayuda y visualización de la versión realmente cargada.
- El procesamiento sigue siendo local. El usuario conserva archivos exportados y proyectos, que pueden contener imágenes, títulos, leyendas, fuentes y fechas: revísalos antes de compartirlos. Usa una máscara sólida para secretos.

## Deutsch

**Version 1.5.0.** Diese Version liefert den folgenden Umfang.

- **Komposition mehrerer Bilder:** lokale Bilddateien importieren oder aus der Zwischenablage einfügen; Bilder hinzufügen, entfernen und umordnen; vertikale oder horizontale Anordnung, Abstand, Hintergrund, Titel, Bildunterschriften und nummerierte Schritte.
- **Exporte und Darstellung:** PNG, JPEG, WebP, HTML, Markdown samt Bildern in einer ZIP-Datei, PDF und Drucken. Einstellbare Bildqualität für die entsprechenden Formate; Ränder, Ausrichtung, Skalierung und Kopf-/Fußzeilen mit Titel, Quelle, Datum und Seitennummerierung, innerhalb der Größenlimits.
- **Bearbeitbare Annotationen:** einzeln bearbeitbare Annotationen und `.scionos` v2, rückwärtskompatibel zu v1, dessen Annotationen zusammengeführt bleiben. Deckende Masken und Zuschnitte werden beim Speichern unumkehrbar angewendet; betroffene Annotationen werden konservativ entfernt.
- **Lokale Bibliothek:** ausdrückliches dauerhaftes Speichern, Vorschaubilder, Suche, Umbenennen, Duplizieren und Löschen; Aufbewahrung 0, 7, 30 oder 90 Tage, Kontingent 64–1.024 MiB (Standard 256 MiB). 0 Tage bedeutet keine automatische Ablaufzeit.
- **Hilfe und Version:** besser sichtbarer Hilfezugang und Anzeige der tatsächlich geladenen Version.
- Die Verarbeitung bleibt lokal. Benutzer bewahren exportierte Dateien und Projekte auf; sie können Bilder, Titel, Bildunterschriften, Quellen und Datumsangaben enthalten: vor dem Teilen prüfen. Geheimnisse deckend maskieren.

## Validation 1.5.0 / 1.5.0 validation status

Les contrôles automatisés et essais natifs associés à la publication sont consignés dans le dépôt ; la soumission au Chrome Web Store reste distincte de la release GitHub.

Automated checks and native trials for this release are recorded in the repository; Chrome Web Store submission remains separate from the GitHub release.

Las comprobaciones automatizadas y las pruebas nativas de esta versión constan en el repositorio; el envío a Chrome Web Store sigue siendo independiente de la release de GitHub.

Automatisierte Prüfungen und native Tests dieser Version sind im Repository dokumentiert; die Einreichung im Chrome Web Store bleibt von der GitHub-Veröffentlichung getrennt.

---

# Scionos Capture 1.4.0

**Version 1.4.0 — 2026-11-10.**

## Français

- **Élément au clic :** survolez un bloc, choisissez au besoin son parent ou son enfant, puis cliquez pour préparer la capture. La partie affichée est choisie par défaut ; le contenu entier est disponible pour les conteneurs réellement défilants.
- **Sélection ajustable :** après le tracé ou le choix d’un élément, ajustez les huit poignées ou les champs X/Y/largeur/hauteur, puis confirmez avec **Capturer**. Les flèches déplacent la sélection ou une poignée ; Maj augmente le pas de 1 à 10 pixels CSS. Échap annule.
- **Capture différée :** choisissez **Immédiat**, **3**, **5** ou **10 secondes**. Le délai est mémorisé localement. Il commence après confirmation pour les sélections et les éléments, dès le lancement pour la zone visible et la page entière. Le compte à rebours est annulable.
- **Fils dynamiques :** une sélection bornée tolère l’ajout de contenu en bas de page. Le correctif a été développé après reproduction sur X.com et vérifié par tests automatisés ; le fonctionnement après correction a été confirmé par l’utilisateur sur X.com, y compris après correction du bandeau cookies répété.
- Les cinq modes restent locaux, sans nouvelle permission ni transmission de capture. Le sélecteur ne parcourt pas l’intérieur des iframes ni les shadow roots fermés ; les contenus virtualisés peuvent rester incomplets. Le flou est visuel : utilisez un masque solide pour les secrets.

## English

**Version 1.4.0 — 2026-11-10.**

- **Element capture:** hover over a block, optionally choose its parent or child, then click to prepare the capture. The displayed portion is the default; entire content is available for genuinely scrollable containers.
- **Adjustable selection:** after drawing or choosing an element, adjust eight handles or the X/Y/width/height fields and confirm with **Capture**. Arrow keys move the selection or a handle; Shift changes the step from 1 to 10 CSS pixels. Escape cancels.
- **Delayed capture:** choose **Immediate**, **3**, **5**, or **10 seconds**. The preference is stored locally. The delay starts after confirmation for selections and elements, immediately after launch for visible-area and full-page captures. The countdown can be cancelled.
- **Dynamic feeds:** bounded selections tolerate content appended below the page. The fix follows reproduction on X.com and automated regression tests; the user confirmed operation on X.com after updating, including the repeated cookie-banner fix.
- All five modes remain local, without new permissions or screenshot transfer. The picker does not traverse iframe contents or closed shadow roots; virtualized content may remain incomplete. Blur is visual only: use a solid mask for secrets.

## Español

**Versión 1.4.0 — 2026-11-10.**

- **Captura de elementos:** pasa el cursor sobre un bloque, elige su padre o hijo si hace falta y haz clic para preparar la captura. La parte mostrada es la opción predeterminada; el contenido completo está disponible para contenedores realmente desplazables.
- **Selección ajustable:** tras dibujar o elegir un elemento, ajusta los ocho tiradores o los campos X/Y/ancho/alto y confirma con **Capturar**. Las flechas mueven la selección o un tirador; Mayús cambia el paso de 1 a 10 píxeles CSS. Escape cancela.
- **Captura diferida:** elige **Inmediato**, **3**, **5** o **10 segundos**. La preferencia se guarda localmente. El retardo comienza tras confirmar zonas y elementos, o al iniciar capturas visibles y completas. La cuenta atrás se puede cancelar.
- **Contenidos dinámicos:** las selecciones acotadas toleran contenido añadido al final de la página. La corrección se basa en una reproducción en X.com y pruebas automatizadas; el usuario confirmó el funcionamiento en X.com tras actualizar, incluida la corrección del aviso de cookies repetido.
- Los cinco modos siguen siendo locales, sin nuevos permisos ni transferencia de capturas. El selector no recorre iframes ni shadow roots cerrados; el contenido virtualizado puede quedar incompleto. El desenfoque es visual: usa una máscara sólida para secretos.

## Deutsch

**Version 1.4.0 — 2026-11-10.**

- **Elementaufnahme:** einen Block mit der Maus hervorheben, bei Bedarf das über- oder untergeordnete Element wählen und per Klick die Aufnahme vorbereiten. Standardmäßig wird der angezeigte Teil aufgenommen; der gesamte Inhalt ist für tatsächlich scrollbare Container verfügbar.
- **Anpassbare Auswahl:** nach dem Zeichnen oder der Elementwahl acht Griffe oder X/Y/Breite/Höhe anpassen und mit **Aufnehmen** bestätigen. Pfeiltasten verschieben die Auswahl oder einen Griff; Umschalt erhöht den Schritt von 1 auf 10 CSS-Pixel. Escape bricht ab.
- **Verzögerte Aufnahme:** **Sofort**, **3**, **5** oder **10 Sekunden** wählen. Die Einstellung wird lokal gespeichert. Bei Auswahl und Elementen beginnt die Verzögerung nach Bestätigung, bei sichtbarem Bereich und ganzer Seite beim Start. Der Countdown kann abgebrochen werden.
- **Dynamische Feeds:** begrenzte Auswahlen tolerieren am Seitenende hinzugefügten Inhalt. Die Korrektur basiert auf einer Reproduktion auf X.com und automatisierten Tests; der Nutzer bestätigte die Funktion auf X.com nach der Aktualisierung, einschließlich der Korrektur des wiederholten Cookie-Banners.
- Alle fünf Modi arbeiten lokal, ohne neue Berechtigungen oder Übertragung von Aufnahmen. Die Elementauswahl durchsucht weder iframe-Inhalte noch geschlossene Shadow Roots; virtualisierte Inhalte können unvollständig bleiben. Unschärfe ist nur visuell: Geheimnisse deckend maskieren.

## Validation / Validation status

Les tests automatisés et essais natifs sont consignés séparément lors de la préparation du livrable final. La soumission au Chrome Web Store reste distincte de la release GitHub.

Automated checks and native browser trials are recorded separately when the final local package is prepared. Chrome Web Store submission is separate from the GitHub release.

Archive locale / Local archive : `scionos-capture-v1.5.0.zip` · SHA-256 : `scionos-capture-v1.5.0.zip.sha256`.
