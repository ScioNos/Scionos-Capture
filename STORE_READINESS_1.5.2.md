# Préparation Chrome Web Store — Scionos Capture 1.5.2 corrigée

## État

**Avis technique : prêt pour une revue humaine avant soumission**, sous réserve de vérifier les champs du compte et les déclarations propres à la console Store. Ce document concerne les corrections locales postérieures au commit `4942564f69e77762295023e8bb2e072638a2b6b2` ; les résultats des archives GitHub déjà publiées ne sont pas utilisés comme preuve de validation de cette candidate. Le numéro de version reste 1.5.2. Aucune publication, soumission Google, modification de tag ou réécriture d’historique n’est effectuée.

## Corrections intégrées

- Sélections : propriété du geste par son pointeur, événements secondaires ignorés et interruptions nettoyées.
- Capture : restauration des éléments masqués même si la préparation échoue.
- Bibliothèque : suppression globale dans une transaction, rejet des listes périmées et annulation intégrale en cas d’échec.

## Validations exécutées

- `npm run verify:core` : syntaxe, ESLint, HTML, 136 tests unitaires, validation du paquet et génération de l’archive, succès.
- Playwright Chromium : 136 tests navigateur réussis, y compris les huit scénarios de pointeurs et deux échecs injectés de préparation (`dist/verify-store-1.5.2/e2e-final`).
- Capture native : cinq modes, dimensions et pixels validés dans Chrome 157.0.8103.79 et Edge 157.0.4341.60.
- Performance synthétique : trois répétitions réussies (`dist/verify-store-1.5.2/performance-smoke.json`).
- PDF : dix scénarios réussis, dont projet proche de 32 millions de pixels et erreurs contrôlées (`dist/verify-store-1.5.2/pdf-performance.json`). Ces scripts ne mesurent pas toute la mémoire du processus navigateur, RSS/GPU ou le spooler d’impression.
- Paquet : 35 entrées conformes à l’allow-list; la validation compare les fichiers source à la sélection de paquet. SHA-256 `70e50fa26ca14fbc1aa3ac7394f79ea0ff5c11a5a53d96f7c0ef0f763a6d968b` dans `dist/scionos-capture-v1.5.2.zip.sha256`.
- Visuels : cinq captures interface réelle, 1280 × 800, présentes dans `store-assets/screenshots-real-v1.5.2.json`; données fictives locales. La sélection est montrée avant l’acquisition, avec transport simulé.
- Fiches : descriptions revues en français, anglais, espagnol et allemand. Consignes images Google consultées : https://developer.chrome.com/docs/webstore/images?hl=en.

## Réserves avant soumission

Les tests sont locaux et ne constituent pas une décision de Google. L’état du tableau de bord, la disponibilité réelle du numéro `1.5.2`, les déclarations de confidentialité/distribution, le compte développeur et le statut du Chrome Web Store n’ont pas été vérifiés. Le tag et le ZIP GitHub existants sont antérieurs à ces modifications; ne pas les confondre avec ce ZIP corrigé. Le SHA du zip peut changer lors d’une reconstruction; toujours soumettre et vérifier le fichier et la checksum produits ensemble.

La candidate n’a pas été téléversée ni soumise à Google. Aucun commit, push, retag ou remplacement de la release GitHub n’a été effectué.
