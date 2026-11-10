# Scionos Capture

[Français](README.md) · [English](README.en.md) · [Español](README.es.md) · [Deutsch](README.de.md)

Extension Chrome et Edge de capture d’écran entièrement locale. Capturez la zone visible, une sélection, une zone défilante ou une page complète, puis dessinez, masquez, rognez et exportez en PNG, HTML interactif ou PDF.

![Version](https://img.shields.io/badge/version-1.4.0-blue) ![Manifest](https://img.shields.io/badge/Manifest-V3-4285F4) ![Licence](https://img.shields.io/badge/licence-MIT-green)


## Fonctionnalités

- Cinq modes : page entière, zone visible, zone sélectionnée, zone défilante et élément au clic.
- Sélection ajustable par poignées et coordonnées, avec confirmation avant capture et navigation parent/enfant pour les éléments.
- Capture immédiate ou différée de 3, 5 ou 10 secondes, avec compte à rebours annulable et préférence mémorisée localement.
- Zone défilante verticale définie par deux points ou par coordonnées X/Y/largeur/hauteur au clavier.
- Éditeur local avec dessin, masquage solide, flou visuel, rognage, Annuler/Refaire et zoom 20–300 %.
- Interface responsive et navigable au clavier en français, anglais, espagnol et allemand.
- Langue automatique du navigateur avec remplacement manuel depuis le menu à drapeaux.
- Export PNG, rapport HTML interactif autonome, copie dans le presse-papiers et impression/enregistrement PDF par le navigateur.
- Aucun serveur, compte, suivi analytique, publicité ou transmission de capture.

## Installation

### Depuis la release GitHub

1. Téléchargez `scionos-capture-v1.4.0.zip` depuis la [release v1.4.0](https://github.com/ScioNos/Scionos-Capture/releases/tag/v1.4.0).
2. Vérifiez éventuellement le fichier `.sha256`, puis extrayez le ZIP.
3. Ouvrez `chrome://extensions` ou `edge://extensions`.
4. Activez le **Mode développeur**, choisissez **Charger l’extension non empaquetée** et sélectionnez le dossier extrait.

### Depuis les sources

Clonez le dépôt, exécutez `npm ci` puis chargez la racine du projet comme extension non empaquetée.

## Utilisation

Choisissez d’abord un délai (**Immédiat**, **3**, **5** ou **10 secondes**), puis **Page entière**, **Zone visible**, **Zone sélectionnée**, **Zone défilante** ou **Élément au clic**. En mode sélection, tracez la zone puis ajustez ses poignées ou ses coordonnées et choisissez **Capturer**. En mode élément, survolez un bloc, choisissez au besoin son **Élément parent/enfant** et la **Partie visible** ou le contenu entier d’un conteneur réellement défilant, puis cliquez sur le bloc. Ajustez ensuite les coordonnées et confirmez avec **Capturer**. Le délai commence après confirmation pour les zones sélectionnées, les zones défilantes et les éléments ; pour la page entière et la zone visible, il commence dès le lancement. **Échap** annule le compte à rebours. Pour **Zone défilante**, cliquez sur le premier coin, faites défiler verticalement, puis cliquez sur le coin opposé. `Échap` annule, « Recommencer » efface le premier point et les champs X/Y/largeur/hauteur offrent une utilisation entièrement au clavier. Le raccourci suggéré est `Alt+Shift+C`; le menu affiche toujours le raccourci réellement configuré par le navigateur.

Dans l’éditeur, les raccourcis `V`, `D`, `M`, `C` sélectionnent les outils; `Ctrl+Z` et `Ctrl+Y` annulent/refont; `+`, `-` et `0` contrôlent le zoom. Le masquage solide est recommandé pour les secrets : le flou est uniquement visuel.

## Permissions et confidentialité

- `activeTab` et `scripting` : exécuter une capture uniquement après une action explicite.
- `storage` : mémoriser la langue, le délai de capture et la correspondance temporaire avec l’éditeur.
- `unlimitedStorage` : conserver localement les grandes captures sans échec de quota.
- `alarms` : supprimer les captures temporaires expirées.

Les fragments de transfert restent uniquement dans IndexedDB local et sont supprimés après assemblage ou après quinze minutes sans activité (au prochain réveil si le navigateur est suspendu). La capture finale est conservée tant qu’un éditeur correspondant est ouvert, même au-delà de quinze minutes et après rechargement. Elle est supprimée à la fermeture du dernier éditeur ; sans éditeur, elle devient éligible au nettoyage quinze minutes après sa création. Consultez [PRIVACY.md](PRIVACY.md) et [SECURITY.md](SECURITY.md).

## Limites connues

- Les pages à défilement infini permanent ne peuvent pas avoir de fin déterminée.
- Une zone défilante reste limitée à la largeur visible au moment du premier point; elle n’assemble pas horizontalement.
- Certains éléments `sticky` ou contenus qui changent continuellement peuvent encore apparaître différemment entre les tuiles.
- Les pages internes du navigateur et les boutiques d’extensions ne sont pas injectables.
- Le sélecteur d’élément ne parcourt pas le contenu des iframes : le cadre peut être capturé comme élément visible, mais ses éléments internes ne sont pas sélectionnables individuellement.
- Les images dépassant 16 millions de pixels ou 16 384 px par côté sont réduites automatiquement.

## Développement

Prérequis : Node.js 24.

```bash
npm ci
npm run verify
```

`verify` exécute syntaxe, ESLint, validation HTML, tests, contrôle du manifeste/locales, packaging et tests E2E Axe dans Chromium. `npm run package` crée le ZIP et son SHA-256 dans `dist/`.

Consultez [CONTRIBUTING.md](CONTRIBUTING.md), [CHANGELOG.md](CHANGELOG.md) et la [licence MIT](LICENSE).

### PDF

Appliquez ou annulez les modifications en attente avant tout export. Le flou reste un effet visuel ; utilisez un masque solide pour les secrets.

Les captures de conteneurs translatés ou mis à l’échelle sont prises en charge. Les rotations, inclinaisons et perspectives non prises en charge provoquent une erreur explicite.

La couche recherchable du PDF conserve uniquement les mots complets dont la visibilité est vérifiable. Les mots incertains sont omis de cette couche ; l’image capturée est conservée. Les anciens calques aux coordonnées non vérifiables sont également omis. Le masquage solide reste nécessaire pour protéger les pixels confidentiels ; le flou est seulement visuel.

Node.js 24 est recommandé pour la vérification complète, notamment l’extraction PDF avec PDF.js 6.3.289 (dépendance de test uniquement). Les contrôles principaux restent compatibles avec Node.js 20.

La synchronisation d’une version non publiée utilise `npm run version:sync -- 1.4.0 --unreleased` ; sous PowerShell, utilisez `npm.cmd run version:sync -- 1.4.0 --unreleased`. Les liens de téléchargement publié restent inchangés.

<!-- local-package --> Archive locale : `scionos-capture-v1.4.0.zip` · SHA-256 : `scionos-capture-v1.4.0.zip.sha256`.

`npm run test:native` vérifie les cinq modes et une capture différée dans Chrome et Edge installés, avec de vraies captures et des profils temporaires. La permission `activeTab` est accordée par l’action de l’extension ; les profils personnels ne sont pas utilisés.
