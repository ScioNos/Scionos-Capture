# Scionos Capture 1.5.3 — Plan et preuves de consolidation

État du 26 novembre 2026 : **qualification locale terminée, validation distante à recueillir avant décision de fusion/publication**. La version reste 1.5.3 sur la branche `consolidation/1.5.3`. Aucune fusion, aucun tag, aucune release GitHub ni soumission Store.

## Références et préservation

Référence de cette passe : `03d87f2fad4c05c1742f29f89c9aff6ddff3a9e7`, identique localement et sur origin avant intervention. Main distant : `4942564f69e77762295023e8bb2e072638a2b6b2`. Aucun changement suivi initial ; quatre fichiers non suivis préexistants ont été préservés. Le rapport transitive préexistant a été complété, les trois autres fichiers non suivis restent hors du commit de consolidation.

Aucun AGENTS.md applicable dans le dépôt et les ancêtres inspectés. CodeGraph CLI consulté en priorité, puis lectures directes lorsque l’index indiquait un changement sur disque. Les corrections de la consolidation précédente sont conservées. Les preuves et copies historiques restent sous `dist/consolidation-1.5.3/`, notamment `baseline` et `reference-03d87f2`.

## Corrections finales

- Fonds semi-transparents : reproduction avant correction avec SECRET_ALPHA et SECRET_LAYERS exportés malgré leur invisibilité effective. L’extraction autonome exclut les fonds composites non attestables.
- Association pixels/DOM : un changement transitoire CSSOM, une feuille adoptée puis retirée, un média ou une police peut échapper à MutationObserver et laisser début/fin identiques. Toute couche source DOM est donc omise dans les captures natives et les anciens enregistrements temporaires ; aucun OCR ni preuve absolue inventée.
- PDF image uniquement : option explicite quatre langues, préférence persistée, aucune couche texte ni lien associé ; bandes visibles rasterisées. PDF réel lu par PDF.js, sans texte extractible ni annotation Link.
- Manifeste : mesure exacte JSON UTF-8 échappements compris, plafond 1 048 576 octets. ZIP STORE : plafond 134 217 728 octets avec en-têtes et répertoire. Frontières exactes et octet supplémentaire testés. Compatibilité v1/v2 conservée.
- Édition : duplication avec UUID définitif avant admission ; glissers fractionnaires contrôlés avant mutation/historique ; métadonnées et paramètres PDF/source-policy vérifiés ; IDs optionnels importés conservés sans grossissement automatique. Imports mesurés après encodage PNG portable. Le codec vérifie aussi les tailles encodées réelles après édition.
- Historiques : annotations undo+redo partagent 100 états/100000 points/5000 opérations/1 Mio JSON avec réserve ; composition undo+redo partage 50 états/1 Mio.
- Ressources : surfaces possédées d’assemblage, patches, flou, crop échoué, rendu, snapshots et miniatures libérées ; entrées appelant préservées. Encodages asynchrones attendus avant nettoyage. Échec, refus et reprise testés.
- Annulation export : Annuler et Échap interrompent la publication du résultat après les attentes ; signal propagé à l’impression et nettoyage URL. Quatre échecs avant correction ; huit scénarios après correction passent (snapshot, raster page, bande image-only).
- Dépendances : douze mises à jour transitives compatibles, onze binaires canvas synchronisés et bare-buffer requis par bare-url. Directes et override ciblé minimatch inchangés ; maintiens justifiés. Actions checkout/setup-node/cache/upload-artifact épinglées aux SHA vérifiés.

Détails : [rapport final](RAPPORT_CONSOLIDATION_1.5.3.md), [dépendances](DEPENDENCY_REVIEW_1.5.3.md), [transitives](DEPENDENCY_TRANSITIVES_1.5.3.md), [compatibilité](COMPATIBILITY_1.5.3.md).

## Qualifications et états intermédiaires

| Preuve | État et résultat |
|---|---|
| `final-qualification-verify-release.log` | **Code 0**, sources finales après fix annulation :178 unitaires,179 E2E,5modes Chrome158.0.8127.37/Edge158.0.4370.33 pixels vérifiés,3interruptions par navigateur,3répétitions performance,10PDF |
| `final-qualified-verify-core.log` | **Code 0**, après dernier npm ci et documentation :178 unitaires,lint/HTML/validation/package |
| `final-npm-ci.log`, `final-npm-ls-all.json`, `final-npm-audit.json` | **Code 0**, arbre cohérent,0vulnérabilité signalée |
| `final-linux/qualified-2/qualification-summary.json` | Node22.22.0/npm10.9.4 et24.8.0/npm11.6.0 :ci/core0,178/178 chacun. Copie isolée,core réseau coupé,2Gio/2CPU/256PID |
| `qualified-verify-release.log` | Succès178unit/171E2E mais **avant annulation export**, intermédiaire |
| `round2-verify-release.log` | Arrêt volontaire après revue ayant confirmé défauts duplication/drag ; pas succès complet |
| `round2-verify-release-rechecked.log` | Échec lint fixture crypto, corrigé ensuite |
| `round2-resource-admission.log` | 7/10,échecs nettoyage miniature révélés puis corrigés ;4/4 snapshot ciblés passent ensuite |
| `final-linux` première série |177/178 :titre RELEASE_NOTES obsolète, corrigé ; qualified-2 remplace cette preuve |

Aucun test supprimé, désactivé ou affaibli pour faire passer la campagne. Les attentes de texte natif ont été adaptées à l’omission explicite, en conservant les contrats autonomes d’extraction, masquage, coordonnées et liens avec des fixtures peintes. Les fixtures intentionnellement en erreur ne sont pas comptées comme défaut applicatif.

## Mesures et paquet

Mesures finales séquentielles contre le commit exact `03d87f2` : `final-qualified-memory-comparison.json` (sourceStable true,1répétition/1prélèvement après étape) et `final-qualified-performance-comparison.json` (3répétitions). Import1image128,6→161,4ms,4images473,2→514,8ms : coût du contrôle PNG anticipé. HTML1image198,4→215,6ms,4images558,7→556,4ms. Aucun gain général revendiqué. PrivateBytes export projet4images664,0→649,7Mio ; listing1000projets549,9→554,4Mio. Prélèvements sans pic exact ni preuve de fuite/absence de fuite ; détails et tables historiques distinctes dans le rapport.

ZIP local vérifié : `dist/scionos-capture-v1.5.3.zip`, **175572 octets,35fichiers**.

```text
f863e10d835425c9023cdb716f7f6bdaa5ce191f34982042417312a50a733d81
```

`final-archive-verification.json` atteste CRC,allow-list exacte,absence de doublons et identité décompressée avec les sources. `final-qualification-source-hashes.json` identifie les sources qualifiées.

## Validation distante et décision de revue

Le commit applicatif `3352a1220f01fb1ae2ddb101730910529f1cd5ee` puis les compléments documentaires et de preuves sont poussés sur la même branche. La [PR nº1](https://github.com/ScioNos/Scionos-Capture/pull/1) est ouverte vers main, sans fusion. Les trois fichiers non suivis préexistants hors périmètre restent préservés.

Premier run45817507247 : filtre,Chromium Linux et Windows scaling réussis ; Core22 échoué sur un lien vers une preuve dist ignorée, Core24 annulé fail-fast. Correction par versionnement des31preuves liées sous qualification/1.5.3 avec inventaireSHA256 et conservation des octets bruts via .gitattributes. Aucun test ou validateur affaibli.

[Run45818859271](https://github.com/ScioNos/Scionos-Capture/actions/runs/45818859271) : **succès des cinq jobs sur81f7849c5afb66c02a9172b33fc47532bd3d49e8** : filtre,Core22.22.0,Core24.8.0,E2E/accessibilitéChromiumLinux,Windowsscaling. Les modifications applicatives et les fichiers de distribution sont identiques à la qualification locale178unit/179E2E. Le complément documentaire relatant ces résultats doit aussi conserver des contrôles verts sur la tête effective de la PR ; le résultat courant y est consultable sans inventer de SHA auto-référent dans le contenu du commit.

Les preuves locales sont collectées, le ZIP définitif175572octets et son SHA complet figurent ci-dessus. Aucun blocage applicatif restant identifié après qualification ; fusion et publication techniquement préparées sous réserve des contrôles de la tête effective et d’une validation humaine explicite de la fusion. Aucune fusion, aucun tag, aucune release GitHub ni Store.

Chrome/Edge106 ne sont pas exécutés ; compatibilité statique documentée et fallbacks préservés. Focus physique du bureau et dialogue d’impression humain non couverts par headless.

