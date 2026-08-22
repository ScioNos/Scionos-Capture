# Sécurité

[Français](SECURITY.md) · [English](SECURITY.en.md) · [Español](SECURITY.es.md) · [Deutsch](SECURITY.de.md)

## Versions prises en charge

La dernière release publiée reçoit les correctifs de sécurité. La ligne actuellement prise en charge est `1.0.x`.

## Signaler une vulnérabilité

N’ouvrez pas d’issue publique pour une vulnérabilité exploitable. Utilisez le [signalement privé GitHub](https://github.com/ScioNos/Scionos-Capture/security/advisories/new) ou contactez directement `info@eyelo.ch` en fournissant la version, l’impact, les étapes de reproduction et une preuve non destructive si possible.

Un accusé de réception est visé sous 3 jours ouvrés et une première évaluation sous 7 jours ouvrés. Les délais de correction dépendent de la gravité; la publication coordonnée intervient après disponibilité d’un correctif.

## Modèle de sécurité

Les captures, y compris les tuiles d’une zone défilante, restent dans l’origine locale de l’extension. Aucun script distant n’est exécuté et la zone défilante n’ajoute aucune permission. Les captures orphelines expirent après une heure et sont purgées au prochain réveil si le navigateur était suspendu. Le masquage solide doit être utilisé pour les secrets; le flou ne constitue pas une suppression cryptographique de l’information.
