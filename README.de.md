# Scionos Capture

[Français](README.md) · [English](README.en.md) · [Español](README.es.md) · [Deutsch](README.de.md)

Vollständig lokale Screenshot-Erweiterung für Chrome und Edge. Sichtbaren, ausgewählten oder scrollbaren Bereich sowie ganze Seiten aufnehmen, anschließend bearbeiten und als PNG, interaktives HTML oder PDF exportieren.

## Funktionen

- Sichtbare, ausgewählte, scrollbare und zweidimensionale vollständige Seitenaufnahme.
- Vertikale Scrollbereiche mit zwei Punkten oder per X/Y/Breite/Höhe über die Tastatur.
- Lokaler Editor mit Zeichnen, voller Abdeckung, visueller Unschärfe, Zuschnitt, Rückgängig/Wiederholen, Tastatur-Geometrie und 20–300 % Zoom.
- Responsive, per Tastatur bedienbare Oberfläche auf Französisch, Englisch, Spanisch und Deutsch.
- Automatische Browsersprache mit manueller Auswahl im Flaggenmenü.
- Kein Server, Konto, Tracking, Werbung oder Übertragen von Aufnahmen.

## Installation

`scionos-capture-v1.2.0.zip` aus dem [Release v1.2.0](https://github.com/ScioNos/Scionos-Capture/releases/tag/v1.2.0) herunterladen, optional `.sha256` prüfen und entpacken. `chrome://extensions` oder `edge://extensions` öffnen, **Entwicklermodus** aktivieren, **Entpackte Erweiterung laden** wählen und den Ordner auswählen.

Aus dem Quellcode: Repository klonen, `npm ci` ausführen und die Projektwurzel als entpackte Erweiterung laden.

## Nutzung, Berechtigungen und Datenschutz

**Ganze Seite**, **Sichtbarer Bereich**, **Ausgewählter Bereich** oder **Scrollbereich** wählen. Beim Scrollbereich die erste Ecke anklicken, vertikal scrollen und die gegenüberliegende Ecke wählen. `Escape` bricht ab, **Neu beginnen** löscht den ersten Punkt; X/Y/Breite/Höhe ermöglichen die Tastaturbedienung. Vorgeschlagen ist `Alt+Shift+C`; das Popup zeigt die tatsächliche Belegung. Im Editor steuern `V`, `D`, `M`, `C`, `Strg+Z`, `Strg+Y`, `+`, `-` und `0` Werkzeuge, Verlauf und Zoom. Für Geheimnisse eine volle Abdeckung verwenden.

`activeTab` und `scripting` reagieren nur auf eine ausdrückliche Aktion; `storage` speichert Sprache und temporäre Zuordnung; `unlimitedStorage` verhindert lokale Quotenfehler; `alarms` lässt Aufnahmen ablaufen. Übertragungsfragmente verbleiben nur im lokalen IndexedDB und werden nach dem Zusammensetzen oder innerhalb von fünfzehn Minuten gelöscht. Die endgültige Aufnahme wird nach dem Dekodieren durch den Editor gelöscht; die fünfzehnminütige Frist schützt nur verwaiste Aufnahmen. Siehe [PRIVACY.de.md](PRIVACY.de.md) und [SECURITY.de.md](SECURITY.de.md).

## Grenzen und Entwicklung

Endlos scrollende Seiten besitzen kein bestimmbares Ende. Ein Scrollbereich bleibt auf die beim ersten Punkt sichtbare Breite begrenzt und wird nicht horizontal zusammengesetzt. Veränderliche oder `sticky` Inhalte können zwischen Kacheln abweichen. Interne Browserseiten und Extension-Stores sind nicht injizierbar. Bilder über 16 Millionen Pixel oder 16.384 px pro Seite werden verkleinert.

Node.js 20 oder 24 verwenden, `npm ci` und `npm run verify` ausführen. Siehe [CONTRIBUTING.de.md](CONTRIBUTING.de.md), [CHANGELOG.de.md](CHANGELOG.de.md) und [MIT-Lizenz](LICENSE).
