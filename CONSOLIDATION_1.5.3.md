# Scionos Capture 1.5.3 — Plan et preuves de consolidation

État de travail au 26 novembre 2026. La version n’est pas finalisée et aucune publication n’est autorisée.

## Référence

- Dépôt : ScioNos/Scionos-Capture ; HEAD local et distant `4942564f69e77762295023e8bb2e072638a2b6b2` vérifiés par `git ls-remote origin HEAD`.
- Arbre initial déjà modifié : documentation 1.5.2, restauration capture, sélection multi-pointeur, suppression transactionnelle bibliothèque et tests associés. Ces modifications ont été préservées, pas attribuées aux nouveaux correctifs.
- Aucun AGENTS.md trouvé dans le dépôt ou ses ancêtres inspectés. CodeGraph CLI disponible ; index synchronisé avant analyse.
- Référence source copiée sous `dist/consolidation-1.5.3/baseline` ; diff initial `initial.patch`, inventaire `initial-status.txt` dans le même dossier de travail. Les fichiers non suivis ne sont pas inclus dans cette copie source ; leur inventaire est conservé.
- Environnement : Windows, Node 26.13.1, npm 12.2.2.

## Validation initiale

`npm run verify:release` : code de sortie 0, journal `dist/consolidation-1.5.3/baseline-verify-release.log`. 136 tests unitaires ; 136 tests E2E ; validation package et archive ; cinq modes réels Chrome 158.0.8127.37 et Edge 158.0.4370.33 ; mesures performance éditeur/DOM et préparation PDF réussies. Les tests natifs sont automatisés avec profils jetables, pas une validation manuelle du dialogue d’impression ni des versions minimales.

Les tests unitaires de référence et le packaging ont précédé les nouveaux correctifs. Deux petits correctifs de cycle de vie IndexedDB ont été appliqués pendant la suite E2E ; le résultat complet initial ne constitue donc pas une attestation d’un unique arbre immuable. Les empreintes des sources concernées par les mesures sont enregistrées dans les rapports. Une validation complète sur l’arbre final sera obligatoire.

Rapports préservés : `baseline-release-performance.json`, `baseline-performance.json`, `baseline-pdf-performance.json` sous `dist/consolidation-1.5.3/`. La première mesure standalone a chevauché les tests E2E ; ses durées ne serviront pas seules à conclure un gain. Le rapport de verify:release est séquentiel. Les mesures existantes excluent la mémoire native des Canvas et du processus : un complément de mesure processus est en préparation.

## Interventions et critères

1. Capture : vérifier identité onglet/fenêtre/document avant et après acquisition effective, navigation SPA, métadonnées session fixes, géométrie/scroll stables, texte absent si cohérence non prouvée, limites durée/portions. Ajouter régressions déterministes.
2. Ressources éditeur : comptabiliser les originaux conservés après crop, préserver budget sous undo/redo, borner snapshots concurrents avant copie, harmoniser limites annotations/points/historiques au format portable. Préserver instantanés au clic.
3. Stockage/import : conserver suppression totale transactionnelle déjà présente et tests rollback/conflits ; corriger connexions abandonnées ; valider PNG/ZIP/projets v1/v2 sans restauration de texte non vérifié. Examiner concurrence et cohérence métadonnées/miniatures.
4. Dépendances/CI : vérifier registre et changelogs au jour demandé, appliquer mises à jour vérifiées, évaluer majeures/actions et compatibilité minimale, conserver contrôles Linux/Windows et documents avec filtrage docs-only.
5. Mesures : comparaison sur sources identifiées et fixtures identiques, mémoire tas + processus avec limites explicites, bibliothèque 100/1000 projets. Optimiser uniquement après mesure.
6. Finalisation : version, documentation quatre langues, notes de publication, verify:release final, archive et SHA-256. Aucune release GitHub ni soumission Store.

## Défauts nouvellement reproduits et corrigés

- Connexion IndexedDB qui aboutit après rejet onblocked : connexion orpheline jamais fermée. Régression en échec avant correction puis réussie.
- Échec synchrone de création transaction IndexedDB : connexion jamais fermée. Régression en échec avant correction puis réussie.
- PNG : tRNS peut dépasser le nombre d’entrées PLTE ou référencer un échantillon hors profondeur de couleur. Régression en échec avant correction puis réussie ; valeurs invalides rejetées, palette mémorisée en nombre d’entrées et ordre PLTE/tRNS renforcé.

Commandes ciblées initiales : `node --test tests/composition-utils.test.js tests/capture-store-lifecycle.test.js tests/capture-store.test.js` : 53/53 réussis. ESLint ciblé sur les deux modules et leurs tests : réussite.

Deux autres régressions ont confirmé que le cache de captures renvoyait des données périmées après mise à jour/suppression depuis un second contexte, et exposait les mutations non persistées des objets appelants. Le cache a été retiré : IndexedDB est désormais la source faisant autorité, sans rétention locale de cinq anciens enregistrements. Les 20 tests ciblés stockage/cycle de vie passent. La suite unitaire intermédiaire complète passe : 146/146 (`dist/consolidation-1.5.3/intermediate-unit-tests.log`), incluant les premiers tests ajoutés par l’analyse capture.

Les autres corrections restent en cours ; aucun gain de performance final n’est encore revendiqué.

## Intégration complémentaire (26 novembre, 10h35)

- Chaîne stabilisée verify:release réussie (journal stabilized-verify-release.log) :151unitaires,154E2E, cinq modes Chrome/Edge158,3interruptions natives/navigateur, performances. Elle précède les derniers correctifs Copier/étatsmorts :validation finale nécessaire.
- Revue indépendante :Copier contournait le garde2snapshots. Test avant :3gels au lieu2 ; après garde+finally :réussite.
- Interface :panneau annotation recouvert dans grille3rangées corrigé par groupe dans toolbar existante et hauteurmin56px. Les3tests changementdurantdrag passent en isolation. Tentative transitoire changementtransformdrag retirée.
- Préparationcapture :3régressions Canvas temporaires avantfix échouées, puis5tests transfert/ressources réussis. Surfaces propres remises1×1 enfinally ; surfaceappelante préservée.
- Code mort editor :historyRevision sanslecteurutile, historyConsolidation toujoursnull, redoOperations toujoursvide retirés. editor-export.js reste horsarchive/chargement ; source conservée pour rapporthistorique local qui lelie.
- Bibliothèque :réutilisationid+revision, cachefort1000cartes, miniatureslazy, nettoyagepagehide/BFCache ;6tests ciblés réussis.
- MinimumChrome/Edge106 identifié statiquement (documentId106, CSS:has105), natifs exécutés158seulement.
- LinuxDockerNode24.22.3 :syntaxe via npmcheck puis ESLint/HTMLValidate/151unitaires/validationpackage viaNode direct réussis, journallinux-node24-direct-validation.log. Source readonly, réseauoff,tmpfs512Mio,1Gio,2CPU,pids128. ShimsWindows .bin nonexécutablesLinux, appelsNode directs ; pas browserLinux exécuté.
- Limitescapture :2tests durée180s simulée/256portions refus/restauration/retry réussis. Stabilisation a son budget5s avantrefusportions.
- Mémoire :scriptresource-memory-smoke livré,baseline28étapes sourceStabletrue Chromium159.0.8154.6,WS/privatePIDprofiljetable. N’observe pas pic exact.
- Jobsparent comparatifs :pwsh-e78d215d67154133 mémoire, pwsh-c56f2a7650034ca9 éditeurDOM. Ils se chevauchent :contention durées àsignal/revérifier séquentiellement. Ne pas modifiersourcesracine pendant mémoire(sourceStable).
- Docs18fichiers4langues préparés,38Markdown329liens valides. Encore statut encours àfinaliser aprèsmesures. Syncversion1.5.3 --unreleased resteàfaire, conserver lienspublics1.5.2.
- Restant :recueillir jobs, mesures finales, revue limitesconfidentialitéfondsimages/CSSOMtransitoire, syncversion, verifyreleasefinal, archiveSHA, rapportfinal. Aucunpublishautorisé.

## État de reprise — version synchronisée

- Version1.5.3 synchronisée via version:sync --unreleased ; package/lock/manifest et READMEbadges concordent ; liens publics1.5.2 conservés.
- Agentfinal-docs terminé :4README marquage archive canonique1.5.3 (anciens marqueurs1.5.2 devenus textehistorique),4CONTRIBUTING,STORE_LISTING,listings4 actualisés ; validate réussi. Autres textes langues actualisés blend/fondimage,clipboardquota,Canvascleanup,toolbar56px,étatsinertes.
- Rapport demandé préparé :RAPPORT_CONSOLIDATION_1.5.3.md ; statutfinalencours àremplacer après dernièrespreuves.
- Texte blendmode screen blanc invisible reproduit SECRET_BLEND avantfix, puis exclusionfondsimages/blend et11tests capture ciblés passent.
- Mémoire comparaison finale SÉQUENTIELLE terminée code0 :resource-memory-final-comparison.json, sourceStabletrue deuxracines. Listing1000:473.7→313.8ms ;clearsearch1000:362.5→84.8ms ;privatebyteslisting654.1→596.7Mio.1répétition/1samplepostaction,sanspicgaranti.
- BancéditeurDOM final SÉQUENTIEL terminé code0 :performance-final-comparison.json,3répétitions. HTML1:160.1→170.3ms,HTML4:340.4→340.8ms ;pasgainéditeurexportglobal. Import4:325.0→294.8ms.
- Validation Node24.22.3Windows unité151/151 passe aprèscohérencedocs. LinuxDockerfinaldirect lintHTML151unitairespackage passe, journallinux-node24-final-validation.log.
- Jobparent pwsh-8c13d93408464205 TERMINÉ et recueilli code0 :npmrunverify:release sur1.5.3, journalfinal-verify-release.log.151unitaires155E2E,5modesChrome/Edge158,3interruptions/navigateur,3répétitionsperf,10scénariosPDFpass. Cette preuve est avant éventuels updatestransitifs encoreàappliquer.
- Archive déjà générée35fichiers170482octets ;PythonCRC+sourcesbyteidentiques+SHAcheck pass. SHAactuel107f9d5e9f9980a850a1f4cb6f042921e4024aefe26ac27b7a362dd773ffb6fe. Recontrôler/repackfinal aprèsreste.
- Audittransitif complémentaire requis découvert npmoutdated--all :wantedupdates notammentcanvas1.2.1,estree1.0.11,b4a1.9.0,bareevents2.9.2,barefs4.8.7,barepath3.1.3,barestream2.13.4,bareurl2.5.8,braceexpansion5.1.0. Pasnpmupdate pendantjobfinalactif. Agenttransitive-final enlectureseule,écritDEPENDENCY_TRANSITIVES_1.5.3.md etrapportdist ;attendreplanavantappliquerupdatescompatibles etjustifiermajorshorsplage. npmoutdated-final.json conservé ;npmauditfinal0vuln au momentappel. Éviterclaim audittransitifcomplettantqueagentpasfini.
- Tousjobs précédentsrecueillis :pwsh4a586f30022f4784 mémoirefinal0 ;e78d215d67154133 mémoireconcurrent0 ;c56f2a7650034ca9 éditeurconcurrent0 ;3a97384857ab4c08 premierfinaléchecREADMEarchivespérimées(résolu). Lesjobsautres précédentsontétérécoltés.
- Àfaire :collecterjobfinal etagenttransitive ;appliquerwantedcompatiblesjustifiés,testspertinents/releasefinalaprèslockchangé ;rapportransitif etfinaldocs statut/gains/tests,archiveSHA attestée ;presentZIP/SHA/rapport/notes ;getgoalpuiscompleteSEULEMENTobjectifréellementatteint. Aucunepublication.

## Coordination initiale (historique)

- `capture-review` : background.js, content-capture.js, content-transfer.js, content-dom.js et tests dédiés ; fin des guards acquisition, navigation et confidentialité texte.
- `resources-review` : editor.js, editor-operations.js, annotation-model.js et tests/e2e/resource-budgets.spec.js ; premiers ciblés 9/9 annoncés, revue finale parent encore requise.
- `deps-implementation` : package/lock/workflows et DEPENDENCY_REVIEW_1.5.3.md ; audit npm annoncé sans vulnérabilité, versions/actions actualisées, rapport final à recueillir. Ne pas installer npm simultanément avec cet agent.
- `memory-measurement` : nouveau scripts/resource-memory-smoke.mjs exclusivement et rapports dist ; baseline mémoire processus et bibliothèque à produire.
- Parent : stockage/import, coordination, revues indépendantes, intégration, documentation finale et distribution.

Les deux jobs initiaux pwsh-16fcefad75df45c7 (verify:release) et pwsh-7ffa7626038644fd (mesure standalone) ont terminé avec code 0 et leurs résultats ont été recueillis. Aucune vérification sur Linux n’a été exécutée localement. Une nouvelle vérification globale sera nécessaire après stabilisation des modifications concurrentes.
