# Scionos Capture — Chrome Web Store

## Fiche française

**Nom :** Scionos Capture

**Catégorie proposée :** Productivité — Outils

**Description :**

Capturez une page web, une zone visible, une sélection, un conteneur défilant ou un élément au clic. Ajustez votre sélection avant de capturer et utilisez un délai de 3, 5 ou 10 secondes pour préparer la page.

Annotez vos captures dans l’éditeur intégré : dessin, surligneur, flèches, formes, texte, pastilles numérotées, masquage solide et rognage. Annulez ou rétablissez vos modifications, puis exportez en PNG, rapport HTML autonome ou PDF via l’impression du navigateur. Copiez aussi l’image dans le presse-papiers.

Le traitement se fait localement dans votre navigateur. Aucun compte, aucune publicité et aucune télémétrie. L’extension n’envoie pas vos captures à un serveur. La langue est disponible en français, anglais, espagnol et allemand.

Les captures sont conservées temporairement pendant leur édition. Les pages internes du navigateur et certaines pages protégées ne peuvent pas être capturées. Les contenus animés ou virtualisés peuvent présenter des limites. La couche recherchable du PDF dépend du texte dont la visibilité est vérifiable. Pour protéger des secrets, utilisez le masque solide ; le flou est uniquement visuel.

## Liens

- Site du projet : https://github.com/ScioNos/Scionos-Capture
- Assistance : https://github.com/ScioNos/Scionos-Capture/issues
- Confidentialité : https://github.com/ScioNos/Scionos-Capture/blob/main/PRIVACY.md
- Contact : info@eyelo.ch

## But unique et permissions

**But unique :** capturer, annoter et exporter localement le contenu visible d’une page web à la demande de l’utilisateur.

- `activeTab` : accéder temporairement à l’onglet choisi après activation explicite pour acquérir ses pixels.
- `scripting` : injecter les outils de sélection, de défilement et de collecte de texte dans cette page.
- `storage` : conserver la langue, le délai choisi et les associations temporaires de l’éditeur.
- `unlimitedStorage` : stocker localement les grandes captures et fragments pendant l’assemblage et l’édition sans échec de quota standard.
- `alarms` : nettoyer les captures orphelines et transferts abandonnés.

Aucun code hébergé à distance n’est exécuté par l’extension. Les scripts et ressources de l’interface sont inclus dans le paquet. Le contenu des sites (pixels, texte visible, titre et URL) est traité localement ; il n’est ni transmis à l’éditeur ni vendu à un tiers.

## Instructions de vérification

1. Installer l’extension et ouvrir une page web ordinaire.
2. Activer l’extension depuis la barre d’outils, sélectionner un mode puis confirmer la zone si nécessaire.
3. Modifier la capture dans l’éditeur et télécharger le PNG ou le rapport HTML ; ouvrir Imprimer/PDF pour enregistrer le PDF.
4. Tester le délai de 3 secondes et son annulation. Aucun identifiant ni compte applicatif n’est nécessaire.
