# Sécurité

[Français](SECURITY.md) · [English](SECURITY.en.md) · [Español](SECURITY.es.md) · [Deutsch](SECURITY.de.md)

## Préparation 1.5.3 — 26 novembre 2026

**Qualification locale finale 1.5.3 réussie, version non publiée.** La campagne complète passe : 178 tests unitaires, 179 E2E, cinq modes natifs dans Chrome 158.0.8127.37 et Edge 158.0.4370.33, trois interruptions par navigateur, trois répétitions de performance et dix scénarios PDF. Les contrôles Linux aux minima exacts Node 22.22.0 et 24.8.0 passent aussi (178 unitaires chacun). Voir le [rapport de consolidation](RAPPORT_CONSOLIDATION_1.5.3.md). Le commit applicatif `3352a12` est proposé dans la [PR #1](https://github.com/ScioNos/Scionos-Capture/pull/1), ouverte et non fusionnée ; sa fusion exige une validation explicite. Les E2E Linux et le scaling Windows ont réussi sur ce commit ; les contrôles core Node 22/24 et le filtre ont réussi sur `81f7849`, après correction des liens de preuves. Consultez les [checks de la PR](https://github.com/ScioNos/Scionos-Capture/pull/1/checks) pour le dernier SHA ; aucun succès global de cette dernière CI n’est encore revendiqué. Archive définitive : 175 572 octets, SHA-256 `f863e10d835425c9023cdb716f7f6bdaa5ce191f34982042417312a50a733d81`. Aucune release GitHub ni soumission Store ; les liens publics 1.5.2 sont conservés.

- Annulation des exports : Annuler et Échap arrêtent la publication du résultat même après le début du snapshot, pendant la rasterisation PDF ou les bandes image uniquement ; nettoyage des URL temporaires et nouvelle tentative couverts par huit scénarios ciblés réussis.

La ligne prise en charge reste `1.5.x` ; 1.5.3 est en préparation. Les instructions de signalement privé et les délais de réponse ci-dessous restent applicables. Les limites de ressources réduisent la charge admise, sans constituer une garantie absolue contre un épuisement de mémoire.

- Capture : contrôles de l’onglet actif, de la fenêtre et de la navigation avant et après acquisition, avec sonde liée au `documentId`. L’URL et le titre sont figés au début de la session.
- PDF : `captureVisibleTab` ne fournit aucune preuve de correspondance entre les pixels capturés et le DOM. Même si les états observés avant et après sont identiques, un changement transitoire peut échapper aux contrôles : toute couche source issue du DOM est donc omise des captures natives. Le texte des annotations utilisateur est rendu dans les pixels ; les titres, légendes et bandes de page restent recherchables hors mode image uniquement.
- PDF image uniquement : option du panneau Document, traduite dans les quatre langues et conservée avec les paramètres du projet. Elle supprime les couches de texte recherchable et rasterise aussi les en-têtes et pieds de page. Les pixels visibles peuvent toujours contenir des secrets ; ce mode ne remplace pas un masque solide.
- Projets : manifeste limité à 1 Mio de JSON UTF-8 (échappements inclus), archive ZIP STORE à 128 Mio, en-têtes et répertoire compris. Un précontrôle refuse les dépassements avant les copies/instantanés ; le codec contrôle aussi les tailles finales encodées. Les historiques d’annotations Annuler/Refaire partagent en plus un budget total de 1 Mio de JSON brut UTF-8, avec une réserve par état. L’historique de composition des titres et légendes est lui aussi limité à 50 états et 1 Mio de JSON UTF-8 partagé ; les changements de paramètres PDF et de politique des sources sont contrôlés avant mutation.
- Captures : budget de 180 secondes contrôlé coopérativement aux points de contrôle, et maximum de 256 portions. Il ne s’agit pas d’une interruption préemptive à 180 secondes ; les pages trop longues sont refusées.
- Ressources : budget cumulé de 32 millions de pixels, incluant les originaux conservés après rognage ; Annuler/Refaire reste borné par ce budget. Au plus deux instantanés sont simultanément en vol, jusqu’à la fin de l’export, de la copie dans le presse-papiers ou de la sauvegarde. Les surfaces Canvas créées par ces opérations sont réduites à 1 × 1 dans `finally`, sans modifier les surfaces reçues en entrée.
- Annotations : 1 000 par image et 5 000 par document ; 10 000 points par tracé et 100 000 par document. Historique global limité à 100 états, 100 000 points et 5 000 opérations, en plus du budget JSON partagé.
- Stockage : cache de captures retiré pour éviter les données périmées entre contextes ; fermeture des connexions IndexedDB abandonnées. La suppression totale transactionnelle déjà présente dans l’arbre local est intégrée et préservée, avec annulation intégrale en cas d’échec.
- Imports : validation stricte des données de transparence PNG `tRNS`. Lecture des projets v1/v2 et écriture v2 conservées. Aucune nouvelle permission ni télémétrie.
- Compatibilité : minimum du manifeste Chrome/Edge 106 au lieu de 102 ; CSS `:has()` exige Chrome 105 et `documentId` Chrome 106. Ce minimum est identifié par analyse statique ; les seules exécutions natives attestées concernent Chrome/Edge 158, sans exécution démontrée de Chrome/Edge 106.
- Outils : `@axe-core/playwright` 4.14.1, `html-validate` 11.22.1, override `minimatch` 11.0.9 ; override `glob` inactif retiré. Douze mises à jour transitives compatibles appliquées ; Actions GitHub épinglées par SHA de commit. Voir la [revue des dépendances](DEPENDENCY_REVIEW_1.5.3.md) et la [revue des transitives](DEPENDENCY_TRANSITIVES_1.5.3.md).

## Versions prises en charge

Politique mise à jour le 26 novembre 2026 pour la 1.5.3 qualifiée localement, non publiée. La ligne prise en charge est `1.5.x`. La version [v1.5.2](https://github.com/ScioNos/Scionos-Capture/releases/tag/v1.5.2) est publiée sur GitHub ; le statut actuel du Chrome Web Store reste non confirmé et aucune soumission de la 1.5.2 n’est effectuée ici.

## Signaler une vulnérabilité

N’ouvrez pas d’issue publique pour une vulnérabilité exploitable. Utilisez le [signalement privé GitHub](https://github.com/ScioNos/Scionos-Capture/security/advisories/new) ou contactez directement `info@eyelo.ch` en fournissant la version, l’impact, les étapes de reproduction et une preuve non destructive si possible.

Un accusé de réception est visé sous 3 jours ouvrés et une première évaluation sous 7 jours ouvrés. Les délais de correction dépendent de la gravité; la publication coordonnée intervient après disponibilité d’un correctif.

## Modèle de sécurité

Les captures, y compris les tuiles d’une zone défilante, restent dans l’origine locale de l’extension. Aucun script distant n’est exécuté et la zone défilante n’ajoute aucune permission. Les captures orphelines expirent après quinze minutes et sont purgées au prochain réveil si le navigateur était suspendu. Le masquage solide doit être utilisé pour les secrets; le flou ne constitue pas une suppression cryptographique de l’information.

Pour la 1.5.3 qualifiée localement, les captures natives ne fournissent aucune couche de texte source issue du DOM : l’API ne prouve pas sa correspondance avec les pixels. Les images importées et restaurées d’un projet ne restaurent pas de couche source fiable. Le texte des annotations utilisateur est rendu dans les pixels ; les titres, légendes et bandes de page restent recherchables hors mode « PDF image uniquement ». Ce mode, conservé dans les paramètres du projet, rasterise aussi les en-têtes et pieds de page. L’image reste présente ; protégez ses pixels confidentiels par un masque solide, le flou étant seulement visuel.

Appliquez ou annulez les modifications en attente avant tout export. Le flou reste un effet visuel ; utilisez un masque solide pour les secrets.

## Garde-fous de la version 1.5.2

Les corrections couvrent les interruptions de glisser et le `pointerId` actif, les miniatures internes de l’éditeur et l’aperçu de composition reconstruits, le respect de la politique de sources dans chaque rapport HTML et le retrait de l’ancien module d’export du paquet (35 fichiers). L’impression/PDF est bornée à 32 millions de pixels cumulés, 128 Mio de blobs cumulés et 200 pages. L’export portable laisse les modifications signalées comme non enregistrées ; son message confirme uniquement la demande de téléchargement. Validation 1.5.2 : `npm run verify:release` a réussi — 133 tests unitaires, 126 tests navigateur, cinq modes chacun dans Chrome 157.0.8103.79 et Edge 157.0.4341.60, trois répétitions de performance et dix scénarios PDF. Résultats et environnement : [revue des dépendances et validation](DEPENDENCY_REVIEW_1.5.2.md).
