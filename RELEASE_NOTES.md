# Scionos Capture 1.3.0

## Français

La version 1.3.0 apporte des avancées majeures inspirées des meilleurs outils du web (FireShot, PrintFriendly, SingleFile) :

- **Sélection avec défilement automatique (*Drag-to-scroll*)** : lorsque vous étirez votre zone de capture vers les bordures de l’écran, la page défile automatiquement et de manière fluide. La capture bascule en assemblage multi-tuiles haute résolution si la sélection dépasse l'écran visible.
- **PDF avec texte indexable et hyperliens cliquables** : l'export PDF intègre une couche de texte vectoriel transparent superposée au pixel près. Le document obtenu est entièrement indexable dans vos lecteurs PDF, permet la recherche textuelle (`Ctrl+F`), la copie du texte et la navigation via les hyperliens `<a>` originaux.
- **Protection de la vie privée lors de la censure** : tout bloc de texte situé sous une zone censurée (masquage opaque ou flou) est automatiquement purgé de la couche indexable du PDF afin qu'aucun secret ne puisse être recherché ni copié.
- **Palette d’annotation enrichie** : nouveaux outils professionnels dans l'éditeur :
  - **Flèches vectorielles** (`A`) avec pointe proportionnelle orientée.
  - **Formes géométriques** (`S`) : rectangles et ellipses en mode contour ou remplissage.
  - **Texte annoté** (`T`) : saisie directe sur le canevas avec fond contrasté personnalisable.
  - **Pastilles d’étape numérotées** (`P`) : badges 1, 2, 3... auto-incrémentés avec bouton de réinitialisation pour documenter des tutoriels et procédures pas à pas.
- **Page d'aide et guide d'utilisation hors-ligne** (`help.html`) : accessible instantanément via le bouton `?` dans la popup et l'éditeur, détaillant les modes de capture, les formats d'export, les raccourcis clavier et l'engagement 100 % local sans télémétrie.
- **Résolution du raccourci clavier & conformité Manifest V3** : prise en charge hybride (Promise et callback) pour l'API `chrome.commands.getAll` éliminant le faux affichage « Non configuré » dans la popup, et alignement strict de `_execute_action` sur la spécification MV3.

Téléchargez `scionos-capture-v1.3.0.zip`, vérifiez le fichier SHA-256, extrayez-le puis chargez le dossier dans Chrome ou Edge.

## English

Version 1.3.0 brings major enhancements inspired by the web's best capture tools (FireShot, PrintFriendly, SingleFile):

- **Selection with Continuous Auto-Scroll (*Drag-to-scroll*)**: When dragging selection borders toward the screen edges, the page scrolls automatically and smoothly, capturing multi-tile high-resolution stitched regions beyond the visible viewport.
- **Searchable PDF with Text and Clickable Links**: Native PDF printing now overlays a transparent vector text layer precisely mapped to captured DOM text and `<a>` links. Exported PDFs support full-text search (`Ctrl+F`), text selection/copying, and clickable web links.
- **Privacy Guarantee on Censor**: Any text underlying solid censor blocks or blur regions is automatically pruned from the PDF text layer to guarantee sensitive information cannot be searched or copied.
- **Enriched Annotation Palette**:
  - **Vector Arrows** (`A`) with directional arrowheads.
  - **Geometric Shapes** (`S`): Rectangles and ellipses with stroke or solid fill styles.
  - **Text Annotations** (`T`): Inline text placement with customizable background contrast.
  - **Numbered Step Badges** (`P`): Auto-incrementing 1, 2, 3... step badges with quick reset for bug reports and guides.
- **Built-in Offline Help & User Guide** (`help.html`): Accessible directly via the `?` button in both the popup and editor, outlining capture workflows, shortcuts, and 100% local privacy architecture.
- **Keyboard Shortcut Resolution & Manifest V3 Compliance**: Hybrid Promise and callback handling for `chrome.commands.getAll` resolving the false "Not configured" state in the popup, and strict alignment of `_execute_action` with the MV3 specification.

Download `scionos-capture-v1.3.0.zip`, verify the SHA-256 file, extract it, and load the folder in Chrome or Edge.

## Español

La versión 1.3.0 incorpora mejoras esenciales inspiradas en las mejores herramientas web (FireShot, PrintFriendly, SingleFile):

- **Selección con desplazamiento automático continuo**: al arrastrar el área de captura hacia los bordes de la pantalla, la página se desplaza suavemente de forma continua para capturar áreas más allá del área visible mediante ensamblado de múltiples teselas.
- **PDF con texto indexable e hipervínculos**: la exportación a PDF incluye una capa de texto transparente superpuesta con precisión que permite búsqueda con `Ctrl+F`, selección/copia de texto y navegación con enlaces web activos.
- **Privacidad estricta al censurar**: el texto cubierto por censura sólida o desenfoque se elimina automáticamente de la capa del PDF para proteger secretos y contraseñas.
- **Paleta de anotación enriquecida**: flechas vectoriales (`A`), formas geométricas (`S`), texto anotado (`T`) y distintivos de paso numerados (`P`) 1, 2, 3... auto-incrementales.
- **Página de ayuda integrada y sin conexión** (`help.html`): accesible desde el botón `?` en el popup y el editor con guía de uso completa y lista de atajos.
- **Resolución del atajo de teclado y conformidad con Manifest V3**: soporte híbrido (Promise y callback) para `chrome.commands.getAll` que soluciona el falso estado «No configurado» en el popup, y alineación estricta de `_execute_action` con la especificación MV3.

Descarga `scionos-capture-v1.3.0.zip`, comprueba el archivo SHA-256 y cárgalo en Chrome o Edge.

## Deutsch

Version 1.3.0 bringt wichtige Neuerungen, inspiriert von den besten Web-Werkzeugen (FireShot, PrintFriendly, SingleFile):

- **Auswahl mit kontinuierlichem automatischem Scrollen**: Beim Ziehen der Bereichskanten an die Bildschirmränder scrollt die Seite gleichmäßig weiter und erfasst auch über den Bildschirm hinausgehende Bereiche per hochauflösendem Kachel-Stitching.
- **Durchsuchbares PDF mit Text und anklickbaren Hyperlinks**: Beim PDF-Druck wird eine transparente Vektor-Textebene pixelgenau über das Bild gelegt. PDFs unterstützen `Strg+F`-Volltextsuche, Textkopieren und anklickbare Web-Links.
- **Datenschutz bei Zensur**: Text unter soliden Zensurbalken oder Unschärfebereichen wird automatisch aus der PDF-Textebene entfernt, damit vertrauliche Informationen nicht auffindbar sind.
- **Erweiterte Anmerkungspalette**: Vektorpfeile (`A`), geometrische Formen (`S`), Textnotizen (`T`) und automatisch hochzählende nummerierte Schrittmarken (`P`) 1, 2, 3... mit Schnell-Zurücksetzung.
- **Integrierte Offline-Hilfeseite** (`help.html`): Direkt über die `?`-Schaltfläche in Popup und Editor erreichbar mit vollständigem Benutzerhandbuch und Tastaturkürzeln.
- **Tastaturkürzel-Erkennung & Manifest V3-Konformität**: Hybride Promise- und Callback-Verarbeitung für `chrome.commands.getAll` zur Behebung der falschen Anzeige „Nicht konfiguriert“ im Popup sowie strikte Anpassung von `_execute_action` an die MV3-Spezifikation.

Laden Sie `scionos-capture-v1.3.0.zip` herunter, prüfen Sie die SHA-256-Datei und laden Sie den Ordner in Chrome oder Edge.
