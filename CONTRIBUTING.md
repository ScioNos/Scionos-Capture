# Contribuer à Scionos Capture

[Français](CONTRIBUTING.md) · [English](CONTRIBUTING.en.md) · [Español](CONTRIBUTING.es.md) · [Deutsch](CONTRIBUTING.de.md)

Merci de contribuer. Ne joignez jamais de capture contenant des données personnelles, identifiants ou secrets.

1. Créez une branche `fix/...`, `feat/...` ou `docs/...`.
2. Installez Node.js 20 ou 24 et exécutez `npm ci`.
3. Gardez les dépendances d’exécution à zéro et justifiez toute dépendance de développement.
4. Exécutez `npm run verify` avant la pull request.
5. Rechargez l’extension et testez manuellement Chrome et Edge.

Vérifiez les quatre modes de capture, notamment les deux points, le défilement, les tranches partielles et les champs géométriques de la zone défilante. Couvrez aussi les pages hautes et larges, le DPR, le changement d’onglet, Annuler/Refaire, rognage, masquage, copie, PNG/PDF, zoom, clavier et les quatre langues.

Toute nouvelle chaîne doit être ajoutée aux quatre fichiers `_locales/*/messages.json`. Toute permission de manifeste doit être minimale, expliquée dans le README et couverte par la validation du paquet.
