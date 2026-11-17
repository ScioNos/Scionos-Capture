# Contribuer à Scionos Capture

[Français](CONTRIBUTING.md) · [English](CONTRIBUTING.en.md) · [Español](CONTRIBUTING.es.md) · [Deutsch](CONTRIBUTING.de.md)

Merci de contribuer. Ne joignez jamais de capture contenant des données personnelles, identifiants ou secrets.

1. Créez une branche `fix/...`, `feat/...` ou `docs/...`.
2. Installez Node.js 24 et exécutez `npm ci`.
3. Gardez les dépendances d’exécution à zéro et justifiez toute dépendance de développement.
4. Exécutez `npm run verify` avant la pull request.
5. Rechargez l’extension et testez manuellement Chrome et Edge.

Vérifiez les cinq modes de capture, notamment les deux points, le défilement, les tranches partielles et les champs géométriques de la zone défilante. Couvrez aussi les pages hautes et larges, le DPR, le changement d’onglet, Annuler/Refaire, rognage, masquage, copie, PNG/PDF, zoom, clavier et les quatre langues.

Toute nouvelle chaîne doit être ajoutée aux quatre fichiers `_locales/*/messages.json`. Toute permission de manifeste doit être minimale, expliquée dans le README et couverte par la validation du paquet.

Node.js 22.13.0 minimum est requis par les dépendances de développement et de test ; Node.js 24 est recommandé. PDF.js 6.5.438 sert uniquement aux tests d’extraction PDF. La CI vérifie Node.js 22.13.0 et 24.

Synchronisation de version pour la publication GitHub : `npm run version:sync -- 1.5.2` ; sous PowerShell : `npm.cmd run version:sync -- 1.5.2`. Cette commande modifie aussi les fichiers de version du paquet ; ne l’exécutez que dans le cadre de leur mise à jour coordonnée.

Appliquez ou annulez les modifications en attente avant tout export. Le flou reste un effet visuel ; utilisez un masque solide pour les secrets. Les captures de conteneurs translatés ou mis à l’échelle sont prises en charge. Les rotations, inclinaisons et perspectives non prises en charge provoquent une erreur explicite.

`npm run test:native` vérifie les cinq modes dans Chrome et Edge installés, avec de vraies captures et des profils temporaires. La permission `activeTab` est accordée par l’action de l’extension ; les profils personnels ne sont pas utilisés.

Validation 1.5.2 : `npm run verify:release` a réussi — 133 tests unitaires, 126 tests navigateur, cinq modes chacun dans Chrome 157.0.8103.79 et Edge 157.0.4341.60, trois répétitions de performance et dix scénarios PDF. Résultats et environnement : [revue des dépendances et validation](DEPENDENCY_REVIEW_1.5.2.md).

Pour les prochaines releases, `npm run verify:release` enchaîne `verify`, les essais natifs et les mesures de performance générales et PDF. Consignez les résultats du livrable contrôlé.
