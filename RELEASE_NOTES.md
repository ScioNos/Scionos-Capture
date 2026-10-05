# Scionos Capture 1.3.3

**Date de version : 5 octobre 2026 (2026-10-05).**

## Français

**1.3.3 — 2026-10-05**

- Captures : assemblage rectangulaire commun, sélection horizontale sans étirement, coordonnées corrigées pour les conteneurs translatés ou mis à l’échelle ; transformations complexes refusées explicitement.
- Sélection : défilement automatique aux bords du conteneur choisi, largeur et origine horizontale verrouillées dans le mode vertical, surcouches utilisables au-dessus des dialogues modaux.
- Assemblage : pied de page fixe conservé intégralement lorsque la dernière tranche est plus courte ; restauration après annulation et réponses tardives ignorées.
- Confidentialité : texte recouvert par un descendant exclu du PDF ; masque libre continu, y compris entre points éloignés et lors d’un simple clic.
- Exports : validation ou annulation obligatoire des modifications en attente ; pixels et métadonnées issus de la même révision pour PNG, HTML, copie et PDF.
- HTML : image incorporée une seule fois, contrôle de taille en octets, défilement des longues images et zoom 100 % corrigés ; extraction textuelle arrêtée au plafond de 1 500 blocs.
- Maintenance : version 1.3.3 distincte des téléchargements publiés, synchronisation `--unreleased`, vérification des Markdown et régressions sur pixels réels, PDF et quatre DPR.

## English

**1.3.3 — 2026-10-05**

- Capture: shared rectangular stitching, horizontal selections without stretching, correct coordinates for translated or scaled containers; unsupported complex transforms fail explicitly.
- Selection: auto-scroll at the selected container edges, locked horizontal origin and width in vertical mode, overlays usable above modal dialogs.
- Stitching: retain the complete fixed footer when the final strip is shorter; restore state after cancellation and ignore late responses.
- Privacy: omit text covered by descendants from searchable PDFs; continuous freehand masks across distant points and single clicks.
- Exports: apply or cancel pending edits before exporting; PNG, HTML, clipboard and PDF use pixels and metadata from the same revision.
- HTML: embed the image once, check the final byte size, fix long-image scrolling and 100% zoom; stop text extraction at 1,500 blocks.
- Maintenance: separate version 1.3.3 from published downloads, add `--unreleased` synchronization, verify Markdown, and add real-pixel, PDF and four-DPR regressions.

## Español

**1.3.3 — 2026-10-05**

- Capturas: ensamblado rectangular común, selecciones horizontales sin estiramiento y coordenadas correctas en contenedores trasladados o escalados; rechazo explícito de transformaciones complejas no compatibles.
- Selección: desplazamiento automático en los bordes del contenedor elegido, origen horizontal y ancho bloqueados en el modo vertical, selección sobre diálogos modales.
- Ensamblado: pie fijo completo incluso si el último fragmento es más corto; restauración al cancelar y respuestas tardías ignoradas.
- Privacidad: texto cubierto por descendientes omitido del PDF; máscaras libres continuas entre puntos distantes y con un solo clic.
- Exportaciones: aplicar o cancelar cambios pendientes antes de exportar; PNG, HTML, portapapeles y PDF usan píxeles y metadatos de la misma revisión.
- HTML: imagen integrada una sola vez, tamaño final verificado en bytes, desplazamiento de imágenes largas y zoom 100 % corregidos; extracción limitada a 1.500 bloques.
- Mantenimiento: versión 1.3.3 separada de las descargas publicadas, sincronización `--unreleased`, revisión de Markdown y regresiones con píxeles reales, PDF y cuatro DPR.

## Deutsch

**1.3.3 — 2026-10-05**

- Aufnahmen: gemeinsame rechteckige Kachelzusammensetzung, horizontale Auswahl ohne Streckung, korrekte Koordinaten für verschobene oder skalierte Container; explizite Ablehnung komplexer Transformationen.
- Auswahl: automatisches Scrollen an den Rändern des gewählten Containers, feste horizontale Position und Breite im vertikalen Modus, Auswahl über modalen Dialogen.
- Zusammensetzung: vollständige feste Fußzeile auch bei kürzerem letzten Abschnitt; Zustand nach Abbruch wiederhergestellt und verspätete Antworten ignoriert.
- Datenschutz: durch Nachfahren verdeckten Text aus PDFs entfernen; durchgehende freie Maskierung zwischen entfernten Punkten und bei einzelnen Klicks.
- Exporte: ausstehende Änderungen vor Export übernehmen oder verwerfen; PNG, HTML, Zwischenablage und PDF verwenden Bild und Metadaten derselben Revision.
- HTML: Bild nur einmal einbetten, endgültige Byte-Größe prüfen, Scrollen langer Bilder und 100-%-Zoom korrigieren; Textextraktion bei 1.500 Blöcken beenden.
- Wartung: Version 1.3.3 von veröffentlichten Downloads trennen, `--unreleased`-Synchronisierung, Markdown-Prüfung sowie Regressionen mit echten Pixeln, PDF und vier DPR.

Archive ZIP / ZIP archive : `scionos-capture-v1.3.3.zip` · SHA-256 : `scionos-capture-v1.3.3.zip.sha256`.

Validation locale : `npm run verify` sous Node.js 24 — 59 tests unitaires et 68 tests E2E Chromium réussis. Archive de 29 fichiers et SHA-256 vérifié. La CI couvre également les contrôles principaux sous Node.js 20 et les régressions Windows.
