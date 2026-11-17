# Sécurité

[Français](SECURITY.md) · [English](SECURITY.en.md) · [Español](SECURITY.es.md) · [Deutsch](SECURITY.de.md)

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
