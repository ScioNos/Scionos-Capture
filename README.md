# Scionos Capture

[Français](README.md) · [English](README.en.md) · [Español](README.es.md) · [Deutsch](README.de.md)

Extension Chrome et Edge de capture d’écran entièrement locale. Capturez la zone visible, une sélection, une zone défilante ou une page complète, puis dessinez, masquez, rognez et exportez en PNG, HTML interactif ou PDF.

![Version](https://img.shields.io/badge/version-1.1.0-blue) ![Manifest](https://img.shields.io/badge/Manifest-V3-4285F4) ![Licence](https://img.shields.io/badge/licence-MIT-green)

## Fonctionnalités

- Capture visible, sélectionnée, défilante ou page complète, y compris les pages plus larges que la fenêtre.
- Zone défilante verticale définie par deux points ou par coordonnées X/Y/largeur/hauteur au clavier.
- Éditeur local avec dessin, masquage solide, flou visuel, rognage, Annuler/Refaire et zoom 20–300 %.
- Interface responsive et navigable au clavier en français, anglais, espagnol et allemand.
- Langue automatique du navigateur avec remplacement manuel depuis le menu à drapeaux.
- Export PNG, rapport HTML interactif autonome, copie dans le presse-papiers et impression/enregistrement PDF par le navigateur.
- Aucun serveur, compte, suivi analytique, publicité ou transmission de capture.

## Installation

### Depuis la release GitHub

1. Téléchargez `scionos-capture-v1.1.0.zip` depuis la [release v1.1.0](https://github.com/ScioNos/Scionos-Capture/releases/tag/v1.1.0).
2. Vérifiez éventuellement le fichier `.sha256`, puis extrayez le ZIP.
3. Ouvrez `chrome://extensions` ou `edge://extensions`.
4. Activez le **Mode développeur**, choisissez **Charger l’extension non empaquetée** et sélectionnez le dossier extrait.

### Depuis les sources

Clonez le dépôt, exécutez `npm ci` puis chargez la racine du projet comme extension non empaquetée.

## Utilisation

Ouvrez Scionos Capture et choisissez **Page entière**, **Zone visible**, **Zone sélectionnée** ou **Zone défilante**. Pour cette dernière, cliquez sur le premier coin, faites défiler verticalement, puis cliquez sur le coin opposé. `Échap` annule, « Recommencer » efface le premier point et les champs X/Y/largeur/hauteur offrent une utilisation entièrement au clavier. Le raccourci suggéré est `Alt+Shift+P`; le menu affiche toujours le raccourci réellement configuré par le navigateur.

Dans l’éditeur, les raccourcis `V`, `D`, `M`, `C` sélectionnent les outils; `Ctrl+Z` et `Ctrl+Y` annulent/refont; `+`, `-` et `0` contrôlent le zoom. Le masquage solide est recommandé pour les secrets : le flou est uniquement visuel.

## Permissions et confidentialité

- `activeTab` et `scripting` : exécuter une capture uniquement après une action explicite.
- `storage` : mémoriser la langue et la correspondance temporaire avec l’éditeur.
- `unlimitedStorage` : conserver localement les grandes captures sans échec de quota.
- `alarms` : supprimer les captures temporaires expirées.

Les fragments de transfert restent uniquement dans IndexedDB local et sont supprimés après assemblage ou sous quinze minutes. La capture finale est supprimée dès son décodage par l’éditeur; une expiration de quinze minutes protège seulement contre les captures orphelines. Consultez [PRIVACY.md](PRIVACY.md) et [SECURITY.md](SECURITY.md).

## Limites connues

- Les pages à défilement infini permanent ne peuvent pas avoir de fin déterminée.
- Une zone défilante reste limitée à la largeur visible au moment du premier point; elle n’assemble pas horizontalement.
- Certains éléments `sticky` ou contenus qui changent continuellement peuvent encore apparaître différemment entre les tuiles.
- Les pages internes du navigateur et les boutiques d’extensions ne sont pas injectables.
- Les images dépassant 16 millions de pixels ou 16 384 px par côté sont réduites automatiquement.

## Développement

Prérequis : Node.js 20 ou 24.

```bash
npm ci
npm run verify
```

`verify` exécute syntaxe, ESLint, validation HTML, tests, contrôle du manifeste/locales, packaging et tests E2E Axe dans Chromium. `npm run package` crée le ZIP et son SHA-256 dans `dist/`.

Consultez [CONTRIBUTING.md](CONTRIBUTING.md), [CHANGELOG.md](CHANGELOG.md) et la [licence MIT](LICENSE).
