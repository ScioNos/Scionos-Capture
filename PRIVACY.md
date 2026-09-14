# Politique de confidentialité

[Français](PRIVACY.md) · [English](PRIVACY.en.md) · [Español](PRIVACY.es.md) · [Deutsch](PRIVACY.de.md)

Dernière mise à jour : 23 août 2026.

**Éditeur responsable :** eyelo SA (IDE : CHE-108.174.302), Vaud, Suisse — Marque **ScioNos** ([scionos.ch](https://scionos.ch)) — Contact : info@eyelo.ch

Scionos Capture traite localement les pixels visibles, le titre et l’URL de la page capturée, ainsi que la préférence de langue. L’utilisateur déclenche explicitement chaque capture.

La capture de zone défilante traite plusieurs portions visibles de la même page pour les assembler localement. Elle n’ajoute aucune permission, destination réseau ou catégorie de donnée.

L’extension n’envoie aucune capture, URL ou donnée de navigation à eyelo SA, ScioNos ou à un tiers. Elle ne contient ni compte, ni télémétrie, ni publicité, ni bibliothèque distante.

La capture et les fragments nécessaires à son transfert sont stockés temporairement dans IndexedDB. Les fragments sont supprimés après assemblage ou au plus tard après quinze minutes. La capture finale est supprimée dès que l’éditeur l’a décodée, avec une expiration d’une heure uniquement comme filet de sécurité.

La langue choisie est conservée dans `chrome.storage.local`. La correspondance entre l’onglet éditeur et la capture utilise `chrome.storage.session` et disparaît avec la session du navigateur.

L’utilisateur peut supprimer toutes les données locales depuis la page de gestion des extensions ou en désinstallant Scionos Capture.

Pour toute question de confidentialité : info@eyelo.ch. Pour une vulnérabilité, suivez exclusivement [SECURITY.md](SECURITY.md).
