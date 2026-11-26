# Politique de confidentialité

[Français](PRIVACY.md) · [English](PRIVACY.en.md) · [Español](PRIVACY.es.md) · [Deutsch](PRIVACY.de.md)

## Préparation 1.5.3 — 26 novembre 2026

**Qualification locale finale 1.5.3 réussie, version non publiée.** La campagne complète passe : 178 tests unitaires, 179 E2E, cinq modes natifs dans Chrome 158.0.8127.37 et Edge 158.0.4370.33, trois interruptions par navigateur, trois répétitions de performance et dix scénarios PDF. Les contrôles Linux aux minima exacts Node 22.22.0 et 24.8.0 passent aussi (178 unitaires chacun). Voir le [rapport de consolidation](RAPPORT_CONSOLIDATION_1.5.3.md). Le commit applicatif `3352a12` est proposé dans la [PR #1](https://github.com/ScioNos/Scionos-Capture/pull/1), ouverte et non fusionnée ; sa fusion exige une validation explicite. Les E2E Linux et le scaling Windows ont réussi sur ce commit ; les contrôles core Node 22/24 et le filtre ont réussi sur `81f7849`, après correction des liens de preuves. Consultez les [checks de la PR](https://github.com/ScioNos/Scionos-Capture/pull/1/checks) pour le dernier SHA ; aucun succès global de cette dernière CI n’est encore revendiqué. Archive définitive : 175 572 octets, SHA-256 `f863e10d835425c9023cdb716f7f6bdaa5ce191f34982042417312a50a733d81`. Aucune release GitHub ni soumission Store ; les liens publics 1.5.2 sont conservés.

- Annulation des exports : Annuler et Échap arrêtent la publication du résultat même après le début du snapshot, pendant la rasterisation PDF ou les bandes image uniquement ; nettoyage des URL temporaires et nouvelle tentative couverts par huit scénarios ciblés réussis.

Les contrôles d’identité de capture et les métadonnées figées au démarrage visent à éviter de mélanger des pages ou des documents. Le retrait du cache ne modifie pas la rétention locale ; IndexedDB reste la source faisant autorité. La fermeture des connexions abandonnées et la suppression totale transactionnelle déjà locale renforcent la cohérence du stockage. Les exports déjà enregistrés doivent toujours être supprimés séparément par l’utilisateur.

- Capture : contrôles de l’onglet actif, de la fenêtre et de la navigation avant et après acquisition, avec sonde liée au `documentId`. L’URL et le titre sont figés au début de la session.
- PDF : `captureVisibleTab` ne fournit aucune preuve de correspondance entre les pixels capturés et le DOM. Même si les états observés avant et après sont identiques, un changement transitoire peut échapper aux contrôles : toute couche source issue du DOM est donc omise des captures natives. Le texte des annotations utilisateur est rendu dans les pixels ; les titres, légendes et bandes de page restent recherchables hors mode image uniquement.
- PDF image uniquement : option du panneau Document, traduite dans les quatre langues et conservée avec les paramètres du projet. Elle supprime les couches de texte recherchable et rasterise aussi les en-têtes et pieds de page. Les pixels visibles peuvent toujours contenir des secrets ; ce mode ne remplace pas un masque solide.
- Projets : manifeste limité à 1 Mio de JSON UTF-8 (échappements inclus), archive ZIP STORE à 128 Mio, en-têtes et répertoire compris. Un précontrôle refuse les dépassements avant les copies/instantanés ; le codec contrôle aussi les tailles finales encodées. Les historiques d’annotations Annuler/Refaire partagent en plus un budget total de 1 Mio de JSON brut UTF-8, avec une réserve par état. L’historique de composition des titres et légendes est lui aussi limité à 50 états et 1 Mio de JSON UTF-8 partagé ; les changements de paramètres PDF et de politique des sources sont contrôlés avant mutation.
- Stockage : cache de captures retiré pour éviter les données périmées entre contextes ; fermeture des connexions IndexedDB abandonnées. La suppression totale transactionnelle déjà présente dans l’arbre local est intégrée et préservée, avec annulation intégrale en cas d’échec.
- Imports : validation stricte des données de transparence PNG `tRNS`. Lecture des projets v1/v2 et écriture v2 conservées. Aucune nouvelle permission ni télémétrie.

Dernière mise à jour : 26 novembre 2026 — documentation de la 1.5.3 qualifiée localement.

**Éditeur responsable :** eyelo SA (IDE : CHE-108.174.302), Vaud, Suisse — Marque **ScioNos** ([scionos.ch](https://scionos.ch)) — Contact : info@eyelo.ch

Scionos Capture traite localement les pixels visibles, le titre et l’URL de la page capturée, ainsi que la préférence de langue. L’utilisateur déclenche explicitement chaque capture.

La capture de zone défilante traite plusieurs portions visibles de la même page pour les assembler localement. Elle n’ajoute aucune permission, destination réseau ou catégorie de donnée.

L’extension n’envoie aucune capture, URL ou donnée de navigation à eyelo SA, ScioNos ou à un tiers. Elle ne contient ni compte, ni télémétrie, ni publicité, ni bibliothèque distante.

La capture et ses métadonnées textuelles restent dans IndexedDB local. Les fragments sont supprimés après assemblage ou après quinze minutes sans activité ; un navigateur suspendu peut différer ce nettoyage jusqu’au réveil. La capture finale est conservée tant qu’un onglet éditeur correspondant est ouvert, y compris après rechargement et au-delà de quinze minutes. Elle est supprimée à la fermeture de son dernier éditeur. Sans éditeur, elle devient éligible au nettoyage quinze minutes après sa création. Les associations sont réconciliées avec les onglets ouverts au réveil et au redémarrage.

La langue choisie et le délai de capture (`captureDelaySeconds`, 0, 3, 5 ou 10 secondes) sont conservés dans `chrome.storage.local`. La sélection d’un élément et le compte à rebours restent locaux ; ils n’ajoutent aucune permission ni destination réseau. La capture différée ne commence qu’après une action explicite et peut être annulée. La correspondance entre l’onglet éditeur et la capture utilise `chrome.storage.session` et disparaît avec la session du navigateur.

L’utilisateur peut supprimer les données stockées par l’extension depuis la page de gestion des extensions ou en désinstallant Scionos Capture. Les fichiers exportés ou projets enregistrés séparément sur l’appareil restent à supprimer par l’utilisateur.

Pour toute question de confidentialité : info@eyelo.ch. Pour une vulnérabilité, suivez exclusivement [SECURITY.md](SECURITY.md).

Pour la 1.5.3 qualifiée localement, les captures natives ne fournissent aucune couche de texte source issue du DOM : l’API ne prouve pas sa correspondance avec les pixels. Les images importées et restaurées d’un projet ne restaurent pas de couche source fiable. Le texte des annotations utilisateur est rendu dans les pixels ; les titres, légendes et bandes de page restent recherchables hors mode « PDF image uniquement ». Ce mode, conservé dans les paramètres du projet, rasterise aussi les en-têtes et pieds de page. L’image reste présente ; protégez ses pixels confidentiels par un masque solide, le flou étant seulement visuel.

Appliquez ou annulez les modifications en attente avant tout export. Le flou reste un effet visuel ; utilisez un masque solide pour les secrets.

## Confidentialité de la version 1.5.2

**1.5.2 — publiée sur GitHub.** Release GitHub : [v1.5.2](https://github.com/ScioNos/Scionos-Capture/releases/tag/v1.5.2). Le statut actuel du Chrome Web Store n’est pas confirmé ; aucune soumission de la 1.5.2 n’est effectuée ici.

Les corrections appliquent aussi la politique de sources à tous les chemins du générateur HTML. `sanitized` retire requête et fragment, `none` omet les sources, `full` conserve les URL ; les identifiants HTTP(S) restent toujours retirés. Les miniatures internes de l’éditeur et l’aperçu de composition sont reconstruits à partir du projet rouvert, annotations comprises. Un export portable ne supprime pas l’indicateur de modifications non enregistrées ; « téléchargement demandé » ne confirme pas l’écriture du fichier sur disque. Les permissions et le traitement local restent inchangés.

## Confidentialité de la version 1.5.1 — publiée sur GitHub ; statut Store non confirmé

Dans le panneau Document, la politique de sources s’applique aux projets sauvegardés et aux exports : sanitized (par défaut) retire paramètres de requête et fragments des URL, none omet les sources et full les conserve. Les identifiants intégrés aux URL HTTP(S) sont toujours retirés, même en mode full. Les sources retirées à la sauvegarde ne sont plus récupérables ; changer de mode ensuite ne les restaure pas. L’export depuis la bibliothèque applique toujours sanitized, y compris aux projets enregistrés avant cette version.

Ce filtrage ne rend pas le document anonyme : le chemin de l’URL, les pixels, titres, légendes et dates peuvent encore contenir des informations sensibles. Vérifiez-les avant tout partage. Les copies déjà exportées restent sous votre contrôle et ne sont pas modifiées par un changement de politique.

Le diagnostic est local et doit être activé explicitement ; il n’ajoute aucune télémétrie ni transmission automatique. Les permissions restent inchangées. La lecture des projets v1/v2 et l’écriture v2 sont conservées ; les protections irréversibles des masques et rognages restent applicables.

## Confidentialité de la version 1.5.0

Cette section décrit le périmètre de confidentialité de la version publiée 1.5.0.

L’import de fichiers image, le collage explicitement demandé depuis le presse-papiers et la composition multi-images traitent localement les images choisies ainsi que les titres, légendes, étapes et métadonnées de source/date présents dans le document. Ces opérations n’impliquent aucun transfert vers un serveur.

La 1.5.0 utilise le format portable local `.scionos` v2 avec annotations individuellement éditables et réouverture des projets v1, dont les annotations restent aplaties. À la sauvegarde, les masques solides et rognages sont appliqués irréversiblement aux images conservées ; les annotations touchées sont supprimées de manière conservative. Les fichiers importés et les projets v1 ne disposent pas d’une couche texte fiable. À la sauvegarde après rognage, toutes les annotations antérieures sont aplaties pour préserver leur rendu et leur ordre.

Les exports PNG, JPEG, WebP, HTML, Markdown/ZIP, PDF et l’impression peuvent inclure les images et les informations de composition sélectionnées. Vérifiez les titres, sources, dates et contenus avant de partager un export ou un projet. Les fichiers enregistrés restent sur l’appareil à l’emplacement choisi par l’utilisateur ; ils ne sont pas supprimés par le nettoyage temporaire de l’extension ni par sa désinstallation. Leur conservation, partage et suppression relèvent de l’utilisateur.

Une bibliothèque locale durable est disponible sur enregistrement explicite : vignettes, recherche, renommage, duplication et suppression. L’utilisateur choisit une durée de 0, 7, 30 ou 90 jours et un quota de 64 à 1 024 Mio, avec 256 Mio par défaut ; 0 jour signifie sans expiration automatique. Les projets conservés localement pourront contenir images, annotations et métadonnées. Le masque solide reste nécessaire pour protéger les pixels confidentiels ; le flou reste uniquement visuel.
