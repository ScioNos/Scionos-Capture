# Politique de confidentialité

[Français](PRIVACY.md) · [English](PRIVACY.en.md) · [Español](PRIVACY.es.md) · [Deutsch](PRIVACY.de.md)

Dernière mise à jour : 14 novembre 2026 — version 1.5.1.

**Éditeur responsable :** eyelo SA (IDE : CHE-108.174.302), Vaud, Suisse — Marque **ScioNos** ([scionos.ch](https://scionos.ch)) — Contact : info@eyelo.ch

Scionos Capture traite localement les pixels visibles, le titre et l’URL de la page capturée, ainsi que la préférence de langue. L’utilisateur déclenche explicitement chaque capture.

La capture de zone défilante traite plusieurs portions visibles de la même page pour les assembler localement. Elle n’ajoute aucune permission, destination réseau ou catégorie de donnée.

L’extension n’envoie aucune capture, URL ou donnée de navigation à eyelo SA, ScioNos ou à un tiers. Elle ne contient ni compte, ni télémétrie, ni publicité, ni bibliothèque distante.

La capture et ses métadonnées textuelles restent dans IndexedDB local. Les fragments sont supprimés après assemblage ou après quinze minutes sans activité ; un navigateur suspendu peut différer ce nettoyage jusqu’au réveil. La capture finale est conservée tant qu’un onglet éditeur correspondant est ouvert, y compris après rechargement et au-delà de quinze minutes. Elle est supprimée à la fermeture de son dernier éditeur. Sans éditeur, elle devient éligible au nettoyage quinze minutes après sa création. Les associations sont réconciliées avec les onglets ouverts au réveil et au redémarrage.

La langue choisie et le délai de capture (`captureDelaySeconds`, 0, 3, 5 ou 10 secondes) sont conservés dans `chrome.storage.local`. La sélection d’un élément et le compte à rebours restent locaux ; ils n’ajoutent aucune permission ni destination réseau. La capture différée ne commence qu’après une action explicite et peut être annulée. La correspondance entre l’onglet éditeur et la capture utilise `chrome.storage.session` et disparaît avec la session du navigateur.

L’utilisateur peut supprimer les données stockées par l’extension depuis la page de gestion des extensions ou en désinstallant Scionos Capture. Les fichiers exportés ou projets enregistrés séparément sur l’appareil restent à supprimer par l’utilisateur.

Pour toute question de confidentialité : info@eyelo.ch. Pour une vulnérabilité, suivez exclusivement [SECURITY.md](SECURITY.md).

La couche recherchable du PDF conserve uniquement les mots complets dont la visibilité est vérifiable. Les mots incertains sont omis de cette couche ; l’image capturée est conservée. Les anciens calques aux coordonnées non vérifiables sont également omis. Le masquage solide reste nécessaire pour protéger les pixels confidentiels ; le flou est seulement visuel.

Appliquez ou annulez les modifications en attente avant tout export. Le flou reste un effet visuel ; utilisez un masque solide pour les secrets.

## Confidentialité de la mise à jour 1.5.1 — soumission Store en attente

Dans le panneau Document, la politique de sources s’applique aux projets sauvegardés et aux exports : sanitized (par défaut) retire paramètres de requête et fragments des URL, none omet les sources et full les conserve. Les identifiants intégrés aux URL HTTP(S) sont toujours retirés, même en mode full. Les sources retirées à la sauvegarde ne sont plus récupérables ; changer de mode ensuite ne les restaure pas. L’export depuis la bibliothèque applique toujours sanitized, y compris aux projets enregistrés avant cette version.

Ce filtrage ne rend pas le document anonyme : le chemin de l’URL, les pixels, titres, légendes et dates peuvent encore contenir des informations sensibles. Vérifiez-les avant tout partage. Les copies déjà exportées restent sous votre contrôle et ne sont pas modifiées par un changement de politique.

Le diagnostic est local et doit être activé explicitement ; il n’ajoute aucune télémétrie ni transmission automatique. Les permissions restent inchangées. La lecture des projets v1/v2 et l’écriture v2 sont conservées ; les protections irréversibles des masques et rognages restent applicables.

## Confidentialité de la version 1.5.0

Cette section décrit le périmètre de confidentialité de la version publiée 1.5.0.

L’import de fichiers image, le collage explicitement demandé depuis le presse-papiers et la composition multi-images traitent localement les images choisies ainsi que les titres, légendes, étapes et métadonnées de source/date présents dans le document. Ces opérations n’impliquent aucun transfert vers un serveur.

La 1.5.0 utilise le format portable local `.scionos` v2 avec annotations individuellement éditables et réouverture des projets v1, dont les annotations restent aplaties. À la sauvegarde, les masques solides et rognages sont appliqués irréversiblement aux images conservées ; les annotations touchées sont supprimées de manière conservative. Les fichiers importés et les projets v1 ne disposent pas d’une couche texte fiable. À la sauvegarde après rognage, toutes les annotations antérieures sont aplaties pour préserver leur rendu et leur ordre.

Les exports PNG, JPEG, WebP, HTML, Markdown/ZIP, PDF et l’impression peuvent inclure les images et les informations de composition sélectionnées. Vérifiez les titres, sources, dates et contenus avant de partager un export ou un projet. Les fichiers enregistrés restent sur l’appareil à l’emplacement choisi par l’utilisateur ; ils ne sont pas supprimés par le nettoyage temporaire de l’extension ni par sa désinstallation. Leur conservation, partage et suppression relèvent de l’utilisateur.

Une bibliothèque locale durable est disponible sur enregistrement explicite : vignettes, recherche, renommage, duplication et suppression. L’utilisateur choisit une durée de 0, 7, 30 ou 90 jours et un quota de 64 à 1 024 Mio, avec 256 Mio par défaut ; 0 jour signifie sans expiration automatique. Les projets conservés localement pourront contenir images, annotations et métadonnées. Le masque solide reste nécessaire pour protéger les pixels confidentiels ; le flou reste uniquement visuel.
