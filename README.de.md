# Scionos Capture

[Français](README.md) · [English](README.en.md) · [Español](README.es.md) · [Deutsch](README.de.md)

![Version](https://img.shields.io/badge/version-1.5.0-blue)

<!-- source-version --> **Version 1.5.0.**

Vollständig lokale Screenshot-Erweiterung für Chrome und Edge. Sichtbaren, ausgewählten oder scrollbaren Bereich sowie ganze Seiten aufnehmen, anschließend bearbeiten und als PNG, interaktives HTML oder PDF exportieren.

## Version 1.5.0

Version 1.5.0 ergänzt die unten beschriebene Komposition mehrerer Bilder, Dokumentexporte, portable Projekte und lokale Bibliothek.

- Komposition mehrerer Bilder: lokale Dateien importieren oder aus der Zwischenablage einfügen, Bilder hinzufügen/entfernen und umordnen, vertikal oder horizontal anordnen sowie Abstand, Hintergrund, Titel, Bildunterschriften und nummerierte Schritte einstellen.
- Export als PNG, JPEG und WebP (einstellbare Qualität für die entsprechenden Formate), HTML, Markdown samt Bildern in einer ZIP-Datei, PDF und Drucken; Einstellungen für Ränder, Ausrichtung, Skalierung sowie Kopf-/Fußzeilen mit Titel, Quelle, Datum und Seitennummerierung, innerhalb der Größenlimits.
- Einzeln bearbeitbare Annotationen und portable `.scionos`-Projekte v2, rückwärtskompatibel zu v1-Projekten, deren Annotationen zusammengeführt bleiben. Beim Speichern werden deckende Masken und Zuschnitte unumkehrbar angewendet; betroffene Annotationen werden konservativ entfernt. Beim Speichern nach einem Zuschnitt werden alle vorherigen Annotationen zusammengeführt, um Darstellung und Reihenfolge zu erhalten.
- Dauerhafte lokale Bibliothek mit ausdrücklichem Speichern, Vorschaubildern, Suche, Umbenennen, Duplizieren und Löschen. Aufbewahrung: 0, 7, 30 oder 90 Tage; einstellbares Kontingent 64 bis 1.024 MiB, standardmäßig 256 MiB. 0 Tage bedeutet keine automatische Ablaufzeit.
- Importierte Dateien und aus einem Projekt wiederhergestellte Bilder liefern keine zuverlässige Textebene: Eine originalgetreue Textsuche in ihren PDFs wird nicht zugesagt. Vertrauliche Pixel deckend maskieren.
- Besser sichtbarer Hilfezugang und Anzeige der tatsächlich geladenen Version.

Die `.scionos`-Datei und Exporte werden auf Wunsch lokal gespeichert. Sie können Bilder, Kompositionstext, Titel, Quellen und Datumsangaben enthalten: vor dem Teilen prüfen. Benutzer verwalten die Löschung.

## Funktionen

- Fünf Modi: ganze Seite, sichtbarer Bereich, ausgewählter Bereich, Scrollbereich und Elementaufnahme.
- Auswahl mit Griffen und Koordinaten anpassen und vor der Aufnahme bestätigen; über- und untergeordnete Elemente auswählen.
- Sofortige Aufnahme oder 3, 5 bzw. 10 Sekunden Verzögerung mit abbrechbarem Countdown und lokal gespeicherter Einstellung.
- Vertikale Scrollbereiche mit zwei Punkten oder per X/Y/Breite/Höhe über die Tastatur.
- Lokaler Editor mit Zeichnen, voller Abdeckung, visueller Unschärfe, Zuschnitt, Rückgängig/Wiederholen, Tastatur-Geometrie und 20–300 % Zoom.
- Responsive, per Tastatur bedienbare Oberfläche auf Französisch, Englisch, Spanisch und Deutsch.
- Automatische Browsersprache mit manueller Auswahl im Flaggenmenü.
- Kein Server, Konto, Tracking, Werbung oder Übertragen von Aufnahmen.

## Installation

`scionos-capture-v1.5.0.zip` aus dem [Release v1.5.0](https://github.com/ScioNos/Scionos-Capture/releases/tag/v1.5.0) herunterladen, optional `.sha256` prüfen und entpacken. `chrome://extensions` oder `edge://extensions` öffnen, **Entwicklermodus** aktivieren, **Entpackte Erweiterung laden** wählen und den Ordner auswählen.

Aus dem Quellcode: Repository klonen, `npm ci` ausführen und die Projektwurzel als entpackte Erweiterung laden.

## Nutzung, Berechtigungen und Datenschutz

**Sofort**, **3**, **5** oder **10 Sekunden** und anschließend **Ganze Seite**, **Sichtbarer Bereich**, **Ausgewählter Bereich**, **Scrollbereich** oder **Element aufnehmen** wählen. Einen ausgewählten Bereich ziehen, mit Griffen oder Koordinaten anpassen und mit **Aufnehmen** bestätigen. Bei Elementen einen Block mit der Maus hervorheben, bei Bedarf das über-/untergeordnete Element und den sichtbaren Teil oder den gesamten Inhalt eines tatsächlich scrollbaren Containers wählen, dann den Block anklicken. Koordinaten anpassen und mit **Aufnehmen** bestätigen. Bei Auswahl, Scrollbereich und Elementen beginnt die Verzögerung nach Bestätigung, bei ganzer Seite und sichtbarem Bereich beim Start. **Escape** bricht den Countdown ab. Beim Scrollbereich die erste Ecke anklicken, vertikal scrollen und die gegenüberliegende Ecke wählen. `Escape` bricht ab, **Neu beginnen** löscht den ersten Punkt; X/Y/Breite/Höhe ermöglichen die Tastaturbedienung. Vorgeschlagen ist `Alt+Shift+C`; das Popup zeigt die tatsächliche Belegung. Im Editor steuern `V`, `D`, `M`, `C`, `Strg+Z`, `Strg+Y`, `+`, `-` und `0` Werkzeuge, Verlauf und Zoom. Für Geheimnisse eine volle Abdeckung verwenden.

`activeTab` und `scripting` reagieren nur auf eine ausdrückliche Aktion; `storage` speichert Sprache, Aufnahmeverzögerung und temporäre Zuordnung; `unlimitedStorage` verhindert lokale Quotenfehler; `alarms` lässt Aufnahmen ablaufen. Übertragungsfragmente verbleiben nur im lokalen IndexedDB und werden nach dem Zusammensetzen oder nach fünfzehn Minuten Inaktivität gelöscht (beim Aufwachen, falls der Browser angehalten ist). Die endgültige Aufnahme bleibt erhalten, solange ein zugehöriger Editor geöffnet ist, auch nach Neuladen und über fünfzehn Minuten hinaus. Sie wird beim Schließen des letzten Editors gelöscht; ohne Editor kann sie fünfzehn Minuten nach ihrer Erstellung bereinigt werden. Siehe [PRIVACY.de.md](PRIVACY.de.md) und [SECURITY.de.md](SECURITY.de.md).

## Grenzen und Entwicklung

Endlos scrollende Seiten besitzen kein bestimmbares Ende. Ein Scrollbereich bleibt auf die beim ersten Punkt sichtbare Breite begrenzt und wird nicht horizontal zusammengesetzt. Veränderliche oder `sticky` Inhalte können zwischen Kacheln abweichen. Interne Browserseiten und Extension-Stores sind nicht injizierbar. Die Elementauswahl durchsucht keine iframe-Inhalte: Der sichtbare Rahmen kann aufgenommen werden, seine inneren Elemente können aber nicht einzeln ausgewählt werden. Bilder über 16 Millionen Pixel oder 16.384 px pro Seite werden verkleinert.

Node.js 24 verwenden, `npm ci` und `npm run verify` ausführen. Siehe [CONTRIBUTING.de.md](CONTRIBUTING.de.md), [CHANGELOG.de.md](CHANGELOG.de.md) und [MIT-Lizenz](LICENSE).

### PDF

Ausstehende Änderungen vor jedem Export übernehmen oder verwerfen. Unschärfe bleibt ein visueller Effekt; Geheimnisse deckend maskieren.

Verschobene und skalierte Aufnahmecontainer werden unterstützt. Nicht unterstützte Drehungen, Scherungen und Perspektiven führen zu einer ausdrücklichen Fehlermeldung.

Die durchsuchbare PDF-Ebene enthält nur vollständige Wörter mit überprüfbarer Sichtbarkeit. Unsichere Wörter werden aus dieser Ebene ausgelassen; das aufgenommene Bild bleibt erhalten. Ältere Ebenen mit ungeprüften Koordinaten werden ebenfalls ausgelassen. Vertrauliche Pixel müssen deckend maskiert werden; Unschärfe ist nur ein visueller Effekt.

Node.js 24 wird für die vollständige Prüfung empfohlen, einschließlich PDF-Textextraktion mit PDF.js 6.3.289 (nur als Testabhängigkeit). Die Hauptprüfungen bleiben mit Node.js 20 kompatibel.

Eine Version mit `npm run version:sync -- 1.5.0` synchronisieren; in PowerShell `npm.cmd run version:sync -- 1.5.0` verwenden.

<!-- local-package --> Lokales Archiv : `scionos-capture-v1.5.0.zip` · SHA-256 : `scionos-capture-v1.5.0.zip.sha256`.

`npm run test:native` prüft alle fünf Modi und eine verzögerte Aufnahme in installiertem Chrome und Edge mit echten Aufnahmen und temporären Profilen. Die Erweiterungsaktion gewährt `activeTab`; persönliche Profile werden nicht verwendet.
