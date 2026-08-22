# Zu Scionos Capture beitragen

[Français](CONTRIBUTING.md) · [English](CONTRIBUTING.en.md) · [Español](CONTRIBUTING.es.md) · [Deutsch](CONTRIBUTING.de.md)

Keine Screenshots mit persönlichen Daten, Zugangsdaten oder Geheimnissen anhängen.

1. Branch `fix/...`, `feat/...` oder `docs/...` erstellen.
2. Node.js 20 oder 24 verwenden und `npm ci` ausführen.
3. Keine Laufzeitabhängigkeiten hinzufügen; Entwicklungsabhängigkeiten begründen.
4. Vor dem Pull Request `npm run verify` ausführen.
5. Chrome und Edge manuell testen.

Alle vier Modi prüfen, besonders die zwei Punkte, das Scrollen, Teilabschnitte und Geometriefelder des Scrollbereichs. Auch hohe/breite Seiten, DPR, Tabwechsel, Rückgängig/Wiederholen, Zuschnitt, Abdeckung, Kopieren, PNG/PDF, Zoom, Tastatur und vier Sprachen abdecken. Neue Texte in alle `_locales/*/messages.json` aufnehmen. Manifest-Berechtigungen minimal, dokumentiert und validiert halten.
