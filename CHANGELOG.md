# Journal des changements

[Français](CHANGELOG.md) · [English](CHANGELOG.en.md) · [Español](CHANGELOG.es.md) · [Deutsch](CHANGELOG.de.md)

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et versionnement sémantique.

## [Unreleased]

## [1.2.0] - 2026-09-22

### Ajouté

- Raccourci clavier par défaut `Alt+Shift+C` et bouton de configuration directe des raccourcis navigateur depuis la popup.
- Sélection par glisser-déposer enrichie d’une action rapide « Jusqu’en bas » pour étendre instantanément la zone au pied du conteneur.
- Nommage automatique des fichiers exportés incluant le titre de la page et un horodatage précis.
- Impression et export PDF multi-pages A4 avec découpage intelligent évitant les césures brutales.
- Cache mémoire IndexedDB (LRU) et sonde ping d’injection prévenant les réinjections superflues du script de contenu.
- Scripts de synchronisation de version, validation stricte d’archive et mise en cache des navigateurs Playwright en CI.

### Corrigé

- Masquage dynamique des barres de saisie stationnaires (ex. ChatGPT, Claude, Notion, Messenger) en `position: absolute` hors du conteneur défilant, n’apparaissant plus qu’une seule fois sur la dernière tuile.
- Stabilisation des dimensions de la page circonscrite à la zone défilante (`range`) évitant les sauts de mise en page.

## [1.1.1] - 2026-09-15

### Corrigé

- Durée de vie des captures orphelines réduite d’une heure à quinze minutes.
- Suppression de l’action de service-worker legacy `OPEN_EDITOR`, inutilisée et non documentée.
- Détection des conteneurs défilants internes (ex. fenêtres de discussion Messenger Facebook) lors de la sélection de zone au lieu de faire défiler la page parente.
- Protection des fenêtres flottantes ancrées (`position: fixed` / `position: sticky`) pour éviter leur masquage intempestif pendant le défilement interne.

## [1.1.0] - 2026-09-14

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

[Unreleased]: https://github.com/ScioNos/Scionos-Capture/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/ScioNos/Scionos-Capture/compare/v1.1.1...v1.2.0
[1.1.1]: https://github.com/ScioNos/Scionos-Capture/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/ScioNos/Scionos-Capture/releases/tag/v1.1.0
[1.0.0]: https://github.com/ScioNos/Scionos-Capture/releases/tag/v1.0.0
