# Datenschutzerklärung

[Français](PRIVACY.md) · [English](PRIVACY.en.md) · [Español](PRIVACY.es.md) · [Deutsch](PRIVACY.de.md)

Zuletzt aktualisiert: 10. November 2026 — Version 1.4.0.

**Verantwortlicher Herausgeber:** eyelo SA (UID: CHE-108.174.302), Waadt (Vaud), Schweiz — Marke **ScioNos** ([scionos.ch](https://scionos.ch)) — Kontakt: info@eyelo.ch

Scionos Capture verarbeitet lokal Pixel, Titel und URL der aufgenommenen Seite sowie die Spracheinstellung. Jede Aufnahme wird ausdrücklich vom Benutzer gestartet.

Die Scrollbereich-Aufnahme verarbeitet mehrere sichtbare Teile derselben Seite und setzt sie lokal zusammen. Sie fügt keine Berechtigung, Netzwerkadresse oder Datenkategorie hinzu.

Keine Aufnahme, URL oder Browserdaten werden an eyelo SA, ScioNos oder Dritte gesendet. Es gibt kein Konto, keine Telemetrie, Werbung oder externe Bibliothek.

Aufnahmen und Textmetadaten bleiben in lokalem IndexedDB. Fragmente werden nach dem Zusammensetzen oder nach fünfzehn Minuten Inaktivität gelöscht; ein angehaltener Browser kann die Bereinigung bis zum Aufwachen verzögern. Die endgültige Aufnahme bleibt erhalten, solange ein zugehöriger Editor-Tab geöffnet ist, auch nach Neuladen und über fünfzehn Minuten hinaus. Beim Schließen des letzten Editors wird sie gelöscht. Ohne Editor kann sie fünfzehn Minuten nach ihrer Erstellung bereinigt werden. Zuordnungen werden beim Aufwachen und Browserneustart mit offenen Tabs abgeglichen.

Sprache und Aufnahmeverzögerung (`captureDelaySeconds`, 0, 3, 5 oder 10 Sekunden) liegen in `chrome.storage.local`, die temporäre Editor-Zuordnung in `chrome.storage.session`. Elementauswahl und Countdown bleiben lokal und benötigen keine weiteren Berechtigungen oder Netzwerkziele. Verzögerte Aufnahmen werden ausdrücklich gestartet und können abgebrochen werden. Alle lokalen Daten können über die Erweiterungsverwaltung oder Deinstallation entfernt werden. Datenschutz-Kontakt: info@eyelo.ch. Für Schwachstellen siehe [SECURITY.de.md](SECURITY.de.md).

Die durchsuchbare PDF-Ebene enthält nur vollständige Wörter mit überprüfbarer Sichtbarkeit. Unsichere Wörter werden aus dieser Ebene ausgelassen; das aufgenommene Bild bleibt erhalten. Ältere Ebenen mit ungeprüften Koordinaten werden ebenfalls ausgelassen. Vertrauliche Pixel müssen deckend maskiert werden; Unschärfe ist nur ein visueller Effekt.

Ausstehende Änderungen vor jedem Export übernehmen oder verwerfen. Unschärfe bleibt ein visueller Effekt; Geheimnisse deckend maskieren.
