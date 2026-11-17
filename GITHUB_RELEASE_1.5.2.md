# Scionos Capture 1.5.2

## Français

Cette version corrige les interruptions de déplacement des annotations, reconstruit les miniatures à la réouverture des projets et conserve l’état non enregistré après un export portable. Les rapports HTML appliquent la politique de sources dans tous leurs chemins et retirent systématiquement les identifiants HTTP(S). L’impression/PDF respecte les budgets cumulés de 32 millions de pixels, 128 Mio de blobs et 200 pages.

Les outils de test sont @axe-core/playwright 4.14.0, @playwright/test 1.65.1, fake-indexeddb 6.2.8 et PDF.js 6.5.438. Les outils majeurs de lint et validation ont également été mis à jour : @eslint/js 10.0.1, eslint 10.15.0 et html-validate 11.21.1. Le prérequis de développement est Node.js ^22.22.0 ou >=24.8.0 ; la CI valide Node 22.22.0 et 24.8.0. Le sélecteur de langue inclut son code visible dans son nom accessible.

Validation locale : 133 tests unitaires, 126 tests navigateur, cinq modes de capture dans Chrome et Edge, performances générales et dix scénarios PDF réussis. Audit npm : zéro vulnérabilité. Archive de 35 fichiers ; SHA-256 : `d20d607afc0bdb4e8d942a04b770803ffa0215d311b657436c5388c023dd5d98`.

Téléchargez le ZIP et son empreinte joints. Le traitement reste local. Le statut et la version distribuée du Chrome Web Store sont distincts ; aucune soumission Store n’est attestée par cette release.

## English

This release fixes interrupted annotation drags, rebuilds thumbnails when reopening projects and preserves the unsaved state after a portable export. HTML reports consistently apply source policy and remove HTTP(S) credentials. Print/PDF enforces cumulative limits of 32 million pixels, 128 MiB of blobs and 200 pages.

Test tools are @axe-core/playwright 4.14.0, @playwright/test 1.65.1, fake-indexeddb 6.2.8 and PDF.js 6.5.438. Major lint and validation tools were also upgraded: @eslint/js 10.0.1, eslint 10.15.0 and html-validate 11.21.1. Development requires Node.js ^22.22.0 or >=24.8.0; CI checks Node 22.22.0 and 24.8.0. The language selector’s accessible name includes its visible code.

Local validation passed: 133 unit tests, 126 browser tests, all five capture modes in Chrome and Edge, general performance runs and ten PDF scenarios. npm audit: zero vulnerabilities. The archive contains 35 files; SHA-256: `d20d607afc0bdb4e8d942a04b770803ffa0215d311b657436c5388c023dd5d98`.

Download the attached ZIP and checksum. Processing remains local. Chrome Web Store status and distribution are separate; this release does not attest to a Store submission.

## Español

Esta versión corrige los arrastres interrumpidos de anotaciones, reconstruye las miniaturas al reabrir proyectos y conserva el estado sin guardar tras exportar un proyecto portátil. Los informes HTML aplican siempre la política de fuentes y eliminan las credenciales HTTP(S). La impresión/PDF limita el total a 32 millones de píxeles, 128 MiB de blobs y 200 páginas.

Las herramientas de prueba son @axe-core/playwright 4.14.0, @playwright/test 1.65.1, fake-indexeddb 6.2.8 y PDF.js 6.5.438. También se actualizaron las herramientas principales de lint y validación: @eslint/js 10.0.1, eslint 10.15.0 y html-validate 11.21.1. Se requiere Node.js ^22.22.0 o >=24.8.0; la CI comprueba Node 22.22.0 y 24.8.0. El nombre accesible del selector de idioma incluye su código visible.

Validación local superada: 133 pruebas unitarias, 126 pruebas de navegador, cinco modos en Chrome y Edge, rendimiento general y diez escenarios PDF. Auditoría npm sin vulnerabilidades. Archivo de 35 elementos; SHA-256: `d20d607afc0bdb4e8d942a04b770803ffa0215d311b657436c5388c023dd5d98`.

El ZIP y su suma están adjuntos. El procesamiento sigue siendo local. El estado de Chrome Web Store es independiente; esta publicación no acredita un envío a la tienda.

## Deutsch

Diese Version korrigiert unterbrochene Annotationsbewegungen, erstellt Vorschaubilder beim erneuten Öffnen von Projekten und behält nach einem portablen Export den Status ungespeicherter Änderungen bei. HTML-Berichte wenden die Quellenrichtlinie durchgehend an und entfernen HTTP(S)-Zugangsdaten. Drucken/PDF begrenzt die Summe auf 32 Millionen Pixel, 128 MiB Blobs und 200 Seiten.

Testwerkzeuge: @axe-core/playwright 4.14.0, @playwright/test 1.65.1, fake-indexeddb 6.2.8 und PDF.js 6.5.438. Auch die Hauptversionen der Lint- und Validierungswerkzeuge wurden aktualisiert: @eslint/js 10.0.1, eslint 10.15.0 und html-validate 11.21.1. Erforderlich ist Node.js ^22.22.0 oder >=24.8.0; die CI prüft Node 22.22.0 und 24.8.0. Der zugängliche Name der Sprachauswahl enthält den sichtbaren Sprachcode.

Lokale Prüfung bestanden: 133 Unit-Tests, 126 Browsertests, fünf Aufnahmemodi in Chrome und Edge, allgemeine Leistungsmessungen und zehn PDF-Szenarien. Keine npm-Sicherheitslücken. Archiv mit 35 Dateien; SHA-256: `d20d607afc0bdb4e8d942a04b770803ffa0215d311b657436c5388c023dd5d98`.

ZIP und Prüfsumme sind angehängt. Die Verarbeitung bleibt lokal. Der Chrome-Web-Store-Status ist unabhängig; dieses Release bestätigt keine Store-Einreichung.
