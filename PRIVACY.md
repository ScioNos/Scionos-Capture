# Politique de confidentialité

[Français](PRIVACY.md) · [English](PRIVACY.en.md) · [Español](PRIVACY.es.md) · [Deutsch](PRIVACY.de.md)

Dernière mise à jour : 30 septembre 2026.

**Éditeur responsable :** eyelo SA (IDE : CHE-108.174.302), Vaud, Suisse — Marque **ScioNos** ([scionos.ch](https://scionos.ch)) — Contact : info@eyelo.ch

Scionos Capture traite localement les pixels visibles, le titre et l’URL de la page capturée, ainsi que la préférence de langue. L’utilisateur déclenche explicitement chaque capture.

La capture de zone défilante traite plusieurs portions visibles de la même page pour les assembler localement. Elle n’ajoute aucune permission, destination réseau ou catégorie de donnée.

L’extension n’envoie aucune capture, URL ou donnée de navigation à eyelo SA, ScioNos ou à un tiers. Elle ne contient ni compte, ni télémétrie, ni publicité, ni bibliothèque distante.

La capture et ses métadonnées textuelles restent dans IndexedDB local. Les fragments sont supprimés après assemblage ou après quinze minutes sans activité ; un navigateur suspendu peut différer ce nettoyage jusqu’au réveil. La capture finale est conservée tant qu’un onglet éditeur correspondant est ouvert, y compris après rechargement et au-delà de quinze minutes. Elle est supprimée à la fermeture de son dernier éditeur. Sans éditeur, elle devient éligible au nettoyage quinze minutes après sa création. Les associations sont réconciliées avec les onglets ouverts au réveil et au redémarrage.

La langue choisie est conservée dans `chrome.storage.local`. La correspondance entre l’onglet éditeur et la capture utilise `chrome.storage.session` et disparaît avec la session du navigateur.

L’utilisateur peut supprimer toutes les données locales depuis la page de gestion des extensions ou en désinstallant Scionos Capture.

Pour toute question de confidentialité : info@eyelo.ch. Pour une vulnérabilité, suivez exclusivement [SECURITY.md](SECURITY.md).

La couche recherchable du PDF conserve uniquement les mots complets dont la visibilité est vérifiable. Les mots incertains sont omis de cette couche ; l’image capturée est conservée. Les anciens calques aux coordonnées non vérifiables sont également omis. Le masquage solide reste nécessaire pour protéger les pixels confidentiels ; le flou est seulement visuel.
