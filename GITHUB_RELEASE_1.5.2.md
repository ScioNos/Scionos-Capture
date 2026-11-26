# Scionos Capture 1.5.2

## Français

**Candidate Store 1.5.2 corrigée localement.** La release GitHub existante conserve son tag et son archive antérieure ; elle ne contient pas ces nouvelles corrections. Aucune soumission Store effectuée. Voir [le bilan de préparation](STORE_READINESS_1.5.2.md).

- Sélections : suivi du pointeur actif, rejet des pointeurs secondaires et nettoyage des gestes interrompus.
- Capture : restauration des éléments masqués même en cas d’exception pendant leur préparation.
- Bibliothèque : suppression globale atomique, avec rejet des listes périmées et annulation intégrale en cas d’échec.

Validation de cette candidate : 136 tests unitaires et 136 tests navigateur réussis, cinq modes natifs dans Chrome et Edge, trois répétitions de performance et dix scénarios PDF. Détails, limites et empreinte finale : [préparation Store](STORE_READINESS_1.5.2.md).

Cette version corrige les interruptions de déplacement des annotations, reconstruit les miniatures à la réouverture des projets et conserve l’état non enregistré après un export portable. Les rapports HTML appliquent la politique de sources dans tous leurs chemins et retirent systématiquement les identifiants HTTP(S). L’impression/PDF respecte les budgets cumulés de 32 millions de pixels, 128 Mio de blobs et 200 pages.

Les outils de test sont @axe-core/playwright 4.14.0, @playwright/test 1.65.1, fake-indexeddb 6.2.8 et PDF.js 6.5.438. Les outils majeurs de lint et validation ont également été mis à jour : @eslint/js 10.0.1, eslint 10.15.0 et html-validate 11.21.1. Le prérequis de développement est Node.js ^22.22.0 ou >=24.8.0 ; la CI valide Node 22.22.0 et 24.8.0. Le sélecteur de langue inclut son code visible dans son nom accessible.


Le ZIP local corrigé et son empreinte sont référencés dans le bilan Store. Le ZIP déjà joint à GitHub reste antérieur à ces corrections.

## English

**Locally corrected Store candidate 1.5.2.** The existing GitHub release keeps its tag and earlier archive; it does not contain these new fixes. No Store submission performed. See [the readiness report](STORE_READINESS_1.5.2.md).

- Selections: track the active pointer, ignore secondary pointers and clean up interrupted gestures.
- Capture: restore hidden elements even when their preparation throws.
- Library: atomic bulk deletion, rejecting stale snapshots and rolling back the entire operation on failure.

Candidate validation: 136 unit tests and 136 browser tests passed, five native modes in Chrome and Edge, three performance repetitions and ten PDF scenarios. Details, limits and final checksum: [Store readiness](STORE_READINESS_1.5.2.md).

This release fixes interrupted annotation drags, rebuilds thumbnails when reopening projects and preserves the unsaved state after a portable export. HTML reports consistently apply source policy and remove HTTP(S) credentials. Print/PDF enforces cumulative limits of 32 million pixels, 128 MiB of blobs and 200 pages.

Test tools are @axe-core/playwright 4.14.0, @playwright/test 1.65.1, fake-indexeddb 6.2.8 and PDF.js 6.5.438. Major lint and validation tools were also upgraded: @eslint/js 10.0.1, eslint 10.15.0 and html-validate 11.21.1. Development requires Node.js ^22.22.0 or >=24.8.0; CI checks Node 22.22.0 and 24.8.0. The language selector’s accessible name includes its visible code.


The corrected local ZIP and checksum are referenced in the Store report. The ZIP already attached on GitHub predates these fixes.

## Español

**Candidata 1.5.2 corregida localmente para la tienda.** La publicación GitHub mantiene su etiqueta y archivo anterior; no contiene estas nuevas correcciones. No se ha enviado a la tienda. Véase [el informe de preparación](STORE_READINESS_1.5.2.md).

- Selecciones: seguimiento del puntero activo, exclusión de punteros secundarios y limpieza de gestos interrumpidos.
- Captura: restauración de elementos ocultos incluso si falla su preparación.
- Biblioteca: eliminación global atómica, con rechazo de listas obsoletas y reversión completa en caso de error.

Validación de esta candidata: 136 pruebas unitarias y 136 pruebas de navegador superadas, cinco modos nativos en Chrome y Edge, tres repeticiones de rendimiento y diez escenarios PDF. Detalles, límites y suma final: [preparación para la tienda](STORE_READINESS_1.5.2.md).

Esta versión corrige los arrastres interrumpidos de anotaciones, reconstruye las miniaturas al reabrir proyectos y conserva el estado sin guardar tras exportar un proyecto portátil. Los informes HTML aplican siempre la política de fuentes y eliminan las credenciales HTTP(S). La impresión/PDF limita el total a 32 millones de píxeles, 128 MiB de blobs y 200 páginas.

Las herramientas de prueba son @axe-core/playwright 4.14.0, @playwright/test 1.65.1, fake-indexeddb 6.2.8 y PDF.js 6.5.438. También se actualizaron las herramientas principales de lint y validación: @eslint/js 10.0.1, eslint 10.15.0 y html-validate 11.21.1. Se requiere Node.js ^22.22.0 o >=24.8.0; la CI comprueba Node 22.22.0 y 24.8.0. El nombre accesible del selector de idioma incluye su código visible.


El ZIP local corregido y su suma se indican en el informe. El ZIP de GitHub es anterior a estas correcciones.

## Deutsch

**Lokal korrigierter Store-Kandidat 1.5.2.** Das bestehende GitHub-Release behält Tag und bisheriges Archiv; diese neuen Korrekturen sind darin nicht enthalten. Keine Store-Einreichung erfolgt. Siehe [Prüfbericht](STORE_READINESS_1.5.2.md).

- Auswahl: aktiven Zeiger verfolgen, weitere Zeiger ignorieren und unterbrochene Gesten bereinigen.
- Aufnahme: ausgeblendete Elemente auch bei Fehlern während der Vorbereitung wiederherstellen.
- Bibliothek: atomare Gesamtlöschung mit Ablehnung veralteter Listen und vollständigem Rollback bei Fehlern.

Prüfung dieses Kandidaten: 136 Unit-Tests und 136 Browsertests bestanden, fünf native Modi in Chrome und Edge, drei Leistungswiederholungen und zehn PDF-Szenarien. Details, Grenzen und endgültige Prüfsumme: [Store-Vorbereitung](STORE_READINESS_1.5.2.md).

Diese Version korrigiert unterbrochene Annotationsbewegungen, erstellt Vorschaubilder beim erneuten Öffnen von Projekten und behält nach einem portablen Export den Status ungespeicherter Änderungen bei. HTML-Berichte wenden die Quellenrichtlinie durchgehend an und entfernen HTTP(S)-Zugangsdaten. Drucken/PDF begrenzt die Summe auf 32 Millionen Pixel, 128 MiB Blobs und 200 Seiten.

Testwerkzeuge: @axe-core/playwright 4.14.0, @playwright/test 1.65.1, fake-indexeddb 6.2.8 und PDF.js 6.5.438. Auch die Hauptversionen der Lint- und Validierungswerkzeuge wurden aktualisiert: @eslint/js 10.0.1, eslint 10.15.0 und html-validate 11.21.1. Erforderlich ist Node.js ^22.22.0 oder >=24.8.0; die CI prüft Node 22.22.0 und 24.8.0. Der zugängliche Name der Sprachauswahl enthält den sichtbaren Sprachcode.


Das korrigierte lokale ZIP und die Prüfsumme stehen im Bericht. Das bestehende GitHub-ZIP enthält diese Korrekturen noch nicht.
