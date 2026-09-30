# Scionos Capture 1.3.2

## Français

- Coordonnées CSS, conteneurs et pixels unifiées ; sélection avec défilement automatique de la page rétablie ; métadonnées textuelles ajustées au DPR et aux réductions.
- Assemblage sans réécriture des portions déjà capturées ; éléments fixes et collants réévalués à chaque tuile, y compris après changement de position ou apparition hors écran.
- PDF : texte collecté par tuile, exclusions des mots recouverts, invisibles ou partiellement rognés ; rognage et masquage alignés sur les pixels ; anciens calques aux coordonnées non vérifiables omis.
- Éditeur : URL longue contenue, ajustement à la largeur disponible, champ Texte conservant le focus, annulation native des champs, compteur des pastilles après rétablissement et consolidation asynchrone de l’historique corrigés.
- Captures conservées tant que leur éditeur est ouvert, supprimées à sa fermeture ; expiration des orphelins et transferts abandonnés ; associations reconstituées au réveil.
- Délais de stabilisation et de collecte textuelle bornés ; dépendances transitives corrigées ; tests sur pixels réels, quatre facteurs d’échelle et extraction effective de PDF.

La couche recherchable du PDF conserve uniquement les mots complets dont la visibilité est vérifiable. Les mots incertains sont omis de cette couche ; l’image capturée est conservée. Les anciens calques aux coordonnées non vérifiables sont également omis. Le masquage solide reste nécessaire pour protéger les pixels confidentiels ; le flou est seulement visuel.

## English

- Unified CSS, container and bitmap coordinates; restored document auto-scroll selection; scaled text metadata for DPR and image reductions.
- Assembly no longer overwrites captured areas; fixed and sticky elements are reassessed on each tile, including position changes and initially offscreen elements.
- PDF: collect text per tile; omit covered, invisible and partially cropped words; align cropping and censorship with bitmap pixels; omit legacy layers with unverified coordinates.
- Editor: contain long URLs, fit the available width, preserve text-input focus and native input undo, advance step numbers after redo, and protect asynchronous history consolidation.
- Keep captures while their editor remains open and delete them on closure; expire orphans and abandoned transfers; reconstruct associations when the worker wakes.
- Bound stabilization and text-collection budgets; patch transitive dependencies; add real-pixel tests, four scaling factors and extraction from generated PDFs.

The searchable PDF layer retains only complete words whose visibility can be verified. Uncertain words are omitted from that layer while the captured image is preserved. Legacy layers with unverified coordinates are also omitted. Use solid censorship to protect confidential pixels; blur is only a visual effect.

## Español

- Coordenadas CSS, del contenedor y de la imagen unificadas; selección con desplazamiento automático de la página corregida; metadatos de texto ajustados al DPR y a las reducciones.
- El ensamblado ya no sobrescribe las partes capturadas; elementos fijos y adherentes reevaluados en cada tesela, incluidos cambios de posición y elementos inicialmente fuera de pantalla.
- PDF: texto recopilado por tesela; palabras cubiertas, invisibles o parcialmente recortadas omitidas; recorte y censura alineados con los píxeles; capas antiguas con coordenadas no verificadas omitidas.
- Editor: URL largas contenidas, ajuste al ancho disponible, foco de texto conservado, deshacer nativo en campos, numeración tras rehacer y consolidación asíncrona del historial corregidos.
- Capturas conservadas mientras el editor permanece abierto y eliminadas al cerrarlo; caducidad de capturas huérfanas y transferencias abandonadas; asociaciones reconstruidas al despertar.
- Tiempos de estabilización y recopilación de texto limitados; dependencias transitivas corregidas; pruebas con píxeles reales, cuatro escalas y extracción de PDF generados.

La capa de búsqueda del PDF conserva solo palabras completas cuya visibilidad puede verificarse. Las palabras inciertas se omiten de esa capa y se conserva la imagen capturada. También se omiten las capas antiguas con coordenadas no verificadas. Usa censura sólida para proteger píxeles confidenciales; el desenfoque es solo visual.

## Deutsch

- CSS-, Container- und Bildkoordinaten vereinheitlicht; Auswahl mit automatischem Seitenscrollen korrigiert; Textmetadaten an DPR und Bildverkleinerungen angepasst.
- Bereits erfasste Bereiche werden nicht mehr überschrieben; feste und haftende Elemente werden pro Kachel neu bewertet, einschließlich Positionsänderungen und zunächst unsichtbarer Elemente.
- PDF: Text pro Kachel erfasst; verdeckte, unsichtbare und teilweise abgeschnittene Wörter ausgelassen; Zuschnitt und Maskierung an Bildpixeln ausgerichtet; ältere Ebenen mit ungeprüften Koordinaten ausgelassen.
- Editor: lange URLs begrenzt, Anpassung an verfügbare Breite, Texteingabefokus und natives Rückgängigmachen erhalten, Schrittzähler nach Wiederherstellung und asynchrone Verlaufskonsolidierung korrigiert.
- Aufnahmen bleiben bei geöffnetem Editor erhalten und werden beim Schließen gelöscht; verwaiste Aufnahmen und abgebrochene Übertragungen laufen ab; Zuordnungen werden beim Aufwachen wiederhergestellt.
- Zeitbudgets für Stabilisierung und Texterfassung begrenzt; transitive Abhängigkeiten aktualisiert; Tests mit echten Pixeln, vier Skalierungen und Textextraktion aus erzeugten PDFs ergänzt.

Die durchsuchbare PDF-Ebene enthält nur vollständige Wörter mit überprüfbarer Sichtbarkeit. Unsichere Wörter werden aus dieser Ebene ausgelassen; das aufgenommene Bild bleibt erhalten. Ältere Ebenen mit ungeprüften Koordinaten werden ebenfalls ausgelassen. Vertrauliche Pixel müssen deckend maskiert werden; Unschärfe ist nur ein visueller Effekt.

ZIP: `scionos-capture-v1.3.2.zip` · SHA-256: `scionos-capture-v1.3.2.zip.sha256`.
