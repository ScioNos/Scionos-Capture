# Zu Scionos Capture beitragen

[Français](CONTRIBUTING.md) · [English](CONTRIBUTING.en.md) · [Español](CONTRIBUTING.es.md) · [Deutsch](CONTRIBUTING.de.md)

Keine Screenshots mit persönlichen Daten, Zugangsdaten oder Geheimnissen anhängen.

1. Branch `fix/...`, `feat/...` oder `docs/...` erstellen.
2. Node.js 24 verwenden und `npm ci` ausführen.
3. Keine Laufzeitabhängigkeiten hinzufügen; Entwicklungsabhängigkeiten begründen.
4. Vor dem Pull Request `npm run verify` ausführen.
5. Chrome und Edge manuell testen.

Alle vier Modi prüfen, besonders die zwei Punkte, das Scrollen, Teilabschnitte und Geometriefelder des Scrollbereichs. Auch hohe/breite Seiten, DPR, Tabwechsel, Rückgängig/Wiederholen, Zuschnitt, Abdeckung, Kopieren, PNG/PDF, Zoom, Tastatur und vier Sprachen abdecken. Neue Texte in alle `_locales/*/messages.json` aufnehmen. Manifest-Berechtigungen minimal, dokumentiert und validiert halten.

Node.js 24 wird für die vollständige Prüfung empfohlen, einschließlich PDF-Textextraktion mit PDF.js 6.3.289 (nur als Testabhängigkeit). Die Hauptprüfungen bleiben mit Node.js 20 kompatibel.

Eine unveröffentlichte Version mit `npm run version:sync -- 1.3.3 --unreleased` synchronisieren; in PowerShell `npm.cmd run version:sync -- 1.3.3 --unreleased` verwenden. Veröffentlichte Download-Links bleiben erhalten.

Ausstehende Änderungen vor jedem Export übernehmen oder verwerfen. Unschärfe bleibt ein visueller Effekt; Geheimnisse deckend maskieren. Verschobene und skalierte Aufnahmecontainer werden unterstützt. Nicht unterstützte Drehungen, Scherungen und Perspektiven führen zu einer ausdrücklichen Fehlermeldung.

`npm run test:native` prüft alle vier Modi in installiertem Chrome und Edge mit echten Aufnahmen und temporären Profilen. Die Erweiterungsaktion gewährt `activeTab`; persönliche Profile werden nicht verwendet.
