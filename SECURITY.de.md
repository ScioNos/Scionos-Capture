# Sicherheit

[Français](SECURITY.md) · [English](SECURITY.en.md) · [Español](SECURITY.es.md) · [Deutsch](SECURITY.de.md)

Richtlinie am 17. November 2026 für Version 1.5.2 aktualisiert — auf GitHub veröffentlicht. Die unterstützte Linie ist `1.5.x`. Version [v1.5.2](https://github.com/ScioNos/Scionos-Capture/releases/tag/v1.5.2) ist auf GitHub veröffentlicht; der aktuelle Chrome-Web-Store-Status ist unbestätigt und hier erfolgt keine Store-Einreichung von 1.5.2.

Für ausnutzbare Schwachstellen kein öffentliches Issue öffnen. Nutzen Sie die [private GitHub-Meldung](https://github.com/ScioNos/Scionos-Capture/security/advisories/new) oder kontaktieren Sie `info@eyelo.ch` und nennen Sie Version, Auswirkung, Schritte und möglichst einen nicht destruktiven Nachweis.

Eine Bestätigung wird innerhalb von 3 Arbeitstagen, eine erste Bewertung innerhalb von 7 Arbeitstagen angestrebt. Koordinierte Offenlegung erfolgt nach Bereitstellung einer Korrektur.

Aufnahmen einschließlich Scrollbereich-Kacheln bleiben lokal. Es laufen keine externen Skripte und der neue Modus fügt keine Berechtigung hinzu. Verwaiste Aufnahmen laufen nach fünfzehn Minuten ab. Für Geheimnisse eine volle Abdeckung verwenden; Unschärfe ist keine kryptografische Löschung.

Die durchsuchbare PDF-Ebene enthält nur vollständige Wörter mit überprüfbarer Sichtbarkeit. Unsichere Wörter werden aus dieser Ebene ausgelassen; das aufgenommene Bild bleibt erhalten. Ältere Ebenen mit ungeprüften Koordinaten werden ebenfalls ausgelassen. Vertrauliche Pixel müssen deckend maskiert werden; Unschärfe ist nur ein visueller Effekt.

Ausstehende Änderungen vor jedem Export übernehmen oder verwerfen. Unschärfe bleibt ein visueller Effekt; Geheimnisse deckend maskieren.

## Schutzmaßnahmen der Version 1.5.2

Die Korrekturen betreffen Zieh-Unterbrechungen und den aktiven `pointerId`, rekonstruierte interne Editor-Miniaturen und Kompositionsvorschau, Quellenrichtlinien in jedem HTML-Bericht und die Entfernung des alten Exportmoduls aus dem Paket (35 Dateien). Drucken/PDF ist auf 32 Millionen kumulierte Pixel, 128 MiB kumulierte Blobs und 200 Seiten begrenzt. Ein portabler Export behält den Status ungespeicherter Änderungen; seine Meldung bestätigt nur die Download-Anforderung. Validierung 1.5.2: `npm run verify:release` erfolgreich — 133 Unit-Tests, 126 Browsertests, je fünf Modi in Chrome 157.0.8103.79 und Edge 157.0.4341.60, drei Leistungswiederholungen und zehn PDF-Szenarien. Ergebnisse und Umgebung: [Abhängigkeitsprüfung und Validierung](DEPENDENCY_REVIEW_1.5.2.md).
