# Scionos Capture — Chrome Web Store 1.5.0

## Fiche produit

**Nom :** Scionos Capture

**Catégorie :** Outils pour les développeurs (catégorie actuellement sélectionnée dans la boutique).

**Descriptions complètes localisées :**

- [Français](store-assets/listing-fr.txt)
- [English](store-assets/listing-en.txt)
- [Español](store-assets/listing-es.txt)
- [Deutsch](store-assets/listing-de.txt)

Ces textes présentent la version 1.5.0 : composition multi-images, annotations éditables, projets portables .scionos v2, bibliothèque locale et exports PNG, JPEG, WebP, HTML, Markdown/ZIP et PDF. Les fonctions de capture existantes, les limites et les précautions de confidentialité restent décrites. Les résumés courts proviennent des messages appDesc inclus dans les quatre catalogues de langue du paquet.

## Captures de la version 1.5.0

Les visuels doivent montrer la véritable interface, avec des contenus de démonstration locaux sans données personnelles. Le générateur reproductible est [generate-real-store-assets.mjs](scripts/generate-real-store-assets.mjs). Exécuter `node scripts/generate-real-store-assets.mjs` produit les captures PNG versionnées dans store-assets, au format 1280 × 800 pixels. La composition, la bibliothèque, les réglages d’export, la sélection et la popup présentent les fonctions à vérifier.

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

## Instructions de vérification pour Google

Aucun identifiant ni compte applicatif n’est nécessaire.

1. Installer l’extension et ouvrir une page web ordinaire. Depuis la barre d’outils, tester les cinq modes et confirmer les sélections. Essayer le délai de 3 secondes et son annulation. Les pages internes du navigateur et les boutiques d’extensions sont protégées et ne sont pas capturables.
2. Modifier une capture, sélectionner et déplacer une annotation, puis exporter une image. Ouvrir Imprimer/PDF pour vérifier les réglages de mise en page. Utiliser un masque solide pour les données confidentielles.
3. Depuis la popup, ouvrir une nouvelle composition. Importer deux images locales, les réordonner, choisir une disposition, ajouter titres et légendes, puis essayer PNG, JPEG, WebP, HTML et Markdown/ZIP.
4. Enregistrer un projet .scionos, fermer l’éditeur et rouvrir le fichier. Les annotations prises en charge restent éditables ; les masques et rognages enregistrés sont définitifs. Les projets v1 restent lisibles avec annotations aplaties.
5. Enregistrer explicitement dans la bibliothèque, rechercher, renommer, dupliquer, rouvrir et supprimer le projet. Vérifier les durées 0, 7, 30 ou 90 jours et le quota configurable de 64 à 1 024 Mio (256 Mio par défaut). 0 jour signifie sans expiration automatique.
6. Vérifier français, anglais, espagnol et allemand depuis le menu de langue. Les images importées ne fournissent pas une couche texte fiable pour la recherche dans le PDF.

## Publication

Le paquet Chrome Web Store est `dist/scionos-capture-v1.5.0.zip`, accompagné de son empreinte `.sha256`. La release GitHub et la validation Google sont deux étapes distinctes. Le statut effectif doit être relevé dans le tableau de bord ; un dépôt pour examen ne signifie pas que la nouvelle version est déjà accessible publiquement.
