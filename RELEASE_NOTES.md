# Scionos Capture 1.5.3

## Français — Préparation 1.5.3 — 26 novembre 2026

**Qualification locale finale 1.5.3 réussie, version non publiée.** La campagne complète passe : 178 tests unitaires, 179 E2E, cinq modes natifs dans Chrome 158.0.8127.37 et Edge 158.0.4370.33, trois interruptions par navigateur, trois répétitions de performance et dix scénarios PDF. Les contrôles Linux aux minima exacts Node 22.22.0 et 24.8.0 passent aussi (178 unitaires chacun). Voir le [rapport de consolidation](RAPPORT_CONSOLIDATION_1.5.3.md). CI distante, commit/PR et archive définitive restent à réaliser ; aucune publication GitHub ni soumission Store. Les liens publics 1.5.2 sont conservés.

- Annulation des exports : Annuler et Échap arrêtent la publication du résultat même après le début du snapshot, pendant la rasterisation PDF ou les bandes image uniquement ; nettoyage des URL temporaires et nouvelle tentative couverts par huit scénarios ciblés réussis.

- Capture : contrôles de l’onglet actif, de la fenêtre et de la navigation avant et après acquisition, avec sonde liée au `documentId`. L’URL et le titre sont figés au début de la session.
- PDF : `captureVisibleTab` ne fournit aucune preuve de correspondance entre les pixels capturés et le DOM. Même si les états observés avant et après sont identiques, un changement transitoire peut échapper aux contrôles : toute couche source issue du DOM est donc omise des captures natives. Le texte des annotations utilisateur est rendu dans les pixels ; les titres, légendes et bandes de page restent recherchables hors mode image uniquement.
- PDF image uniquement : option du panneau Document, traduite dans les quatre langues et conservée avec les paramètres du projet. Elle supprime les couches de texte recherchable et rasterise aussi les en-têtes et pieds de page. Les pixels visibles peuvent toujours contenir des secrets ; ce mode ne remplace pas un masque solide.
- Projets : manifeste limité à 1 Mio de JSON UTF-8 (échappements inclus), archive ZIP STORE à 128 Mio, en-têtes et répertoire compris. Un précontrôle refuse les dépassements avant les copies/instantanés ; le codec contrôle aussi les tailles finales encodées. Les historiques d’annotations Annuler/Refaire partagent en plus un budget total de 1 Mio de JSON brut UTF-8, avec une réserve par état. L’historique de composition des titres et légendes est lui aussi limité à 50 états et 1 Mio de JSON UTF-8 partagé ; les changements de paramètres PDF et de politique des sources sont contrôlés avant mutation.
- Captures : budget de 180 secondes contrôlé coopérativement aux points de contrôle, et maximum de 256 portions. Il ne s’agit pas d’une interruption préemptive à 180 secondes ; les pages trop longues sont refusées.
- Ressources : budget cumulé de 32 millions de pixels, incluant les originaux conservés après rognage ; Annuler/Refaire reste borné par ce budget. Au plus deux instantanés sont simultanément en vol, jusqu’à la fin de l’export, de la copie dans le presse-papiers ou de la sauvegarde. Les surfaces Canvas créées par ces opérations sont réduites à 1 × 1 dans `finally`, sans modifier les surfaces reçues en entrée.
- Annotations : 1 000 par image et 5 000 par document ; 10 000 points par tracé et 100 000 par document. Historique global limité à 100 états, 100 000 points et 5 000 opérations, en plus du budget JSON partagé.
- Stockage : cache de captures retiré pour éviter les données périmées entre contextes ; fermeture des connexions IndexedDB abandonnées. La suppression totale transactionnelle déjà présente dans l’arbre local est intégrée et préservée, avec annulation intégrale en cas d’échec.
- Imports : validation stricte des données de transparence PNG `tRNS`. Lecture des projets v1/v2 et écriture v2 conservées. Aucune nouvelle permission ni télémétrie.
- Interface : correction du chevauchement de la barre d’outils ; les commandes d’annotation restent groupées dans la même barre de 56 px, sans déplacement du canevas ni décalage pendant le glisser. Les états inertes `historyRevision`, `historyConsolidation` et `redoOperations` sont retirés.
- Compatibilité : minimum du manifeste Chrome/Edge 106 au lieu de 102 ; CSS `:has()` exige Chrome 105 et `documentId` Chrome 106. Ce minimum est identifié par analyse statique ; les seules exécutions natives attestées concernent Chrome/Edge 158, sans exécution démontrée de Chrome/Edge 106.
- Outils : `@axe-core/playwright` 4.14.1, `html-validate` 11.22.1, override `minimatch` 11.0.9 ; override `glob` inactif retiré. Douze mises à jour transitives compatibles appliquées ; Actions GitHub épinglées par SHA de commit. Voir la [revue des dépendances](DEPENDENCY_REVIEW_1.5.3.md) et la [revue des transitives](DEPENDENCY_TRANSITIVES_1.5.3.md).
- Bibliothèque : réutilisation bornée des cartes et miniatures. Les mesures comparatives antérieures sont documentées dans le [rapport](RAPPORT_CONSOLIDATION_1.5.3.md), avec leurs limites ; elles ne prouvent pas une accélération générale. Le traitement par lots n’est pas implémenté.

## English — 1.5.3 preparation — November 26, 2026

**Final local 1.5.3 qualification passed; unpublished version.** The complete run passes: 178 unit tests, 179 E2E tests, five native modes in Chrome 158.0.8127.37 and Edge 158.0.4370.33, three interruptions per browser, three performance repetitions and ten PDF scenarios. Linux checks also pass on the exact Node 22.22.0 and 24.8.0 minima (178 unit tests each). See the [consolidation report](RAPPORT_CONSOLIDATION_1.5.3.md). Remote CI, commit/PR and definitive archive remain pending; no GitHub publication or Store submission. Public 1.5.2 links are preserved.

- Export cancellation: Cancel and Escape prevent publication even after snapshot creation starts, during PDF rasterization or image-only page bands; temporary URL cleanup and retry are covered by eight passing targeted scenarios.

- Capture: check the active tab, window and navigation before and after acquisition, with a probe tied to `documentId`. The URL and title are fixed at the start of the session.
- PDF: `captureVisibleTab` provides no evidence that captured pixels match the DOM. Even identical observed states before and after capture can miss a transient change, so all DOM-derived source text is omitted from native captures. User annotation text is rendered into pixels; titles, captions and page bands remain searchable outside image-only mode.
- Image-only PDF: a Document panel option, translated into all four languages and saved with project settings. It removes searchable text layers and rasterizes headers and footers too. Visible pixels may still contain secrets; this mode does not replace a solid mask.
- Projects: the manifest is limited to 1 MiB of UTF-8 JSON (including escapes), and the STORE ZIP archive to 128 MiB including headers and directory. Preflight rejects over-budget states before copies/snapshots; the codec also checks final encoded sizes. Undo/Redo annotation histories additionally share a total 1 MiB budget for raw UTF-8 JSON, with a per-state allowance. Composition history for titles and captions is also limited to 50 states and a shared 1 MiB of UTF-8 JSON; changes to PDF settings and source policy are checked before mutation.
- Captures: a 180-second budget checked cooperatively at checkpoints, and at most 256 portions. This is not a preemptive interruption at 180 seconds; excessively long pages are rejected.
- Resources: a cumulative 32-million-pixel budget includes originals retained after cropping; Undo/Redo remains bounded by this budget. At most two snapshots are in flight simultaneously, until export, clipboard copying or saving finishes. Canvas surfaces owned by these operations are reduced to 1 × 1 in `finally`, preserving input surfaces.
- Annotations: 1,000 per image and 5,000 per document; 10,000 points per stroke and 100,000 per document. Global history is limited to 100 states, 100,000 points and 5,000 operations, in addition to the shared JSON budget.
- Storage: remove the capture cache to avoid stale data across contexts; close abandoned IndexedDB connections. Transactional full deletion already present in the local tree is integrated and preserved, with complete rollback on failure.
- Imports: strictly validate PNG `tRNS` transparency data. Project v1/v2 reading and v2 writing are retained. No new permission or telemetry.
- Interface: fix toolbar overlap; annotation controls stay grouped in the same 56 px toolbar, without canvas shifts or drag offsets. Inert `historyRevision`, `historyConsolidation` and `redoOperations` state is removed.
- Compatibility: manifest minimum Chrome/Edge 106 instead of 102; CSS `:has()` requires Chrome 105 and `documentId` requires Chrome 106. This minimum is identified by static analysis; the only attested native runs concern Chrome/Edge 158, with no demonstrated run on Chrome/Edge 106.
- Tools: `@axe-core/playwright` 4.14.1, `html-validate` 11.22.1, `minimatch` override 11.0.9; inactive `glob` override removed. Twelve compatible transitive updates applied; GitHub Actions pinned to commit SHAs. See the [dependency review](DEPENDENCY_REVIEW_1.5.3.md) and [transitive dependency review](DEPENDENCY_TRANSITIVES_1.5.3.md).
- Library: bounded card and thumbnail reuse. Earlier comparative measurements and their limits are documented in the [report](RAPPORT_CONSOLIDATION_1.5.3.md); they do not establish a general speedup. Batch processing is not implemented.

## Español — Preparación de 1.5.3 — 26 de noviembre de 2026

**Calificación local final de 1.5.3 superada; versión sin publicar.** Campaña completa superada: 178 pruebas unitarias, 179 E2E, cinco modos nativos en Chrome 158.0.8127.37 y Edge 158.0.4370.33, tres interrupciones por navegador, tres repeticiones de rendimiento y diez escenarios PDF. Los controles Linux también pasan con los mínimos exactos Node 22.22.0 y 24.8.0 (178 pruebas unitarias cada uno). Véase el [informe de consolidación](RAPPORT_CONSOLIDATION_1.5.3.md). CI remota, commit/PR y archivo definitivo siguen pendientes; sin publicación GitHub ni envío a la tienda. Se conservan los enlaces públicos de 1.5.2.

- Cancelación de exportaciones: Cancelar y Escape impiden publicar el resultado incluso después de iniciar la instantánea, durante la rasterización PDF o las bandas solo imagen; ocho escenarios específicos superados cubren limpieza de URL temporales y reintento.

- Captura: comprobaciones de pestaña activa, ventana y navegación antes y después de la adquisición, con una sonda vinculada al `documentId`. La URL y el título se fijan al inicio de la sesión.
- PDF: `captureVisibleTab` no aporta pruebas de correspondencia entre los píxeles capturados y el DOM. Incluso con estados observados idénticos antes y después puede pasar inadvertido un cambio transitorio, por lo que se omite todo texto fuente derivado del DOM en las capturas nativas. El texto de las anotaciones del usuario se representa en los píxeles; los títulos, leyendas y bandas de página siguen siendo buscables fuera del modo solo imagen.
- PDF solo imagen: opción del panel Documento, traducida a los cuatro idiomas y guardada con los ajustes del proyecto. Elimina las capas de texto buscable y también rasteriza encabezados y pies de página. Los píxeles visibles aún pueden contener secretos; este modo no sustituye una máscara sólida.
- Proyectos: manifiesto limitado a 1 MiB de JSON UTF-8 (incluidos los escapes) y archivo ZIP STORE a 128 MiB, con cabeceras y directorio incluidos. Una comprobación previa rechaza los excesos antes de copiar o crear instantáneas; el códec comprueba también los tamaños finales codificados. Los historiales de anotaciones Deshacer/Rehacer comparten además un presupuesto total de 1 MiB de JSON bruto UTF-8, con una reserva por estado. El historial de composición de títulos y leyendas también se limita a 50 estados y 1 MiB compartido de JSON UTF-8; los cambios de ajustes PDF y política de fuentes se comprueban antes de modificar el estado.
- Capturas: presupuesto de 180 segundos comprobado de forma cooperativa en los puntos de control y un máximo de 256 porciones. No es una interrupción preventiva a los 180 segundos; las páginas demasiado largas se rechazan.
- Recursos: el presupuesto acumulado de 32 millones de píxeles incluye los originales conservados tras recortar; Deshacer/Rehacer sigue limitado por ese presupuesto. Como máximo hay dos instantáneas simultáneas en curso hasta finalizar la exportación, la copia al portapapeles o el guardado. Los Canvas propios de estas operaciones se reducen a 1 × 1 en `finally`, conservando las superficies de entrada.
- Anotaciones: 1.000 por imagen y 5.000 por documento; 10.000 puntos por trazo y 100.000 por documento. Historial global limitado a 100 estados, 100.000 puntos y 5.000 operaciones, además del presupuesto JSON compartido.
- Almacenamiento: retirada de la caché de capturas para evitar datos obsoletos entre contextos; cierre de conexiones IndexedDB abandonadas. La eliminación total transaccional ya presente en el árbol local se integra y conserva, con reversión completa en caso de error.
- Importaciones: validación estricta de los datos de transparencia PNG `tRNS`. Se conserva la lectura de proyectos v1/v2 y la escritura v2. Sin nuevos permisos ni telemetría.
- Interfaz: corrección del solapamiento de la barra de herramientas; los controles de anotación permanecen agrupados en la misma barra de 56 px, sin desplazar el lienzo ni alterar el arrastre. Se retiran los estados inertes `historyRevision`, `historyConsolidation` y `redoOperations`.
- Compatibilidad: mínimo del manifiesto Chrome/Edge 106 en lugar de 102; CSS `:has()` requiere Chrome 105 y `documentId` Chrome 106. Este mínimo se identifica mediante análisis estático; las únicas ejecuciones nativas acreditadas son en Chrome/Edge 158, sin ejecución demostrada en Chrome/Edge 106.
- Herramientas: `@axe-core/playwright` 4.14.1, `html-validate` 11.22.1, override de `minimatch` 11.0.9; override inactivo de `glob` retirado. Doce actualizaciones transitivas compatibles aplicadas; Actions de GitHub fijadas por SHA de commit. Véanse la [revisión de dependencias](DEPENDENCY_REVIEW_1.5.3.md) y la [revisión de transitivas](DEPENDENCY_TRANSITIVES_1.5.3.md).
- Biblioteca: reutilización limitada de tarjetas y miniaturas. Las mediciones comparativas anteriores y sus límites constan en el [informe](RAPPORT_CONSOLIDATION_1.5.3.md); no demuestran una aceleración general. El procesamiento por lotes no está implementado.

## Deutsch — Vorbereitung von 1.5.3 — 26. November 2026

**Abschließende lokale Qualifizierung von 1.5.3 bestanden; unveröffentlichte Version.** Gesamtlauf bestanden: 178 Unit-Tests, 179 E2E-Tests, fünf native Modi in Chrome 158.0.8127.37 und Edge 158.0.4370.33, drei Unterbrechungen je Browser, drei Leistungswiederholungen und zehn PDF-Szenarien. Linux-Prüfungen bestehen auch mit den exakten Node-Mindestversionen 22.22.0 und 24.8.0 (je 178 Unit-Tests). Siehe [Konsolidierungsbericht](RAPPORT_CONSOLIDATION_1.5.3.md). Remote-CI, Commit/PR und endgültiges Archiv stehen noch aus; keine GitHub-Veröffentlichung oder Store-Einreichung. Öffentliche Links von 1.5.2 bleiben erhalten.

- Exportabbruch: Abbrechen und Escape verhindern die Ausgabe auch nach Beginn der Momentaufnahme, während der PDF-Rasterung oder der Bildmodus-Seitenbänder; acht bestandene gezielte Szenarien prüfen temporäre URL-Bereinigung und erneuten Versuch.

- Aufnahme: aktiven Tab, Fenster und Navigation vor und nach der Erfassung prüfen, mit einer an die `documentId` gebundenen Prüfung. URL und Titel werden zu Beginn der Sitzung festgelegt.
- PDF: `captureVisibleTab` liefert keinen Nachweis, dass aufgenommene Pixel und DOM übereinstimmen. Selbst identische beobachtete Zustände vor und nach der Aufnahme können eine vorübergehende Änderung übersehen. Deshalb wird sämtlicher aus dem DOM abgeleiteter Quelltext bei nativen Aufnahmen weggelassen. Text in Benutzerannotationen wird als Pixel gerendert; Titel, Bildunterschriften sowie Kopf- und Fußzeilen bleiben außerhalb des reinen Bildmodus durchsuchbar.
- PDF nur als Bild: Option im Bereich Dokument, in alle vier Sprachen übersetzt und mit den Projekteinstellungen gespeichert. Sie entfernt durchsuchbare Textebenen und rastert auch Kopf- und Fußzeilen. Sichtbare Pixel können weiterhin Geheimnisse enthalten; dieser Modus ersetzt keine deckende Maske.
- Projekte: Manifest auf 1 MiB UTF-8-JSON (einschließlich Escape-Sequenzen), STORE-ZIP-Archiv auf 128 MiB einschließlich Headern und Verzeichnis begrenzt. Eine Vorprüfung lehnt Überschreitungen vor Kopien/Momentaufnahmen ab; der Codec prüft auch die endgültig kodierten Größen. Die Annotationsverläufe für Rückgängig/Wiederholen teilen zusätzlich ein Gesamtbudget von 1 MiB rohem UTF-8-JSON mit einer Reserve pro Zustand. Der Kompositionsverlauf für Titel und Bildunterschriften ist ebenfalls auf 50 Zustände und ein gemeinsames Budget von 1 MiB UTF-8-JSON begrenzt; Änderungen an PDF-Einstellungen und Quellenrichtlinie werden vor der Zustandsänderung geprüft.
- Aufnahmen: Zeitbudget von 180 Sekunden, kooperativ an Kontrollpunkten geprüft, und höchstens 256 Teilaufnahmen. Dies ist keine präemptive Unterbrechung nach 180 Sekunden; zu lange Seiten werden abgelehnt.
- Ressourcen: Das Gesamtbudget von 32 Millionen Pixeln umfasst nach einem Zuschnitt aufbewahrte Originale; Rückgängig/Wiederholen bleibt durch dieses Budget begrenzt. Höchstens zwei Momentaufnahmen sind gleichzeitig in Bearbeitung, bis Export, Kopieren in die Zwischenablage oder Speicherung abgeschlossen ist. Eigene Canvas-Flächen dieser Vorgänge werden in `finally` auf 1 × 1 verkleinert; Eingabeflächen bleiben erhalten.
- Annotationen: 1.000 pro Bild und 5.000 pro Dokument; 10.000 Punkte pro Zeichenstrich und 100.000 pro Dokument. Der globale Verlauf ist auf 100 Zustände, 100.000 Punkte und 5.000 Operationen begrenzt, zusätzlich zum gemeinsamen JSON-Budget.
- Speicherung: Aufnahme-Cache entfernen, um veraltete Daten zwischen Kontexten zu vermeiden; aufgegebene IndexedDB-Verbindungen schließen. Die im lokalen Arbeitsbaum bereits vorhandene transaktionale Gesamtlöschung wird integriert und beibehalten, mit vollständigem Rollback bei Fehlern.
- Importe: strenge Validierung der PNG-Transparenzdaten `tRNS`. Projekte v1/v2 bleiben lesbar, geschrieben wird v2. Keine neue Berechtigung oder Telemetrie.
- Oberfläche: Überlappung der Werkzeugleiste korrigiert; Annotationsbefehle bleiben in derselben 56 px hohen Leiste gruppiert, ohne Verschiebung der Zeichenfläche oder Versatz beim Ziehen. Inaktive Zustände `historyRevision`, `historyConsolidation` und `redoOperations` sind entfernt.
- Kompatibilität: Manifest-Minimum Chrome/Edge 106 statt 102; CSS `:has()` benötigt Chrome 105 und `documentId` Chrome 106. Dieses Minimum wurde statisch ermittelt; die einzigen belegten nativen Ausführungen betreffen Chrome/Edge 158, ohne nachgewiesene Ausführung unter Chrome/Edge 106.
- Werkzeuge: `@axe-core/playwright` 4.14.1, `html-validate` 11.22.1, `minimatch`-Override 11.0.9; inaktiven `glob`-Override entfernt. Zwölf kompatible transitive Aktualisierungen angewendet; GitHub Actions auf Commit-SHAs festgelegt. Siehe [Abhängigkeitsprüfung](DEPENDENCY_REVIEW_1.5.3.md) und [Prüfung der transitiven Abhängigkeiten](DEPENDENCY_TRANSITIVES_1.5.3.md).
- Bibliothek: begrenzte Wiederverwendung von Karten und Miniaturen. Frühere Vergleichsmessungen und ihre Grenzen sind im [Bericht](RAPPORT_CONSOLIDATION_1.5.3.md) dokumentiert; sie belegen keine allgemeine Beschleunigung. Stapelverarbeitung ist nicht implementiert.

---

# Scionos Capture 1.5.2

## Français

**Candidate Store 1.5.2 corrigée localement.** La release GitHub existante conserve son tag et son archive antérieure ; elle ne contient pas ces nouvelles corrections. Aucune soumission Store effectuée. Voir [le bilan de préparation](STORE_READINESS_1.5.2.md).

- Sélections : suivi du pointeur actif, rejet des pointeurs secondaires et nettoyage des gestes interrompus.
- Capture : restauration des éléments masqués même en cas d’exception pendant leur préparation.
- Bibliothèque : suppression globale atomique, avec rejet des listes périmées et annulation intégrale en cas d’échec.

Validation de cette candidate : 136 tests unitaires et 136 tests navigateur réussis, cinq modes natifs dans Chrome et Edge, trois répétitions de performance et dix scénarios PDF. Détails, limites et empreinte finale : [préparation Store](STORE_READINESS_1.5.2.md).

- Glissers dans l’éditeur : suivi du `pointerId` actif et gestion des interruptions du geste.
- Miniatures internes de l’éditeur et aperçu de composition : reconstruction à la réouverture du projet pour inclure les annotations.
- Bouton « Exporter projet » : l’état « modifications non enregistrées » reste actif ; le message indique que le téléchargement a été demandé, sans garantir son enregistrement par le navigateur.
- Rapports HTML : application de la politique de sources dans tous les chemins du générateur, avec retrait systématique des identifiants HTTP(S).
- Impression/PDF : limites cumulées de 32 millions de pixels et 128 Mio de blobs, avec un maximum de 200 pages.
- Paquet : retrait de l’ancien module `editor-export.js`, soit 35 fichiers de distribution.
- Outils de test : @axe-core/playwright 4.14.0, @playwright/test 1.65.1, fake-indexeddb 6.2.8 et PDF.js 6.5.438. Dépendances de lint et validation majeures mises à jour : @eslint/js 10.0.1, eslint 10.15.0 et html-validate 11.21.1. Prérequis Node.js : ^22.22.0 ou >=24.8.0 ; matrice CI configurée pour 22.22.0 et 24.8.0, sans nouveau résultat CI pour cette candidate locale.
- Accessibilité : le nom annoncé du sélecteur de langue contient son code visible. La migration majeure ESLint et HTML-Validate est détaillée dans [la revue de migration](MAJOR_DEPENDENCY_MIGRATION.md).


## English

**Locally corrected Store candidate 1.5.2.** The existing GitHub release keeps its tag and earlier archive; it does not contain these new fixes. No Store submission performed. See [the readiness report](STORE_READINESS_1.5.2.md).

- Selections: track the active pointer, ignore secondary pointers and clean up interrupted gestures.
- Capture: restore hidden elements even when their preparation throws.
- Library: atomic bulk deletion, rejecting stale snapshots and rolling back the entire operation on failure.

Candidate validation: 136 unit tests and 136 browser tests passed, five native modes in Chrome and Edge, three performance repetitions and ten PDF scenarios. Details, limits and final checksum: [Store readiness](STORE_READINESS_1.5.2.md).

- Editor drags: track the active `pointerId` and handle gesture interruptions.
- Internal editor thumbnails and composition preview: reconstruct them when reopening a project to include annotations.
- The “Export project” button: keep the unsaved-changes state; the message says the download was requested without guaranteeing that the browser saved the file.
- HTML reports: apply source policy throughout the generator, always removing HTTP(S) credentials.
- Print/PDF: cumulative limits of 32 million pixels and 128 MiB of blobs, with a maximum of 200 pages.
- Package: removed the legacy `editor-export.js` module, leaving 35 distribution files.
- Test tools: @axe-core/playwright 4.14.0, @playwright/test 1.65.1, fake-indexeddb 6.2.8 and PDF.js 6.5.438. Major lint and validation tools upgraded: @eslint/js 10.0.1, eslint 10.15.0 and html-validate 11.21.1. Node.js requirement: ^22.22.0 or >=24.8.0; CI matrix configured for 22.22.0 and 24.8.0, with no new CI result for this local candidate.
- Accessibility: the language selector’s accessible name contains its visible code. The ESLint and HTML-Validate major migration is detailed in the [migration review](MAJOR_DEPENDENCY_MIGRATION.md).


## Español

**Candidata 1.5.2 corregida localmente para la tienda.** La publicación GitHub mantiene su etiqueta y archivo anterior; no contiene estas nuevas correcciones. No se ha enviado a la tienda. Véase [el informe de preparación](STORE_READINESS_1.5.2.md).

- Selecciones: seguimiento del puntero activo, exclusión de punteros secundarios y limpieza de gestos interrumpidos.
- Captura: restauración de elementos ocultos incluso si falla su preparación.
- Biblioteca: eliminación global atómica, con rechazo de listas obsoletas y reversión completa en caso de error.

Validación de esta candidata: 136 pruebas unitarias y 136 pruebas de navegador superadas, cinco modos nativos en Chrome y Edge, tres repeticiones de rendimiento y diez escenarios PDF. Detalles, límites y suma final: [preparación para la tienda](STORE_READINESS_1.5.2.md).

- Arrastres en el editor: seguimiento del `pointerId` activo y gestión de interrupciones del gesto.
- Miniaturas internas del editor y vista previa de composición: reconstrucción al reabrir el proyecto para incluir las anotaciones.
- Botón «Exportar proyecto»: se mantiene el estado de cambios sin guardar; el mensaje indica que se ha solicitado la descarga sin garantizar que el navegador haya guardado el archivo.
- Informes HTML: aplicación de la política de fuentes en todo el generador, eliminando siempre las credenciales HTTP(S).
- Impresión/PDF: límites acumulados de 32 millones de píxeles y 128 MiB de blobs, con un máximo de 200 páginas.
- Paquete: retirada del módulo antiguo `editor-export.js`, con 35 archivos de distribución.
- Herramientas de prueba: @axe-core/playwright 4.14.0, @playwright/test 1.65.1, fake-indexeddb 6.2.8 y PDF.js 6.5.438. Herramientas principales de lint y validación actualizadas: @eslint/js 10.0.1, eslint 10.15.0 y html-validate 11.21.1. Node.js requerido: ^22.22.0 o >=24.8.0; matriz CI configurada para 22.22.0 y 24.8.0, sin un nuevo resultado CI para esta candidata local.
- Accesibilidad: el nombre accesible del selector de idioma incluye su código visible. La migración mayor de ESLint y HTML-Validate se detalla en la [revisión de migración](MAJOR_DEPENDENCY_MIGRATION.md).


## Deutsch

**Lokal korrigierter Store-Kandidat 1.5.2.** Das bestehende GitHub-Release behält Tag und bisheriges Archiv; diese neuen Korrekturen sind darin nicht enthalten. Keine Store-Einreichung erfolgt. Siehe [Prüfbericht](STORE_READINESS_1.5.2.md).

- Auswahl: aktiven Zeiger verfolgen, weitere Zeiger ignorieren und unterbrochene Gesten bereinigen.
- Aufnahme: ausgeblendete Elemente auch bei Fehlern während der Vorbereitung wiederherstellen.
- Bibliothek: atomare Gesamtlöschung mit Ablehnung veralteter Listen und vollständigem Rollback bei Fehlern.

Prüfung dieses Kandidaten: 136 Unit-Tests und 136 Browsertests bestanden, fünf native Modi in Chrome und Edge, drei Leistungswiederholungen und zehn PDF-Szenarien. Details, Grenzen und endgültige Prüfsumme: [Store-Vorbereitung](STORE_READINESS_1.5.2.md).

- Ziehen im Editor: aktiven `pointerId` verfolgen und Unterbrechungen der Geste behandeln.
- Interne Editor-Miniaturen und Kompositionsvorschau: beim erneuten Öffnen des Projekts einschließlich Annotationen rekonstruieren.
- Schaltfläche „Projekt exportieren“: Status ungespeicherter Änderungen beibehalten; die Meldung bestätigt die Download-Anforderung, ohne das Speichern durch den Browser zu garantieren.
- HTML-Berichte: Quellenrichtlinie im gesamten Generator anwenden und HTTP(S)-Zugangsdaten immer entfernen.
- Drucken/PDF: kumulierte Grenzen von 32 Millionen Pixeln und 128 MiB Blobs, höchstens 200 Seiten.
- Paket: altes Modul `editor-export.js` entfernt; damit 35 Distributionsdateien.
- Testwerkzeuge: @axe-core/playwright 4.14.0, @playwright/test 1.65.1, fake-indexeddb 6.2.8 und PDF.js 6.5.438. Lint- und Validierungswerkzeuge aktualisiert: @eslint/js 10.0.1, eslint 10.15.0 und html-validate 11.21.1. Node.js-Anforderung: ^22.22.0 oder >=24.8.0; CI-Matrix für 22.22.0 und 24.8.0 konfiguriert, für diesen lokalen Kandidaten liegt kein neuer CI-Lauf vor.
- Barrierefreiheit: Der zugängliche Name der Sprachauswahl enthält den sichtbaren Sprachcode. Die Hauptversionsmigration von ESLint und HTML-Validate ist in der [Migrationsprüfung](MAJOR_DEPENDENCY_MIGRATION.md) dokumentiert.


---

# Scionos Capture 1.5.1

**1.5.1 publiée sur GitHub ; statut Store non confirmé / 1.5.1 published on GitHub; Store status unconfirmed / 1.5.1 publicada en GitHub; estado de la tienda no confirmado / 1.5.1 auf GitHub veröffentlicht; Store-Status unbestätigt.**

## Français

- Dans le panneau Document, la politique de sources s’applique aux projets et exports : `sanitized` par défaut retire paramètres de requête et fragments, `none` omet les sources et `full` les conserve. Les identifiants HTTP(S) sont toujours retirés. Les sources supprimées à la sauvegarde ne peuvent pas être restaurées ; la bibliothèque exporte toujours en mode `sanitized`, anciens projets compris.
- Les chemins d’URL, images, titres, légendes et dates peuvent encore être sensibles. Diagnostic local sur activation explicite, sans télémétrie ; permissions inchangées.
- Un instantané PNG par image pour les exports et projets ; vignette de bibliothèque générée directement et nettoyage tenant compte d’une impression en cours. Le renommage modifie les métadonnées avec une validation du codec et préserve les PNG.
- Imports PNG/JPEG/WebP : au-delà de 16 millions de pixels ou de 16 384 px par côté, refus avant décodage au lieu d’une réduction. Le cumul de composition reste à 32 millions de pixels. Lecture des projets v1/v2 et écriture v2 conservées.
- La version 1.5.1 est publiée sur GitHub. Le statut actuel et la version distribuée sur le Chrome Web Store ne sont pas confirmés ; ils doivent être vérifiés dans le tableau de bord.

## English

- In the Document panel, source policy applies to projects and exports: default `sanitized` removes query parameters and fragments, `none` omits sources and `full` retains them. HTTP(S) credentials are always removed. Sources removed on save cannot be restored; the library always exports using `sanitized`, including older projects.
- URL paths, images, titles, captions and dates may still be sensitive. Local opt-in diagnostics, without telemetry; permissions unchanged.
- One PNG snapshot per image for exports and projects; directly generated library thumbnails and cleanup that accounts for printing in progress. Rename changes metadata with one codec validation and preserves PNGs.
- PNG/JPEG/WebP imports: above 16 million pixels or 16,384 px per side, reject before decoding instead of reducing. The total composition limit remains 32 million pixels. Project v1/v2 reading and v2 writing retained.
- Version 1.5.1 is published on GitHub. The current Chrome Web Store status and distributed version are unconfirmed; check them in the dashboard.

## Español

- En el panel Documento, la política de fuentes se aplica a proyectos y exportaciones: `sanitized` por defecto elimina parámetros de consulta y fragmentos, `none` omite las fuentes y `full` las conserva. Las credenciales HTTP(S) siempre se eliminan. Las fuentes eliminadas al guardar no se recuperan; la biblioteca siempre exporta con `sanitized`, incluidos los proyectos antiguos.
- Las rutas de URL, imágenes, títulos, leyendas y fechas aún pueden ser sensibles. Diagnóstico local de activación voluntaria, sin telemetría; permisos sin cambios.
- Una instantánea PNG por imagen para exportaciones y proyectos; miniaturas de biblioteca generadas directamente y limpieza que tiene en cuenta una impresión en curso. El cambio de nombre modifica metadatos con una validación del códec y conserva los PNG.
- Importaciones PNG/JPEG/WebP: por encima de 16 millones de píxeles o 16.384 px por lado, rechazo antes de decodificar, en vez de reducir. El límite acumulado sigue en 32 millones de píxeles. Lectura de proyectos v1/v2 y escritura v2 conservadas.
- La versión 1.5.1 está publicada en GitHub. El estado actual de Chrome Web Store y su versión distribuida no están confirmados; deben comprobarse en el panel.

## Deutsch

- Im Bereich Dokument gilt die Quellenrichtlinie für Projekte und Exporte: Standard `sanitized` entfernt Abfrageparameter und Fragmente, `none` lässt Quellen weg und `full` behält sie bei. HTTP(S)-Zugangsdaten werden immer entfernt. Beim Speichern entfernte Quellen sind nicht wiederherstellbar; die Bibliothek exportiert immer mit `sanitized`, auch ältere Projekte.
- URL-Pfade, Bilder, Titel, Bildunterschriften und Datumsangaben können weiterhin vertraulich sein. Lokale, ausdrücklich aktivierte Diagnose ohne Telemetrie; Berechtigungen unverändert.
- Ein PNG-Abbild pro Bild für Exporte und Projekte; direkt erzeugte Bibliotheksvorschaubilder und Bereinigung unter Berücksichtigung laufender Druckvorgänge. Umbenennen ändert Metadaten mit einer Codec-Validierung und behält PNGs bei.
- PNG-/JPEG-/WebP-Importe: über 16 Millionen Pixel oder 16.384 px pro Seite vor dem Dekodieren ablehnen statt verkleinern. Gesamtlimit weiterhin 32 Millionen Pixel. Projekte v1/v2 bleiben lesbar, geschrieben wird v2.
- Version 1.5.1 ist auf GitHub veröffentlicht. Der aktuelle Chrome-Web-Store-Status und die ausgelieferte Version sind unbestätigt; im Dashboard prüfen.

---

# Scionos Capture 1.5.0

**Version du 14 novembre 2026 / Release dated November 14, 2026 / Versión del 14 de noviembre de 2026 / Version vom 14. November 2026.**

## Français

**Version 1.5.0.** Cette version livre le périmètre suivant.

- **Composition multi-images :** import de fichiers image locaux ou collage depuis le presse-papiers ; ajout, retrait et réordonnancement des images ; disposition verticale ou horizontale, espacement, fond, titres, légendes et étapes numérotées.
- **Exports et présentation :** PNG, JPEG, WebP, HTML, Markdown accompagné des images dans un ZIP, PDF et impression. Qualité d’image réglable pour les formats concernés ; réglages de marges, orientation, échelle et en-têtes/pieds de page avec titre, source, date et pagination, sous réserve des limites de taille.
- **Annotations éditables :** annotations individuellement éditables et `.scionos` v2 rétrocompatible v1, dont les annotations restent aplaties. À la sauvegarde, masques solides et rognages deviennent irréversibles ; les annotations touchées sont supprimées de manière conservative. À la sauvegarde après rognage, toutes les annotations antérieures sont aplaties pour préserver leur rendu et leur ordre.
- **Bibliothèque locale :** enregistrement explicite et durable, vignettes, recherche, renommage, duplication et suppression ; durée 0, 7, 30 ou 90 jours, quota de 64 à 1 024 Mio (256 Mio par défaut). Le choix 0 jour signifie sans expiration automatique.
- **Aide et version :** accès à l’aide plus visible et affichage du numéro de version réellement chargé.
- Le traitement reste local. Les fichiers exportés et projets sont conservés par l’utilisateur et peuvent contenir images, titres, légendes, sources et dates : vérifiez-les avant partage. Utilisez un masque solide pour les secrets.

## English

**Version 1.5.0.** This release delivers the following scope.

- **Multi-image composition:** import local image files or paste from the clipboard; add, remove, and reorder images; vertical or horizontal layout, spacing, background, titles, captions, and numbered steps.
- **Exports and presentation:** PNG, JPEG, WebP, HTML, Markdown with images in a ZIP, PDF, and printing. Adjustable image quality for the applicable formats; margins, orientation, scale, and headers/footers with title, source, date, and pagination, subject to size limits.
- **Editable annotations:** individually editable annotations and `.scionos` v2 backward compatible with v1, whose annotations remain flattened. On saving, solid masks and crops become irreversible; affected annotations are conservatively removed. When saving after a crop, all preceding annotations are flattened to preserve their appearance and order.
- **Local library:** explicitly saved durable projects, thumbnails, search, rename, duplicate and delete; retention 0, 7, 30 or 90 days, quota 64–1,024 MiB (default 256 MiB). 0 days means no automatic expiration.
- **Help and version:** more visible help access and display of the version actually loaded.
- Processing remains local. Users retain exported files and projects, which may contain images, titles, captions, sources, and dates: review them before sharing. Use a solid mask for secrets.

## Español

**Versión 1.5.0.** Esta versión entrega el siguiente alcance.

- **Composición de varias imágenes:** importar archivos de imagen locales o pegar desde el portapapeles; añadir, eliminar y reordenar imágenes; disposición vertical u horizontal, espaciado, fondo, títulos, leyendas y pasos numerados.
- **Exportación y presentación:** PNG, JPEG, WebP, HTML, Markdown con imágenes en un ZIP, PDF e impresión. Calidad ajustable en los formatos correspondientes; márgenes, orientación, escala y encabezados/pies con título, fuente, fecha y paginación, sujetos a límites de tamaño.
- **Anotaciones editables:** anotaciones editables individualmente y `.scionos` v2 compatible con v1, cuyas anotaciones permanecen aplanadas. Al guardar, las máscaras sólidas y los recortes son irreversibles; las anotaciones afectadas se eliminan de forma conservadora.
- **Biblioteca local:** guardado explícito y duradero, miniaturas, búsqueda, cambio de nombre, duplicación y eliminación; duración 0, 7, 30 o 90 días, cuota de 64 a 1.024 MiB (256 MiB por defecto). 0 días significa sin expiración automática.
- **Ayuda y versión:** acceso más visible a la ayuda y visualización de la versión realmente cargada.
- El procesamiento sigue siendo local. El usuario conserva archivos exportados y proyectos, que pueden contener imágenes, títulos, leyendas, fuentes y fechas: revísalos antes de compartirlos. Usa una máscara sólida para secretos.

## Deutsch

**Version 1.5.0.** Diese Version liefert den folgenden Umfang.

- **Komposition mehrerer Bilder:** lokale Bilddateien importieren oder aus der Zwischenablage einfügen; Bilder hinzufügen, entfernen und umordnen; vertikale oder horizontale Anordnung, Abstand, Hintergrund, Titel, Bildunterschriften und nummerierte Schritte.
- **Exporte und Darstellung:** PNG, JPEG, WebP, HTML, Markdown samt Bildern in einer ZIP-Datei, PDF und Drucken. Einstellbare Bildqualität für die entsprechenden Formate; Ränder, Ausrichtung, Skalierung und Kopf-/Fußzeilen mit Titel, Quelle, Datum und Seitennummerierung, innerhalb der Größenlimits.
- **Bearbeitbare Annotationen:** einzeln bearbeitbare Annotationen und `.scionos` v2, rückwärtskompatibel zu v1, dessen Annotationen zusammengeführt bleiben. Deckende Masken und Zuschnitte werden beim Speichern unumkehrbar angewendet; betroffene Annotationen werden konservativ entfernt.
- **Lokale Bibliothek:** ausdrückliches dauerhaftes Speichern, Vorschaubilder, Suche, Umbenennen, Duplizieren und Löschen; Aufbewahrung 0, 7, 30 oder 90 Tage, Kontingent 64–1.024 MiB (Standard 256 MiB). 0 Tage bedeutet keine automatische Ablaufzeit.
- **Hilfe und Version:** besser sichtbarer Hilfezugang und Anzeige der tatsächlich geladenen Version.
- Die Verarbeitung bleibt lokal. Benutzer bewahren exportierte Dateien und Projekte auf; sie können Bilder, Titel, Bildunterschriften, Quellen und Datumsangaben enthalten: vor dem Teilen prüfen. Geheimnisse deckend maskieren.

## Validation 1.5.0 / 1.5.0 validation status

Les contrôles automatisés et essais natifs associés à la publication sont consignés dans le dépôt ; la soumission au Chrome Web Store reste distincte de la release GitHub.

Automated checks and native trials for this release are recorded in the repository; Chrome Web Store submission remains separate from the GitHub release.

Las comprobaciones automatizadas y las pruebas nativas de esta versión constan en el repositorio; el envío a Chrome Web Store sigue siendo independiente de la release de GitHub.

Automatisierte Prüfungen und native Tests dieser Version sind im Repository dokumentiert; die Einreichung im Chrome Web Store bleibt von der GitHub-Veröffentlichung getrennt.

---

# Scionos Capture 1.4.0

**Version 1.4.0 — 2026-11-10.**

## Français

- **Élément au clic :** survolez un bloc, choisissez au besoin son parent ou son enfant, puis cliquez pour préparer la capture. La partie affichée est choisie par défaut ; le contenu entier est disponible pour les conteneurs réellement défilants.
- **Sélection ajustable :** après le tracé ou le choix d’un élément, ajustez les huit poignées ou les champs X/Y/largeur/hauteur, puis confirmez avec **Capturer**. Les flèches déplacent la sélection ou une poignée ; Maj augmente le pas de 1 à 10 pixels CSS. Échap annule.
- **Capture différée :** choisissez **Immédiat**, **3**, **5** ou **10 secondes**. Le délai est mémorisé localement. Il commence après confirmation pour les sélections et les éléments, dès le lancement pour la zone visible et la page entière. Le compte à rebours est annulable.
- **Fils dynamiques :** une sélection bornée tolère l’ajout de contenu en bas de page. Le correctif a été développé après reproduction sur X.com et vérifié par tests automatisés ; le fonctionnement après correction a été confirmé par l’utilisateur sur X.com, y compris après correction du bandeau cookies répété.
- Les cinq modes restent locaux, sans nouvelle permission ni transmission de capture. Le sélecteur ne parcourt pas l’intérieur des iframes ni les shadow roots fermés ; les contenus virtualisés peuvent rester incomplets. Le flou est visuel : utilisez un masque solide pour les secrets.

## English

**Version 1.4.0 — 2026-11-10.**

- **Element capture:** hover over a block, optionally choose its parent or child, then click to prepare the capture. The displayed portion is the default; entire content is available for genuinely scrollable containers.
- **Adjustable selection:** after drawing or choosing an element, adjust eight handles or the X/Y/width/height fields and confirm with **Capture**. Arrow keys move the selection or a handle; Shift changes the step from 1 to 10 CSS pixels. Escape cancels.
- **Delayed capture:** choose **Immediate**, **3**, **5**, or **10 seconds**. The preference is stored locally. The delay starts after confirmation for selections and elements, immediately after launch for visible-area and full-page captures. The countdown can be cancelled.
- **Dynamic feeds:** bounded selections tolerate content appended below the page. The fix follows reproduction on X.com and automated regression tests; the user confirmed operation on X.com after updating, including the repeated cookie-banner fix.
- All five modes remain local, without new permissions or screenshot transfer. The picker does not traverse iframe contents or closed shadow roots; virtualized content may remain incomplete. Blur is visual only: use a solid mask for secrets.

## Español

**Versión 1.4.0 — 2026-11-10.**

- **Captura de elementos:** pasa el cursor sobre un bloque, elige su padre o hijo si hace falta y haz clic para preparar la captura. La parte mostrada es la opción predeterminada; el contenido completo está disponible para contenedores realmente desplazables.
- **Selección ajustable:** tras dibujar o elegir un elemento, ajusta los ocho tiradores o los campos X/Y/ancho/alto y confirma con **Capturar**. Las flechas mueven la selección o un tirador; Mayús cambia el paso de 1 a 10 píxeles CSS. Escape cancela.
- **Captura diferida:** elige **Inmediato**, **3**, **5** o **10 segundos**. La preferencia se guarda localmente. El retardo comienza tras confirmar zonas y elementos, o al iniciar capturas visibles y completas. La cuenta atrás se puede cancelar.
- **Contenidos dinámicos:** las selecciones acotadas toleran contenido añadido al final de la página. La corrección se basa en una reproducción en X.com y pruebas automatizadas; el usuario confirmó el funcionamiento en X.com tras actualizar, incluida la corrección del aviso de cookies repetido.
- Los cinco modos siguen siendo locales, sin nuevos permisos ni transferencia de capturas. El selector no recorre iframes ni shadow roots cerrados; el contenido virtualizado puede quedar incompleto. El desenfoque es visual: usa una máscara sólida para secretos.

## Deutsch

**Version 1.4.0 — 2026-11-10.**

- **Elementaufnahme:** einen Block mit der Maus hervorheben, bei Bedarf das über- oder untergeordnete Element wählen und per Klick die Aufnahme vorbereiten. Standardmäßig wird der angezeigte Teil aufgenommen; der gesamte Inhalt ist für tatsächlich scrollbare Container verfügbar.
- **Anpassbare Auswahl:** nach dem Zeichnen oder der Elementwahl acht Griffe oder X/Y/Breite/Höhe anpassen und mit **Aufnehmen** bestätigen. Pfeiltasten verschieben die Auswahl oder einen Griff; Umschalt erhöht den Schritt von 1 auf 10 CSS-Pixel. Escape bricht ab.
- **Verzögerte Aufnahme:** **Sofort**, **3**, **5** oder **10 Sekunden** wählen. Die Einstellung wird lokal gespeichert. Bei Auswahl und Elementen beginnt die Verzögerung nach Bestätigung, bei sichtbarem Bereich und ganzer Seite beim Start. Der Countdown kann abgebrochen werden.
- **Dynamische Feeds:** begrenzte Auswahlen tolerieren am Seitenende hinzugefügten Inhalt. Die Korrektur basiert auf einer Reproduktion auf X.com und automatisierten Tests; der Nutzer bestätigte die Funktion auf X.com nach der Aktualisierung, einschließlich der Korrektur des wiederholten Cookie-Banners.
- Alle fünf Modi arbeiten lokal, ohne neue Berechtigungen oder Übertragung von Aufnahmen. Die Elementauswahl durchsucht weder iframe-Inhalte noch geschlossene Shadow Roots; virtualisierte Inhalte können unvollständig bleiben. Unschärfe ist nur visuell: Geheimnisse deckend maskieren.

## Validation / Validation status

Les tests automatisés et essais natifs sont consignés séparément lors de la préparation du livrable final. La soumission au Chrome Web Store reste distincte de la release GitHub.

Automated checks and native browser trials are recorded separately when the final local package is prepared. Chrome Web Store submission is separate from the GitHub release.

Archive locale / Local archive : `scionos-capture-v1.5.0.zip` · SHA-256 : `scionos-capture-v1.5.0.zip.sha256`.
