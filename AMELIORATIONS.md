# Scionos Capture — Suggestions d'améliorations

Date : 14 septembre 2026 · Version auditée : **1.1.0**

Suggestion tirées d'un audit complet du code (syntaxe, lint, tests unitaires, tests E2E Playwright, validation de paquet, revue manuelle). Aucun problème bloquant n'a été détecté ; les pistes ci-dessous sont des améliorations optionnelles, classées par priorité.

---

## 🔴 Prioritaire (sécurité / robustesse)

### 1. `OPEN_EDITOR` est une action de service-worker non documentée
- **Fichier :** `background.js`
- **Statut :** ✅ **Corrigé (1.2.0)** — branche `OPEN_EDITOR`, fonction `openLegacyEditor` et utilitaire `dataUrlToBlob` supprimés.
- **Problème :** l'action `OPEN_EDITOR` (legacy, via `openLegacyEditor`) n'est envoyée par aucun script du projet. Elle reste exposée au message listener et peut être invoquée par tout onglet qui passe la garde `isTrustedTabSender`.
- **Action :** supprimer la branche morte ou documenter son utilisation. Si elle est vraiment inutile, c'est une petite surface d'attaque à retirer.

### 2. `chrome.storage.session` n'est pas déclaré dans le manifest
- **Fichier :** `manifest.json`
- **Statut :** ❌ **Recommandation erronée — aucun changement nécessaire.**
- **Explication :** la permission `"storage"` couvre déjà `local`, `sync` **et** `session` en Manifest V3. La [documentation Chrome](https://developer.chrome.com/docs/extensions/reference/api/storage) ne mentionne aucune permission `"session"` distincte. Ajouter une permission inexistante aurait pu invalider le manifest.

### 3. Durée de vie des captures orphelines
- **Fichier :** `background.js` (constante `CAPTURE_TTL_MS`)
- **Statut :** ✅ **Corrigé (1.2.0)** — réduite de 1 heure à 15 minutes ; documentation mise à jour (PRIVACY, README, SECURITY × 4 langues).
- **Problème :** les captures expirent après 1 heure ; l'éditeur les supprime dès le décodage (`ACK_CAPTURE_LOADED`). Si l'onglet éditeur se ferme sans ACK (crash, arrêt), la capture reste une heure.
- **Action :** réduire le filet de sécurité (10–15 min) ou purger via `chrome.tabs.onRemoved` (déjà utilisé pour les transferts).

---

## 🟡 Améliorations d'expérience utilisateur

### 4a. Défilement étendu / action jusqu'en bas
- **Fichier :** `content.js` (`selectScrollingRegion`)
- **Statut :** ✅ **Corrigé** — bouton « Jusqu’en bas » (`scrollingToBottom`) et raccourci clavier `B`/`End` ajoutés dans le panneau flottant pour étendre instantanément la sélection jusqu'au bas de la surface défilante sans défilement manuel fastidieux.
- **Problème :** La sélection d'une zone étendue imposait de faire défiler manuellement toute la page jusqu'au deuxième point.
- **Action :** Bouton rapide « Jusqu’en bas » et calcul automatique de la hauteur restante.

### 5a & 5b. Impression / export PDF paginé avec texte vectoriel
- **Fichiers :** `editor.html`, `editor.js` (`printButton`)
- **Statut :** ✅ **Corrigé** — vue d'impression `#print-area` dédiée avec en-tête en véritable texte vectoriel indexable (`h1`, URL cliquable, date, dimensions) et styles `@media print` évitant le rognage du canvas sur les grandes captures.
- **Problème :** L'export PDF imprimait le canvas brut sans en-tête vectoriel textuel indexable et risquait de rogner les grandes images.
- **Action :** Intégration d'une mise en page d'impression avec métadonnées vectorielles indexables et règles de pagination sans coupure.

### 4b. Nom du fichier à télécharger
- **Fichiers :** `capture-utils.js` (`sanitizeFilename`), `editor.js`
- **Statut :** ✅ **Corrigé** — intégration de `captureRecord.title` sanitisé (`Scionos_Capture_${titre}_${date}.png` et `.html`), avec fallback propre et tests unitaires.
- **Problème :** le nom généré était `Scionos_Capture_YYYY-MM-DD.png` sans le titre de la page.
- **Action :** intégrer `captureRecord.title` (sanitisé) au nom de fichier.

### 6. Raccourcis clavier de l'éditeur visibles
- **Fichiers :** `editor.js` (`updateTexts`), `editor.html`
- **Statut :** ✅ **Corrigé** — infobulles (`title`) dynamiques et localisées sur tous les outils (`V`, `D`, `M`, `C`), l'historique (`Ctrl+Z`, `Ctrl+Y`) et le zoom (`+`, `-`, `0`).
- **Problème :** les raccourcis existent mais n'étaient pas documentés dans l'interface.
- **Action :** ajouter des infobulles documentant les touches.

### 7. Mode « Zone défilante » : sélection par glisser-déposer
- **Fichier :** `content.js` (`selectScrollingRegion`)
- **Statut :** ✅ **Corrigé** — support hybride : le glisser-déposer valide immédiatement la zone au relâchement (`pointerup`), tout en maintenant le mode 2 clics pour les très longues pages.
- **Problème :** la sélection nécessitait toujours deux clics.
- **Action :** glisser-déposer fluide avec validation automatique si distance > 10px.

---

## 🟢 Améliorations techniques / performance

### 8. `capture-utils.js` injecté à chaque capture
- **Fichiers :** `popup.js:86-89`
- **Problème :** le couple `capture-utils.js` + `content.js` est réinjecté à chaque capture ; 26 Ko servent à un fichier purement utilitaire.
- **Action :** mémoire de l'injection par onglet (vérifier `window.hasScionosCaptureLoaded`) ou passage des utilitaires en page d'extension pour ne les charger qu'une fois.

### 9. Lectures IndexedDB répétées dans l'éditeur
- **Fichier :** `editor.js` (`loadCapture`)
- **Problème :** chaque ouverture d'un onglet éditeur relit IndexedDB, même pour la même capture.
- **Action :** cache en mémoire (session) pour éviter des lectures redondantes.

### 10. Schéma de migration du store IndexedDB
- **Fichier :** `capture-store.js` (`onupgradeneeded`)
- **Problème :** `DATABASE_VERSION = 2` existe, mais les migrations ne sont pas gérées via un tableau de versions ; l'ajout d'un index ou d'un store peut créer des incohérences.
- **Action :** introduire un schéma de migration versionné (`MIGRATIONS[version]`) .

---

## 📚 Documentation / process

### 11. Version du README mise à jour à la main
- **Fichiers :** `README*.md`, `RELEASE_NOTES.md`, `CHANGELOG.md`
- **Problème :** `validate-package.mjs` exige que le README référence la version courante (ligne 73), mais rien ne la met à jour automatiquement.
- **Action :** ajouter un script `scripts/update-readme-version.mjs` exécuté au release.

### 12. Tests E2E et cache Chromium en CI
- **Fichier :** `.github/workflows/ci.yml`
- **Problème :** chaque run télécharge Chromium ; les PR lourdes deviennent coûteuses.
- **Action :** cacher les binaires Playwright (`actions/cache`) ou limiter le plein E2E aux push sur `main`.

### 13. Pas de script de nettoyage
- **Fichier :** `package.json`
- **Problème :** `dist/` et `test-results/` s'accumulent localement.
- **Action :** ajouter `npm run clean` (suppression de `dist/`, `test-results/`, `playwright-report/`).

---

## 🎯 Recommandation

Si une seule amélioration doit être retenue, commencer par **#1 (supprimer `OPEN_EDITOR`)** : sécurité immédiate, modification de quelques lignes, et nettoyage du code. Ensuite, **#2** (déclarer la permission `session`) et **#11** (script de mise à jour des versions) apportent un gain durable sans risque.