# Änderungsprotokoll

[Français](CHANGELOG.md) · [English](CHANGELOG.en.md) · [Español](CHANGELOG.es.md) · [Deutsch](CHANGELOG.de.md)

## [Unveröffentlicht]

## [1.3.2] - 2026-09-30

### Behoben

- CSS-, Container- und Bildkoordinaten vereinheitlicht; Auswahl mit automatischem Seitenscrollen korrigiert; Textmetadaten an DPR und Bildverkleinerungen angepasst.
- Bereits erfasste Bereiche werden nicht mehr überschrieben; feste und haftende Elemente werden pro Kachel neu bewertet, einschließlich Positionsänderungen und zunächst unsichtbarer Elemente.
- PDF: Text pro Kachel erfasst; verdeckte, unsichtbare und teilweise abgeschnittene Wörter ausgelassen; Zuschnitt und Maskierung an Bildpixeln ausgerichtet; ältere Ebenen mit ungeprüften Koordinaten ausgelassen.
- Editor: lange URLs begrenzt, Anpassung an verfügbare Breite, Texteingabefokus und natives Rückgängigmachen erhalten, Schrittzähler nach Wiederherstellung und asynchrone Verlaufskonsolidierung korrigiert.
- Aufnahmen bleiben bei geöffnetem Editor erhalten und werden beim Schließen gelöscht; verwaiste Aufnahmen und abgebrochene Übertragungen laufen ab; Zuordnungen werden beim Aufwachen wiederhergestellt.

### Wartung und Validierung

- Zeitbudgets für Stabilisierung und Texterfassung begrenzt; transitive Abhängigkeiten aktualisiert; Tests mit echten Pixeln, vier Skalierungen und Textextraktion aus erzeugten PDFs ergänzt.

## [1.3.1] - 2026-09-28

### Hinzugefügt

- Halbtransparentes Textmarker-Werkzeug (`H`) im Editor mit Tastenkürzel, integrierter Hilfe und Übersetzungen.
- Automatische Aufteilung und Paginierung langer Aufnahmen für Druck/PDF mit wiederholten Kopfzeilen und durchsuchbarer Textebene je Seite.
- Automatisches Scrollen auf interne Scrollcontainer erweitert mit Kachelzusammensetzung.
- Lokale standardisierte `JJJJ-MM-TT_HH-mm`-Exportzeitstempel.

### Behoben

- Durchsuchbare PDF-Textebene: Blöcke aus `<a>`-Links werden wieder als anklickbare Hyperlinks exportiert (Feld `url` wird berücksichtigt).
- Scrollende Auswahl: Eine schmale Auswahl (Breite oder Höhe > 10 px) wird nun beim Loslassen bestätigt.
- Internationalisierung: Der Schlüssel `statusZone` ist im Nachrichtenpaket enthalten (Overlay-Beschriftung für Screenreader).
- Hilfe: Tastenkürzel des Form-Werkzeugs korrigiert (`S` statt `R`).
- Editor: Neuladen behält die Aufnahme (Bestätigung löscht das Bild nicht mehr; Bereinigung beim Schließen oder Ablauf).
- Druck/PDF: Nicht-HTTP(S)-Quell-URLs erscheinen als einfacher Text statt leerem Link.
- Popup: Fehler beim Öffnen der Tastenkürzel-Seite werden nun angezeigt.
- Verlauf: Glättung nach 100 Vorgängen erhält die Textebene; Rückgängigmachen einer Marke stellt den Zähler wieder her.
- Dateinamen: Kürzung an Codepoint-Grenzen (Emojis erhalten); Texthintergrund-Optionen und HTML-Berichtsfehler in allen 4 Sprachen übersetzt.

### Geändert & Leistung

- Kachel-Robustheit: Wiederholungen mit Backoff bei `captureVisibleTab`-Limitierung (Tabwechsel werden nicht wiederholt).
- Leistung: Anker-Klassifizierung pro Versuch zwischengespeichert, Layout-Vorfilter vor Stilberechnung, deduplizierte Container-Scans.
- Textextraktion: echte Sichtbarkeit per `checkVisibility` (vererbte Opazität beachtet).
- Speicherung: tatsächlich begrenzter LRU-IndexedDB-Cache.
- Wartung: Einzige gemeinsame Dateiliste für Paketierung und Validierung; Speicher-Cache nicht mehr öffentlich.

## [1.3.0] - 2026-09-25

### Hinzugefügt

- Kontinuierliches automatisches Scrollen (*drag-to-scroll*) bei Bereichsauswahl mit der Maus zur unterbrechungsfreien Aufnahme über den sichtbaren Bereich hinaus per Kachelzusammensetzung.
- Durchsuchbarer PDF-Export mit transparenter Vektor-Textebene (`Strg+F`), auswählbarem Text und anklickbaren `<a>`-Links.
- Automatisches Entfernen von Textblöcken unter zensierten Bereichen (Vollton oder Weichzeichner) zur Wahrung der Privatsphäre im exportierten PDF.
- Vektor-Anmerkungspalette : Richtungspfeile (`tool-arrow`), Rechteck- und Kreisformen (`tool-shape`), Textanmerkungen (`tool-text`) und nummerierte Schrittmarken (`tool-step`) 1, 2, 3... mit Zurücksetzen-Taste.
- Integriertes Offline-Benutzerhandbuch und Hilfeseite (`help.html`), erreichbar über die `?`-Schaltfläche in Popup und Editor.
- Zusätzliche Tastaturkürzel im Editor: `A` (Pfeil), `S` (Form), `T` (Text), `P` (Schritt).
- Erweiterte Testabdeckung: 36 Unit-Tests und 14 End-to-End-Tests (Playwright E2E).

### Behoben

- Zuverlässige Erkennung des Tastaturkürzels im Popup: Hybride Unterstützung von Promise und Callback für `chrome.commands.getAll`, wodurch der fehlerhafte Status „Nicht konfiguriert“ bei aktivem `Alt+Shift+C` behoben wird.
- Manifest V3-Konformität: Ungültiger Schlüssel `description` unter `_execute_action` in `manifest.json` entfernt.
- Vollständiges Veröffentlichungsarchiv: Garantierte Aufnahme von `help.html` und `help.js` im ZIP-Archiv mit verstärkter Validierungsprüfung.
- Editor-Leistung: Beseitigung unnötiger Canvas-Größenänderungen bei jedem Rendern zur Vermeidung von Kontext-Resets bei großen Aufnahmen.
- Atomare Versionssynchronisierung: Strikte Vorab-Prüfung von `package-lock.json` vor dem Schreiben von Dateien auf die Festplatte.
- Strengere PNG-Validierung: Vollständige 8-Byte-Signatur und `IHDR`-Header-Prüfung vor dem Auslesen der Bildabmessungen.
- Editor-Barrierefreiheit: Tastatur-Fokussierbarkeit für die scrollbare Werkzeugleiste hinzugefügt (`tabindex="0"`).
- Zuverlässigkeit beim Zeichnen: Garantiertes Bereinigen des Zeigerzustands bei `lostpointercapture` und `pointercancel`.

### Geändert

- Modulare interne Umstrukturierung der Aufnahme- (`content-dom.js`, `content-transfer.js`, `content-capture.js`) und Editor-Skripte (`editor-operations.js`, `editor-export.js`) zur besseren Wartbarkeit ohne funktionale Änderungen.

## [1.2.0] - 2026-09-22

### Hinzugefügt

- Standard-Tastaturkürzel auf `Alt+Shift+C` aktualisiert mit Direktlink zur Tastaturkürzel-Verwaltung im Popup.
- Bereichsauswahl per Ziehen mit Schnellaktion „Bis ganz nach unten“ zum sofortigen Erweitern bis zum Containerende.
- Automatische Dateinamen inklusive Seitentitel und präzisem Zeitstempel.
- Mehrseitiger A4/PDF-Druck mit sauberem seitenweisen Bildzuschnitt.
- IndexedDB-Speichercaching (LRU) und Ping-Injektionssonde zur Vermeidung überflüssiger Skriptinjektionen.
- Versionssynchronisierungsskripte, strikte Paketvalidierung und Playwright-Caching in CI.

### Behoben

- Dynamisches Ausblenden stationärer Eingabeleisten (z. B. ChatGPT, Claude, Notion, Messenger) mit `position: absolute` außerhalb des Scrollcontainers, nur noch auf der letzten Kachel sichtbar.
- Bereichsstabilisierung auf den Scrollbereich (`range`) begrenzt, um Verschiebungen im Gesamtseitenlayout zu vermeiden.
- Auswahlzuschnitt mit klassischen Scrollleisten und gebrochener Anzeigeskalierung korrigiert.
- Scrollpositionen und `scroll-behavior`-Stile werden nach Abbruch, Neustart oder Fehler einer Aufnahme zuverlässig wiederhergestellt.
- IndexedDB-Fragmente und Transfermetadaten werden atomar gespeichert, um teilweise persistierte Zustände zu vermeiden.
- Inkrementelle Editor-Rasterisierung sowie asynchrone HTML-/Druckexporte mit Größenbegrenzung hinzugefügt.
- Strikte Chrome-Versionsprüfung, synchronisierte Sicherheitsrichtlinien und explizite Fehler der Asset-Generatoren hinzugefügt.

## [1.1.1] - 2026-09-15

### Behoben

- Lebensdauer verwaister Aufnahmen von einer Stunde auf fünfzehn Minuten reduziert.
- Nicht verwendete und undokumentierte Legacy-Service-Worker-Aktion `OPEN_EDITOR` entfernt.
- Zuverlässige Erkennung interner scrollbarer Container (z. B. Facebook Messenger-Chatfenster) bei der Bereichsaufnahme, ohne die Hintergrundseite zu scrollen.
- Schutz verankerter schwebender Docks (`position: fixed` / `position: sticky`), um versehentliches Ausblenden beim internen Scrollen zu verhindern.

## [1.1.0] - 2026-09-14

### Hinzugefügt

- Persistente, segmentierte Übertragung großer Aufnahmen, kompatibel mit Manifest V3.
- Scrollbereich-Aufnahme in internen Containern und eigene Windows-Prüfung.

### Behoben

- Verschiebungen bei Windows-Skalierung, gebrochenem Zoom und klassischen Scrollleisten.
- Wiederholte feste oder klebende Kopfzeilen, Kachelnähte und Layoutänderungen während der Aufnahme.
- Bereinigung nach dem Laden, abgebrochene Übertragungen, Sprach-Fallback und nicht unterstützte Seiten.


## [1.0.0] - 2026-08-22

### Hinzugefügt

- Erste offizielle Version von **Scionos Capture** von **eyelo SA** (ScioNos, Schweiz).
- 4 Aufnahmemodi: Sichtbarer Tab, Vollständige Seite (2D-Gitterzusammenfügung), Bereichsauswahl und Multi-Screen-Scrollbereich.
- Umfangreicher Anmerkungs-Editor: Rechtecke, Ellipsen, Pfeile, Text, Hervorhebung, Vollabdeckung/Unschärfe und verlustfreier Zuschnitt.
- Vielseitiger Export: Hochauflösender PNG-Download, direkte Zwischenablage, Drucken und **interaktiver HTML-Berichtsexport** (integrierter Betrachter mit Zoom/Verschieben und Metadaten).
- Neues offizielles SN-Monogramm-Logo mit leuchtendem Aufnahme-Fadenkreuz.
- 100 % lokale Verarbeitung ohne externe Server, null Telemetrie und strikte Einhaltung der DSGVO und des Schweizer DSG.
- Vollständige 4-Sprachen-Unterstützung: Französisch, Englisch, Spanisch und Deutsch.
- Volle Barrierefreiheit (WCAG, hohe Kontraste, Tastaturnavigation, Screenreader).

[Unveröffentlicht]: https://github.com/ScioNos/Scionos-Capture/compare/v1.3.2...HEAD
[1.3.2]: https://github.com/ScioNos/Scionos-Capture/compare/v1.3.1...v1.3.2
[1.3.1]: https://github.com/ScioNos/Scionos-Capture/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/ScioNos/Scionos-Capture/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/ScioNos/Scionos-Capture/compare/v1.1.1...v1.2.0
[1.1.1]: https://github.com/ScioNos/Scionos-Capture/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/ScioNos/Scionos-Capture/releases/tag/v1.1.0
[1.0.0]: https://github.com/ScioNos/Scionos-Capture/releases/tag/v1.0.0
