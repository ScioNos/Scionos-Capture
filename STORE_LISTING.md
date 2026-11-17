# Scionos Capture — fiche Chrome Web Store 1.5.2

**1.5.2 — publiée sur GitHub.** Release GitHub : [v1.5.2](https://github.com/ScioNos/Scionos-Capture/releases/tag/v1.5.2). Le statut actuel du Chrome Web Store n’est pas confirmé ; aucune soumission de la 1.5.2 n’est effectuée ici.

## Fiche produit

**Nom :** Scionos Capture

**Catégorie :** Outils pour les développeurs (catégorie actuellement sélectionnée dans la boutique).

**Descriptions complètes localisées :**

- [Français](store-assets/listing-fr.txt)
- [English](store-assets/listing-en.txt)
- [Español](store-assets/listing-es.txt)
- [Deutsch](store-assets/listing-de.txt)

Ces brouillons décrivent la version 1.5.2 et conservent les fonctions introduites en 1.5.0 : composition multi-images, annotations éditables, projets portables .scionos v2, bibliothèque locale et exports PNG, JPEG, WebP, HTML, Markdown/ZIP et PDF. Les fonctions de capture existantes, les limites et les précautions de confidentialité restent décrites. Les résumés courts proviennent des messages appDesc inclus dans les quatre catalogues de langue du paquet.

## Captures existantes — interface réelle 1.5.0

Les captures existantes montrent la véritable interface 1.5.0 ; elles ne constituent pas des captures de la version 1.5.2. Leurs noms et liens sont conservés. Les visuels doivent montrer la véritable interface, avec des contenus de démonstration locaux sans données personnelles. Le générateur reproductible est [generate-real-store-assets.mjs](scripts/generate-real-store-assets.mjs). Exécuter `node scripts/generate-real-store-assets.mjs` produit les captures PNG versionnées dans store-assets, au format 1280 × 800 pixels. La composition, la bibliothèque, les réglages d’export, la sélection et la popup présentent les fonctions à vérifier.

## Version 1.5.2 — corrections et fiabilisation

- Glissers dans l’éditeur : suivi du `pointerId` actif et gestion des interruptions du geste.
- Miniatures internes de l’éditeur et aperçu de composition : reconstruction à la réouverture du projet pour inclure les annotations.
- Bouton « Exporter projet » : l’état « modifications non enregistrées » reste actif ; le message indique que le téléchargement a été demandé, sans garantir son enregistrement par le navigateur.
- Rapports HTML : application de la politique de sources dans tous les chemins du générateur, avec retrait systématique des identifiants HTTP(S).
- Impression/PDF : limites cumulées de 32 millions de pixels et 128 Mio de blobs, avec un maximum de 200 pages.
- Paquet : ancien module `editor-export.js` retiré, soit 35 fichiers de distribution.

## Liens

- Site : https://scionos.ch
- Code source : https://github.com/ScioNos/Scionos-Capture
- Assistance : https://github.com/ScioNos/Scionos-Capture/issues
- Confidentialité : https://github.com/ScioNos/Scionos-Capture/blob/main/PRIVACY.md
- Contact : info@eyelo.ch

## But unique et permissions

**But unique :** capturer le contenu visible d’une page web à la demande de l’utilisateur, puis l’annoter, le composer, le conserver et l’exporter localement.

- `activeTab` : accéder temporairement à l’onglet choisi après activation explicite pour acquérir ses pixels.
- `scripting` : injecter les outils de sélection, de défilement et de collecte de texte visible dans cette page.
- `storage` : conserver la langue, le délai de capture, les préférences de bibliothèque et les associations temporaires de l’éditeur.
- `unlimitedStorage` : stocker localement les grandes captures, les fragments et les projets de bibliothèque sans échec du quota standard ; un quota applicatif configurable limite la bibliothèque.
- `alarms` : nettoyer les captures orphelines et transferts abandonnés et supprimer les projets de bibliothèque dont la durée de conservation a expiré.

Aucun code hébergé à distance n’est exécuté par l’extension. Les scripts et ressources sont inclus dans le paquet. Les pixels, le texte visible, le titre, l’URL, les images importées, les annotations et les métadonnées sont traités sur l’appareil ; ces données ne sont ni transmises à l’éditeur ni vendues à un tiers. Les exports et projets enregistrés séparément restent sous la responsabilité de l’utilisateur. Les masques solides et rognages sont irréversibles à la sauvegarde ; le flou reste un effet visuel.

## Parcours de vérification pour la boutique

Aucun identifiant ni compte applicatif n’est nécessaire.

1. Installer l’extension et ouvrir une page web ordinaire. Depuis la barre d’outils, tester les cinq modes et confirmer les sélections. Essayer le délai de 3 secondes et son annulation. Les pages internes du navigateur et les boutiques d’extensions sont protégées et ne sont pas capturables.
2. Modifier une capture, sélectionner et déplacer une annotation, puis exporter une image. Ouvrir Imprimer/PDF pour vérifier les réglages de mise en page. Utiliser un masque solide pour les données confidentielles.
3. Depuis la popup, ouvrir une nouvelle composition. Importer deux images locales, les réordonner, choisir une disposition, ajouter titres et légendes, puis essayer PNG, JPEG, WebP, HTML et Markdown/ZIP.
4. Enregistrer un projet .scionos, fermer l’éditeur et rouvrir le fichier. Les annotations prises en charge restent éditables ; les masques et rognages enregistrés sont définitifs. Les projets v1 restent lisibles avec annotations aplaties.
5. Enregistrer explicitement dans la bibliothèque, rechercher, renommer, dupliquer, rouvrir et supprimer le projet. Vérifier les durées 0, 7, 30 ou 90 jours et le quota configurable de 64 à 1 024 Mio (256 Mio par défaut). 0 jour signifie sans expiration automatique.
6. Pour la version 1.5.2, vérifier les interruptions de glisser, les miniatures reconstruites, l’état non enregistré après export portable, les politiques de sources HTML et les budgets PDF (32 millions de pixels, 128 Mio de blobs, 200 pages). Ces régressions sont couvertes par la [validation locale réussie](DEPENDENCY_REVIEW_1.5.2.md) ; ce parcours peut être repris par les examinateurs de la boutique.
7. Vérifier français, anglais, espagnol et allemand depuis le menu de langue. Les images importées ne fournissent pas une couche texte fiable pour la recherche dans le PDF.

## Préparation et publication

Archive locale validée : `scionos-capture-v1.5.2.zip`, 35 fichiers. SHA-256 : `4cd9154b5b98b4e413c23683f3ecbfe3bfc2b0a633ae0b4407b19934d5938bc7`.

Validation 1.5.2 : `npm run verify:release` a réussi — 133 tests unitaires, 126 tests navigateur, cinq modes chacun dans Chrome 157.0.8103.79 et Edge 157.0.4341.60, trois répétitions de performance et dix scénarios PDF. Résultats et environnement : [revue des dépendances et validation](DEPENDENCY_REVIEW_1.5.2.md).

La version [v1.5.2](https://github.com/ScioNos/Scionos-Capture/releases/tag/v1.5.2) est publiée sur GitHub. La version distribuée et le statut effectif du Store restent à confirmer dans le tableau de bord ; aucune soumission de la 1.5.2 n’est effectuée ici.
