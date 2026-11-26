# Scionos Capture 1.5.3 — Rapport de consolidation

26 novembre 2026. **Qualification locale finale réussie ; candidate non publiée.** La campagne complète finale passe sur les sources inchangées depuis le correctif d’annulation des exports : 178 tests unitaires, 179 E2E, contrôles natifs, performance et PDF. Les contrôles Linux aux deux minima Node exacts passent également. La CI distante, les opérations Git et l’archive définitive restent à réaliser ; les nouvelles mesures comparatives sont en cours.

## Référence et périmètre

Référence actuelle de la branche locale : `03d87f2`, avec modifications de travail non commitées. L’ancienne référence `4942564f69e77762295023e8bb2e072638a2b6b2` décrit le début de la consolidation, pas le HEAD actuel. Les corrections déjà locales de restauration des captures, sélection/pointeurs et suppression générale transactionnelle ont été préservées. La copie historique des sources et le diff initial sont conservés sous `dist/consolidation-1.5.3/baseline` et `dist/consolidation-1.5.3/initial.patch`.

Aucun fichier AGENTS.md applicable n’avait été trouvé lors de l’inspection initiale. CodeGraph CLI a servi à l’analyse des responsabilités et des appels ; les vérifications directes des sources complètent les résultats du graphe.

La version reste 1.5.3. Aucun traitement par lots, framework supplémentaire, nouvelle permission, télémétrie ou transmission des captures n’est ajouté. Les données utilisateur sont traitées localement. Les accès réseau de développement concernent la documentation et les dépendances. Les liens publics de la release 1.5.2 et son archive existante restent distincts de cette candidate.

## Défauts confirmés et corrections

| Domaine | Défaut confirmé | Correction et preuve disponible |
|---|---|---|
| Capture native | Un changement pendant l’attente ou l’acquisition pouvait échapper aux seuls contrôles avant appel | Gardes pendant l’attente et l’acquisition, événements onglet/navigation/focus, sonde liée au documentId, contrôles avant/après et nettoyage en finally ; scénarios unitaires et natifs dans la campagne intermédiaire |
| Cohérence de capture | URL et titre lus tardivement, scroll ou géométrie devenus périmés | Métadonnées figées au début de session ; contrôles SPA et géométriques après acquisition/décodage ; refus lorsque l’identité ou la géométrie ne correspond plus |
| Texte source et PDF | Des états DOM/CSSOM identiques avant et après ne prouvent pas le contenu des pixels pris entre les observations | Toute couche source issue du DOM est omise des captures natives. Les anciens blocs textuels du stockage ne sont pas réintroduits dans l’éditeur. L’API captureVisibleTab ne fournit pas de preuve d’association pixels/DOM |
| PDF image uniquement | Les titres, légendes et bandes pouvaient rester extractibles même sans couche source | Option explicite dans les quatre langues, conservée dans les paramètres du projet ; suppression des couches textuelles générées et rasterisation des en-têtes/pieds de page. Le texte des annotations utilisateur est rendu dans les pixels ; titres, légendes et bandes restent recherchables hors de ce mode |
| Recadrage et mémoire | L’admission ne comptait que le résultat du crop alors que le bitmap original était conservé | Réservation sur la plus grande forme retenue ; reproduction historique 3900 × 3900 recadré en 10 × 10 puis imports : trois images admises avant, deux après ; restauration par Annuler vérifiée |
| Manifeste et ZIP | Les limites en nombre de points ou de caractères n’empêchaient pas un manifeste UTF-8 trop gros ou un ZIP dépassant la limite avec son enveloppe | Mesure exacte du JSON UTF-8, échappements inclus, et du ZIP STORE, en-têtes et répertoire compris ; précontrôle avant copies/instantanés et contrôle des tailles encodées avant stockage ou téléchargement |
| Historiques | Le seul nombre d’états ne bornait pas le volume de textes et de coordonnées conservés | Budgets partagés Annuler/Refaire en points, opérations et JSON UTF-8 ; éviction des états anciens. L’historique de composition des titres/légendes a aussi une limite de volume |
| Admission des éditions | Un déplacement fractionnaire pouvait allonger le JSON sans passer par le précontrôle ; la duplication conservait l’UUID pendant l’admission | Admission du candidat avant mutation et avant ajout à l’historique ; nouvel UUID attribué avant admission de la copie. Les IDs optionnels des annotations importées sont préservés, sans ajout automatique à l’ouverture |
| Instantanés concurrents | Des copies pouvaient précéder leur mise en file ; Copier contournait la garde | Deux réservations au maximum, prises avant gel et libérées à la fin de l’export, de la copie ou de la sauvegarde ; troisième demande refusée avant allocation, instantanés distincts au clic préservés |
| Annulation d’export | Annuler ou Échap après le début du snapshot n’empêchait pas toujours PNG/PDF de poursuivre | Contrôleur d’annulation, vérifications aux frontières asynchrones, signal transmis à l’impression. Les quatre reproductions avant correctif échouaient ; les huit scénarios ciblés après correctif passent, y compris pendant la rasterisation et les bandes du mode image uniquement, avec nettoyage des URL et nouvelle tentative |
| IndexedDB | Connexion orpheline après onblocked ou exception lors de la création d’une transaction | Fermeture d’une connexion arrivée après abandon et fermeture en finally ; régressions avant/après |
| Cache de captures | Données périmées après mutation/suppression dans un autre contexte et mutations appelant non persistées | Cache retiré ; IndexedDB fait autorité. Scénarios multicontextes et alias mutables couverts |
| PNG | tRNS pouvait dépasser la palette PLTE ou la profondeur d’échantillon | Validation du nombre réel d’entrées, des échantillons et de l’ordre des chunks ; PNG valides préservés |
| Surfaces temporaires | Des Canvas restaient dimensionnés après succès, erreur ou abandon | Réduction des surfaces possédées à 1 × 1 en finally ; entrées appelant préservées. Revue des surfaces d’import, de snapshot, de miniatures et d’export ; nettoyage des URL temporaires |
| Bibliothèque | Reconstruction des cartes et URL à chaque recherche ou rafraîchissement | Réutilisation par ID et révision, cache fort de 1 000 cartes, décodage différé, éviction et nettoyage pagehide/BFCache ; contrôles d’identité DOM, langues, actions et URL |
| Interface | Commandes d’annotation recouvertes par une grille à trois rangées | Regroupement dans la barre existante et hauteur de 56 px réservée ; contrôles de position du Canvas et des glissers conservés |

La suppression générale transactionnelle déjà locale reste intégrée : une liste confirmée devenue périmée rejette toute l’opération ; métadonnées et contenus sont supprimés dans la même transaction et un abandon entraîne un rollback. Les projets v1/v2 restent lisibles et l’écriture reste en v2. Les projets importés ne restaurent aucune couche textuelle source non vérifiée.

## Budgets et comportement de l’éditeur

Le budget logique cumulé de **32 millions de pixels** réserve aussi les originaux conservés après recadrage. Il protège les restaurations par Annuler/Refaire, sans mesurer la mémoire totale. Bitmaps, Canvas, instantanés, encodeurs, blobs, mémoire GPU et processus contribuent séparément. La limite de deux instantanés simultanés borne la concurrence, sans garantir une faible consommation sur toute machine.

Les annotations sont limitées à **1 000 par image**, **5 000 par document**, **10 000 points par tracé** et **100 000 points par document**. Les opérations interactives de recadrage et de masquage sont comptées conservativement. Les copies d’historique d’annotations Annuler/Refaire partagent au maximum **100 états, 100 000 points, 5 000 opérations et 1 Mio de JSON UTF-8 brut**, avec une réserve par état. Elles s’ajoutent aux opérations vivantes. L’historique de composition des titres et légendes partage **50 états et 1 Mio de JSON UTF-8**. Les états les plus anciens sont évincés ; une restauration peut être refusée si l’état candidat ne respecte plus les ressources disponibles.

Le manifeste portable est limité à **1 048 576 octets**, mesurés sur le JSON UTF-8 réellement sérialisé, et non sur le nombre d’unités UTF-16 des chaînes. Le ZIP STORE est limité à **134 217 728 octets**, avec son enveloppe complète : 22 octets de fin de répertoire, puis 76 octets et deux copies du nom UTF-8 par entrée, en plus des données. Les frontières exactes et le refus de l’octet supplémentaire sont couverts par les tests ciblés.

Le précontrôle de l’éditeur vérifie les annotations, métadonnées, paramètres PDF et politique des sources avant mutation. Les décalages fractionnaires peuvent augmenter la taille des coordonnées JSON même sans ajouter de points ; ils suivent donc la même admission. La taille PNG peut changer après édition : le codec vérifie encore les tailles réellement encodées avant sauvegarde ou téléchargement. Le contrôle précoce ne prétend pas prédire exactement la compression future d’une image modifiée.

Les captures ont au maximum **256 portions** et un budget de **180 secondes** contrôlé coopérativement aux points de contrôle. Le choix interactif de la région est hors échéance ; une API bloquée n’est pas interrompue préemptivement. La stabilisation de page dispose de son propre budget de cinq secondes. L’annulation d’export suit elle aussi les frontières coopératives des opérations ; un encodeur déjà engagé peut terminer avant le prochain contrôle, mais sa sortie ne doit plus être publiée après annulation.

Le découpage capture/DOM/transfert/stockage/composition est conservé. Les états inertes historyConsolidation, redoOperations et historyRevision ont été retirés. L’ancien module editor-export.js reste hors chargement et distribution, avec sa source conservée pour les références d’audit historiques. Aucune abstraction de traitement par lots n’est ajoutée.

## Validation : états intermédiaires et campagne finale

La campagne [qualified-verify-release.log](qualification/1.5.3/qualified-verify-release.log) a réussi avec :

- 178 tests unitaires et 171 tests E2E ;
- cinq modes de capture native dans Chrome 158.0.8127.37 et Edge 158.0.4370.33 ;
- trois scénarios d’interruption native dans chaque navigateur ;
- trois répétitions du banc de performance et dix scénarios PDF.

**Cette campagne précède le dernier correctif d’annulation des exports.** Elle constitue une preuve intermédiaire, pas la qualification de l’état final. Les quatre reproductions PNG/PDF par Annuler/Échap après le début du snapshot échouaient avant ce correctif. Les huit scénarios ciblés passent après correction, avec annulation pendant la rasterisation et les bandes image uniquement, nettoyage des URL et nouvelle tentative. Les régressions ciblées duplication/admission fractionnaire ont également passé leurs quatre scénarios, dont les deux scénarios préexistants.

La campagne [final-qualification-verify-release.log](qualification/1.5.3/final-qualification-verify-release.log) **est terminée avec code 0** : **178 tests unitaires et 179 E2E réussis**, cinq modes natifs dans Chrome 158.0.8127.37 et Edge 158.0.4370.33 avec les contrôles de pixels à 100 %, trois interruptions par navigateur, trois répétitions de performance et dix scénarios PDF. Les sources sont restées inchangées depuis le correctif d’annulation. Cette campagne remplace les 171 E2E intermédiaires comme preuve de qualification locale finale. Elle ne constitue pas une attestation de CI distante ni de distribution définitive.

Les validations antérieures à 151 tests unitaires et 155 E2E, ainsi que les contrôles Linux/Windows sous Node 24.22.3, restent des preuves historiques d’états précédents. Elles ne remplacent pas une validation de l’état final après les changements de sources et de verrou. Les erreurs intentionnelles des fixtures stockage/quota et les essais diagnostiques échoués ne sont pas comptés comme succès.

Les tests natifs utilisent des profils jetables, des pages loopback et de vrais appels captureVisibleTab, avec retard de livraison pour les bascules/navigation, refus sans résidu et nouvelle tentative contrôlée sur les pixels. Le focus physique entre fenêtres du bureau et le dialogue d’impression humain ne sont pas attestés par ces scénarios headless. Les contrôles Linux historiques n’incluaient pas de navigateur Linux.

## Mesures finales sur les sources qualifiées

Les deux bancs ont été exécutés séquentiellement après la campagne complète, avec pour référence une extraction Git exacte de `03d87f2fad4c05c1742f29f89c9aff6ddff3a9e7`. Les sources mesurées sont identifiées par leurs SHA-256 dans les rapports ; les deux racines du banc mémoire indiquent `sourceStable: true`.

[Performance éditeur/DOM](qualification/1.5.3/final-qualified-performance-comparison.json), Windows, Chromium 159, trois répétitions, médianes et fixtures PNG 1024 × 1024 :

| Parcours | Référence 03d87f2 | Sources qualifiées | Lecture |
|---|---:|---:|---|
| Import 1 image | 128,6 ms | 161,4 ms | +32,8 ms ; contrôle PNG portable ajouté à l’import |
| Import 4 images | 473,2 ms | 514,8 ms | +41,6 ms ; coût du contrôle anticipé, pas un gain |
| Export HTML 1 image | 198,4 ms | 215,6 ms | +8,7 % sur ce banc |
| Export HTML 4 images | 558,7 ms | 556,4 ms | Écart de −0,4 %, aucune accélération générale revendiquée |

L’export HTML conserve un encodage PNG par image et respectivement trois/six Canvas pour une/quatre images. L’encodage supplémentaire à l’import mesure le PNG réellement portable, notamment après JPEG/WebP ; il sert l’admission au budget, sans optimisation spéculative.

[Mémoire processus](qualification/1.5.3/final-qualified-memory-comparison.json), une répétition, un prélèvement après chaque étape, mêmes fixtures 1600 × 1200 et bibliothèque synthétique :

| Prélèvement | Référence | Sources qualifiées |
|---|---:|---:|
| Private Bytes après import 4 images | 621,1 Mio | 526,5 Mio |
| Private Bytes après crop 4 images | 636,1 Mio | 640,4 Mio |
| Private Bytes après export projet 4 images | 664,0 Mio | 649,7 Mio |
| Private Bytes listing 1 000 projets | 549,9 Mio | 554,4 Mio |
| Working Set listing 1 000 projets | 707,4 Mio | 711,2 Mio |
| Durée listing 1 000 projets | 713,1 ms | 695,8 ms |

Ces prélèvements incluent caches et allocateurs et n’observent pas nécessairement les pics. La variabilité des Private Bytes entre étapes ne prouve ni un gain mémoire général ni une fuite. Le banc n’isole pas la mémoire GPU ni la capture native. Les corrections de libération sont aussi vérifiées par les tests de propriété des surfaces, de refus, d’annulation et de reprise.

Le banc PDF final passe dix scénarios : le rendu réel proche de 32 millions de pixels prend 4 010,6 ms pour douze pages sur cette machine ; le dépassement de pixels est refusé en précontrôle en 2,5 ms, sans page produite. Ces durées ne sont pas des seuils garantis sur d’autres matériels.

## Mesures comparatives historiques

**Les tableaux suivants sont conservés comme mesures historiques.** Ils précèdent les derniers changements de sources et de verrou, notamment l’annulation d’export ; ils ne mesurent pas le dernier état qualifié. Le mot « final » dans le nom des fichiers désigne la fin de cette ancienne série comparative, pas la qualification finale actuelle.

Les rapports enregistrent les SHA-256 des sources mesurées. Environnement : Windows, Chromium 159.0.8154.6, profils jetables distincts et fixtures synthétiques. Les deux bancs de référence ont été exécutés séquentiellement, sans chevauchement ; les premiers rapports concurrents restent diagnostiques.

Médianes de trois répétitions avec PNG 1024 × 1024 : [comparaison historique éditeur/DOM](qualification/1.5.3/performance-final-comparison.json).

| Parcours | Avant historique | Après historique | Lecture limitée à ce banc |
|---|---:|---:|---|
| Import d’une image | 78,6 ms | 85,2 ms | +6,7 ms ; aucun gain |
| Import de quatre images | 325,0 ms | 294,8 ms | −9,3 % sur ce passage |
| HTML, une image | 160,1 ms | 170,3 ms | +6,4 % ; aucune accélération générale |
| HTML, quatre images | 340,4 ms | 340,8 ms | Stable |

Un encodage PNG par image et le nombre de Canvas sont inchangés dans ce banc. Aucune optimisation générale d’encodage n’en est déduite.

Une répétition et un prélèvement après chaque étape, miniatures PNG 96 × 64, blobs projets fictifs de 1 Kio jamais ouverts : [comparaison historique mémoire](qualification/1.5.3/resource-memory-final-comparison.json).

| Parcours | Avant historique | Après historique | Écart observé |
|---|---:|---:|---:|
| Listing de 100 projets | 106,5 ms | 120,2 ms | +12,9 % |
| Effacement de recherche, 100 projets | 41,2 ms | 10,1 ms | −75,5 % |
| Listing de 1 000 projets | 473,7 ms | 313,8 ms | −33,8 % |
| Recherche, 1 000 projets | 20,7 ms | 12,1 ms | −41,5 % |
| Effacement de recherche, 1 000 projets | 362,5 ms | 84,8 ms | −76,6 % |
| Working Set, listing de 1 000 projets | 801,3 Mio | 765,7 Mio | −35,6 Mio |
| Private Bytes, listing de 1 000 projets | 654,1 Mio | 596,7 Mio | −57,4 Mio |
| Private Bytes, retour à la liste de 1 000 projets | 679,4 Mio | 612,7 Mio | −66,7 Mio |
| Private Bytes, import de quatre images | 613,0 Mio | 606,9 Mio | −6,1 Mio |
| Private Bytes, crop de quatre images | 709,7 Mio | 705,3 Mio | −4,4 Mio |
| Private Bytes, export projet de quatre images | 735,9 Mio | 730,2 Mio | −5,7 Mio |

Les PID proviennent uniquement de SystemInfo.getProcessInfo du navigateur mesuré. Les Working Sets peuvent compter plusieurs fois les pages partagées ; les Private Bytes Windows mesurent la mémoire engagée, pas exclusivement résidente. Les prélèvements après action ne garantissent pas la capture d’un pic transitoire. Les caches et allocateurs après fermeture ne prouvent ni fuite ni absence de fuite. Les petits écarts de l’éditeur sont bruités ; les améliorations de bibliothèque restent limitées aux parcours et états mesurés.

Les parcours historiques incluent capture synthétique chargée dans l’éditeur, imports, crop, sauvegarde, exports projet/HTML/PNG, fermeture et bibliothèque. La mémoire du pipeline natif de capture d’écran complet n’a pas été isolée. Le banc PDF couvre préparation, rasterisation/blobs et nettoyage. Les mesures finales actuelles figurent dans la section précédente ; ces données historiques ne les remplacent pas.

## Dépendances et compatibilité

La [revue des dépendances](DEPENDENCY_REVIEW_1.5.3.md) détaille registre, changelogs, avis, migrations et contrôles. Les mises à jour directes comprennent axe-core/Playwright 4.14.1 et HTML-Validate 11.22.1. L’override glob inactif a été retiré. L’override exact minimatch 11.0.9 reste conservé pour readdir-glob 3, la branche 10 ayant été affectée par l’avis examiné. Readdir-glob 4 reste hors de la plage déclarée par archiver 8 ; les maintiens hors plage sont motivés dans les revues.

L’[audit complémentaire des transitives](DEPENDENCY_TRANSITIVES_1.5.3.md) est terminé : **douze mises à jour compatibles ont été appliquées**. Il distingue les résolutions imbriquées, les dépendances optionnelles et les versions hors plage conservées. Les résultats détaillés ne signifient pas que chaque branche optionnelle ou plateforme native a été exercée. La campagne finale doit qualifier ensemble le verrou et les sources actuels.

Actions GitHub : checkout 7.0.1, setup-node 7.1.0, cache 6.1.0 et upload-artifact 7.0.2, désormais **épinglées par SHA de commit**. Les runners Linux/Windows sont conservés. Les changements documentaires seuls sautent les navigateurs, mais verify:core reste prévu sur les deux minima Node. Permissions contents:read et aucune publication automatique ; une exécution locale ne constitue pas une preuve de succès de la CI distante.

Node déclaré : `^22.22.0 || >=24.8.0`. Les deux minima exacts ont été exécutés sous Linux : **Node 22.22.0 avec npm 10.9.4**, puis **Node 24.8.0 avec npm 11.6.0**. Chaque environnement a réussi npm ci et verify:core avec code 0, dont **178/178 tests unitaires**. Les sources sont montées en lecture seule et le réseau est déconnecté pour la validation après installation. Le [résumé Linux qualified-2](qualification/1.5.3/final-linux/qualified-2/qualification-summary.json) conserve les empreintes des instantanés de sources et des preuves ; son digest d’instantané est `659d9e04e5726de671f909c0a4975fa5ac2b7c32b0e9a2fe44c93cd1c0349d97`. Les documents ont été actualisés après ce prélèvement ; les artefacts générés durant ces contrôles ne sont pas présentés comme l’archive définitive. Aucun navigateur Linux ni Chrome/Edge 106 n’est attesté par ces contrôles.

Chrome/Edge 106 reste le minimum déclaré : documentId exige Chrome 106 et CSS :has() Chrome 105. AbortSignal.throwIfAborted, utilisé pour l’annulation coopérative, est disponible depuis Chrome 100 et n’élève donc pas ce minimum. Les API getContexts, checkVisibility et roundRect gardent leurs détections ou replis. Les exécutions natives attestées ici concernent les navigateurs 158 ; Chromium 159 a servi aux mesures historiques. Aucun test sur Chrome/Edge 106 n’est revendiqué.

## Limites de confidentialité et portée du mode PDF

La stabilité observée du DOM/CSSOM ne prouve jamais, à elle seule, la correspondance avec l’image prise par captureVisibleTab. Une modification transitoire peut être rétablie entre deux observations. La règle actuelle est donc l’omission systématique de la couche source DOM des captures natives, ainsi que l’exclusion des anciens blocs de stockage et des couches source importées non vérifiées. Aucun OCR des pixels n’est ajouté.

Hors mode image uniquement, les titres, légendes et bandes de page générés à partir du document restent recherchables. Le texte des annotations utilisateur est rendu dans les pixels. Le mode PDF image uniquement retire les couches textuelles générées et rasterise aussi les bandes ; il ne retire pas les secrets visibles dans les pixels et ne remplace pas un masque solide. Les chemins d’URL, titres, légendes, dates et images peuvent encore être sensibles. Le flou reste un effet visuel.

## Distribution locale vérifiée et validation distante restante

Le dernier `npm ci` Windows, `npm ls --all` et `npm audit` réussissent : arbre sans dépendance invalide, zéro vulnérabilité signalée par la base npm au moment du contrôle. `verify:core` est relancé après cette installation et les dernières mises à jour documentaires : code 0, 178/178 tests unitaires. Le journal est conservé sous `dist/consolidation-1.5.3/final-qualified-verify-core.log`.

ZIP définitif local : `dist/scionos-capture-v1.5.3.zip`, **175 572 octets, 35 fichiers**. SHA-256 :

```text
f17b2c50df2cc6b21254a6a893ddb48a5339ba369ee2d1ca3592fc7dbadb1b34
```

[Attestation indépendante de l’archive](qualification/1.5.3/final-archive-verification.json) : CRC de chaque entrée, allow-list exacte, aucune entrée supplémentaire ou dupliquée, taille décompressée et contenu octet pour octet identiques aux sources. Le fichier `.sha256` adjacent correspond. Le ZIP n’est pas publié sur GitHub ou dans un Store.

Le commit applicatif qualifié `3352a1220f01fb1ae2ddb101730910529f1cd5ee` a été poussé et la [PR nº1](https://github.com/ScioNos/Scionos-Capture/pull/1) est ouverte vers main. Le [premier workflow distant](https://github.com/ScioNos/Scionos-Capture/actions/runs/45817507247) a réussi les jobs **Chromium E2E/accessibilité Linux** et **Windows scaling**, ainsi que le filtrage documentaire. Core Node22.22.0 a échoué sur un lien Markdown pointant vers une preuve locale ignorée dans dist ; Node24.8.0 a été annulé par fail-fast. Les sources et tests applicatifs n’étaient pas en échec sur ce run.

Correction : les preuves effectivement liées par les quatre rapports sont désormais versionnées sous `qualification/1.5.3`, avec inventaire SHA-256 et liens corrigés. Aucun test, validateur ni règle de CI n’est supprimé ou affaibli. Une nouvelle exécution du dernier commit doit confirmer tous les jobs avant décision finale ; le SHA et l’état réels sont consultables dans la PR. **La publication n’est pas effectuée et la fusion attend la validation explicite de l’utilisateur.** Aucun tag, aucune release et aucune soumission Store dans ce travail.
