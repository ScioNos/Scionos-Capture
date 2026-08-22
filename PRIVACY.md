# Politique de confidentialité

[Français](PRIVACY.md) · [English](PRIVACY.en.md) · [Español](PRIVACY.es.md) · [Deutsch](PRIVACY.de.md)

Dernière mise à jour : 22 août 2026.

**Éditeur responsable :** eyelo SA (IDE : CHE-108.174.302), Vaud, Suisse — Marque **ScioNos** ([scionos.ch](https://scionos.ch)) — Contact : info@eyelo.ch

Scionos Capture traite localement les pixels visibles, le titre et l’URL de la page capturée, ainsi que la préférence de langue. L’utilisateur déclenche explicitement chaque capture.

La capture de zone défilante traite plusieurs portions visibles de la même page pour les assembler localement. Elle n’ajoute aucune permission, destination réseau ou catégorie de donnée.

L’extension n’envoie aucune capture, URL ou donnée de navigation à eyelo SA, ScioNos ou à un tiers. Elle ne contient ni compte, ni télémétrie, ni publicité, ni bibliothèque distante.

La capture est stockée temporairement dans IndexedDB afin d’ouvrir et de recharger l’éditeur. Elle est supprimée lorsque l’onglet éditeur est fermé ou après une heure, selon la première échéance. Si le navigateur est fermé ou suspendu à cet instant, elle est supprimée au prochain réveil de l’extension.

La langue choisie est conservée dans `chrome.storage.local`. La correspondance entre l’onglet éditeur et la capture utilise `chrome.storage.session` et disparaît avec la session du navigateur.

L’utilisateur peut supprimer toutes les données locales depuis la page de gestion des extensions ou en désinstallant Scionos Capture.

Pour toute question de confidentialité : info@eyelo.ch. Pour une vulnérabilité, suivez exclusivement [SECURITY.md](SECURITY.md).
