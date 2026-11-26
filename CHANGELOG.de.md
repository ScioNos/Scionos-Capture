# Änderungsprotokoll

[Français](CHANGELOG.md) · [English](CHANGELOG.en.md) · [Español](CHANGELOG.es.md) · [Deutsch](CHANGELOG.de.md)

## [Unveröffentlicht]

### Vorbereitung von 1.5.3 — 26. November 2026

**Abschließende lokale Qualifizierung von 1.5.3 bestanden; unveröffentlichte Version.** Gesamtlauf bestanden: 178 Unit-Tests, 179 E2E-Tests, fünf native Modi in Chrome 158.0.8127.37 und Edge 158.0.4370.33, drei Unterbrechungen je Browser, drei Leistungswiederholungen und zehn PDF-Szenarien. Linux-Prüfungen bestehen auch mit den exakten Node-Mindestversionen 22.22.0 und 24.8.0 (je 178 Unit-Tests). Siehe [Konsolidierungsbericht](RAPPORT_CONSOLIDATION_1.5.3.md). Remote-CI, Commit/PR und endgültiges Archiv stehen noch aus; keine GitHub-Veröffentlichung oder Store-Einreichung. Öffentliche Links von 1.5.2 bleiben erhalten.

- Exportabbruch: Abbrechen und Escape verhindern die Ausgabe auch nach Beginn der Momentaufnahme, während der PDF-Rasterung oder der Bildmodus-Seitenbänder; acht bestandene gezielte Szenarien prüfen temporäre URL-Bereinigung und erneuten Versuch.

- Aufnahme: aktiven Tab, Fenster und Navigation vor und nach der Erfassung prüfen, mit einer an die `documentId` gebundenen Prüfung. URL und Titel werden zu Beginn der Sitzung festgelegt.
- PDF: `captureVisibleTab` liefert keinen Nachweis, dass aufgenommene Pixel und DOM übereinstimmen. Selbst identische beobachtete Zustände vor und nach der Aufnahme können eine vorübergehende Änderung übersehen. Deshalb wird sämtlicher aus dem DOM abgeleiteter Quelltext bei nativen Aufnahmen weggelassen. Text in Benutzerannotationen wird als Pixel gerendert; Titel, Bildunterschriften sowie Kopf- und Fußzeilen bleiben außerhalb des reinen Bildmodus durchsuchbar.
- PDF nur als Bild: Option im Bereich Dokument, in alle vier Sprachen übersetzt und mit den Projekteinstellungen gespeichert. Sie entfernt durchsuchbare Textebenen und rastert auch Kopf- und Fußzeilen. Sichtbare Pixel können weiterhin Geheimnisse enthalten; dieser Modus ersetzt keine deckende Maske.
- Projekte: Manifest auf 1 MiB UTF-8-JSON (einschließlich Escape-Sequenzen), STORE-ZIP-Archiv auf 128 MiB einschließlich Headern und Verzeichnis begrenzt. Eine Vorprüfung lehnt Überschreitungen vor Kopien/Momentaufnahmen ab; der Codec prüft auch die endgültig kodierten Größen. Die Annotationsverläufe für Rückgängig/Wiederholen teilen zusätzlich ein Gesamtbudget von 1 MiB rohem UTF-8-JSON mit einer Reserve pro Zustand. Der Kompositionsverlauf für Titel und Bildunterschriften ist ebenfalls auf 50 Zustände und ein gemeinsames Budget von 1 MiB UTF-8-JSON begrenzt; Änderungen an PDF-Einstellungen und Quellenrichtlinie werden vor der Zustandsänderung geprüft.
- Aufnahmen: Zeitbudget von 180 Sekunden, kooperativ an Kontrollpunkten geprüft, und höchstens 256 Teilaufnahmen. Dies ist keine präemptive Unterbrechung nach 180 Sekunden; zu lange Seiten werden abgelehnt.
- Ressourcen: Das Gesamtbudget von 32 Millionen Pixeln umfasst nach einem Zuschnitt aufbewahrte Originale; Rückgängig/Wiederholen bleibt durch dieses Budget begrenzt. Höchstens zwei Momentaufnahmen sind gleichzeitig in Bearbeitung, bis Export, Kopieren in die Zwischenablage oder Speicherung abgeschlossen ist. Eigene Canvas-Flächen dieser Vorgänge werden in `finally` auf 1 × 1 verkleinert; Eingabeflächen bleiben erhalten.
- Annotationen: 1.000 pro Bild und 5.000 pro Dokument; 10.000 Punkte pro Zeichenstrich und 100.000 pro Dokument. Der globale Verlauf ist auf 100 Zustände, 100.000 Punkte und 5.000 Operationen begrenzt, zusätzlich zum gemeinsamen JSON-Budget.
- Speicherung: Aufnahme-Cache entfernen, um veraltete Daten zwischen Kontexten zu vermeiden; aufgegebene IndexedDB-Verbindungen schließen. Die im lokalen Arbeitsbaum bereits vorhandene transaktionale Gesamtlöschung wird integriert und beibehalten, mit vollständigem Rollback bei Fehlern.
- Importe: strenge Validierung der PNG-Transparenzdaten `tRNS`. Projekte v1/v2 bleiben lesbar, geschrieben wird v2. Keine neue Berechtigung oder Telemetrie.
- Oberfläche: Überlappung der Werkzeugleiste korrigiert; Annotationsbefehle bleiben in derselben 56 px hohen Leiste gruppiert, ohne Verschiebung der Zeichenfläche oder Versatz beim Ziehen. Inaktive Zustände `historyRevision`, `historyConsolidation` und `redoOperations` sind entfernt.
- Kompatibilität: Manifest-Minimum Chrome/Edge 106 statt 102; CSS `:has()` benötigt Chrome 105 und `documentId` Chrome 106. Dieses Minimum wurde statisch ermittelt; die einzigen belegten nativen Ausführungen betreffen Chrome/Edge 158, ohne nachgewiesene Ausführung unter Chrome/Edge 106.
- Werkzeuge: `@axe-core/playwright` 4.14.1, `html-validate` 11.22.1, `minimatch`-Override 11.0.9; inaktiven `glob`-Override entfernt. Zwölf kompatible transitive Aktualisierungen angewendet; GitHub Actions auf Commit-SHAs festgelegt. Siehe [Abhängigkeitsprüfung](DEPENDENCY_REVIEW_1.5.3.md) und [Prüfung der transitiven Abhängigkeiten](DEPENDENCY_TRANSITIVES_1.5.3.md).
- Bibliothek: begrenzte Wiederverwendung von Karten und Miniaturen. Frühere Vergleichsmessungen und ihre Grenzen sind im [Bericht](RAPPORT_CONSOLIDATION_1.5.3.md) dokumentiert; sie belegen keine allgemeine Beschleunigung. Stapelverarbeitung ist nicht implementiert.

## [1.5.2] — 2026-11-17

**Lokal korrigierter Store-Kandidat 1.5.2.** Das bestehende GitHub-Release behält Tag und bisheriges Archiv; diese neuen Korrekturen sind darin nicht enthalten. Keine Store-Einreichung erfolgt. Siehe [Prüfbericht](STORE_READINESS_1.5.2.md).

- Auswahl: aktiven Zeiger verfolgen, weitere Zeiger ignorieren und unterbrochene Gesten bereinigen.
- Aufnahme: ausgeblendete Elemente auch bei Fehlern während der Vorbereitung wiederherstellen.
- Bibliothek: atomare Gesamtlöschung mit Ablehnung veralteter Listen und vollständigem Rollback bei Fehlern.
- Ziehen im Editor: aktiven `pointerId` verfolgen und Unterbrechungen der Geste behandeln.
- Interne Editor-Miniaturen und Kompositionsvorschau: beim erneuten Öffnen des Projekts einschließlich Annotationen rekonstruieren.
- Schaltfläche „Projekt exportieren“: Status ungespeicherter Änderungen beibehalten; die Meldung bestätigt die Download-Anforderung, ohne das Speichern durch den Browser zu garantieren.
- HTML-Berichte: Quellenrichtlinie im gesamten Generator anwenden und HTTP(S)-Zugangsdaten immer entfernen.
- Drucken/PDF: kumulierte Grenzen von 32 Millionen Pixeln und 128 MiB Blobs, höchstens 200 Seiten.
- Paket: altes Modul `editor-export.js` entfernt; damit 35 Distributionsdateien.
- Aktualisierte Testwerkzeuge: axe-core/Playwright 4.14.0, Playwright Test 1.65.1, fake-indexeddb 6.2.8 und PDF.js 6.5.438. ESLint und HTML-Validate auf @eslint/js 10.0.1, eslint 10.15.0 und html-validate 11.21.1 aktualisiert. Node.js-Anforderung: ^22.22.0 oder >=24.8.0; die CI-Matrix zielt auf Node.js 22.22.0 und 24.8.0, ein GitHub-Lauf für diese Migration ist nicht belegt. Details: [Migration der Hauptversionen](MAJOR_DEPENDENCY_MIGRATION.md).
- Barrierefreiheit: Der zugängliche Name der Sprachauswahl enthält den sichtbaren Sprachcode, geprüft in allen vier Sprachen.

Historische Prüfungen von 1.5.2: siehe [Abhängigkeitsprüfung](DEPENDENCY_REVIEW_1.5.2.md) und [Bericht zum korrigierten Store-Kandidaten](STORE_READINESS_1.5.2.md). Diese Ergebnisse betreffen frühere Arbeitsstände und qualifizieren 1.5.3 nicht.

## [1.5.1] — auf GitHub veröffentlicht

Version 1.5.1 ist auf GitHub veröffentlicht. Der aktuelle Chrome-Web-Store-Status und die ausgelieferte Version sind unbestätigt; im Dashboard prüfen.

### Datenschutz und Robustheit

- Quellenrichtlinie im Bereich Dokument: Standard sanitized entfernt Abfrage und Fragment, none lässt Quellen weg, full behält sie bei; HTTP(S)-Zugangsdaten werden immer entfernt. Gilt für Projekte und Exporte; beim Speichern entfernte Quellen sind nicht wiederherstellbar. Bibliotheksexporte verwenden immer sanitized, auch für ältere Projekte.
- URL-Pfade, Titel, Bildunterschriften, Datumsangaben und Pixel können weiterhin vertraulich sein; lokale, ausdrücklich aktivierte Diagnose ohne Telemetrie. Berechtigungen unverändert.
- Exporte und Projekte: ein PNG-Abbild pro Bild; Bibliotheksvorschaubilder direkt erzeugt und laufende Druckvorgänge bei der Bereinigung berücksichtigt.
- PNG-/JPEG-/WebP-Importe: Ablehnung vor dem Dekodieren über 16 Millionen Pixel oder 16.384 px pro Seite statt Verkleinerung; Gesamtlimit unverändert bei 32 Millionen Pixel.
- Projekte v1/v2 bleiben lesbar, geschrieben wird v2; Umbenennen nur in Metadaten mit einer Codec-Validierung unter Beibehaltung der PNGs.

## [1.5.0] - 2026-11-14

### Hinzugefügt

- Komposition mehrerer Bilder mit lokalem Import oder Einfügen, Umordnung, vertikaler/horizontaler Anordnung, Titeln, Bildunterschriften und nummerierten Schritten.
- PNG-, JPEG-, WebP-, HTML-, Markdown/ZIP-, PDF- und Druckexporte mit Qualitäts- und Darstellungseinstellungen.
- Einzeln bearbeitbare Annotationen und portable `.scionos`-Projekte v2, mit Öffnen zusammengeführter v1-Projekte und unumkehrbarer Masken-/Zuschnittanwendung beim Speichern.
- Dauerhafte lokale Bibliothek mit ausdrücklichem Speichern, Suche, Umbenennen, Duplizieren, Löschen, konfigurierbarer Aufbewahrung und begrenztem Kontingent.
- Besser sichtbarer Hilfezugang und Anzeige der tatsächlich geladenen Version.

### Behoben

- Gleichzeitige Bibliotheksspeicherungen erhalten Klickreihenfolge und Dokumentidentität, auch wenn beim Kodieren ein anderes Projekt geöffnet wird.
- Über Bildränder verschobene oder duplizierte Annotationen bleiben mit begrenzten Koordinaten speicherbar und erneut lesbar.

## [1.4.0] - 2026-11-10

### Hinzugefügt

- Fünfter Modus, Element aufnehmen: Hervorhebung beim Überfahren, über-/untergeordnete Elemente wählen und sichtbaren Teil oder gesamten Inhalt eines Scrollcontainers aufnehmen.
- Auswahlbestätigung mit Größenänderungsgriffen, X/Y/Breite/Höhe und Tastatursteuerung.
- Sofortige Aufnahme oder lokal gespeicherte Verzögerung von 3, 5 bzw. 10 Sekunden mit abbrechbarem Countdown nach der Auswahlbestätigung.
- Oberfläche und Hilfe auf Französisch, Englisch, Spanisch und Deutsch. Die Elementauswahl durchsucht keine iframe-Inhalte.

### Behoben

- Sichtbare Banner in fixierten Containern mit Höhe null, darunter der Cookie-Hinweis von X.com, wiederholen sich nicht mehr in jeder Aufnahmekachel; sie bleiben einmal am unteren Bildrand erhalten.
- Zusätzlicher Inhalt am Ende eines dynamischen Feeds wie X.com unterbricht eine begrenzte Auswahl nicht mehr. Breite, Ansichtsfenster und schrumpfende Höhe werden weiterhin geprüft; vollständige Seitenaufnahmen bleiben streng.

## [1.3.3] - 2026-10-05

- Aufnahmen: gemeinsame rechteckige Kachelzusammensetzung, horizontale Auswahl ohne Streckung, korrekte Koordinaten für verschobene oder skalierte Container; explizite Ablehnung komplexer Transformationen.
- Auswahl: automatisches Scrollen an den Rändern des gewählten Containers, feste horizontale Position und Breite im vertikalen Modus, Auswahl über modalen Dialogen.
- Zusammensetzung: vollständige feste Fußzeile auch bei kürzerem letzten Abschnitt; Zustand nach Abbruch wiederhergestellt und verspätete Antworten ignoriert.
- Datenschutz: durch Nachfahren verdeckten Text aus PDFs entfernen; durchgehende freie Maskierung zwischen entfernten Punkten und bei einzelnen Klicks.
- Exporte: ausstehende Änderungen vor Export übernehmen oder verwerfen; PNG, HTML, Zwischenablage und PDF verwenden Bild und Metadaten derselben Revision.
- HTML: Bild nur einmal einbetten, endgültige Byte-Größe prüfen, Scrollen langer Bilder und 100-%-Zoom korrigieren; Textextraktion bei 1.500 Blöcken beenden.
- Wartung: Version 1.3.3 von veröffentlichten Downloads trennen, `--unreleased`-Synchronisierung, Markdown-Prüfung sowie Regressionen mit echten Pixeln, PDF und vier DPR.

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

[Unveröffentlicht]: https://github.com/ScioNos/Scionos-Capture/compare/v1.5.2...HEAD
[1.3.3]: https://github.com/ScioNos/Scionos-Capture/compare/v1.3.2...v1.3.3
[1.3.2]: https://github.com/ScioNos/Scionos-Capture/compare/v1.3.1...v1.3.2
[1.3.1]: https://github.com/ScioNos/Scionos-Capture/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/ScioNos/Scionos-Capture/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/ScioNos/Scionos-Capture/compare/v1.1.1...v1.2.0
[1.1.1]: https://github.com/ScioNos/Scionos-Capture/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/ScioNos/Scionos-Capture/releases/tag/v1.1.0
[1.0.0]: https://github.com/ScioNos/Scionos-Capture/releases/tag/v1.0.0

[1.5.0]: https://github.com/ScioNos/Scionos-Capture/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/ScioNos/Scionos-Capture/compare/v1.3.3...v1.4.0

[1.5.1]: https://github.com/ScioNos/Scionos-Capture/releases/tag/v1.5.1

[1.5.2]: https://github.com/ScioNos/Scionos-Capture/compare/v1.5.1...v1.5.2
