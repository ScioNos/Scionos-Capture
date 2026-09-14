# Journal des changements

[Français](CHANGELOG.md) · [English](CHANGELOG.en.md) · [Español](CHANGELOG.es.md) · [Deutsch](CHANGELOG.de.md)

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et versionnement sémantique.

## [Unreleased]

## [1.1.0] - 2026-08-23

### Ajouté

- Transfert segmenté et persistant des captures volumineuses, compatible Manifest V3.
- Prise en charge des zones défilantes dans les conteneurs internes et validation Windows dédiée.

### Corrigé

- Décalages avec mise à l’échelle Windows, zoom fractionnaire et barres de défilement classiques.
- Répétition des en-têtes fixes ou collants, coutures entre tuiles et pages changeant pendant la capture.
- Nettoyage des captures après décodage, transferts interrompus, fallback de langue et détection des pages non supportées.


## [1.0.0] - 2026-08-22

### Ajouté

- Version initiale officielle de **Scionos Capture** par **eyelo SA** (ScioNos, Suisse).
- 4 modes de capture complets : Onglet visible, Page complète (assemblage 2D), Sélection libre et Zone défilante multi-écrans.
- Éditeur d'annotations riche : rectangles, ellipses, flèches, texte, surlignage, flou/masquage solide et recadrage sans perte.
- Export polyvalent : Téléchargement PNG haute résolution, copie directe dans le presse-papiers, impression et **Rapport HTML interactif autonome** (visionneuse zoom/pan intégrée avec métadonnées).
- Nouveau logo officiel et monogramme SN avec viseur de capture dégradé.
- Traitement 100 % local sans aucun serveur externe, zéro télémétrie et respect strict de la confidentialité (RGPD / nDPA suisse).
- Internationalisation complète en 4 langues : Français, Anglais, Espagnol et Allemand.
- Accessibilité totale (WCAG, contrastes élevés, navigation clavier, lecteurs d'écran).
- Export PNG, presse-papiers et impression/enregistrement PDF.
- Tests unitaires, intégration, packaging, E2E Chromium et audit Axe automatisé.
- Workflows GitHub Actions pour CI et publication reproductible.

### Corrigé

- Assemblage de la dernière tranche et des pages plus larges que la fenêtre.
- Collisions entre captures, changement d’onglet et restauration après erreur.
- Zoom qui rognait le canvas et barre d’outils non responsive.
- Traductions incomplètes, raccourci codé en dur, contrastes et noms accessibles.
- Descriptions localisées dépassant la limite de 132 caractères.
- Conservation temporaire plus longue que celle annoncée et perte au rechargement de l’éditeur.

[Unreleased]: https://github.com/ScioNos/Scionos-Capture/compare/v1.1.0...HEAD
[1.0.0]: https://github.com/ScioNos/Scionos-Capture/releases/tag/v1.0.0

[1.1.0]: https://github.com/ScioNos/Scionos-Capture/releases/tag/v1.1.0
