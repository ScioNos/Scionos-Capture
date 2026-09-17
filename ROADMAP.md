# Scionos Capture — Feuille de route (Roadmap)

Ce document présente les orientations stratégiques et les évolutions prévues pour les prochaines versions de **Scionos Capture**.

- **Version actuelle :** `1.2.0` (publiée)
- **Objectif :** Capture d’écran locale, confidentielle, sans serveur externe ni télémétrie, avec éditeur riche et défilement précis.

---

## 1. Prochaines versions

### Version 1.3.0 — Outils d’annotation enrichis

L'objectif de cette version est de compléter la palette d'outils de l'éditeur d'annotations pour la documentation et le support :

- [ ] **Flèches directionnelles vectorielles :** Tracé de flèches nettes avec pointe orientée pour désigner des éléments précis.
- [ ] **Formes géométriques (Rectangles / Ellipses) :** Encadrement de zones d'intérêt (contour coloré ou remplissage translucide).
- [ ] **Outil Texte :** Insertion de texte directement sur l'image avec sélection de police, taille et couleur.
- [ ] **Pastilles numérotées (1, 2, 3...) :** Dépose en un clic de pastilles séquentielles pour créer facilement des guides pas-à-pas.

### Version 1.4.0 — Précision de capture & Formats avancés

Amélioration de l'ergonomie lors de la sélection et diversification des formats d'export :

- [ ] **Poignées de redimensionnement interactives :** Ajustement au pixel près de la zone sélectionnée (coins et bords) avant de déclencher la capture.
- [ ] **Indicateur de dimensions en temps réel :** Affichage dynamique de la taille (L × H en pixels) à côté du curseur pendant la sélection.
- [ ] **Export au format WebP :** Option d'export léger et performant en complément du PNG haute fidélité.
- [ ] **Historique récent des captures :** Consultation et réouverture rapide des captures temporaires conservées dans IndexedDB depuis la popup.

---

## 2. Invariants d’architecture & Règles techniques

Pour préserver la robustesse et la sécurité du projet lors des évolutions futures :

1. **Confidentialité absolue :** Aucun traitement ni stockage distant. Aucune télémétrie ni dépendance cloud.
2. **Sonde d'injection :** Toujours vérifier la présence préalable du script de contenu via `ensureContentInjected(tabId)` avant toute injection.
3. **Migrations IndexedDB :** Toute modification de schéma doit être déclarée séquentiellement dans `MIGRATIONS` (`capture-store.js`) avec incrément de `DATABASE_VERSION`.
4. **Sanitisation stricte :** Tout texte issu du DOM servant au nommage de fichier ou à l'export HTML doit passer par `sanitizeFilename()` et `escapeHtml()`.
5. **Internationalisation (i18n) :** Chaque texte visible doit être déclaré dans les 4 langues (`fr`, `en`, `es`, `de`).
6. **Linting :** Respect strict de `no-control-regex` et des règles ESLint / HTML-Validate du projet.
