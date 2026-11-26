# Journal des changements

[Français](CHANGELOG.md) · [English](CHANGELOG.en.md) · [Español](CHANGELOG.es.md) · [Deutsch](CHANGELOG.de.md)

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et versionnement sémantique.

## [Unreleased]

### Préparation 1.5.3 — 26 novembre 2026

**Préparation locale, non publiée.** La validation finale des tests est encore en cours ; les résultats et limites seront consignés dans le [rapport de consolidation](CONSOLIDATION_1.5.3.md). Aucune release GitHub ni soumission Store n’est effectuée. Les liens publics 1.5.2 et leurs archives restent ceux de la publication existante.

- Capture : contrôles de l’onglet actif, de la fenêtre et de la navigation avant et après acquisition, avec sonde liée au `documentId`. L’URL et le titre sont figés au début de la session.
- PDF : invalidation de la couche texte lors de mutations DOM/CSSOM, de feuilles CSS inaccessibles, de changements de média ou d’animations ; exclusion du texte blanc sur blanc et omission du texte sous modes de fusion ou fonds image lorsque sa visibilité est incertaine (régression `SECRET_BLEND` invisible sur fond blanc confirmée et corrigée). Ces contrôles ne prouvent pas une correspondance absolue pixels/texte lorsqu’un changement CSSOM transitoire est rétabli entre les observations. L’absence de texte est privilégiée en cas de doute ; vérifiez les pixels et utilisez un masque solide pour les secrets.
- Captures : budget de 180 secondes contrôlé coopérativement aux points de contrôle, et maximum de 256 portions. Il ne s’agit pas d’une interruption préemptive à 180 secondes ; les pages trop longues sont refusées.
- Ressources : budget cumulé de 32 millions de pixels, incluant les originaux conservés après rognage ; Annuler/Refaire reste borné par ce budget. Au plus deux instantanés sont simultanément en vol, jusqu’à la fin de l’export, de la copie dans le presse-papiers ou de la sauvegarde. Les surfaces Canvas créées par ces opérations sont réduites à 1 × 1 dans `finally`, sans modifier les surfaces reçues en entrée.
- Annotations : 1 000 par image et 5 000 par document ; 10 000 points par tracé et 100 000 par document. Historique global limité à 100 états, 100 000 points et 5 000 opérations.
- Stockage : cache de captures retiré pour éviter les données périmées entre contextes ; fermeture des connexions IndexedDB abandonnées. La suppression totale transactionnelle déjà présente dans l’arbre local est intégrée et préservée, avec annulation intégrale en cas d’échec.
- Imports : validation stricte des données de transparence PNG `tRNS`. Lecture des projets v1/v2 et écriture v2 conservées. Aucune nouvelle permission ni télémétrie.
- Interface : correction du chevauchement de la barre d’outils ; les commandes d’annotation restent groupées dans la même barre de 56 px, sans déplacement du canevas ni décalage pendant le glisser. Les états inertes `historyRevision`, `historyConsolidation` et `redoOperations` sont retirés.
- Compatibilité : minimum du manifeste Chrome/Edge 106 au lieu de 102 ; CSS `:has()` exige Chrome 105 et `documentId` Chrome 106. Ce minimum est identifié par analyse statique ; les seules exécutions natives attestées concernent Chrome/Edge 158, sans exécution démontrée de Chrome/Edge 106.
- Outils : `@axe-core/playwright` 4.14.1, `html-validate` 11.22.1, override `minimatch` 11.0.9 ; override `glob` inactif retiré et Actions mises à jour. Voir la [revue des dépendances](DEPENDENCY_REVIEW_1.5.3.md).
- Bibliothèque : réutilisation bornée des cartes et miniatures implémentée ; mesure du gain de performance encore en cours. Le traitement par lots visé pour 1.6 n’est pas implémenté.

## [1.5.2] — 2026-11-17

**Candidate Store 1.5.2 corrigée localement.** La release GitHub existante conserve son tag et son archive antérieure ; elle ne contient pas ces nouvelles corrections. Aucune soumission Store effectuée. Voir [le bilan de préparation](STORE_READINESS_1.5.2.md).

- Sélections : suivi du pointeur actif, rejet des pointeurs secondaires et nettoyage des gestes interrompus.
- Capture : restauration des éléments masqués même en cas d’exception pendant leur préparation.
- Bibliothèque : suppression globale atomique, avec rejet des listes périmées et annulation intégrale en cas d’échec.
- Glissers dans l’éditeur : suivi du `pointerId` actif et gestion des interruptions du geste.
- Miniatures internes de l’éditeur et aperçu de composition : reconstruction à la réouverture du projet pour inclure les annotations.
- Bouton « Exporter projet » : l’état « modifications non enregistrées » reste actif ; le message indique que le téléchargement a été demandé, sans garantir son enregistrement par le navigateur.
- Rapports HTML : application de la politique de sources dans tous les chemins du générateur, avec retrait systématique des identifiants HTTP(S).
- Impression/PDF : limites cumulées de 32 millions de pixels et 128 Mio de blobs, avec un maximum de 200 pages.
- Paquet : ancien module `editor-export.js` retiré, soit 35 fichiers de distribution.
- Outils de test mis à jour : axe-core/Playwright 4.14.0, Playwright Test 1.65.1, fake-indexeddb 6.2.8 et PDF.js 6.5.438. Outils ESLint et HTML-Validate migrés vers @eslint/js 10.0.1, eslint 10.15.0 et html-validate 11.21.1. Prérequis Node.js : ^22.22.0 ou >=24.8.0 ; la matrice CI cible Node.js 22.22.0 et 24.8.0, sans exécution GitHub attestée pour cette migration. Détails : [migration majeure des dépendances](MAJOR_DEPENDENCY_MIGRATION.md).
- Accessibilité : le nom annoncé du sélecteur de langue inclut son code visible, avec vérification dans les quatre langues.

Validation 1.5.2 : `npm run verify:release` a réussi — 133 tests unitaires, 126 tests navigateur, cinq modes chacun dans Chrome 157.0.8103.79 et Edge 157.0.4341.60, trois répétitions de performance et dix scénarios PDF. Résultats et environnement : [revue des dépendances et validation](DEPENDENCY_REVIEW_1.5.2.md).

## [1.5.1] — publiée sur GitHub

La version 1.5.1 est publiée sur GitHub. Le statut actuel et la version distribuée sur le Chrome Web Store ne sont pas confirmés ; ils doivent être vérifiés dans le tableau de bord.

### Confidentialité et robustesse

- Politique de sources dans le panneau Document : sanitized par défaut retire requête et fragment, none omet les sources, full les conserve ; identifiants HTTP(S) toujours retirés. Le choix s’applique aux projets et exports ; les sources retirées à la sauvegarde ne sont pas récupérables. L’export de bibliothèque utilise toujours sanitized, anciens projets compris.
- Les chemins d’URL, titres, légendes, dates et pixels peuvent encore être sensibles ; diagnostic local sur activation explicite, sans télémétrie. Permissions inchangées.
- Exports et projets : un instantané PNG par image ; vignettes de bibliothèque produites directement et nettoyage tenant compte d’une impression en cours.
- Imports PNG/JPEG/WebP : refus avant décodage au-delà de 16 millions de pixels ou de 16 384 px par côté, au lieu d’une réduction ; cumul de composition inchangé à 32 millions de pixels.
- Lecture des projets v1/v2 et écriture v2 conservées ; renommage limité aux métadonnées avec une validation du codec, en préservant les PNG.

## [1.5.0] - 2026-11-14

### Ajouté

- Composition multi-images avec import local ou collage, réordonnancement, assemblage vertical/horizontal, titres, légendes et étapes numérotées.
- Exports PNG, JPEG, WebP, HTML, Markdown/ZIP, PDF et impression avec réglages de qualité et de présentation.
- Annotations individuellement éditables et projets portables `.scionos` v2, avec lecture des projets v1 aplatis et application irréversible des masques/rognages à la sauvegarde.
- Bibliothèque locale durable avec enregistrement explicite, recherche, renommage, duplication, suppression, rétention configurable et quota borné.
- Aide plus visible et affichage de la version réellement chargée.

### Corrigé

- Les sauvegardes rapprochées de bibliothèque suivent l’ordre des clics et restent liées au bon document, même si un autre projet est ouvert pendant l’encodage.
- Les annotations déplacées ou dupliquées au-delà des bords restent sauvegardables et réouvrables, avec des coordonnées bornées.

## [1.4.0] - 2026-11-10

### Ajouté

- Cinquième mode « Élément au clic » : surbrillance au survol, choix du bloc parent/enfant et capture de la partie visible ou du contenu entier d’un conteneur défilant.
- Confirmation de sélection avant capture avec poignées de redimensionnement, coordonnées X/Y/largeur/hauteur et commandes clavier.
- Délai immédiat ou de 3, 5 ou 10 secondes, mémorisé localement, avec compte à rebours annulable après confirmation de la sélection.
- Interface et aide traduites en français, anglais, espagnol et allemand. Le sélecteur d’élément ne parcourt pas les contenus internes des iframes.

### Corrigé

- Les bandeaux visibles placés dans un parent fixe à hauteur nulle, notamment le bandeau cookies de X.com, ne se répètent plus à chaque portion de capture ; ils sont conservés une seule fois en bas de l’image.
- Sélection défilante : l’ajout de contenu en bas d’un fil dynamique, comme sur X.com, n’interrompt plus une capture bornée à une zone. Les changements de largeur, de fenêtre et les réductions de hauteur restent contrôlés ; la capture de page entière conserve son contrôle strict.

## [1.3.3] - 2026-10-05

- Captures : assemblage rectangulaire commun, sélection horizontale sans étirement, coordonnées corrigées pour les conteneurs translatés ou mis à l’échelle ; transformations complexes refusées explicitement.
- Sélection : défilement automatique aux bords du conteneur choisi, largeur et origine horizontale verrouillées dans le mode vertical, surcouches utilisables au-dessus des dialogues modaux.
- Assemblage : pied de page fixe conservé intégralement lorsque la dernière tranche est plus courte ; restauration après annulation et réponses tardives ignorées.
- Confidentialité : texte recouvert par un descendant exclu du PDF ; masque libre continu, y compris entre points éloignés et lors d’un simple clic.
- Exports : validation ou annulation obligatoire des modifications en attente ; pixels et métadonnées issus de la même révision pour PNG, HTML, copie et PDF.
- HTML : image incorporée une seule fois, contrôle de taille en octets, défilement des longues images et zoom 100 % corrigés ; extraction textuelle arrêtée au plafond de 1 500 blocs.
- Maintenance : version 1.3.3 distincte des téléchargements publiés, synchronisation `--unreleased`, vérification des Markdown et régressions sur pixels réels, PDF et quatre DPR.

## [1.3.2] - 2026-09-30

### Corrigé

- Coordonnées CSS, conteneurs et pixels unifiées ; sélection avec défilement automatique de la page rétablie ; métadonnées textuelles ajustées au DPR et aux réductions.
- Assemblage sans réécriture des portions déjà capturées ; éléments fixes et collants réévalués à chaque tuile, y compris après changement de position ou apparition hors écran.
- PDF : texte collecté par tuile, exclusions des mots recouverts, invisibles ou partiellement rognés ; rognage et masquage alignés sur les pixels ; anciens calques aux coordonnées non vérifiables omis.
- Éditeur : URL longue contenue, ajustement à la largeur disponible, champ Texte conservant le focus, annulation native des champs, compteur des pastilles après rétablissement et consolidation asynchrone de l’historique corrigés.
- Captures conservées tant que leur éditeur est ouvert, supprimées à sa fermeture ; expiration des orphelins et transferts abandonnés ; associations reconstituées au réveil.

### Maintenance et validation

- Délais de stabilisation et de collecte textuelle bornés ; dépendances transitives corrigées ; tests sur pixels réels, quatre facteurs d’échelle et extraction effective de PDF.

## [1.3.1] - 2026-09-28

### Ajouté

- Outil Surligneur (`H`) semi-transparent dans l'éditeur avec raccourci, aide intégrée et traductions.
- Découpage et pagination automatique des longues captures pour l'impression/PDF en tranches avec en-têtes répétés et calque de texte interrogeable par page.
- Défilement automatique étendu aux conteneurs internes scrollables avec assemblage multi-tuiles de la région.
- Horodatage des exports au format local standardisé `AAAA-MM-JJ_HH-mm`.

### Corrigé

- Couche de texte PDF : les blocs issus des liens `<a>` sont de nouveau exportés comme hyperliens cliquables (champ `url` pris en compte).
- Sélection défilante : un glisser fin (largeur ou hauteur > 10 px) valide désormais la zone au relâcher du pointeur.
- Internationalisation : la clé `statusZone` est incluse dans le bundle des scripts de contenu (libellé de l'overlay pour les lecteurs d'écran).
- Aide : le raccourci de l'outil Forme est corrigé (`S` au lieu de `R`).
- Éditeur : le rechargement de la page conserve la capture (l'accusé de réception ne purge plus le blob, nettoyage à la fermeture de l'onglet ou à l'expiration).
- Impression/PDF : les URL sources non HTTP(S) affichent un texte simple au lieu d'un lien vide.
- Popup : l'échec d'ouverture de la page des raccourcis affiche désormais l'erreur au lieu d'un rejet silencieux.
- Historique : l'aplatissement après 100 opérations conserve le calque de texte ; l'annulation d'une pastille restaure son compteur.
- Noms de fichiers : troncature sur frontières de points de code (émojis préservés) ; options de fond de texte et erreurs du rapport HTML traduites dans les 4 langues.

### Modifié & Performances

- Robustesse des tuiles : réessais avec backoff sur limitation de `captureVisibleTab` (changement d'onglet non re-tenté).
- Performances : classification des éléments ancrés mise en cache par tentative, pré-filtres layout avant calculs de style, balayages de conteneurs dédupliqués.
- Extraction de texte : vérification de la visibilité réelle via `checkVisibility` (opacité héritée prise en compte).
- Persistance : cache mémoire IndexedDB réellement LRU et borné.
- Maintenance : liste unique des fichiers du ZIP partagée entre packaging et validation ; cache interne du stockage non exposé.

## [1.3.0] - 2026-09-25

### Ajouté

- Défilement automatique continu (*drag-to-scroll*) lors de la sélection de zone à la souris, étendant la zone capturée au-delà de la hauteur visible avec assemblage multi-tuiles fluide.
- Génération de PDF avec texte vectoriel indexable (`Ctrl+F`), texte sélectionnable et hyperliens `<a>` cliquables superposés à la capture.
- Élimination automatique et sécurisée des blocs de texte sous les zones censurées (masquage solide ou flou) pour préserver la confidentialité dans le PDF exporté.
- Outils d'annotation vectorielle : flèche directionnelle avec tête proportionnelle (`tool-arrow`), formes rectangle et ellipse en contour ou remplissage (`tool-shape`), texte annoté sur canevas avec fond contrasté (`tool-text`), et pastilles d'étapes numérotées auto-incrémentées 1, 2, 3... avec bouton de réinitialisation (`tool-step`).
- Page et guide d'aide hors-ligne complet (`help.html`) accessible via le bouton `?` depuis la popup et l'éditeur.
- Raccourcis clavier d'éditeur additionnels : `A` (flèche), `S` (forme), `T` (texte), `P` (pastille).
- Couverture de test étendue à 36 tests unitaires et 14 tests de bout en bout (Playwright E2E).

### Corrigé

- Résolution fiable du raccourci clavier dans la popup : prise en charge hybride (Promise et callback) pour `chrome.commands.getAll`, éliminant le faux affichage « Non configuré » lorsque `Alt+Shift+C` est actif.
- Conformité Manifest V3 : suppression du champ invalide `description` sous `_execute_action` dans `manifest.json`.
- Archive de distribution complète : inclusion garantie de `help.html` et `help.js` dans le ZIP de distribution avec validation de présence renforcée.
- Performances de l'éditeur : suppression du redimensionnement systématique du canvas à chaque rendu pour éviter la réinitialisation inutile du contexte graphique sur les grandes captures.
- Synchronisation de version atomique : échec explicite en amont si `package-lock.json` est absent ou invalide, et préparation en mémoire avant écriture disque.
- Validation stricte des images PNG : vérification de la signature complète à 8 octets et de l'en-tête `IHDR` avant lecture des dimensions.
- Accessibilité de l'éditeur : ajout de la navigabilité clavier sur la barre d'outils défilable (`tabindex="0"`).
- Robustesse des gestes de dessin : nettoyage systématique de l'état du geste sur `lostpointercapture` et `pointercancel`.

### Modifié

- Refactorisation modulaire interne des scripts de capture (`content-dom.js`, `content-transfer.js`, `content-capture.js`) et de l’éditeur (`editor-operations.js`, `editor-export.js`) pour simplifier la maintenance, sans altération des fonctionnalités.

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
- Correction du recadrage des sélections avec barres de défilement classiques et mise à l’échelle fractionnaire.
- Restauration fiable des positions de défilement et des styles `scroll-behavior` après annulation, redémarrage ou échec d’une capture.
- Écriture atomique des fragments IndexedDB et des métadonnées de transfert pour éviter les états partiellement persistés.
- Rasterisation incrémentale de l’éditeur et exports HTML/impression asynchrones avec garde-fou de taille.
- Validation stricte des versions Chrome, synchronisation des politiques de sécurité et échec explicite des générateurs d’assets.

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

[Unreleased]: https://github.com/ScioNos/Scionos-Capture/compare/v1.5.2...HEAD
[1.3.3]: https://github.com/ScioNos/Scionos-Capture/compare/v1.3.2...v1.3.3
[1.3.2]: https://github.com/ScioNos/Scionos-Capture/compare/v1.3.1...v1.3.2
[1.3.1]: https://github.com/ScioNos/Scionos-Capture/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/ScioNos/Scionos-Capture/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/ScioNos/Scionos-Capture/compare/v1.1.1...v1.2.0
[1.1.1]: https://github.com/ScioNos/Scionos-Capture/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/ScioNos/Scionos-Capture/releases/tag/v1.1.0
[1.0.0]: https://github.com/ScioNos/Scionos-Capture/releases/tag/v1.0.0

[1.5.0]: https://github.com/ScioNos/Scionos-Capture/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/ScioNos/Scionos-Capture/compare/v1.3.3...v1.4.0

[1.5.1]: https://github.com/ScioNos/Scionos-Capture/releases/tag/v1.5.1

[1.5.2]: https://github.com/ScioNos/Scionos-Capture/compare/v1.5.1...v1.5.2
