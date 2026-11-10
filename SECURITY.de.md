# Sicherheit

[Français](SECURITY.md) · [English](SECURITY.en.md) · [Español](SECURITY.es.md) · [Deutsch](SECURITY.de.md)

Richtlinie am 10. November 2026 für Version 1.4.0 aktualisiert. Die unterstützte Linie ist `1.4.x`; ihre neueste Version erhält Sicherheitskorrekturen.

Für ausnutzbare Schwachstellen kein öffentliches Issue öffnen. Nutzen Sie die [private GitHub-Meldung](https://github.com/ScioNos/Scionos-Capture/security/advisories/new) oder kontaktieren Sie `info@eyelo.ch` und nennen Sie Version, Auswirkung, Schritte und möglichst einen nicht destruktiven Nachweis.

Eine Bestätigung wird innerhalb von 3 Arbeitstagen, eine erste Bewertung innerhalb von 7 Arbeitstagen angestrebt. Koordinierte Offenlegung erfolgt nach Bereitstellung einer Korrektur.

Aufnahmen einschließlich Scrollbereich-Kacheln bleiben lokal. Es laufen keine externen Skripte und der neue Modus fügt keine Berechtigung hinzu. Verwaiste Aufnahmen laufen nach fünfzehn Minuten ab. Für Geheimnisse eine volle Abdeckung verwenden; Unschärfe ist keine kryptografische Löschung.

Die durchsuchbare PDF-Ebene enthält nur vollständige Wörter mit überprüfbarer Sichtbarkeit. Unsichere Wörter werden aus dieser Ebene ausgelassen; das aufgenommene Bild bleibt erhalten. Ältere Ebenen mit ungeprüften Koordinaten werden ebenfalls ausgelassen. Vertrauliche Pixel müssen deckend maskiert werden; Unschärfe ist nur ein visueller Effekt.

Ausstehende Änderungen vor jedem Export übernehmen oder verwerfen. Unschärfe bleibt ein visueller Effekt; Geheimnisse deckend maskieren.
