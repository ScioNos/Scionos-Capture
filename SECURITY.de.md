# Sicherheit

[Français](SECURITY.md) · [English](SECURITY.en.md) · [Español](SECURITY.es.md) · [Deutsch](SECURITY.de.md)

## Vorbereitung von 1.5.3 — 26. November 2026

**Lokale Vorbereitung, nicht veröffentlicht.** Die abschließende Testvalidierung läuft noch; Ergebnisse und Grenzen werden im [Konsolidierungsbericht](CONSOLIDATION_1.5.3.md) festgehalten. Es erfolgt weder eine GitHub-Veröffentlichung noch eine Store-Einreichung. Öffentliche Links und Archive von 1.5.2 verweisen weiterhin auf die bestehende Veröffentlichung.

Die unterstützte Linie bleibt `1.5.x`; 1.5.3 wird vorbereitet. Die folgenden Hinweise zur privaten Meldung und die Antwortziele gelten weiterhin. Ressourcenlimits reduzieren die zugelassene Last, bieten jedoch keine absolute Garantie gegen Speichererschöpfung.

- Aufnahme: aktiven Tab, Fenster und Navigation vor und nach der Erfassung prüfen, mit einer an die `documentId` gebundenen Prüfung. URL und Titel werden zu Beginn der Sitzung festgelegt.
- PDF: Textebene bei DOM-/CSSOM-Änderungen, unzugänglichen CSS-Stylesheets, Medienänderungen oder Animationen verwerfen; weißen Text auf weißem Hintergrund ausschließen und Text bei Mischmodi oder Bildhintergründen mit unklarer Sichtbarkeit weglassen (unsichtbare `SECRET_BLEND`-Regression auf Weiß bestätigt und korrigiert). Diese Prüfungen beweisen keine absolute Übereinstimmung von Pixeln und Text, wenn eine vorübergehende CSSOM-Änderung zwischen den Beobachtungen rückgängig gemacht wird. Im Zweifel wird Text bevorzugt weggelassen; Pixel prüfen und Geheimnisse deckend maskieren.
- Aufnahmen: Zeitbudget von 180 Sekunden, kooperativ an Kontrollpunkten geprüft, und höchstens 256 Teilaufnahmen. Dies ist keine präemptive Unterbrechung nach 180 Sekunden; zu lange Seiten werden abgelehnt.
- Ressourcen: Das Gesamtbudget von 32 Millionen Pixeln umfasst nach einem Zuschnitt aufbewahrte Originale; Rückgängig/Wiederholen bleibt durch dieses Budget begrenzt. Höchstens zwei Momentaufnahmen sind gleichzeitig in Bearbeitung, bis Export, Kopieren in die Zwischenablage oder Speicherung abgeschlossen ist. Eigene Canvas-Flächen dieser Vorgänge werden in `finally` auf 1 × 1 verkleinert; Eingabeflächen bleiben erhalten.
- Annotationen: 1.000 pro Bild und 5.000 pro Dokument; 10.000 Punkte pro Zeichenstrich und 100.000 pro Dokument. Der globale Verlauf ist auf 100 Zustände, 100.000 Punkte und 5.000 Operationen begrenzt.
- Speicherung: Aufnahme-Cache entfernen, um veraltete Daten zwischen Kontexten zu vermeiden; aufgegebene IndexedDB-Verbindungen schließen. Die im lokalen Arbeitsbaum bereits vorhandene transaktionale Gesamtlöschung wird integriert und beibehalten, mit vollständigem Rollback bei Fehlern.
- Importe: strenge Validierung der PNG-Transparenzdaten `tRNS`. Projekte v1/v2 bleiben lesbar, geschrieben wird v2. Keine neue Berechtigung oder Telemetrie.
- Kompatibilität: Manifest-Minimum Chrome/Edge 106 statt 102; CSS `:has()` benötigt Chrome 105 und `documentId` Chrome 106. Dieses Minimum wurde statisch ermittelt; die einzigen belegten nativen Ausführungen betreffen Chrome/Edge 158, ohne nachgewiesene Ausführung unter Chrome/Edge 106.
- Werkzeuge: `@axe-core/playwright` 4.14.1, `html-validate` 11.22.1, `minimatch`-Override 11.0.9; inaktiven `glob`-Override entfernt und Actions aktualisiert. Siehe [Abhängigkeitsprüfung](DEPENDENCY_REVIEW_1.5.3.md).

Richtlinie am 17. November 2026 für Version 1.5.2 aktualisiert — auf GitHub veröffentlicht. Die unterstützte Linie ist `1.5.x`. Version [v1.5.2](https://github.com/ScioNos/Scionos-Capture/releases/tag/v1.5.2) ist auf GitHub veröffentlicht; der aktuelle Chrome-Web-Store-Status ist unbestätigt und hier erfolgt keine Store-Einreichung von 1.5.2.

Für ausnutzbare Schwachstellen kein öffentliches Issue öffnen. Nutzen Sie die [private GitHub-Meldung](https://github.com/ScioNos/Scionos-Capture/security/advisories/new) oder kontaktieren Sie `info@eyelo.ch` und nennen Sie Version, Auswirkung, Schritte und möglichst einen nicht destruktiven Nachweis.

Eine Bestätigung wird innerhalb von 3 Arbeitstagen, eine erste Bewertung innerhalb von 7 Arbeitstagen angestrebt. Koordinierte Offenlegung erfolgt nach Bereitstellung einer Korrektur.

Aufnahmen einschließlich Scrollbereich-Kacheln bleiben lokal. Es laufen keine externen Skripte und der neue Modus fügt keine Berechtigung hinzu. Verwaiste Aufnahmen laufen nach fünfzehn Minuten ab. Für Geheimnisse eine volle Abdeckung verwenden; Unschärfe ist keine kryptografische Löschung.

Die durchsuchbare PDF-Ebene enthält nur vollständige Wörter mit überprüfbarer Sichtbarkeit. Unsichere Wörter werden aus dieser Ebene ausgelassen; das aufgenommene Bild bleibt erhalten. Ältere Ebenen mit ungeprüften Koordinaten werden ebenfalls ausgelassen. Vertrauliche Pixel müssen deckend maskiert werden; Unschärfe ist nur ein visueller Effekt.

Ausstehende Änderungen vor jedem Export übernehmen oder verwerfen. Unschärfe bleibt ein visueller Effekt; Geheimnisse deckend maskieren.

## Schutzmaßnahmen der Version 1.5.2

Die Korrekturen betreffen Zieh-Unterbrechungen und den aktiven `pointerId`, rekonstruierte interne Editor-Miniaturen und Kompositionsvorschau, Quellenrichtlinien in jedem HTML-Bericht und die Entfernung des alten Exportmoduls aus dem Paket (35 Dateien). Drucken/PDF ist auf 32 Millionen kumulierte Pixel, 128 MiB kumulierte Blobs und 200 Seiten begrenzt. Ein portabler Export behält den Status ungespeicherter Änderungen; seine Meldung bestätigt nur die Download-Anforderung. Validierung 1.5.2: `npm run verify:release` erfolgreich — 133 Unit-Tests, 126 Browsertests, je fünf Modi in Chrome 157.0.8103.79 und Edge 157.0.4341.60, drei Leistungswiederholungen und zehn PDF-Szenarien. Ergebnisse und Umgebung: [Abhängigkeitsprüfung und Validierung](DEPENDENCY_REVIEW_1.5.2.md).
