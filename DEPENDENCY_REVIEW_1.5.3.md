# Revue des dépendances et de la CI — préparation 1.5.3

Contrôle indépendant effectué le 26 novembre 2026 sur le registre npm public et les sources officielles. La revue initiale a été effectuée sur **1.5.2** ; le parent a depuis synchronisé le manifeste, le paquet npm et le verrou en **1.5.3**, en préparation locale non publiée. Les modifications locales préexistantes et celles des autres agents sont préservées. Aucun ajout de dépendance runtime, aucune nouvelle permission, aucun publish, push, tag ou release.

## Dépendances directes

Les huit commandes `npm view <paquet> version engines --json` confirment les versions stables ci-dessous ; pour archiver, les dépendances ont aussi été interrogées. Les plages existantes sont conservées, avec relèvement du minimum des deux outils mis à jour.

| Dépendance | Avant → déclaré après | Résolution du verrou / latest vérifié | Source registre |
|---|---|---|---|
| @axe-core/playwright | ^4.14.0 → ^4.14.1 | 4.14.1 | [npm](https://registry.npmjs.org/@axe-core%2fplaywright/latest) |
| @eslint/js | ^10.0.1 inchangé | 10.0.1 | [npm](https://registry.npmjs.org/@eslint%2fjs/latest) |
| @playwright/test | ^1.65.1 inchangé | 1.65.1 | [npm](https://registry.npmjs.org/@playwright%2ftest/latest) |
| archiver | ^8.0.0 inchangé | 8.0.0 | [npm](https://registry.npmjs.org/archiver/latest) |
| eslint | ^10.15.0 inchangé | 10.15.0 | [npm](https://registry.npmjs.org/eslint/latest) |
| fake-indexeddb | ^6.2.8 inchangé | 6.2.8 | [npm](https://registry.npmjs.org/fake-indexeddb/latest) |
| html-validate | ^11.21.1 → ^11.22.1 | 11.22.1 | [npm](https://registry.npmjs.org/html-validate/latest) |
| pdfjs-dist | 6.5.438 inchangé, exact | 6.5.438 | [npm](https://registry.npmjs.org/pdfjs-dist/latest) |

Le [changelog HTML-Validate](https://html-validate.org/changelog/index.html) décrit en 11.22.1 la correction de backtracking catastrophique des directives (ReDoS), publiée le 24 novembre. Le passage par 11.22.0 ajoute une propriété API et actualise ignore ; aucune règle locale n'est désactivée. Le [changelog axe-core-npm](https://raw.githubusercontent.com/dequelabs/axe-core-npm/develop/CHANGELOG.md) décrit en 4.14.1 le respect de `iframes: false`, l'évitement des frames sans exécution de scripts qui pouvaient bloquer et l'actualisation axe-core. Le verrou possédait déjà **axe-core 4.14.1** : seul le wrapper passe de 4.14.0 à 4.14.1 et sa plage transitive devient ~4.14.1.

## Overrides et transitives

- Override global **glob 14.0.2 supprimé** : aucune entrée node_modules/glob dans le verrou avant ou après. Il était inactif.
- Override **readdir-glob > minimatch conservé et fixé exactement à 11.0.9**, version vérifiée par `npm view minimatch@11.0.9 version engines --json` et [métadonnées npm](https://registry.npmjs.org/minimatch/11.0.9).
- Chaîne finale : **archiver 8.0.0 → readdir-glob 3.0.0 → minimatch 11.0.9**, dédoublonné avec ESLint 10.15.0 et @eslint/config-array 0.23.6. L'ancienne copie imbriquée minimatch 11.0.1 et sa copie brace-expansion 5.0.12 sont retirées par npm. Aucun changement de version d'une autre transitive n'est introduit dans le diff final du verrou.
- Le [GHSA-g3hv-75wg-m249 / CVE-2026-118764](https://github.com/advisories/GHSA-g3hv-75wg-m249), confirmé également via son [API officielle](https://api.github.com/advisories/GHSA-g3hv-75wg-m249), couvre **>=7.0.0, <11.0.1**. Il décrit une amplification CPU/mémoire par un motif contrôlé par l'appelant avec optimizationLevel >=2. **10.2.6 est affecté** ; revenir à cette branche n'est pas une correction. 11.0.1 était déjà corrigé pour cet advisory, 11.0.9 apporte les correctifs ultérieurs. Le [changelog minimatch](https://raw.githubusercontent.com/isaacs/minimatch/main/changelog.md) documente notamment les changements de matching, Unicode/Windows et d'optimisation qui justifient le smoke ciblé.

Le [registre archiver 8.0.0](https://registry.npmjs.org/archiver/8.0.0) impose readdir-glob **^3.0.0** ; readdir-glob 3.0.0 déclare minimatch **^10.2.2**. Le [registre readdir-glob 4.0.0](https://registry.npmjs.org/readdir-glob/4.0.0) indique minimatch ^11.0.1 et Node >=20. Forcer la majeure readdir-glob 4 sortirait de la plage d'archiver et ajouterait une migration transitive. On conserve donc la majeure 3 et l'override limité à son minimatch. Son code utilise l'export nommé Minimatch, présent en 11 ; le smoke de parcours réel confirme cette interface pour les cas testés. Ce choix doit être réévalué lorsque archiver adoptera officiellement readdir-glob 4. Le smoke ne garantit pas tous les motifs exotiques ou les chemins UNC.

Particularité npm 12.2.2 : install puis update ont conservé la copie imbriquée 11.0.1 malgré le nouvel override ; `npm ls` la signalait invalid. L'entrée obsolète a été retirée de manière ciblée du verrou, puis `npm install --package-lock-only --ignore-scripts` et `npm install --ignore-scripts` ont régénéré et installé l'arbre cohérent. Aucun npm ci local inutile ; les npm ci des workflows sont conservés pour les installations reproductibles.

## Node et navigateurs

L'engine projet **^22.22.0 || >=24.8.0** est conservé. HTML-Validate 11.22.1 impose la même plage ; axe-core/playwright exige >=22.12.0, ESLint/@eslint/js ^20.19.0 || ^22.13.0 || >=24, Playwright >=20, archiver/fake-indexeddb >=18, pdfjs-dist >=22.13.0 || >=24 et minimatch 11.0.9 exige 20 || >=22. La vérification avec semver de **chaque engine Node des 151 entrées du verrou** réussit pour **22.22.0, 24.8.0 et 26.13.1**. Cela vérifie les contraintes déclarées. La revue initiale utilisait Windows, Node 26.13.1 et npm 12.2.2. Des validations directes supplémentaires sous Linux Docker, Node 24.22.3, ont réussi pour lint, HTML, 151 tests unitaires et packaging ; aucun navigateur Linux n’a été exécuté.

La matrice principale Linux reste sur les deux minima 22.22.0 et 24.8.0 ; les jobs navigateurs restent sur Node 24. Playwright 1.65.1 et ses résolutions restent inchangés. Chromium est toujours installé par la CLI de cette version verrouillée, avec dépendances système sous Linux et binaire Windows sous Windows ; aucun navigateur système n'est supposé présent. Les caches restent séparés par OS et empreinte du verrou. Sur hit Linux, install-deps continue de vérifier/installer les dépendances système. Aucun résultat E2E Linux ou Windows n'est revendiqué dans cette revue locale.

## Actions et filtrage CI

Les API officielles releases/latest ont confirmé que ces versions sont publiées, non draft et non prerelease. Les workflows utilisent des tags exacts, conformément à la stratégie de tags existante du dépôt.

| Action | Avant → après | Source officielle |
|---|---|---|
| checkout | v6 → v7.0.1 | [release](https://github.com/actions/checkout/releases/tag/v7.0.1) |
| setup-node | v4 → v7.1.0 | [release](https://github.com/actions/setup-node/releases/tag/v7.1.0) |
| cache | v4 → v6.1.0 | [release](https://github.com/actions/cache/releases/tag/v6.1.0) |
| upload-artifact | v4 → v7.0.2 | [release](https://github.com/actions/upload-artifact/releases/tag/v7.0.2) |

Compatibilité vérifiée dans les README versionnés : [checkout](https://raw.githubusercontent.com/actions/checkout/v7.0.1/README.md), [setup-node](https://raw.githubusercontent.com/actions/setup-node/v7.1.0/README.md), [cache](https://raw.githubusercontent.com/actions/cache/v6.1.0/README.md), [upload-artifact](https://raw.githubusercontent.com/actions/upload-artifact/v7.0.2/README.md) et son [action.yml Node 24](https://raw.githubusercontent.com/actions/upload-artifact/v7.0.2/action.yml). Ces générations utilisent Node 24 côté Action et nécessitent un runner au moins **2.327.1** ; les runners GitHub hébergés ubuntu-latest/windows-latest utilisés par le dépôt conviennent. Le minimum 2.329.0 documenté par checkout concerne les commandes Git authentifiées dans une action conteneur Docker, absentes ici. Le runtime Node d'une Action est distinct du Node installé pour la matrice.

Les migrations ESM n'exigent pas de modification des entrées utilisées. La suppression du faux NODE_AUTH_TOKEN de setup-node 7 ne concerne pas ces jobs sans registry-url/authentification npm. Le durcissement checkout pour pull_request_target/workflow_run ne touche pas les triggers push/pull_request actuels. Cache 6.1.0 gère les accès cache en lecture seule sans faire échouer la sauvegarde ; aucune permission write n'est ajoutée. L'upload reste multi-fichiers avec le comportement d'archive par défaut. Les permissions des deux workflows restent exclusivement contents: read, les déclencheurs release restent les tags v*, sans publication automatique.

Un job changes utilise uniquement Git et checkout avec historique complet. Pour les PR, il compare le merge-base avec la tête ; pour push, before avec sha. Un diff non vide composé exclusivement de chemins finissant par .md permet de sauter seulement les E2E Chromium/accessibilité Linux et scaling Windows. **verify:core reste exécuté sur les deux versions Node**, y compris tests, lint, validation Markdown/liens et packaging. Aucun paths-ignore global ne supprime les contrôles docs. Toute source, image, HTML, configuration, dépendance ou workflow modifié déclenche les deux plateformes navigateur.

Le parcours est NUL-délimité et désactive la détection des renommages pour examiner les deux chemins. SHA absent, premier push, diff vide ou échec de comparaison déclenchent la couverture complète ; les conditions des jobs navigateur utilisent always() et !cancelled() pour conserver les contrôles si changes échoue. Risques résiduels : un checkout/history complet ajoute un petit coût ; les tags exacts restent des références mutables plutôt que des SHA ; aucun run GitHub distant n'a été déclenché pour cette revue. Les jobs navigateur volontairement sautés sur docs-only doivent être compatibles avec les règles de protection de branche du dépôt.

## Vérifications exécutées

Les résultats ci-dessous décrivent la revue initiale, sauf mention explicite. Avant les derniers correctifs, une campagne stabilisée avait réussi avec **151 tests unitaires, 154 E2E, cinq modes dans Chrome/Edge 158 et trois interruptions natives**. Elle ne valide pas le dernier état intégré. Le minimum Chrome/Edge 106 est issu d’une analyse statique, sans exécution de ces versions. La validation finale reste à consigner par le parent.

- Installation sans scripts réussie ; npm ls --depth=0 confirme les huit versions ci-dessus. npm ls minimatch readdir-glob axe-core glob --all réussit sans invalid/extraneous.
- npm audit --json : **0 vulnérabilité** (info/low/moderate/high/critical à zéro), 151 dépendances dans les métadonnées d'audit, optionnelles incluses. L'installation Windows audite 142 paquets applicables à la plateforme. Ce résultat porte sur la base d'advisories npm au moment du contrôle.
- HTML-Validate 11.22.1 : les quatre pages popup/editor/library/help passent via npx --no-install html-validate.
- node --test tests/package-validation.test.js : **8/8 réussis** ; npm run validate réussit (4 langues, 189 clés, 49 références ; état alors courant : 36 documents Markdown, 285 liens locaux).
- npm run package réussit : ZIP avec **35 fichiers**, vérification de l'allow-list et empreinte SHA-256 par le script existant. Cette archive de la revue initiale portait 1.5.2 ; le parent a ensuite synchronisé la préparation 1.5.3. Aucun de ces résultats ne constitue une publication 1.5.3.
- Smoke sous Windows réel : ZipArchive.glob('**/*.txt', {cwd, dot:false, ignore:['**/*.tmp']}) parcourt une fixture temporaire comprenant café.txt, espace et é/naïve.txt et 日本語/画像-😀.txt. Les trois noms du répertoire central ZIP, le drapeau UTF-8 et les contenus décompressés sont vérifiés ; ignorer.tmp est exclu. Succès avec la chaîne archiver 8 / readdir-glob 3 / minimatch 11.0.9. Fixture supprimée après exécution.
- Script Bash extrait du workflow : syntaxe bash -n réussie. Exécution via Git Bash sur un dépôt temporaire : **9/9 scénarios réussis** (Markdown Unicode, code seul, mixte, PR merge-base, premier push, SHA inconnu, diff vide, renommage code vers Markdown, suppression Markdown). Fixture supprimée après exécution.
- npm run lint a été exécuté : **échec dans les modifications applicatives concurrentes**, 28 erreurs alors observées : MutationObserver dans content-dom, MAX_DOCUMENT_PIXELS inutilisé dans editor, globals navigateur dans les nouveaux E2E capture-acquisition/resource-budgets. Le parent a reçu ces détails pour les agents propriétaires ; aucune modification de ces fichiers n'est faite dans cette tâche. Le && du script empêchait alors sa phase HTML, exécutée séparément avec succès ci-dessus. Cet échec décrit l’état intermédiaire de la revue initiale ; le lint applicatif final était encore en cours lors de la passation. Le parent consigne le résultat final sur l’état intégré.
- git diff --check sur les fichiers modifiés de ce périmètre : réussi. Aucun test global ni navigateur n'est relancé inutilement ici, la baseline ayant déjà été exécutée et les autres agents travaillant encore sur ces suites.

Le document historique MAJOR_DEPENDENCY_MIGRATION.md reste inchangé ; la présente revue décrit les évolutions ultérieures sans réécrire les résultats de publication de 1.5.2.
