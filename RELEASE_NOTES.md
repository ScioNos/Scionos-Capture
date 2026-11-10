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

Archive locale / Local archive : `scionos-capture-v1.4.0.zip` · SHA-256 : `scionos-capture-v1.4.0.zip.sha256`.
