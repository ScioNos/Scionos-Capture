<p align="center">
  <img src="images/icon128.png" width="88" height="88" alt="Scionos-Capture-Logo">
</p>

<h1 align="center">Scionos Capture</h1>

<p align="center"><strong>Seite aufnehmen. Dokument gestalten.<br>Ihre Daten bleiben auf Ihrem Gerät.</strong></p>

<p align="center">Eine lokale Erweiterung für Chrome und Microsoft Edge – von der Aufnahme bis zur Projektbibliothek.</p>

[Français](README.md) · [English](README.en.md) · [Deutsch](README.de.md) · [Español](README.es.md)

[![Version](https://img.shields.io/badge/version-1.5.0-blue)](https://github.com/ScioNos/Scionos-Capture/releases/tag/v1.5.0) [![Prüfungen](https://github.com/ScioNos/Scionos-Capture/actions/workflows/ci.yml/badge.svg)](https://github.com/ScioNos/Scionos-Capture/actions/workflows/ci.yml) [![MIT-Lizenz](https://img.shields.io/badge/licence-MIT-green)](LICENSE) ![Chrome und Edge](https://img.shields.io/badge/Chrome_%26_Edge-Manifest_V3-4285F4)

**[Version 1.5.0 herunterladen](https://github.com/ScioNos/Scionos-Capture/releases/tag/v1.5.0)** · **[Chrome-Web-Store-Eintrag ansehen](https://chromewebstore.google.com/detail/modfkdhgnhbfilpfanjginilabajchbe)** · **[Hilfe erhalten](https://github.com/ScioNos/Scionos-Capture/issues)**

<!-- source-version --> Version 1.5.0 ist auf GitHub verfügbar. Die Aktualisierung des Chrome-Web-Store-Eintrags wird vorbereitet; seine Version kann vom Repository abweichen.

![Scionos-Capture-Editor 1.5.0: Bildannotation und Vorschau einer horizontalen Komposition](store-assets/screenshot-real-1-composition-v1.5.0.png)

*Echte Oberfläche der Version 1.5.0 mit lokalen Demo-Inhalten.*

## Von der Webseite zum Dokument

Erstellen Sie eine visuelle Erklärung, dokumentieren Sie ein Problem oder bewahren Sie einen nützlichen Ausschnitt auf. Scionos Capture vereint Auswahl, Annotation, Komposition und das Fortsetzen von Projekten in einer Erweiterung.

| Präzise aufnehmen | Erklären und gestalten | Arbeit wiederfinden |
| --- | --- | --- |
| Ganze Seite, sichtbarer Bereich, Auswahl, Scrollbereich oder Element per Klick. | Zeichnungen, Text, Pfeile und Masken; mehrere Bilder mit Titeln und Bildunterschriften. | Portable Projekte und lokale Bibliothek mit Suche, Umbenennen und Duplizieren. |

**Ohne Konto, Telemetrie oder Verarbeitungsserver.** Bilder und Metadaten bleiben auf Ihrem Gerät. Sie entscheiden, was Sie speichern und teilen.

## In wenigen Minuten installieren

### Von GitHub — Version 1.5.0

1. Laden Sie `scionos-capture-v1.5.0.zip` aus dem [Release v1.5.0](https://github.com/ScioNos/Scionos-Capture/releases/tag/v1.5.0) herunter.
2. Prüfen Sie die Prüfsumme mit der mitgelieferten `.sha256`-Datei und entpacken Sie das Archiv.
3. Öffnen Sie `chrome://extensions` oder `edge://extensions` und aktivieren Sie den **Entwicklermodus**.
4. Wählen Sie **Entpackte Erweiterung laden** und den entpackten Ordner mit dem Manifest aus.
5. Heften Sie Scionos Capture an die Symbolleiste an und öffnen Sie eine normale Webseite.

Über den [Chrome-Web-Store-Eintrag](https://chromewebstore.google.com/detail/modfkdhgnhbfilpfanjginilabajchbe) können Sie die Erweiterung aus dem Store installieren. Prüfen Sie die dort angebotene Version: GitHub-Veröffentlichung und Google-Prüfung erfolgen unabhängig voneinander.

## Drei Arbeitsabläufe

### 1. Den richtigen Bereich aufnehmen

Wählen Sie einen der fünf Modi, passen Sie die Auswahl mit Griffen oder Koordinaten an und bestätigen Sie. Bei der Elementauswahl können Sie zum über- oder untergeordneten Element wechseln. Eine Verzögerung von **3, 5 oder 10 Sekunden**, mit **Escape** abbrechbar, lässt Zeit, ein Menü oder einen vorübergehenden Zustand vorzubereiten.

Ein Scrollbereich lässt sich mit zwei Punkten oder per Tastatur festlegen. Er behält die gewählte sichtbare Breite bei und setzt die unterstützten Abschnitte vertikal zusammen.

<details>
<summary>Auswahl und Einstellungen ansehen</summary>

![Anpassbare Auswahl: Griffe, Koordinaten und Bestätigung vor der Aufnahme](store-assets/screenshot-real-4-selection-v1.5.0.png)

</details>

### 2. Annotieren und gestalten

Importieren Sie mehrere Bilder oder fügen Sie sie aus der Zwischenablage ein, ändern Sie ihre Reihenfolge und wählen Sie eine vertikale oder horizontale Anordnung. Ergänzen Sie Titel, Bildunterschriften und nummerierte Schritte; passen Sie Abstände, Ränder und Hintergrund an.

Im Editor können Sie unterstützte Annotationen auswählen und bearbeiten. Zeichnungen, Textmarker, Pfeile, Formen, Text und nummerierte Markierungen helfen beim Erklären; deckende Masken schützen vertrauliche Informationen. Mit Rückgängig/Wiederholen und Zoom verfeinern Sie das Ergebnis.

| Gewünschtes Ergebnis | Möglichkeiten |
| --- | --- |
| Ein Bild zum Teilen | PNG, JPEG oder WebP, Kopieren in die Zwischenablage. |
| Ein Dokument zum Lesen | Eigenständiger HTML-Bericht oder Markdown samt Bildern in einer ZIP-Datei. |
| Eine gedruckte Fassung | Drucken/PDF mit Rändern, Ausrichtung, Skalierung und Kopf-/Fußzeilen. |
| Später weiterarbeiten | Portables `.scionos`-Projekt v2; v1-Projekte lassen sich mit ins Bild eingebetteten Annotationen öffnen. |

<details>
<summary>Export- und Layouteinstellungen ansehen</summary>

![Exportdialog: PDF-Layout, Ränder, Ausrichtung und Seitennummerierung](store-assets/screenshot-real-3-export-v1.5.0.png)

</details>

### 3. Projekte speichern und wiederfinden

Die Bibliothek bewahrt Projekte **nach ausdrücklichem Speichern** über das Schließen des Editors hinaus auf. Durchsuchen Sie die Vorschaubilder, suchen Sie nach Titel oder Quelle und öffnen, benennen, duplizieren, exportieren oder löschen Sie ein Projekt.

Wählen Sie eine Aufbewahrungsdauer von **0, 7, 30 oder 90 Tagen** und ein Kontingent von **64 bis 1.024 MiB** — standardmäßig **256 MiB**. **0 Tage** bedeutet keine automatische Löschung nach Ablauf einer Frist. Mit einer portablen Datei behalten Sie eine separate Kopie außerhalb der Bibliothek.

![Lokale Bibliothek: gespeicherte Projekte, Aktionen und Aufbewahrungseinstellungen](store-assets/screenshot-real-2-bibliotheque-v1.5.0.png)

## Datenschutz und Kontrolle über Ihre Daten

- **Lokale Verarbeitung.** Die Erweiterung überträgt keine Aufnahmen, URLs oder Browserdaten an ScioNos oder Dritte. Es wird kein Code aus entfernten Quellen ausgeführt.
- **Selbst gewählte Aufbewahrung.** Temporäre Aufnahmen und Fragmente werden gemäß ihrem Lebenszyklus bereinigt. Bibliotheksprojekte folgen der gewählten Aufbewahrungsdauer; separat gespeicherte Dateien liegen in Ihrer Verantwortung.
- **Deckende Masken für Geheimnisse.** Unschärfe ist ein visueller Effekt. Beim Speichern eines Projekts werden Masken und Zuschnitte unumkehrbar angewendet; betroffene Annotationen werden vorsorglich entfernt. Nach einem Zuschnitt werden vorherige Annotationen ins Bild eingebettet, um Darstellung und Reihenfolge zu erhalten.
- **Vor dem Teilen prüfen.** Projekte und Exporte können Bilder, Titel, Bildunterschriften, Quellen und Datumsangaben enthalten.

Lesen Sie die [Datenschutzerklärung](PRIVACY.de.md) und das [Sicherheitsmodell](SECURITY.de.md).

<details>
<summary>Berechtigungen und temporären Speicher verstehen</summary>

| Berechtigung | Zweck |
| --- | --- |
| `activeTab` und `scripting` | Gewählten Tab aufnehmen und Werkzeuge nach einer ausdrücklichen Aktion injizieren. |
| `storage` | Sprache, Verzögerung, Bibliothekseinstellungen und temporäre Zuordnungen speichern. |
| `unlimitedStorage` | Große Bilder und Projekte lokal speichern; das Anwendungskontingent der Bibliothek bleibt bestehen. |
| `alarms` | Abgelaufene temporäre Daten und Projekte nach Ende ihrer Aufbewahrungsdauer bereinigen. |

Fragmente bleiben in der lokalen IndexedDB und werden nach dem Zusammensetzen oder fünfzehn Minuten Inaktivität gelöscht. Eine fertige Aufnahme bleibt verfügbar, solange ein zugehöriger Editor geöffnet ist, auch nach einem Neuladen. Sie wird beim Schließen des letzten Editors gelöscht; ohne Editor kann sie fünfzehn Minuten nach ihrer Erstellung bereinigt werden. Ein angehaltener Browser kann die Bereinigung bis zum Aufwachen verschieben.

</details>

## Was Sie wissen sollten

- Interne Browserseiten und Erweiterungs-Stores sind gegen das Injizieren von Code geschützt.
- Animierte, virtualisierte oder endlose Inhalte können unvollständig bleiben. Manche festen oder `sticky`-Elemente können zwischen den Abschnitten variieren.
- Die Auswahl durchsucht weder iframe-Inhalte noch geschlossene Shadow Roots.
- Bilder über **16 Millionen Pixel** oder **16.384 px pro Seite** können verkleinert werden. Nicht unterstützte Drehungen, Scherungen und perspektivische Transformationen werden ausdrücklich abgelehnt.
- Durchsuchbarer PDF-Text bleibt nur erhalten, wenn seine Sichtbarkeit überprüfbar ist. Importierte und aus einem Projekt wiederhergestellte Bilder liefern keine zuverlässige Textebene; unsichere Wörter werden aus der Textebene ausgelassen, das Bild bleibt erhalten.
- Übernehmen oder verwerfen Sie ausstehende Änderungen vor einem Export.

## Entwickeln und beitragen

Oberfläche und Hilfe sind auf **Französisch, Englisch, Deutsch und Spanisch** verfügbar. Das Projekt nutzt Manifest V3 und hat keine externen JavaScript-Laufzeitabhängigkeiten.

Empfohlene Voraussetzung: **Node.js 24**. Die Hauptprüfungen bleiben mit Node.js 20 kompatibel.

```bash
npm ci
npm run verify
```

`verify` prüft Syntax, Lint, HTML, Unit-Tests, Übersetzungen, Paket und Browser-/Barrierefreiheitsregressionen. `npm run test:native` testet die fünf Modi in installiertem Chrome und Edge mit echten Aufnahmen und temporären Profilen, ohne persönliche Profile zu nutzen. `npm run package` erzeugt das Archiv und seine Prüfsumme in `dist/`.

Versionsabgleich: `npm run version:sync -- 1.5.0`; in PowerShell: `npm.cmd run version:sync -- 1.5.0`.

<!-- local-package --> Lokales Archiv: scionos-capture-v1.5.0.zip · SHA-256: scionos-capture-v1.5.0.zip.sha256.

[Beitragen](CONTRIBUTING.de.md) · [Änderungen](CHANGELOG.de.md) · [Versionshinweise](RELEASE_NOTES.md) · [Problem melden](https://github.com/ScioNos/Scionos-Capture/issues) · [Sicherheitslücke melden](SECURITY.de.md)

---

Entwickelt von **eyelo SA, Schweiz**, unter der Marke **ScioNos**. [Website](https://scionos.ch) · [Kontakt](mailto:info@eyelo.ch) · [MIT-Lizenz](LICENSE)
