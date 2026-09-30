# Audit de publication — Scionos Capture 1.3.2

**Date :** 30 septembre 2026
**Périmètre :** audit du code et du conditionnement, corrections des défauts reproduits, tests de régression et inspection en lecture seule de l’archive existante. Le profil Chrome personnel n’a pas été automatisé.

## Verdict initial

**Publication déconseillée en l’état.** Deux défauts ont été reproduits dans des simulations utilisant les fonctions de production : le PDF peut conserver du texte masqué visuellement par une forme opaque, et l’assemblage peut laisser une bande blanche d’un pixel à certains facteurs d’échelle fractionnaires. Les simulations sont reproductibles, mais n’ont pas été exécutées dans le vrai profil Chrome de l’utilisateur.

## Défauts

### AUDIT-01 — Le PDF conserve le texte recouvert par une forme opaque

**Sévérité : élevée — confidentialité.**

- **Zones concernées :** `editor.js`, autour des lignes 252–285; `editor-operations.js`, autour des lignes 277–295; `capture-utils.js`, autour des lignes 699–718; export PDF dans `editor-export.js`, autour des lignes 98–124.
- **Reproduction :** partir d’une capture contenant un bloc de texte indexé (`SECRET-OMEGA-7319` dans la simulation), puis poser une forme pleine noire par-dessus avec l’outil de forme. L’image finale montre bien le rectangle noir, mais les blocs de texte ne sont filtrés que pour les opérations de recadrage et de censure. La génération de la couche texte PDF reçoit donc encore le bloc d’origine.
- **Résultat observé :** dans la simulation, le pixel couvert est noir, tandis que la couche texte produite contient toujours `SECRET-OMEGA-7319`. Un lecteur PDF ou une extraction de texte pourrait retrouver ce contenu malgré son masquage à l’écran.
- **Résultat attendu :** toute opération qui masque de manière opaque du contenu doit également retirer de la couche texte PDF les blocs recouverts, avec un comportement cohérent après annulation, rétablissement et consolidation de l’historique.
- **Correction suggérée :** filtrer les blocs de texte indexés qui intersectent une forme pleine opaque avant de produire le PDF, ou omettre de façon conservatrice les blocs touchant la zone couverte. Ajouter une régression qui crée un vrai PDF puis vérifie son texte extrait après forme opaque, censure, recadrage, annulation/rétablissement et consolidation.
- **Portée de la preuve :** constat établi à partir du flux de code et d’une simulation de l’application de production et du générateur de couche texte. Le PDF simulé n’a pas été imprimé en fichier puis passé dans un extracteur PDF.

### AUDIT-02 — Bande blanche d’un pixel avec certaines échelles fractionnaires

**Sévérité : moyenne — intégrité visuelle.**

- **Zones concernées :** `content-capture.js`, autour des lignes 158–169 et 568–574; `capture-utils.js`, autour des lignes 89–109 et 135–148.
- **Reproduction :** simuler une page de 1703 × 1109 pixels CSS, fenêtre de 800 × 600, puis assembler les tuiles avec le calcul de destination de production. À l’échelle 1,25, la simulation produit une sortie de 2129 × 1387 pixels avec la dernière rangée blanche. À l’échelle 1,5, la dernière rangée et la dernière colonne restent blanches. Pour une zone défilante de 800 × 1109, les facteurs 1,25 et 1,5 laissent aussi la dernière rangée blanche.
- **Résultat attendu :** les pixels de la sortie jusqu’à ses bords calculés doivent être couverts par les tuiles, sans bord blanc ajouté par l’arrondi.
- **Cause probable :** les dimensions du canevas sont arrondies vers le haut (`Math.ceil`), tandis que les bornes des sources sont arrondies séparément puis reconverties en dimensions CSS pour calculer les destinations. À certaines échelles, la destination finale s’arrête avant la dernière rangée ou colonne du canevas.
- **Correction suggérée :** calculer les bornes de destination depuis la région CSS prévue, puis borner les coordonnées droites et basses de la dernière tuile aux dimensions réelles de sortie. Ajouter des régressions comparant chaque pixel pour les facteurs 1,25 et 1,5 et des dimensions qui ne tombent pas juste.
- **Portée de la preuve :** simulation avec les fonctions de géométrie de production et des tuiles synthétiques de couleur uniforme; aucune capture en direct par l’API Chrome n’a été effectuée.

## Vérifications et limites

| Sujet | Constat |
|---|---|
| Installation Chrome | La capture d’écran fournie montre Scionos Capture 1.3.2 installée et activée. Le worker « Inactive » est compatible avec le cycle normal des service workers MV3 après une période d’inactivité; Chrome peut le réveiller pour traiter un événement. Voir la [documentation Chrome sur le cycle de vie des service workers](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle?hl=en). |
| Accès au vrai profil | L’outil de navigateur disponible dans cette session contrôlait un Chrome isolé, pas le profil personnel visible dans la capture. L’automatisation du poste n’a pas pu se connecter au profil réel. Les tests décrits ci-dessus sont donc des simulations locales de l’éditeur et des fonctions de géométrie, pas une validation bout en bout dans le Chrome de l’utilisateur. |
| Tests automatisés | Vérifications exécutées après les corrections : 55 tests unitaires réussis, 46 tests navigateur réussis, `npm run check`, `npm run lint` et `npm run validate` réussis. |
| Versions déclarées | `manifest.json`, `package.json` et la racine de `package-lock.json` déclarent la version 1.3.2. Les versions exactes du lockfile sont cohérentes pour les dépendances consultées. L’installation locale des dépendances n’a pas été inspectée avec `npm ls`. |
| Permissions et reprise du worker | Le manifeste conserve les permissions existantes et ne demande pas `tabs`. Le test navigateur a reproduit la perte du mapping après arrêt du worker : l’URL de l’onglet d’extension n’était pas disponible au code de réconciliation. La reprise utilise maintenant les contextes d’extension quand l’API est disponible et conserve une solution de repli pour les versions Chrome prises en charge. Le test de cycle du worker passe. Voir la [référence Chrome de l’API Tabs](https://developer.chrome.com/docs/extensions/reference/api/tabs?hl=en) et l’[API Runtime](https://developer.chrome.com/docs/extensions/reference/api/runtime/). |
| Cadence de capture | Le code impose un délai minimal de 550 ms entre les captures visibles, soit environ 1,82 appel par seconde, sous la limite documentée de deux appels par seconde de `captureVisibleTab`. |
| Archive et empreinte | L’archive existante `dist/scionos-capture-v1.3.2.zip` et son fichier `.sha256` ont été inspectés en lecture seule. L’empreinte recalculée correspond à `99aa511dcc18f032e37c61a6d55d36d2886e6d18dee6dac88cfcee92c9ccb0b7`; l’archive contient 29 entrées. Elle précède les corrections et n’a pas été reconstruite ni remplacée. |

## État après correctifs — 30 septembre 2026

- **AUDIT-01 corrigé dans le code :** l’éditeur filtre maintenant les blocs de texte qui chevauchent les limites d’une forme pleine opaque, à la fois lors de l’application et de la reconstruction de l’historique. Le test navigateur ajouté génère un vrai PDF, vérifie l’extraction du texte couvert et du texte public, puis vérifie l’annulation et le rétablissement.
- **AUDIT-02 corrigé dans le code :** les destinations de tuiles sont maintenant calculées depuis les régions CSS écrites et les dimensions finales du canevas; la dernière tuile atteint les bords de sortie. Des tests unitaires et navigateur couvrent les facteurs 1,25 et 1,5 pour les captures pleine page et les zones défilantes.
- **Récupération du worker :** le test navigateur force l’arrêt du worker avec une capture encore ouverte, contrôle le mapping et l’alarme d’expiration après redémarrage, puis vérifie la récupération de l’éditeur. Le test passe. Le défaut provenait de la suppression d’un mapping valide quand Chrome masquait l’URL de l’onglet à l’extension.
- **Vérification locale des géométries :** le `capture-utils.js` courant a été chargé dans un navigateur isolé et exercé avec les mêmes dimensions et formules d’assemblage. À 1,25 et 1,5, les simulations pleine page (1703 × 1109 CSS px) et défilante (800 × 1109 CSS px) produisent zéro pixel inattendu, avec des dimensions respectives de 2129 × 1387 / 2555 × 1664 et 1000 × 1387 / 1200 × 1664.
- **Suites automatisées :** `npm test` (55 tests), `npm run test:e2e` (46 tests), `npm run check`, `npm run lint` et `npm run validate` réussissent.
- **ZIP et SHA-256 :** l’archive existante et son fichier d’empreinte ont été contrôlés en lecture seule. L’empreinte correspond et les 29 entrées ont été inspectées. L’archive est antérieure aux corrections; elle n’a pas été modifiée ni reconstruite.

## Recommandation

Les défauts PDF, de bord de capture et de reprise du worker sont corrigés. Les suites unitaires, navigateur, contrôle statique et validation du paquet réussissent. L’archive ZIP et son SHA-256 correspondent toujours et restent inchangés; ils précèdent les corrections, donc une prochaine archive de distribution devra être créée séparément. La récupération a été validée dans Chromium automatisé, pas dans le profil Chrome personnel de l’utilisateur.
