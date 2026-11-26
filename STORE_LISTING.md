# Scionos Capture — préparation locale de la fiche Chrome Web Store 1.5.3

**Préparation locale 1.5.3, non publiée.** Aucune modification de la fiche Store distante ni des liens publics 1.5.2. La validation finale intégrée appartient au parent.

## Historique de la candidate 1.5.2

**Candidate locale 1.5.2 corrigée pour le Store.** La release GitHub existante reste inchangée et ne contient pas ces nouveaux correctifs. Aucune soumission Google effectuée. [Bilan de préparation](STORE_READINESS_1.5.2.md).

## Fiche produit

**Nom :** Scionos Capture

**Catégorie proposée :** Outils pour les développeurs. La sélection actuelle de la console n’a pas été vérifiée pendant cette préparation.

**Descriptions complètes localisées :**

- [Français](store-assets/listing-fr.txt)
- [English](store-assets/listing-en.txt)
- [Español](store-assets/listing-es.txt)
- [Deutsch](store-assets/listing-de.txt)

Ces descriptions produit préparent localement la version 1.5.3 non publiée et conservent les fonctions introduites en 1.5.0 : composition multi-images, annotations éditables, projets portables .scionos v2, bibliothèque locale et exports PNG, JPEG, WebP, HTML, Markdown/ZIP et PDF. Les fonctions de capture existantes, les limites et les précautions de confidentialité restent décrites. Les résumés courts proviennent des messages appDesc inclus dans les quatre catalogues de langue du paquet.

## Captures — interface réelle 1.5.2

Cinq captures réelles 1.5.2 ont été générées et revues visuellement, en français, au format 1280 × 800 pixels : [composition](store-assets/screenshot-real-1-composition-v1.5.2.png), [bibliothèque](store-assets/screenshot-real-2-bibliotheque-v1.5.2.png), [export](store-assets/screenshot-real-3-export-v1.5.2.png), [sélection](store-assets/screenshot-real-4-selection-v1.5.2.png), [popup](store-assets/screenshot-real-5-popup-v1.5.2.png). Les autres langues peuvent utiliser ces visuels communs ; seules les descriptions sont localisées. Les contenus sont fictifs et locaux. La sélection présente l’interface de production avec transfert simulé, avant acquisition ; aucun pixel de capture simulée n’est montré. La popup est ouverte dans un onglet à sa largeur native.

Le [générateur reproductible](scripts/generate-real-store-assets.mjs) conserve l’interface sans retouche ; les dimensions, empreintes et contrôles sont dans [le manifeste des visuels](store-assets/screenshots-real-v1.5.2.json). Les anciens visuels 1.5.0 sont conservés comme historique. Les [consignes Google sur les images](https://developer.chrome.com/docs/webstore/images?hl=en) permettent cinq captures et recommandent 1280 × 800 pixels.

## Version 1.5.2 — corrections et fiabilisation

- Sélections : pointeur actif, rejet des pointeurs secondaires et gestion des interruptions.
- Capture : restauration des éléments masqués après exception de préparation.
- Bibliothèque : suppression globale atomique et refus des listes périmées.

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
6. Pour la version 1.5.2, vérifier les interruptions de glisser, les miniatures reconstruites, l’état non enregistré après export portable, les politiques de sources HTML et les budgets PDF (32 millions de pixels, 128 Mio de blobs, 200 pages). Ces régressions sont couvertes par la [validation de la candidate](STORE_READINESS_1.5.2.md) ; ce parcours peut être repris par les examinateurs de la boutique.
7. Vérifier français, anglais, espagnol et allemand depuis le menu de langue. Les images importées ne fournissent pas une couche texte fiable pour la recherche dans le PDF.

## Préparation et publication

136 tests unitaires et 136 tests navigateur ont réussi. Les cinq modes natifs Chrome/Edge, trois répétitions de performance et dix scénarios PDF ont été exécutés. Le [bilan de préparation](STORE_READINESS_1.5.2.md) décrit les preuves, les limites, le ZIP final et son empreinte.

La candidate reste locale : aucun téléversement ou envoi à Google, aucun push Git ou remplacement de release GitHub.
