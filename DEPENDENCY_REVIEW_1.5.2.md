# Dépendances — préparation de Scionos Capture 1.5.2

## Périmètre

Mises à jour mineures et correctives demandées, en conservant les versions majeures existantes. Les dépendances sont des outils de développement et de test ; elles ne sont pas ajoutées au paquet de l’extension.

| Dépendance | Avant | Après |
|---|---|---|
| @axe-core/playwright | ^4.12.1 | ^4.14.0 |
| @playwright/test | ^1.62.1 | ^1.65.1 |
| fake-indexeddb | ^6.2.5 | ^6.2.8 |
| pdfjs-dist | 6.3.289 | 6.5.438 (version exacte) |

Le verrou npm inclut les dépendances transitives correspondantes. `archiver` reste en ^8.0.0 et les overrides existants sont conservés.

## Prérequis Node.js

Les métadonnées des versions exactes donnent Node >=22.12.0 pour [@axe-core/playwright 4.14.0](https://registry.npmjs.org/@axe-core%2fplaywright/4.14.0), >=20 pour [@playwright/test 1.65.1](https://registry.npmjs.org/@playwright%2ftest/1.65.1), >=18 pour [fake-indexeddb 6.2.8](https://registry.npmjs.org/fake-indexeddb/6.2.8) et >=22.13.0 pour [PDF.js 6.5.438](https://registry.npmjs.org/pdfjs-dist/6.5.438).

Le projet déclare donc Node >=22.13.0, recommande Node 24 et configure la CI sur Node 22.13.0 et 24. Cette exigence concerne les outils du dépôt, pas la version minimale de Chrome de l’extension.

## Migrations majeures étudiées et non appliquées

| Dépendance | Conservée | Cible étudiée | Node exigé par la cible |
|---|---|---|---|
| @eslint/js | ^9.39.5 | ^10.0.1 | ^20.19.0 ou ^22.13.0 ou >=24 |
| eslint | ^9.39.5 | ^10.15.0 | ^20.19.0 ou ^22.13.0 ou >=24 |
| html-validate | ^9.7.1 | ^11.21.1 | ^22.22.0 ou >=24.8.0 |

Disponibilité et exigences vérifiées sur les fiches npm officielles : [@eslint/js](https://registry.npmjs.org/@eslint%2fjs/10.0.1), [ESLint](https://registry.npmjs.org/eslint/10.15.0), [HTML-Validate](https://registry.npmjs.org/html-validate/11.21.1).

### ESLint 10 et @eslint/js 10

Le [guide officiel de migration](https://eslint.org/docs/latest/use/migrate-to-10.0.0) documente notamment :

- trois règles supplémentaires dans `js.configs.recommended`, utilisé par le projet : `no-unassigned-vars`, `no-useless-assignment` et `preserve-caught-error` ;
- une recherche de configuration depuis chaque fichier analysé ;
- le retrait du format eslintrc et les erreurs sur les commentaires `eslint-env` ;
- des suppressions d’API concernant les intégrations, règles et parseurs personnalisés.

Le projet utilise déjà une configuration plate avec des règles natives. Aucun commentaire `eslint-env` n’a été trouvé dans les sources examinées. Une migration devra toutefois exécuter le lint et traiter les nouveaux diagnostics. Les deux paquets sont à migrer ensemble : @eslint/js 10.0.1 déclare le pair optionnel eslint ^10.0.0.

Les [notes ESLint 10.15.0](https://eslint.org/blog/2026/11/eslint-v10.15.0-released/) décrivent les corrections et améliorations de résolution de configuration. La [politique officielle de support](https://eslint.org/version-support/) indique que la branche 9 a atteint sa fin de support le 6 août 2026. Son maintien ici respecte la demande d’exclure les migrations majeures ; prévoir une intervention séparée.

### HTML-Validate 10 puis 11

Le [guide officiel](https://html-validate.org/migration/index.html) couvre les deux migrations. Les points concernés sont les exigences Node, les exports de sous-chemins, les anciennes intégrations Jest/Vitest/Cypress, les motifs réguliers désormais délimités par `/.../`, le déplacement de `implicitRole` vers `aria.implicitRole` et plusieurs suppressions d’API.

La configuration du projet étend `html-validate:recommended` et désactive sept règles ; elle n’utilise ni plugins, ni métadonnées, ni motifs personnalisés concernés. L’usage est celui de la CLI. La configuration JSON reste acceptée par [la CLI officielle](https://html-validate.org/usage/cli.html#c-config), mais les diagnostics des quatre pages HTML devront être comparés lors d’une migration. Le [changelog officiel](https://html-validate.org/changelog/index.html) détaille les évolutions de règles.

Une migration future des trois dépendances majeures demanderait au minimum Node ^22.22.0 ou >=24.8.0. Aucune de ces versions majeures n’a été installée pour cette préparation.

## Validation

`npm run verify:release` a terminé avec le code 0 sous Windows, Node.js 26.13.1 et npm 12.2.2 :

- syntaxe JavaScript, ESLint et HTML-Validate réussis ;
- 133 tests unitaires réussis ;
- 126 tests navigateur réussis avec Playwright 1.65.1, dont les vérifications d’accessibilité axe-core 4.14 et les exports PDF ;
- cinq modes de capture réussis dans Chrome 157.0.8103.79 et dans Edge 157.0.4341.60, dimensions et pixels vérifiés ;
- mesures de performance générales : trois répétitions terminées ;
- dix scénarios de préparation PDF réussis, dont la limite proche de 32 millions de pixels, les refus au-delà des budgets et le nettoyage après erreur d’encodage ;
- `npm audit` : zéro vulnérabilité ; `npm outdated` ne liste plus que les trois migrations majeures exclues ;
- réinstallation du verrou réussie avec `npm ci --ignore-scripts` (160 paquets installés, zéro vulnérabilité) ; aucun changement de version majeure parmi les dépendances transitives mises à jour ;
- validation finale des documents et liens locaux réussie ;
- archive de 35 fichiers, SHA-256 : `4cd9154b5b98b4e413c23683f3ecbfe3bfc2b0a633ae0b4407b19934d5938bc7`.

La première exécution a révélé un diagnostic sérieux `label-content-name-mismatch` sur le sélecteur de langue. Son nom accessible inclut maintenant le code visible ; le test existant dans les quatre langues couvre aussi ce bouton. La validation complète ci-dessus a été relancée après cette correction.

Rapports locaux générés dans `dist/performance-smoke.json` et `dist/verify-1.5.2/pdf-performance.json`. Ces mesures sont synthétiques et locales ; les captures natives utilisent des profils jetables. Les vérifications Node.js 22.13.0 et 24 sont configurées dans la CI ; elles ne sont pas assimilées à une exécution locale sous ces versions.

La publication GitHub et la soumission au Chrome Web Store doivent être constatées séparément.
