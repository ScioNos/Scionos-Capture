# Sécurité

[Français](SECURITY.md) · [English](SECURITY.en.md) · [Español](SECURITY.es.md) · [Deutsch](SECURITY.de.md)

## Préparation 1.5.3 — 26 novembre 2026

**Préparation locale, non publiée.** La validation finale des tests est encore en cours ; les résultats et limites seront consignés dans le [rapport de consolidation](CONSOLIDATION_1.5.3.md). Aucune release GitHub ni soumission Store n’est effectuée. Les liens publics 1.5.2 et leurs archives restent ceux de la publication existante.

La ligne prise en charge reste `1.5.x` ; 1.5.3 est en préparation. Les instructions de signalement privé et les délais de réponse ci-dessous restent applicables. Les limites de ressources réduisent la charge admise, sans constituer une garantie absolue contre un épuisement de mémoire.

- Capture : contrôles de l’onglet actif, de la fenêtre et de la navigation avant et après acquisition, avec sonde liée au `documentId`. L’URL et le titre sont figés au début de la session.
- PDF : invalidation de la couche texte lors de mutations DOM/CSSOM, de feuilles CSS inaccessibles, de changements de média ou d’animations ; exclusion du texte blanc sur blanc et omission du texte sous modes de fusion ou fonds image lorsque sa visibilité est incertaine (régression `SECRET_BLEND` invisible sur fond blanc confirmée et corrigée). Ces contrôles ne prouvent pas une correspondance absolue pixels/texte lorsqu’un changement CSSOM transitoire est rétabli entre les observations. L’absence de texte est privilégiée en cas de doute ; vérifiez les pixels et utilisez un masque solide pour les secrets.
- Captures : budget de 180 secondes contrôlé coopérativement aux points de contrôle, et maximum de 256 portions. Il ne s’agit pas d’une interruption préemptive à 180 secondes ; les pages trop longues sont refusées.
- Ressources : budget cumulé de 32 millions de pixels, incluant les originaux conservés après rognage ; Annuler/Refaire reste borné par ce budget. Au plus deux instantanés sont simultanément en vol, jusqu’à la fin de l’export, de la copie dans le presse-papiers ou de la sauvegarde. Les surfaces Canvas créées par ces opérations sont réduites à 1 × 1 dans `finally`, sans modifier les surfaces reçues en entrée.
- Annotations : 1 000 par image et 5 000 par document ; 10 000 points par tracé et 100 000 par document. Historique global limité à 100 états, 100 000 points et 5 000 opérations.
- Stockage : cache de captures retiré pour éviter les données périmées entre contextes ; fermeture des connexions IndexedDB abandonnées. La suppression totale transactionnelle déjà présente dans l’arbre local est intégrée et préservée, avec annulation intégrale en cas d’échec.
- Imports : validation stricte des données de transparence PNG `tRNS`. Lecture des projets v1/v2 et écriture v2 conservées. Aucune nouvelle permission ni télémétrie.
- Compatibilité : minimum du manifeste Chrome/Edge 106 au lieu de 102 ; CSS `:has()` exige Chrome 105 et `documentId` Chrome 106. Ce minimum est identifié par analyse statique ; les seules exécutions natives attestées concernent Chrome/Edge 158, sans exécution démontrée de Chrome/Edge 106.
- Outils : `@axe-core/playwright` 4.14.1, `html-validate` 11.22.1, override `minimatch` 11.0.9 ; override `glob` inactif retiré et Actions mises à jour. Voir la [revue des dépendances](DEPENDENCY_REVIEW_1.5.3.md).

## Versions prises en charge

Politique mise à jour le 17 novembre 2026 pour la version 1.5.2 — publiée sur GitHub. La ligne prise en charge est `1.5.x`. La version [v1.5.2](https://github.com/ScioNos/Scionos-Capture/releases/tag/v1.5.2) est publiée sur GitHub ; le statut actuel du Chrome Web Store reste non confirmé et aucune soumission de la 1.5.2 n’est effectuée ici.

## Signaler une vulnérabilité

N’ouvrez pas d’issue publique pour une vulnérabilité exploitable. Utilisez le [signalement privé GitHub](https://github.com/ScioNos/Scionos-Capture/security/advisories/new) ou contactez directement `info@eyelo.ch` en fournissant la version, l’impact, les étapes de reproduction et une preuve non destructive si possible.

Un accusé de réception est visé sous 3 jours ouvrés et une première évaluation sous 7 jours ouvrés. Les délais de correction dépendent de la gravité; la publication coordonnée intervient après disponibilité d’un correctif.

## Modèle de sécurité

Les captures, y compris les tuiles d’une zone défilante, restent dans l’origine locale de l’extension. Aucun script distant n’est exécuté et la zone défilante n’ajoute aucune permission. Les captures orphelines expirent après quinze minutes et sont purgées au prochain réveil si le navigateur était suspendu. Le masquage solide doit être utilisé pour les secrets; le flou ne constitue pas une suppression cryptographique de l’information.

La couche recherchable du PDF conserve uniquement les mots complets dont la visibilité est vérifiable. Les mots incertains sont omis de cette couche ; l’image capturée est conservée. Les anciens calques aux coordonnées non vérifiables sont également omis. Le masquage solide reste nécessaire pour protéger les pixels confidentiels ; le flou est seulement visuel.

Appliquez ou annulez les modifications en attente avant tout export. Le flou reste un effet visuel ; utilisez un masque solide pour les secrets.

## Garde-fous de la version 1.5.2

Les corrections couvrent les interruptions de glisser et le `pointerId` actif, les miniatures internes de l’éditeur et l’aperçu de composition reconstruits, le respect de la politique de sources dans chaque rapport HTML et le retrait de l’ancien module d’export du paquet (35 fichiers). L’impression/PDF est bornée à 32 millions de pixels cumulés, 128 Mio de blobs cumulés et 200 pages. L’export portable laisse les modifications signalées comme non enregistrées ; son message confirme uniquement la demande de téléchargement. Validation 1.5.2 : `npm run verify:release` a réussi — 133 tests unitaires, 126 tests navigateur, cinq modes chacun dans Chrome 157.0.8103.79 et Edge 157.0.4341.60, trois répétitions de performance et dix scénarios PDF. Résultats et environnement : [revue des dépendances et validation](DEPENDENCY_REVIEW_1.5.2.md).
