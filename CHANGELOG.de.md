# Änderungsprotokoll

[Français](CHANGELOG.md) · [English](CHANGELOG.en.md) · [Español](CHANGELOG.es.md) · [Deutsch](CHANGELOG.de.md)

## [Unveröffentlicht]

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

[Unveröffentlicht]: https://github.com/ScioNos/Scionos-Capture/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/ScioNos/Scionos-Capture/compare/v1.1.1...v1.2.0
[1.1.1]: https://github.com/ScioNos/Scionos-Capture/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/ScioNos/Scionos-Capture/releases/tag/v1.1.0
[1.0.0]: https://github.com/ScioNos/Scionos-Capture/releases/tag/v1.0.0
