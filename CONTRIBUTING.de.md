# Zu Scionos Capture beitragen

[Français](CONTRIBUTING.md) · [English](CONTRIBUTING.en.md) · [Español](CONTRIBUTING.es.md) · [Deutsch](CONTRIBUTING.de.md)

Keine Screenshots mit persönlichen Daten, Zugangsdaten oder Geheimnissen anhängen.

1. Branch `fix/...`, `feat/...` oder `docs/...` erstellen.
2. Node.js 24.8+ verwenden und `npm ci` ausführen.
3. Keine Laufzeitabhängigkeiten hinzufügen; Entwicklungsabhängigkeiten begründen.
4. Vor dem Pull Request `npm run verify` ausführen.
5. Chrome und Edge manuell testen.

Alle fünf Modi prüfen, besonders die zwei Punkte, das Scrollen, Teilabschnitte und Geometriefelder des Scrollbereichs. Auch hohe/breite Seiten, DPR, Tabwechsel, Rückgängig/Wiederholen, Zuschnitt, Abdeckung, Kopieren, PNG/PDF, Zoom, Tastatur und vier Sprachen abdecken. Neue Texte in alle `_locales/*/messages.json` aufnehmen. Manifest-Berechtigungen minimal, dokumentiert und validiert halten.

Entwicklungs- und Testabhängigkeiten benötigen Node.js `^22.22.0 || >=24.8.0`; Node.js 24.8+ wird empfohlen. PDF.js 6.5.438 wird nur für PDF-Textextraktionstests verwendet. Die CI prüft Node.js 22.22.0 und 24.8.0.

Versionsabgleich für die GitHub-Veröffentlichung: `npm run version:sync -- 1.5.2`; in PowerShell: `npm.cmd run version:sync -- 1.5.2`. Dieser Befehl ändert auch Paketversionsdateien; nur im Rahmen ihrer abgestimmten Aktualisierung ausführen.

Ausstehende Änderungen vor jedem Export übernehmen oder verwerfen. Unschärfe bleibt ein visueller Effekt; Geheimnisse deckend maskieren. Verschobene und skalierte Aufnahmecontainer werden unterstützt. Nicht unterstützte Drehungen, Scherungen und Perspektiven führen zu einer ausdrücklichen Fehlermeldung.

`npm run test:native` prüft alle fünf Modi in installiertem Chrome und Edge mit echten Aufnahmen und temporären Profilen. Die Erweiterungsaktion gewährt `activeTab`; persönliche Profile werden nicht verwendet.

Validierung 1.5.2: `npm run verify:release` erfolgreich — 133 Unit-Tests, 126 Browsertests, je fünf Modi in Chrome 157.0.8103.79 und Edge 157.0.4341.60, drei Leistungswiederholungen und zehn PDF-Szenarien. Ergebnisse und Umgebung: [Abhängigkeitsprüfung und Validierung](DEPENDENCY_REVIEW_1.5.2.md).

Für künftige Releases führt `npm run verify:release` die Prüfungen, nativen Browsertests sowie allgemeinen und PDF-Leistungsmessungen aus. Ergebnisse des geprüften Pakets protokollieren.
