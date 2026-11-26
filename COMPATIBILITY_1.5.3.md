# Compatibilité ciblée — ScionosCapture 1.5.3

Revue statique du 26 novembre 2026, limitée aux API Web/CSS/MV3 réellement utilisées et aux minima Node déclarés. **Aucun blocage statique démontré contre Chrome/Edge 106 n’a été identifié dans les usages examinés. Ce constat ne constitue pas une exécution de ces navigateurs.** Aucune source, configuration, dépendance, workflow ou autre documentation n’a été modifié dans cette sous-tâche ; seul ce rapport a été créé. Aucune installation npm, aucun test navigateur et aucun commit/push.

## Méthode et périmètre

CodeGraph a été consulté en premier pour les symboles ciblés : `codegraph status`, `query getExtensionTabContexts`, `node getExtensionTabContexts`, `query isRenderedVisible`. Le graphe comptait 65 fichiers, 1 053 nœuds et 3 875 arêtes ; il annonçait aussi deux ajouts et douze modifications non synchronisés. Il n’a pas été réindexé pendant les éditions concurrentes. Les résultats utiles ont donc été confirmés par lecture des fichiers sur disque et recherches ciblées des usages récents. Les API présentes uniquement dans les tests, les outils Node et les dépendances de développement ne sont pas assimilées à des prérequis de l’extension distribuée.

Le [manifeste](manifest.json) déclare Manifest V3 et `minimum_chrome_version: "106"`. La [configuration Node](package.json) déclare `^22.22.0 || >=24.8.0`. La revue porte sur ces exigences existantes, sans proposition de relever automatiquement les minima.

## API MV3

| Usage réel | Version ou contrainte vérifiée | Conclusion pour 106 |
|---|---|---|
| `MessageSender.documentId`, ciblage de message par `documentId` | Chrome 106, d’après les références [runtime](https://developer.chrome.com/docs/extensions/reference/api/runtime?hl=en#type-MessageSender) et [tabs](https://developer.chrome.com/docs/extensions/reference/api/tabs?hl=en#method-sendMessage) | Correspond au minimum déclaré. Le [contrôle d’acquisition](background.js) passe le documentId à tabs.sendMessage quand il existe. |
| `chrome.storage.session`, `setAccessLevel` et niveau TRUSTED_CONTEXTS | Chrome 102 ; [storage](https://developer.chrome.com/docs/extensions/reference/api/storage?hl=en) et son interface [StorageArea](https://developer.chrome.com/docs/extensions/reference/api/storage/StorageArea?hl=en) | Disponibles avant 106. La session contenait seulement 1 Mio jusqu’à Chrome 111 inclus, contre 10 Mio ensuite : ne pas lui attribuer la capacité du stockage IndexedDB des captures/projets. Les valeurs de session examinées sont des associations d’identifiants. |
| `chrome.runtime.getContexts` | Chrome 116, référence runtime ci-dessus | **Fallback présent et nécessaire** : getExtensionTabContexts retourne null si la fonction manque ou échoue ; getOpenCaptureIds/reconcileStorage utilisent tabs.query et les associations storage.session. Ne pas retirer ce chemin de compatibilité. |
| Promesses tabs.captureVisibleTab, tabs.create | Chrome 88, référence tabs ci-dessus | Les await/catch utilisés sont compatibles avec 106. Le quota de deux captures par seconde existe depuis Chrome 92 ; le code possède une file et un intervalle de capture. |
| chrome.alarms.clear/get | Promesses depuis Chrome 91, [référence alarms](https://developer.chrome.com/docs/extensions/reference/api/alarms?hl=en) | Compatibles avec 106. |
| chrome.alarms.create | La création existe sur 106, mais **sa Promise n’existe que depuis Chrome 111** | Nuance ci-dessous ; pas de TypeError créé par `await undefined`. |

### Nuance concrète : alarms.create sur 106–110

Le [service worker](background.js) fait `await chrome.alarms.create(...)` dans scheduleExpiry, scheduleTransferExpiry et reconcileLibrary. Sur 106, l’appel effectue une création sans Promise ; JavaScript autorise `await undefined`. Ce n’est donc pas une incompatibilité empêchant d’exécuter la capture ou la programmation de l’alarme.

En revanche, sur 106–110, cet await ne constitue pas une confirmation asynchrone de création ; les catch autour des appels ne peuvent pas exploiter une réjection de Promise absente. Les erreurs synchrones restent capturées. Si une garantie stricte de création ou de remontée des erreurs est recherchée sur ces versions, le parent doit distinguer explicitement le chemin ancien de celui retournant une Promise et vérifier l’existence de l’alarme via get, plutôt que supposer une Promise universelle. **Ne pas ajouter aveuglément un callback de création sans vérifier la signature de l’API historique.** Aucun échec utilisateur de cette nature n’a été reproduit par cette revue statique.

Les pages officielles actuelles mettent aussi en avant le namespace `browser.*`, disponible dans Chrome depuis 148. Le projet utilise `chrome.*` : ces annotations modernes ne doivent pas être interprétées comme un minimum 148 pour son code existant.

## API Web et CSS

Les versions suivantes ont été lues directement dans les données du projet MDN Browser Compatibility Data. Dans les entrées consultées, Edge utilise `mirror` de Chrome ; cela documente leur disponibilité Chromium, sans exécution Edge 106 locale.

| Usage et emplacement | Compatibilité / fallback observé | Source de données |
|---|---|---|
| `Element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })` dans [content-dom](content-dom.js) | Méthode **et ces deux noms d’options historiques depuis 105**. Un test typeof et un catch reviennent aux styles calculés display/visibility/opacity. Les options plus récentes opacityProperty, visibilityProperty et contentVisibilityAuto sont 121 ; elles ne remplacent pas ici les options historiques. | [BCD Element](https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/Element.json) |
| `moveBefore` dans [library](library.js) | Depuis **133**. Test typeof et fallback **insertBefore** présents ; conserver le fallback pour 106. | BCD Element ci-dessus |
| Canvas `roundRect` dans [editor-operations](editor-operations.js) | Test typeof présent ; rectangle de fond via **fillRect** quand indisponible. Aucun appel inconditionnel repéré sur ce chemin. | Lecture de drawText, lignes 269–281 au moment du contrôle |
| `:has()` dans le CSS d’impression de [composition-export](composition-export.js) | Depuis **105** ; le sélecteur `body > *:not(...):not(:has(...))` est donc disponible sur 106. Le minimum du projet ne requiert pas de fallback plus ancien. | [BCD :has](https://raw.githubusercontent.com/mdn/browser-compat-data/main/css/selectors/has.json) |
| `<dialog>.showModal()` dans les sélections/captures et l’éditeur | Depuis **37** ; le projet utilise le mécanisme impératif existant, sans dépendre de commandfor/closedby/popover récents. | [BCD HTMLDialogElement](https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/HTMLDialogElement.json) |
| `DecompressionStream('deflate')` pour valider les PNG dans [composition-utils](composition-utils.js) | Depuis **80**. Le code échoue explicitement si la primitive manque ; cette absence n’est pas attendue sur Chrome/Edge 106. | [BCD DecompressionStream](https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/DecompressionStream.json) |
| `crypto.randomUUID()` | Depuis **92** ; disponible dans l’origine d’extension sécurisée où les usages repérés créent les identifiants. | [BCD Crypto](https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/Crypto.json) |
| `Object.hasOwn()` dans composition-utils | Depuis **93**, compatible avec 106. | [BCD Object](https://raw.githubusercontent.com/mdn/browser-compat-data/main/javascript/builtins/Object.json) |
| `new ClipboardItem({ 'image/png': blob })` dans les exports | ClipboardItem depuis **76** ; la signature sur 98–132 accepte Blob/Promise<Blob>, exactement le type fourni ici. La prise en charge plus large ajoutée en 133 n’est pas nécessaire. L’accès au presse-papiers demeure soumis aux règles d’activation et de permission du navigateur. | [BCD ClipboardItem](https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/ClipboardItem.json) |
| Canvas 2D `{ willReadFrequently: true }` dans content-dom | Option depuis **99**, compatible avec 106. | [BCD HTMLCanvasElement](https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/HTMLCanvasElement.json) |
| `scrollbar-width: thin` dans [editor.html](editor.html) | Depuis **121**. Sur 106, la déclaration est ignorée ; overflow-x:auto reste en place, avec une barre système normale. **Différence cosmétique**, sans blocage fonctionnel identifié. | [BCD scrollbar-width](https://raw.githubusercontent.com/mdn/browser-compat-data/main/css/properties/scrollbar-width.json) |

Les usages createImageBitmap et HTMLImageElement.decode, le rendu Canvas2D, la lecture Blob/ArrayBuffer, IndexedDB et les primitives Promise/Map/Set ne font pas apparaître de dépendance à une API nouvellement introduite après 106 dans les chemins examinés. Le décodage de composition dispose aussi d’un chemin Image quand createImageBitmap n’est pas exposé. Les recherches ciblées n’ont pas trouvé d’usage applicatif de Promise.withResolvers, Object/Map.groupBy, Array.toSorted/toReversed, Uint8Array.toBase64/fromBase64, RegExp.escape, requestClose, commandfor, closedby ou popover imposant un navigateur plus récent. Cette recherche ne prouve pas à elle seule l’absence de toute API non compatible ; les cas sensibles ci-dessus ont été lus dans leur contexte.

### Modern Web Guidance

Les guides dialog et content-based-styling ont été consultés avec l’outil déjà disponible depuis le cache npm. Leur matrice confirme `:has()` à partir de Chrome/Edge 105 et distingue showModal des mécanismes récents de contrôle déclaratif des dialogues. **Aucune modernisation ni nouveau pattern du guide n’a été appliqué** : la tâche est une revue de compatibilité avec une politique explicite 106. Les recommandations visant les navigateurs actuels ne justifient pas de retirer les fallbacks existants.

## Node : contraintes et environnement réellement disponible

La [preuve des engines du verrou final](qualification/1.5.3/final-dependencies/engines.json) vérifie statiquement les contraintes Node des **152 entrées installables** pour **22.22.0, 24.8.0 et 26.13.1**, sans échec. Le projet reprend le minimum de HTML-Validate ; les dépendances directes, leurs engines et les intégrités vérifiées figurent dans la [preuve registre](qualification/1.5.3/final-dependencies/registry-verified.json).

Les scripts propres au projet utilisent les modules node:fs[/promises], path, url, crypto, child_process, http, os, timers[/promises], perf_hooks, zlib, util et le lanceur node:test. Le parcours examiné ne dépend pas de fs.glob, de registerHooks ou d’un module node:sqlite. Le SQLite employé par CodeGraph est celui de cet outil externe, pas une exigence de l’extension ou du script de tests du projet. Les paquets pdfjs-dist/canvas sont des outils de développement et de qualification, sans ajout de dépendance runtime dans le paquet de l’extension.

Constat local, par `nvm list`, `docker images`, `docker run --rm --pull=never <image-existante> node --version` et métadonnées des exécutables Windows :

| Outil | Réellement présent / observé | Limite de la preuve |
|---|---|---|
| Node actif Windows | **26.13.1** | N’est aucun des deux minima. |
| Autres Node NVM présents | 26.13.0, 26.12.1, 24.22.3, 24.22.2, 24.22.1, 24.19.0 | **22.22.0 et 24.8.0 non présents** dans cette liste. Aucun changement de version NVM globale effectué. |
| Docker Linux | image `node:24.22.3-bookworm-slim`, ainsi qu’une image node sans tag qui rapporte aussi **24.22.3** | Pas d’image déjà présente pour les minima exacts. Aucun pull supplémentaire effectué. |
| Chrome Windows | **158.0.8127.37** | Le binaire présent ne valide pas Chrome 106. |
| Edge Windows | **158.0.4370.33** | Le binaire présent ne valide pas Edge 106. |

La campagne dépendances antérieure à cette sous-tâche a déjà exécuté un npm ci et un smoke PDF/archives sous Windows Node 26.13.1 et dans Linux Node 24.22.3 : [Windows](qualification/1.5.3/final-dependencies/dependency-smoke.json), [Linux](qualification/1.5.3/final-dependencies/linux/dependency-smoke.json). **Ces exécutions ne deviennent pas des tests des minima Node par comparaison semver.** Aucune nouvelle campagne d’installation ou de tests applicatifs n’a été lancée dans la présente revue.

## Commandes utiles pour la qualification du parent

La matrice de [CI](.github/workflows/ci.yml) exécute déjà les minima exacts 22.22.0 et 24.8.0. Pour une validation syntaxique locale sous Linux avec l’image existante, sans installation npm ni modification du checkout, cette commande est proposée, **non exécutée dans cette sous-tâche** :

```powershell
docker run --rm --pull=never --mount 'type=bind,source=D:\Serveurs\Projet_ScioNos\Scionos-Capture,target=/repo,readonly' --workdir /repo node:24.22.3-bookworm-slim npm run check
```

Pour contrôler les **minima exacts**, il faudra rendre disponibles les binaires correspondants ou les images officielles `node:22.22.0-bookworm-slim` et `node:24.8.0-bookworm-slim`, puis remplacer le tag dans la commande ci-dessus. Ce téléchargement n’a pas été réalisé. Les versions exactes et les images utilisées devront être consignées par la qualification, plutôt que supposées depuis un tag majeur flottant. Pour les tests requérant les dépendances natives, utiliser ensuite un répertoire de travail Linux isolé et son installation propre, lorsque la phase d’installation concurrente sera terminée ; ne pas partager les binaires node_modules Windows avec Linux. Les smokes navigateur et natifs actuels doivent conserver leur version Chrome/Edge dans leurs preuves et ne pas être présentés comme une validation de 106.

## Complément de qualification des minima exacts

Après cette revue, les deux images officielles exactes ont été téléchargées et exécutées dans des copies isolées du snapshot `qualified-2`. **Node 22.22.0 / npm 10.9.4 et Node 24.8.0 / npm 11.6.0 réussissent chacun npm ci puis verify:core complet, avec 178/178 tests unitaires**, syntaxe, ESLint, HTML-Validate, validation et packaging de 35 fichiers. Core a été exécuté réseau déconnecté, avec 2 Gio, 2 CPU et 256 PID ; aucune installation hôte ni navigateur Linux dans cette passe. Les constats de disponibilité et commandes non exécutées des sections précédentes décrivent l’état de la revue initiale, pas le résultat de ce complément.

La [synthèse du snapshot et des résultats](qualification/1.5.3/final-linux/qualified-2/qualification-summary.json) contient les empreintes et limites. Les deux archives du snapshot ont la même taille de 175 572 octets et le même SHA-256 `09c06d5dca2c0d56550904a77bc246717b4aa4ebe5bf335f40fc25ec1a82827f` ; cela n’atteste pas encore le ZIP Windows définitif. Les tests navigateur 106 restent non exécutés.

Le correctif final d’annulation emploie `AbortController` et `AbortSignal.throwIfAborted()` (Chrome 100, antérieur au minimum 106) ; il conserve les contrôles après les attentes et avant les téléchargements ou l’impression. La primitive ne préempte pas un encodeur Canvas déjà démarré : son résultat est ignoré et ses surfaces sont nettoyées à sa terminaison. Voir [les données MDN AbortSignal](https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/AbortSignal.json).

## Points transmis au parent

1. **Conserver** les fallbacks runtime.getContexts → tabs/session, moveBefore → insertBefore, roundRect → fillRect et checkVisibility → styles calculés.
2. `scrollbar-width` est une amélioration décorative postérieure à 106 ; aucun correctif fonctionnel requis par la revue ciblée. Une apparence de barre identique sur 106 demanderait un choix CSS distinct, sans intérêt démontré ici.
3. Si la confirmation d’alarme et la remontée d’erreurs sont requises sur 106–110, traiter explicitement la différence de contrat d’alarms.create ; l’await actuel ne bloque pas l’exécution mais n’apporte pas la même garantie qu’en 111+.
4. Les deux minima Node et les navigateurs 106 restent **non exécutés localement**. La compatibilité 106 décrite ici est statique et circonscrite aux usages examinés ; la qualification finale de l’état intégré revient au parent.
