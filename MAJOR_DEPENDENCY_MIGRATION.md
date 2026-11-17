# Migration des outils ESLint et HTML-Validate

Cette migration intervient après la publication GitHub de la version 1.5.2. À la demande de l’utilisateur, elle est intégrée à une correction de cette même release, sans changer le numéro 1.5.2. Le tag et les fichiers joints seront actualisés après validation du paquet corrigé.

## Versions

| Dépendance | Avant | Après |
|---|---|---|
| @eslint/js | ^9.39.5 | ^10.0.1 |
| eslint | ^9.39.5 | ^10.15.0 |
| html-validate | ^9.7.1 | ^11.21.1 |

Commande utilisée : `ncu -u --filter '@eslint/js,eslint,html-validate'`, puis `npm install`. Le verrou npm est actualisé. Les autres dépendances directes et les overrides existants sont conservés.

## Compatibilité

HTML-Validate 11.21.1 exige Node `^22.22.0 || >=24.8.0`. Ce prérequis est déclaré dans le paquet et documenté dans les quatre langues ; la matrice de contrôles principaux de la CI cible Node 22.22.0 et 24.8.0. L’exécution locale utilise Node 26.13.1 et npm 12.2.2.

La configuration plate ESLint et la configuration JSON HTML-Validate existantes sont conservées. Aucune nouvelle règle n’est désactivée. La règle `no-useless-assignment` a détecté l’initialisation inutile de `nextMessages` dans le chargement de langue. Cette initialisation est retirée : chaque chemin normal ou de secours attribue déjà une valeur avant son utilisation.

Sources officielles : [npm-check-updates](https://github.com/raineorshine/npm-check-updates#usage), [migration ESLint 10](https://eslint.org/docs/latest/use/migrate-to-10.0.0), [migrations HTML-Validate 10 et 11](https://html-validate.org/migration/index.html).

## Vérifications

- Installation réussie : 10 paquets ajoutés, 27 retirés, 22 modifiés ; audit npm sans vulnérabilité.
- `npm ls --depth=0` confirme les trois versions cibles.
- `ncu` indique que toutes les dépendances directes correspondent aux dernières versions disponibles au moment du contrôle.
- Le lint ESLint 10 et HTML-Validate 11 passe après la correction de l’affectation inutile.
- 133 tests unitaires réussis ; validation du paquet et génération locale de l’archive de 35 fichiers réussies.
- `npm run verify` a terminé avec le code 0 : syntaxe, lint, 133 tests unitaires, validation du paquet, génération du ZIP et 126 tests navigateur réussis (suite navigateur : 3,6 minutes).
- Manifeste npm et verrou synchronisés, vérifiés par comparaison de leurs dépendances et exigences Node ; `git diff --check` réussi.

La correction complète a aussi passé `npm run verify:release` sous Node 26.13.1 : 133 tests unitaires, 126 tests navigateur, cinq modes natifs dans Chrome 157.0.8103.79 et Edge 157.0.4341.60, trois répétitions de performances générales et dix scénarios PDF. L’archive corrigée contient 35 fichiers ; SHA-256 : `d20d607afc0bdb4e8d942a04b770803ffa0215d311b657436c5388c023dd5d98`.

La matrice CI cible Node 22.22.0 et 24.8.0 ; les résultats distants seront constatés après le push du commit corrigé.

La correction conserve le numéro 1.5.2 dans le paquet et le manifeste. Le ZIP corrigé garde le nom `scionos-capture-v1.5.2.zip` ; son empreinte sera remplacée avec l’archive dans la release existante. La correction du tag v1.5.2 est explicite ; les clones qui possèdent déjà l’ancien tag devront le récupérer à nouveau pour voir le nouveau commit.
