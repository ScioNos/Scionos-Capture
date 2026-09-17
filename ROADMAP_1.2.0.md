# Scionos Capture — Feuille de route & Évolutions 1.2.0

Ce document récapitule l'ensemble des améliorations déjà implémentées pour la version **1.2.0** de Scionos Capture, l'état de l'architecture technique, ainsi que les pistes de développement proposées pour la suite des travaux.

---

## 1. Vue d'ensemble du projet

- **Extension :** Scionos Capture (Manifest V3 pour Google Chrome et Microsoft Edge)
- **Objectif :** Capture d’écran locale, confidentielle, sans serveur externe, avec éditeur d'annotations intégré et défilement précis.
- **Statut courant :** Version 1.2.0 en cours de développement (socle 1.1.1 entièrement testé et enrichi).

---

## 2. Nouveautés déjà implémentées pour la 1.2.0

### A. Expérience utilisateur (UX)

1. **Sélection fluide par glisser-déposer (Drag & Drop) :**
   - **Fichier :** `content.js`
   - **Description :** Un geste continu souris/stylet (`pointerdown` → `pointermove` → `pointerup`) capture directement la zone dès que la diagonale dépasse 10 px.
   - Le mode traditionnel en 2 clics reste actif pour permettre de faire défiler manuellement de très longues pages entre le point de départ et le point d'arrivée.

2. **Action rapide « Jusqu’en bas » :**
   - **Fichiers :** `content.js`, `popup.js`, `_locales/*/messages.json`
   - **Description :** Ajout d'un bouton dédié dans la barre flottante de sélection et du raccourci clavier `B` ou `Fin` (`End`) permettant d'étendre instantanément la hauteur sélectionnée jusqu'au bas effectif de la surface défilante (`fullHeight`), sans défilement manuel fastidieux.

3. **Nom de fichier personnalisé avec le titre de la page :**
   - **Fichiers :** `capture-utils.js`, `editor.js`, `tests/capture-utils.test.js`
   - **Description :** La fonction `sanitizeFilename` convertit les accents, supprime les caractères interdits par les systèmes de fichiers (`\`, `/`, `:`, `*`, `?`, `"`, `<`, `>`, `|`, apostrophes, caractères de contrôle) et tronque proprement le titre. Les exports sont nommés :
     - PNG : `Scionos_Capture_${titre}_${date}.png`
     - HTML : `Scionos_Capture_${titre}_${date}.html`

4. **Infobulles des raccourcis clavier dans l'éditeur :**
   - **Fichiers :** `editor.js`, `editor.html`
   - **Description :** Tous les boutons de la barre d'outils disposent d'infobulles dynamiques et localisées affichant leurs raccourcis :
     - Outils : Curseur `(V)`, Dessiner `(D)`, Masquer `(M)`, Rogner `(C)`
     - Historique : Annuler `(Ctrl+Z)` / Refaire `(Ctrl+Y)` (avec détection de `⌘` sur macOS)
     - Zoom : Zoom avant `(+)`, Zoom arrière `(-)`, Ajuster `(0)`

5. **Impression et export PDF paginé avec en-tête vectoriel :**
   - **Fichiers :** `editor.html`, `editor.js`
   - **Description :** Zone `#print-area` dédiée avec styles CSS `@media print` garantissant l'absence de coupure ou rognage du canvas sur formats A4/Letter. L'en-tête de page contient un véritable texte vectoriel indexable (`h1` titre, lien hypertexte cliquable de l'URL source, horodatage localisé et dimensions en pixels).

---

### B. Robustesse technique & Performance

6. **Sonde de présence pour éviter la réinjection systématique :**
   - **Fichiers :** `popup.js`, `content.js`
   - **Description :** Avant tout appel à `chrome.scripting.executeScript`, une sonde légère envoie un message `PING`. Si `content.js` est déjà présent dans l'onglet, l'injection est ignorée, économisant ~75 Ko de transfert et temps d'analyse JS à chaque capture répétée sur le même onglet.

7. **Cache mémoire transparent pour IndexedDB :**
   - **Fichiers :** `capture-store.js`, `editor.js`, `tests/capture-store.test.js`
   - **Description :** `CaptureStore` intègre une Map en mémoire vive (`captureCache`) évitant les transactions disques répétées lors des appels `getCapture`. Le cache est automatiquement invalidé lors des suppressions (`deleteCapture`) et des nettoyages (`purgeExpiredCaptures`). `editor.js` réutilise également la capture active déjà chargée.

8. **Schéma de migrations déclaratif et versionné :**
   - **Fichiers :** `capture-store.js`, `tests/capture-store.test.js`
   - **Description :** Les montées de version du schéma de base de données locale sont formalisées sous un objet `MIGRATIONS[v]` et orchestrées séquentiellement par `applyMigrations(database, transaction, oldVersion, newVersion)`. Un test unitaire valide la séquence des migrations.

9. **Purge sécurisée des captures orphelines :**
   - **Fichier :** `background.js`
   - **Description :** Le délai de rétention de sécurité des captures non acquittées (`CAPTURE_TTL_MS`) a été réduit de 1 heure à 15 minutes, limitant l'empreinte disque locale en cas de fermeture inattendue de l'onglet d'édition.

---

### C. Outillage, CI & Process de développement

10. **Cache binaire Playwright Chromium en CI :**
    - **Fichier :** `.github/workflows/ci.yml`
    - **Description :** Utilisation de `actions/cache@v4` indexée sur `package-lock.json` pour mettre en cache les binaires Chromium (`~/.cache/ms-playwright` sur Ubuntu et `~\AppData\Local\ms-playwright` sur Windows). Évite de télécharger ~100 Mo à chaque exécution du workflow.

11. **Script de nettoyage local multiplateforme (`npm run clean`) :**
    - **Fichiers :** `scripts/clean.mjs`, `package.json`
    - **Description :** Script utilisant `fs.rmSync` natif sans aucune dépendance externe, purgeant proprement `dist/`, `test-results/`, `playwright-report/` et `coverage/`.

12. **Script de synchronisation automatique de version (`npm run version:sync`) :**
    - **Fichiers :** `scripts/update-readme-version.mjs`, `package.json`
    - **Description :** Script ESM capable de propager un nouveau numéro de version SemVer dans `package.json`, `manifest.json`, les 4 README (`README.md`, `README.en.md`, `README.es.md`, `README.de.md`) et `RELEASE_NOTES.md`.

---

## 3. Conventions & Règles d'architecture à respecter

Pour tout développement futur sur ce dépôt, veiller à respecter les règles suivantes :

1. **Règle ESLint `no-control-regex` :**
   - Le linter interdit les séquences d'échappement de contrôle dans les littéraux regex (ex. `[\x00-\x1F]`).
   - Pour filtrer ou vérifier des caractères de contrôle, utiliser `String.fromCharCode`, un filtre sur les `charCodeAt` ou `Array.from`.
2. **Migrations IndexedDB :**
   - Toute nouvelle modification du schéma IndexedDB doit être ajoutée comme nouvelle clé dans l'objet `MIGRATIONS` de `capture-store.js` (ex. `MIGRATIONS[3] = ...`), avec incrémentation de `DATABASE_VERSION`.
3. **Injection de scripts :**
   - Ne jamais injecter aveuglément `capture-utils.js` ou `content.js` depuis la popup. Toujours passer par la fonction `ensureContentInjected(tabId)`.
4. **Sanitisation des chaînes :**
   - Tout nom de fichier dérivé de données de page web doit impérativement passer par `sanitizeFilename()` défini dans `capture-utils.js`.
5. **Internationalisation (i18n) :**
   - Chaque nouvelle chaîne visible dans l'interface doit être déclarée dans les 4 fichiers de locale : `_locales/fr/messages.json`, `_locales/en/messages.json`, `_locales/es/messages.json`, `_locales/de/messages.json`.

---

## 4. Pistes d'améliorations futures (Backlog pour la suite)

Voici les pistes prioritaires et pertinentes pour continuer à enrichir la version 1.2.0 ou préparer une future 1.3.0 :

### 🎨 Outils d'annotation dans l'éditeur
- **Flèches directionnelles vectorielles :** Permettre de tracer une flèche d'indication nette avec pointe orientée pour pointer des éléments clés sur une capture.
- **Formes géométriques (Rectangles / Ellipses) :** Ajouter un outil pour encadrer des zones d'intérêt (en mode contour vide ou surlignage translucide).
- **Outil Texte :** Permettre de poser une zone de texte directement sur l'image avec choix de la taille et de la couleur.
- **Numérotation d'étapes (Pastilles 1, 2, 3...) :** Cliquer pour déposer des pastilles numérotées automatiques pour créer des guides ou tutoriels visuels.

### 📐 Ergonomie de sélection de zone
- **Poignées de redimensionnement (Handles) :** Après avoir tracé une sélection rectangulaire, afficher des poignées aux 4 coins et 4 côtés pour ajuster au pixel près la zone avant de valider la capture.
- **Règle / Loupe de précision :** Afficher les dimensions en pixels (largeur × hauteur) en temps réel à côté du curseur pendant la sélection.

### 💾 Formats d'export & Partage
- **Export au format WebP :** Offrir le choix entre PNG (sans perte) et WebP (haute compression pour documentation légère).
- **Copie presse-papier améliorée :** Notification visuelle ou son discret lors de la copie de l'image dans le presse-papier.
- **Qualité / compression JPEG ajustable :** Pour les captures de photos ou pages très volumineuses.

### 🗂️ Gestionnaire de captures locales
- **Historique récent des captures :** Afficher une liste des dernières captures stockées temporairement dans IndexedDB directement accessible depuis la popup ou l'éditeur, permettant de ré-ouvrir une capture fermée par inadvertance.

---

## 5. Commandes de référence

| Commande | Rôle |
|---|---|
| `npm run verify` | Vérification complète (check syntaxe, lint, tests unitaires, validation paquet, tests E2E) |
| `npm run check` | Vérification syntaxique Node.js de tous les scripts |
| `npm run lint` | Exécution d'ESLint et d'HTML-Validate |
| `npm test` | Exécution des 27 tests unitaires Node.js |
| `npm run test:e2e` | Exécution des 12 tests Playwright E2E |
| `npm run validate` | Validation de l'arborescence, des locales et des métadonnées du paquet |
| `npm run clean` | Purge propre de `dist/`, `test-results/`, `playwright-report/` et `coverage/` |
| `npm run package` | Construction de l'archive ZIP officielle prête pour le store |
| `npm run version:sync <version>` | Synchronisation automatique d'une nouvelle version dans tous les fichiers |
