# Datenschutzerklärung

[Français](PRIVACY.md) · [English](PRIVACY.en.md) · [Español](PRIVACY.es.md) · [Deutsch](PRIVACY.de.md)

Zuletzt aktualisiert: 17. November 2026 — Dokumentation der Version 1.5.2.

**Verantwortlicher Herausgeber:** eyelo SA (UID: CHE-108.174.302), Waadt (Vaud), Schweiz — Marke **ScioNos** ([scionos.ch](https://scionos.ch)) — Kontakt: info@eyelo.ch

Scionos Capture verarbeitet lokal Pixel, Titel und URL der aufgenommenen Seite sowie die Spracheinstellung. Jede Aufnahme wird ausdrücklich vom Benutzer gestartet.

Die Scrollbereich-Aufnahme verarbeitet mehrere sichtbare Teile derselben Seite und setzt sie lokal zusammen. Sie fügt keine Berechtigung, Netzwerkadresse oder Datenkategorie hinzu.

Keine Aufnahme, URL oder Browserdaten werden an eyelo SA, ScioNos oder Dritte gesendet. Es gibt kein Konto, keine Telemetrie, Werbung oder externe Bibliothek.

Aufnahmen und Textmetadaten bleiben in lokalem IndexedDB. Fragmente werden nach dem Zusammensetzen oder nach fünfzehn Minuten Inaktivität gelöscht; ein angehaltener Browser kann die Bereinigung bis zum Aufwachen verzögern. Die endgültige Aufnahme bleibt erhalten, solange ein zugehöriger Editor-Tab geöffnet ist, auch nach Neuladen und über fünfzehn Minuten hinaus. Beim Schließen des letzten Editors wird sie gelöscht. Ohne Editor kann sie fünfzehn Minuten nach ihrer Erstellung bereinigt werden. Zuordnungen werden beim Aufwachen und Browserneustart mit offenen Tabs abgeglichen.

Sprache und Aufnahmeverzögerung (`captureDelaySeconds`, 0, 3, 5 oder 10 Sekunden) liegen in `chrome.storage.local`, die temporäre Editor-Zuordnung in `chrome.storage.session`. Elementauswahl und Countdown bleiben lokal und benötigen keine weiteren Berechtigungen oder Netzwerkziele. Verzögerte Aufnahmen werden ausdrücklich gestartet und können abgebrochen werden. Von der Erweiterung gespeicherte Daten können über die Erweiterungsverwaltung oder Deinstallation entfernt werden. Exportierte Dateien oder auf dem Gerät gespeicherte Projekte müssen Benutzer separat löschen. Datenschutz-Kontakt: info@eyelo.ch. Für Schwachstellen siehe [SECURITY.de.md](SECURITY.de.md).

Die durchsuchbare PDF-Ebene enthält nur vollständige Wörter mit überprüfbarer Sichtbarkeit. Unsichere Wörter werden aus dieser Ebene ausgelassen; das aufgenommene Bild bleibt erhalten. Ältere Ebenen mit ungeprüften Koordinaten werden ebenfalls ausgelassen. Vertrauliche Pixel müssen deckend maskiert werden; Unschärfe ist nur ein visueller Effekt.

Ausstehende Änderungen vor jedem Export übernehmen oder verwerfen. Unschärfe bleibt ein visueller Effekt; Geheimnisse deckend maskieren.

## Datenschutz der Version 1.5.2

**1.5.2 — auf GitHub veröffentlicht.** GitHub-Release: [v1.5.2](https://github.com/ScioNos/Scionos-Capture/releases/tag/v1.5.2). Der aktuelle Chrome-Web-Store-Status ist unbestätigt; hier erfolgt keine Store-Einreichung von 1.5.2.

Die Korrekturen wenden die Quellenrichtlinie auch im gesamten HTML-Generator an. `sanitized` entfernt Abfrage und Fragment, `none` lässt Quellen weg und `full` behält URLs; HTTP(S)-Zugangsdaten werden immer entfernt. Interne Editor-Miniaturen und Kompositionsvorschau werden aus dem erneut geöffneten Projekt einschließlich Annotationen rekonstruiert. Ein portabler Export entfernt den Hinweis auf ungespeicherte Änderungen nicht; „Download angefordert“ bestätigt keine Datei auf dem Datenträger. Berechtigungen und lokale Verarbeitung bleiben unverändert.

## Datenschutz der Version 1.5.1 — auf GitHub veröffentlicht; Store-Status unbestätigt

Im Bereich Dokument gilt die Quellenrichtlinie für gespeicherte Projekte und Exporte: sanitized (Standard) entfernt URL-Abfrageparameter und Fragmente, none lässt Quellen weg und full behält sie bei. In HTTP(S)-URLs eingebettete Zugangsdaten werden immer entfernt, auch im Modus full. Beim Speichern entfernte Quellen sind nicht wiederherstellbar; ein späterer Moduswechsel stellt sie nicht wieder her. Bibliotheksexporte verwenden immer sanitized, auch für vor dieser Version gespeicherte Projekte.

Diese Filterung anonymisiert das Dokument nicht: URL-Pfade, Pixel, Titel, Bildunterschriften und Datumsangaben können weiterhin vertrauliche Informationen enthalten. Vor dem Teilen prüfen. Bereits exportierte Kopien bleiben unter Ihrer Kontrolle und werden durch eine Richtlinienänderung nicht angepasst.

Die Diagnose ist lokal und muss ausdrücklich aktiviert werden; sie fügt weder Telemetrie noch automatische Übertragung hinzu. Berechtigungen unverändert. Projekte v1/v2 bleiben lesbar, geschrieben wird v2; der unumkehrbare Schutz durch Masken und Zuschnitte gilt weiterhin.

## Datenschutzumfang der Version 1.5.0

Dieser Abschnitt beschreibt den Datenschutzumfang der veröffentlichten Version 1.5.0.

Der Import von Bilddateien, ausdrücklich angefordertes Einfügen aus der Zwischenablage und die Komposition mehrerer Bilder verarbeiten lokal die gewählten Bilder sowie Titel, Bildunterschriften, Schritte und vorhandene Quellen-/Datumsmetadaten. Diese Vorgänge übertragen keine Daten an einen Server.

Version 1.5.0 verwendet das portable lokale Format `.scionos` v2 mit einzeln bearbeitbaren Annotationen und dem Öffnen von v1-Projekten; deren Annotationen bleiben zusammengeführt. Beim Speichern werden deckende Masken und Zuschnitte unumkehrbar auf die gespeicherten Bilder angewendet; betroffene Annotationen werden konservativ entfernt. Importierte Dateien und v1-Projekte besitzen keine zuverlässige Textebene. Beim Speichern nach einem Zuschnitt werden alle vorherigen Annotationen zusammengeführt, um Darstellung und Reihenfolge zu erhalten.

PNG-, JPEG-, WebP-, HTML-, Markdown/ZIP- und PDF-Exporte sowie Ausdrucke können Bilder und gewählte Kompositionsinformationen enthalten. Titel, Quellen, Datumsangaben und Inhalt vor dem Teilen eines Exports oder Projekts prüfen. Gespeicherte Dateien bleiben am vom Benutzer gewählten Ort auf dem Gerät; temporäre Bereinigung und Deinstallation der Erweiterung löschen sie nicht. Benutzer verwalten Aufbewahrung, Weitergabe und Löschung.

Eine dauerhafte lokale Bibliothek mit ausdrücklichem Speichern ist verfügbar: Vorschaubilder, Suche, Umbenennen, Duplizieren und Löschen. Benutzer wählen 0, 7, 30 oder 90 Tage und ein Kontingent von 64 bis 1.024 MiB, standardmäßig 256 MiB; 0 Tage bedeutet keine automatische Ablaufzeit. Lokal gespeicherte Projekte können Bilder, Annotationen und Metadaten enthalten. Vertrauliche Pixel müssen weiterhin deckend maskiert werden; Unschärfe ist nur ein visueller Effekt.
