# Scionos Capture 1.5.3 — Rapport de consolidation

26 novembre 2026. Candidate non publiée. La version synchronisée 1.5.3 a réussi npm run verify:release : 151 tests unitaires, 155 tests E2E, cinq modes natifs dans Chrome et Edge 158, trois scénarios natifs d’interruption par navigateur, trois répétitions de performance et dix scénarios PDF. Les contrôles disponibles sous Linux et Windows avec Node 24.22.3 passent également. Un audit complémentaire des mises à jour transitives reste en cours ; ce commit constitue un point d’étape validé avant ces éventuelles mises à jour.

## Référence et périmètre

HEAD local et distant vérifié :4942564f69e77762295023e8bb2e072638a2b6b2. L’arbre initial comportait déjà des corrections locales de restauration des captures, sélection/pointeurs, suppression générale transactionnelle et documentation1.5.2. Elles ont été préservées. Copie source et diff initial sous dist/consolidation-1.5.3/baseline et initial.patch. Aucun AGENTS.md applicable trouvé ; CodeGraph CLI utilisé et index synchronisé.

Aucun traitement par lots, framework supplémentaire, nouvelle permission, télémétrie ou transmission des captures. Les accès réseau de développement concernent documentation et dépendances ; les données utilisateur restent traitées localement.

## Défauts confirmés et corrections

| Domaine | Défaut confirmé | Correction et preuve |
|---|---|---|
| Capture native | Contrôles avant API insuffisants pour changement pendant acquisition ou aller-retour | Gardes actives pendant attente/acquisition, événements onglet/navigation/focus, sonde documentId, contrôles avant/après et finally ; tests unitaires et natifs |
| Cohérence | URL/titre lus au transfert après assemblage ; scroll/géométrie périmés | Métadonnées figées début de session, checkpoints SPA et géométrie après acquisition/décodage ; refus si source incertaine |
| Texte PDF | Mutations après pixels, changements CSSOM, texte même couleur que fond, fusion screen invisible | Toute couche omise si incertitude détectée ; feuilles CSS inaccessibles/hors budget, animations/médias ; fonds images et modes de fusion exclus. SECRET_BLEND échoue avant fix puis passe |
| Recadrage | Admission compte crop tandis que bitmap original reste conservé | Réservation sur plus grande forme retenue ;3900×3900 recadré10×10 puis imports :3 items avant,2 après ;undo vérifié |
| Historique | Nombre d’états seul borné, points/opérations interactifs sans limites du codec | Limites communes, validation avant édition/undo/redo, budget global des copies historiques ; bornes de tracés calculées itérativement |
| Instantanés | Copies multiples avant file de sauvegarde ; Copier contournait garde |2slots réservés avant gel jusqu’à fin stockage/export/presse-papiers ;3e refusé avant allocation ;2 clics distincts préservés |
| IndexedDB | Connexion orpheline après onblocked et exception création transaction | Fermeture tardive connexion abandonnée et finally ; régressions avant/après |
| Cache captures | Records périmés après mutation/suppression autre contexte, mutations appelant non persistées | Cache supprimé, IndexedDB faisant autorité ; tests multicontextes et alias mutables |
| PNG | tRNS dépassant PLTE ou profondeur d’échantillon accepté | Nombre réel entrées palette, échantillons et ordre validés ; PNG valide conservé |
| Surfaces temporaires | Canvas de réduction non remis à taille minimale après encodage/échec | Surfaces possédées remises1×1 en finally, entrée appelant préservée ;3échecs avantfix,5 tests transfert/ressources passent |
| Bibliothèque | Reconstruction cartes et URLs à chaque recherche/refresh | Réutilisation id+révision, cache fort1000cartes, lazy decode, éviction/pagehide/BFCache ; tests identité DOM, langues, actions révisées et URLs |
| Interface |quatrième enfant dans grille3 rangées, commandes annotation recouvertes | Groupe dans barre existante, hauteur56px réservée, rangées nommées ; assertions de position Canvas et drag conservées |

Suppression générale transactionnelle déjà locale intégrée : liste confirmée périmée rejette tout, métadonnées/contenus supprimés dans la même transaction, tests d’abandon vérifient rollback. Quota/rétention/conflits, migrations IndexedDB et projets v1/v2 restent couverts ; texte importé non vérifié jamais restauré.

## Ressources et architecture

Le budget logique32 Mpx réserve les originaux conservés et protège undo ; il ne mesure pas la mémoire totale. Bitmaps, Canvas, snapshots, encodeurs, blobs, GPU et processus contribuent séparément.2 snapshots restent une borne, pas une garantie de faible consommation.

Annotations1000/image,5000/document ;10000 points/tracé,100000/document. Les opérations interactives crops/masques sont comptées conservativement. Les copies d’historique undo+redo partagent100 états/100000 points/5000 opérations ; elles s’ajoutent aux opérations vivantes. Les anciens états sont évincés ; une restauration peut être refusée si d’autres images occupent le quota.

Captures256 portions et180 secondes coopératives aux checkpoints ; choix interactif de région hors échéance. Une API bloquée n’est pas interrompue préemptivement. La stabilisation de page a son budget5 secondes.

Découpage capture/DOM/transfert/stockage/composition conservé, gardes dans leurs responsabilités. États editor historyConsolidation, redoOperations et historyRevision inertes retirés. editor-export.js reste hors chargement/distribution ; source conservée pour lien d’audit historique local. Aucune abstraction prématurée de traitement par lots.

## Mesures comparatives

SHA-256 des sources dans JSON, Windows et Chromium 159.0.8154.6, profils jetables distincts, fixtures synthétiques. Mesures finales exécutées séquentiellement sans chevauchement des deux bancs. Premiers rapports concurrents diagnostiques, pas référence principale.

Trois répétitions médianes, PNG1024×1024 : [rapport éditeur/DOM](dist/consolidation-1.5.3/performance-final-comparison.json).

| Parcours | Avant | Après | Lecture |
|---|---:|---:|---|
| Import1 image |78,6 ms |85,2 ms |+6,7 ms ;aucun gain revendiqué |
| Import4 images |325,0 ms |294,8 ms |−9,3% sur ce passage |
| HTML1 image |160,1 ms |170,3 ms |+6,4% ;pas accélération générale |
| HTML4 images |340,4 ms |340,8 ms |Stable |

Encodages PNG1par image et nombres de Canvas inchangés dans ce banc. Aucune optimisation spéculative d’encodage.

Une répétition et un prélèvement après chaque étape, miniatures PNG96×64, blobs projets fictifs1 Kio jamais ouverts : [rapport mémoire final](dist/consolidation-1.5.3/resource-memory-final-comparison.json).

| Parcours | Avant | Après | Écart observé |
|---|---:|---:|---:|
| Listing100 projets |106,5 ms |120,2 ms |+12,9% |
| Effacement recherche100 |41,2 ms |10,1 ms |−75,5% |
| Listing1000 |473,7 ms |313,8 ms |−33,8% |
| Recherche1000 |20,7 ms |12,1 ms |−41,5% |
| Effacement recherche1000 |362,5 ms |84,8 ms |−76,6% |
| Working Set listing1000 |801,3 Mio |765,7 Mio |−35,6 Mio |
| Private Bytes listing1000 |654,1 Mio |596,7 Mio |−57,4 Mio |
| Private Bytes retour liste1000 |679,4 Mio |612,7 Mio |−66,7 Mio |
| Private Bytes import4 |613,0 Mio |606,9 Mio |−6,1 Mio |
| Private Bytes crop4 |709,7 Mio |705,3 Mio |−4,4 Mio |
| Private Bytes export projet4 |735,9 Mio |730,2 Mio |−5,7 Mio |

PIDs uniquement via SystemInfo.getProcessInfo de ce navigateur. Working Sets peuvent compter plusieurs fois pages partagées ; Private Bytes Windows est mémoire engagée, pas exclusivement résidente. Prélèvements après action sans pic transitoire garanti. Caches/allocateurs après fermeture ne prouvent ni fuite ni absence de fuite. Gains bibliothèque appuyés aussi par tests URLs/DOM ; petits écarts éditeur bruités. Parcours :capture synthétique chargée éditeur,imports,crop,sauvegarde,projet/HTML/PNG,fermeture,bibliothèque. Mémoire du pipeline natif écran complet non isolée. Banc PDF existant couvre préparation, raster/blob et nettoyage.

## Dépendances et compatibilité

[Revue détaillée](DEPENDENCY_REVIEW_1.5.3.md) :registre,changelogs,advisory,migrations et vérifications. axe-core/playwright4.14.1 et html-validate11.22.1 appliqués ;override glob inactif retiré ;minimatch11.0.9 exact conservé pour readdir-glob3 car branche10 affectée par avis examiné. Readdir-glob4 hors plage archiver8 :maintien justifié de chaîne testée. Autres directs déjà aux stables vérifiées.

Actions checkout7.0.1,setup-node7.1.0,cache6.1.0,upload-artifact7.0.2 ;runners Linux/Windows conservés. Docs-only saute navigateurs mais verify:core reste sur2minima Node. Permissions contents:read,aucune publication automatique. Tags Actions exacts mais mutables ;SHA à envisager ultérieurement.

Node déclaré ^22.22.0 ou>=24.8.0 ;contraintes des entrées du verrou vérifiées compatibles. Exécutions locales Node 26.13.1Windows et24.22.3Linux/Windows ;minima exacts22.22.0/24.8.0 non exécutés localement.

Chrome/Edge 106 minimum déclaré (documentId 106,CSS :has() 105). getContexts/checkVisibility/roundRect détectés avec fallback. Natifs 158 et Chromium 159 exécutés ;aucun test106 revendiqué.

## Validation et limites

La dernière validation complète sur1.5.3 reste à consigner. Les erreurs intentionnelles de fixtures stockage/quota et essais diagnostiques échoués ne sont pas comptés comme succès. Aucune assertion existante retirée ou affaiblie.

Tests natifs :profils jetables,pages loopback,vraie captureVisibleTab et retard de livraison pour bascules/navigation,rejet sansrésidu puis retry pixelsvérifiés. Focus physique entre fenêtres bureau et dialogue impression humain non testés headless. Linux :contrôles sources/unitaires/HTML sous Docker sans réseau, pasnavigateurs.

Limite confidentialité :stabilité observée DOM/CSSOM ne prouve pas correspondance absolue face à changement CSSOM transitoire rétabli entre observations. Peintures complexes omises si détectées ;pasOCRdespixels. Préférer absence texte en cas d’incertitude. Projets importés ne restaurent jamais couche non vérifiée.

## Recommandations pour 1.6.0

- Réutiliser moteur via demande explicite source/document avec gardes,quotas,sortie locale ;maintenir invariants par unité de travail.
- Mesurer pics acquisition native/grandes compositions sur machines modestes avant hausse plafonds.
- Garder absence texte sur peintures dynamiques ;envisager preuve indépendante pixels avant extension couche PDF.
- Tester conflits multiéditeurs,restaurationMV3 et annulation de chaque unité future.
- Réévaluer readdir-glob4 si archiver le supporte ;mesurer bien au-delà1000 projets avant pagination/virtualisation.

## Distribution

Archive 1.5.3 et SHA-256 à attester après validation finale. Aucun publish,push,tag,release GitHub ou soumission Store effectué.
