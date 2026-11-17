// Accessible local screenshot editor - Scionos Capture
document.addEventListener('DOMContentLoaded', async () => {
  const canvas = document.getElementById('main-canvas');
  const context = canvas.getContext('2d');
  const container = document.getElementById('canvas-container');
  const workspace = document.getElementById('workspace');
  const emptyState = document.getElementById('empty-state');
  const pageTitle = document.getElementById('page-title');
  const pageMeta = document.getElementById('page-meta');
  const notice = document.getElementById('capture-notice');
  const toast = document.getElementById('toast');
  const toolButtons = Array.from(document.querySelectorAll('[data-tool]'));
  const drawControls = document.getElementById('draw-controls');
  const arrowControls = document.getElementById('arrow-controls');
  const arrowSize = document.getElementById('arrow-size');
  const arrowColor = document.getElementById('arrow-color');
  const shapeControls = document.getElementById('shape-controls');
  const shapeType = document.getElementById('shape-type');
  const shapeFillMode = document.getElementById('shape-fill-mode');
  const shapeSize = document.getElementById('shape-size');
  const shapeSizeField = document.getElementById('shape-size-field');
  const shapeColor = document.getElementById('shape-color');
  const textControls = document.getElementById('text-controls');
  const textSize = document.getElementById('text-size');
  const textColor = document.getElementById('text-color');
  const textBgColor = document.getElementById('text-bg-color');
  const textInputOverlay = document.getElementById('text-input-overlay');
  const stepControls = document.getElementById('step-controls');
  const stepCounterBadge = document.getElementById('step-counter-badge');
  const stepColor = document.getElementById('step-color');
  const stepSize = document.getElementById('step-size');
  const btnStepReset = document.getElementById('btn-step-reset');
  const censorControls = document.getElementById('censor-controls');
  const censorType = document.getElementById('censor-type');
  const censorShape = document.getElementById('censor-shape');
  const censorSize = document.getElementById('censor-size');
  const censorSizeField = document.getElementById('censor-size-field');
  const censorColor = document.getElementById('censor-color');
  const censorColorField = document.getElementById('censor-color-field');
  const blurIntensity = document.getElementById('blur-intensity');
  const blurIntensityValue = document.getElementById('blur-intensity-val');
  const blurField = document.getElementById('blur-field');
  const blurWarning = document.getElementById('blur-warning');
  const drawColor = document.getElementById('draw-color');
  const drawSize = document.getElementById('draw-size');
  const btnHelp = document.getElementById('btn-help');
  const undoButton = document.getElementById('btn-undo');
  const redoButton = document.getElementById('btn-redo');
  const downloadButton = document.getElementById('btn-download');
  const htmlButton = document.getElementById('btn-html');
  const printButton = document.getElementById('btn-pdf');
  const copyButton = document.getElementById('btn-copy');
  const zoomInButton = document.getElementById('zoom-in');
  const zoomOutButton = document.getElementById('zoom-out');
  const zoomResetButton = document.getElementById('zoom-reset');
  const zoomText = document.getElementById('zoom-text');
  const geometryPanel = document.getElementById('geometry-panel');
  const geometryApply = document.getElementById('geometry-apply');
  const geometryCancel = document.getElementById('geometry-cancel');
  const geometryInputs = {
    x: document.getElementById('geometry-x'),
    y: document.getElementById('geometry-y'),
    width: document.getElementById('geometry-width'),
    height: document.getElementById('geometry-height')
  };

  const MAX_OPERATIONS = 100;
  const MIN_ZOOM = 0.2;
  const MAX_ZOOM = 3;
  let currentTool = 'select';
  let currentZoom = 1;
  let currentStepNumber = 1;
  let historyRevision = 0;
  let historyConsolidation = null;
  let pendingTextPoint = null;
  let activeTextBlocks = [];
  let baseImage = null;
  let committedSurface = null;
  let operations = [];
  let redoOperations = [];
  let draftOperation = null;
  let activePointerId = null;
  let renderScheduled = false;
  let captureRecord = null;
  let toastTimer = null;
  let selectedAnnotation = -1;
  let annotationDrag = null;
  let annotationUndo = [];
  let annotationRedo = [];
  // Each opened document owns its identity, revision and ordered save queue.
  let librarySession = { id: null, revision: null, saves: Promise.resolve() };

  const compositionItems = [];
  const compositionUndoStack = [];
  const compositionRedoStack = [];
  function compositionHistoryState() {
    return { settings: { ...compositionSettings }, items: compositionItems.map(item => ({ id: item.id, title: item.title, caption: item.caption })) };
  }
  function rememberComposition() {
    const state = compositionHistoryState();
    if (JSON.stringify(compositionUndoStack[compositionUndoStack.length - 1]) !== JSON.stringify(state)) compositionUndoStack.push(state);
    if (compositionUndoStack.length > 50) compositionUndoStack.shift();
    compositionRedoStack.length = 0;
  }
  function resetCompositionHistory() { compositionUndoStack.length = 0; compositionRedoStack.length = 0; }
  function restoreCompositionHistory(from, to) {
    if (!from.length || !allowDocumentAction()) return;
    to.push(compositionHistoryState());
    const state = from.pop();
    const ordered = state.items.map(entry => compositionItems.find(item => item.id === entry.id));
    if (ordered.some(item => !item)) { resetCompositionHistory(); return; }
    compositionItems.splice(0, compositionItems.length, ...ordered);
    state.items.forEach((entry, index) => { compositionItems[index].title = entry.title; compositionItems[index].caption = entry.caption; });
    Object.assign(compositionSettings, state.settings);
    for (const key of ['title', 'direction', 'gap', 'padding', 'background', 'numbered']) {
      const input = byId(`composition-${key}`);
      if (key === 'numbered') input.checked = compositionSettings[key];
      else input.value = compositionSettings[key];
    }
    markDocumentDirty();
    refreshComposition();
  }
  let activeItemId = null;
  let documentDirty = false;
  let documentRevision = 0;
  let compositionBusy = false;
  let thumbnailTimer = null;
  const byId = id => document.getElementById(id);
  const compositionSettings = { direction: 'vertical', gap: 0, padding: 0, background: '#ffffff', title: '', numbered: false };
  const copyLabels = {
    fr: { document: 'Document', import: 'Importer des images', open: 'Ouvrir un projet', save: 'Exporter le projet', documentTitle: 'Titre du document', images: 'Images', up: 'Monter', down: 'Descendre', remove: 'Supprimer', itemTitle: 'Titre de l’image', caption: 'Légende', layout: 'Composition', direction: 'Disposition', vertical: 'Verticale', horizontal: 'Horizontale', gap: 'Espacement (px)', padding: 'Marge (px)', background: 'Fond', numbered: 'Numéroter les images', preview: 'Aperçu de la composition', export: 'Exporter', format: 'Format', quality: 'Qualité (%)', pdfSettings: 'Présentation PDF', paper: 'Papier', orientation: 'Orientation', portrait: 'Portrait', landscape: 'Paysage', pdfMargin: 'Marges (mm)', scale: 'Échelle (%)', header: 'En-tête : titre, source et date', footer: 'Pied de page : pagination', cancel: 'Annuler', empty: 'Importez des images PNG, JPEG ou WebP, collez une image, ou ouvrez un projet .scionos pour commencer.', pending: 'Validez ou annulez la modification en cours avant de continuer.', limit: 'Maximum 30 images, 48 Mio par image et 128 Mio au total.', replace: 'Remplacer le document ? Les modifications non enregistrées seront perdues.', saved: 'Projet enregistré dans la bibliothèque.', projectExportRequested: 'Téléchargement du projet demandé ; vérifiez que le fichier a bien été conservé.', failure: 'Impossible de terminer : ', image: 'Image', loading: 'Traitement en cours…', unsupported: 'Choisissez uniquement des images PNG, JPEG ou WebP.', reduced: 'Image exportée à taille réduite pour respecter les limites du navigateur.', done: 'Export terminé.' },
    en: { document: 'Document', import: 'Import images', open: 'Open project', save: 'Export project', documentTitle: 'Document title', images: 'Images', up: 'Move up', down: 'Move down', remove: 'Remove', itemTitle: 'Image title', caption: 'Caption', layout: 'Composition', direction: 'Layout', vertical: 'Vertical', horizontal: 'Horizontal', gap: 'Spacing (px)', padding: 'Margin (px)', background: 'Background', numbered: 'Number images', preview: 'Composition preview', export: 'Export', format: 'Format', quality: 'Quality (%)', pdfSettings: 'PDF layout', paper: 'Paper', orientation: 'Orientation', portrait: 'Portrait', landscape: 'Landscape', pdfMargin: 'Margins (mm)', scale: 'Scale (%)', header: 'Header: title, source and date', footer: 'Footer: page numbers', cancel: 'Cancel', empty: 'Import PNG, JPEG or WebP images, paste an image, or open a .scionos project to begin.', pending: 'Apply or cancel the pending edit before continuing.', limit: 'Maximum 30 images, 48 MiB per image and 128 MiB total.', replace: 'Replace this document? Unsaved changes will be lost.', saved: 'Project saved to the library.', projectExportRequested: 'Project download requested; check that the file was saved.', failure: 'Unable to complete: ', image: 'Image', loading: 'Processing…', unsupported: 'Choose PNG, JPEG or WebP images only.', reduced: 'The exported image was reduced to respect browser limits.', done: 'Export complete.' },
    es: { document: 'Documento', import: 'Importar imágenes', open: 'Abrir proyecto', save: 'Exportar proyecto', documentTitle: 'Título del documento', images: 'Imágenes', up: 'Subir', down: 'Bajar', remove: 'Eliminar', itemTitle: 'Título de la imagen', caption: 'Leyenda', layout: 'Composición', direction: 'Disposición', vertical: 'Vertical', horizontal: 'Horizontal', gap: 'Espaciado (px)', padding: 'Margen (px)', background: 'Fondo', numbered: 'Numerar imágenes', preview: 'Vista previa', export: 'Exportar', format: 'Formato', quality: 'Calidad (%)', pdfSettings: 'Presentación PDF', paper: 'Papel', orientation: 'Orientación', portrait: 'Vertical', landscape: 'Horizontal', pdfMargin: 'Márgenes (mm)', scale: 'Escala (%)', header: 'Encabezado: título, fuente y fecha', footer: 'Pie: número de página', cancel: 'Cancelar', empty: 'Importa imágenes PNG, JPEG o WebP, pega una imagen o abre un proyecto .scionos.', pending: 'Aplica o cancela la edición antes de continuar.', limit: 'Máximo 30 imágenes, 48 MiB por imagen y 128 MiB en total.', replace: '¿Reemplazar el documento? Se perderán los cambios sin guardar.', saved: 'Proyecto guardado en la biblioteca.', projectExportRequested: 'Descarga del proyecto solicitada; comprueba que el archivo se haya guardado.', failure: 'No se pudo completar: ', image: 'Imagen', loading: 'Procesando…', unsupported: 'Elige imágenes PNG, JPEG o WebP.', reduced: 'La imagen exportada se redujo para respetar los límites del navegador.', done: 'Exportación completada.' },
    de: { document: 'Dokument', import: 'Bilder importieren', open: 'Projekt öffnen', save: 'Projekt exportieren', documentTitle: 'Dokumenttitel', images: 'Bilder', up: 'Nach oben', down: 'Nach unten', remove: 'Entfernen', itemTitle: 'Bildtitel', caption: 'Bildunterschrift', layout: 'Zusammenstellung', direction: 'Anordnung', vertical: 'Vertikal', horizontal: 'Horizontal', gap: 'Abstand (px)', padding: 'Rand (px)', background: 'Hintergrund', numbered: 'Bilder nummerieren', preview: 'Vorschau', export: 'Exportieren', format: 'Format', quality: 'Qualität (%)', pdfSettings: 'PDF-Layout', paper: 'Papier', orientation: 'Ausrichtung', portrait: 'Hochformat', landscape: 'Querformat', pdfMargin: 'Ränder (mm)', scale: 'Maßstab (%)', header: 'Kopfzeile: Titel, Quelle und Datum', footer: 'Fußzeile: Seitenzahlen', cancel: 'Abbrechen', empty: 'PNG-, JPEG- oder WebP-Bilder importieren, ein Bild einfügen oder ein .scionos-Projekt öffnen.', pending: 'Die laufende Änderung zuerst anwenden oder abbrechen.', limit: 'Höchstens 30 Bilder, 48 MiB pro Bild und 128 MiB insgesamt.', replace: 'Dokument ersetzen? Nicht gespeicherte Änderungen gehen verloren.', saved: 'Projekt in der Bibliothek gespeichert.', projectExportRequested: 'Projektdownload angefordert; bitte prüfen, ob die Datei gespeichert wurde.', failure: 'Vorgang fehlgeschlagen: ', image: 'Bild', loading: 'Verarbeitung…', unsupported: 'Nur PNG-, JPEG- oder WebP-Bilder auswählen.', reduced: 'Das exportierte Bild wurde wegen der Browsergrenzen verkleinert.', done: 'Export abgeschlossen.' }
  };
  const extraLabels = { fr: { fit: 'Ajuster à la largeur', source: 'Source', date: 'Date', pagination: 'Pagination' }, en: { fit: 'Fit to width', source: 'Source', date: 'Date', pagination: 'Page numbers' }, es: { fit: 'Ajustar al ancho', source: 'Fuente', date: 'Fecha', pagination: 'Paginación' }, de: { fit: 'An Breite anpassen', source: 'Quelle', date: 'Datum', pagination: 'Seitennummern' } };
  const projectLabels = {
    fr: { projectNotice: 'Le projet conserve les pixels et la composition. Les annotations sont aplaties ; leur historique n’est pas conservé après réouverture.', reduceBefore: 'La composition dépasse les limites d’une image exportable. Elle sera réduite de {from} à {to} pixels. Continuer ?', compositionUndo: 'Annuler la composition', compositionRedo: 'Rétablir la composition' },
    en: { projectNotice: 'The project saves pixels and composition. Annotations are flattened; their history is not kept after reopening.', reduceBefore: 'The composition exceeds exportable image limits. It will be reduced from {from} to {to} pixels. Continue?', compositionUndo: 'Undo composition', compositionRedo: 'Redo composition' },
    es: { projectNotice: 'El proyecto guarda píxeles y composición. Las anotaciones se aplanan; su historial no se conserva al reabrir.', reduceBefore: 'La composición supera los límites de imagen. Se reducirá de {from} a {to} píxeles. ¿Continuar?', compositionUndo: 'Deshacer composición', compositionRedo: 'Rehacer composición' },
    de: { projectNotice: 'Das Projekt speichert Pixel und Zusammenstellung. Anmerkungen werden eingebrannt; ihr Verlauf bleibt nach erneutem Öffnen nicht erhalten.', reduceBefore: 'Die Zusammenstellung überschreitet die Bildgrenzen. Sie wird von {from} auf {to} Pixel verkleinert. Fortfahren?', compositionUndo: 'Zusammenstellung rückgängig', compositionRedo: 'Zusammenstellung wiederholen' }
  };
  const historyLabels = { fr: 'L’ajout et la suppression ne sont pas annulables et réinitialisent l’historique de composition.', en: 'Adding and removing images cannot be undone and resets composition history.', es: 'Añadir y eliminar imágenes no se puede deshacer y reinicia el historial de composición.', de: 'Hinzufügen und Entfernen sind nicht rückgängig zu machen und setzen den Zusammenstellungsverlauf zurück.' };
  const sharingLabels = {
    fr: { sourcePolicy: 'Sources et liens enregistrés', sourceSanitized: 'Liens sans paramètres ni fragments', sourceNone: 'Exclure les sources et liens', sourceFull: 'URL complètes', sourceHelp: 'S’applique aux projets et exports. Les chemins, titres, légendes et dates peuvent rester sensibles. Les informations retirées d’un projet enregistré ne sont pas récupérables.', imageDimensions: 'Image invalide ou trop grande : maximum 16 millions de pixels et 16 384 pixels par côté. Réduisez-la avant import.' },
    en: { sourcePolicy: 'Saved sources and links', sourceSanitized: 'Links without query parameters or fragments', sourceNone: 'Exclude sources and links', sourceFull: 'Full URLs', sourceHelp: 'Applies to projects and exports. Paths, titles, captions and dates can still be sensitive. Information removed from a saved project cannot be recovered.', imageDimensions: 'Invalid or oversized image: maximum 16 million pixels and 16,384 pixels per side. Resize it before importing.' },
    es: { sourcePolicy: 'Fuentes y enlaces guardados', sourceSanitized: 'Enlaces sin parámetros ni fragmentos', sourceNone: 'Excluir fuentes y enlaces', sourceFull: 'URL completas', sourceHelp: 'Se aplica a proyectos y exportaciones. Rutas, títulos, leyendas y fechas pueden ser sensibles. La información eliminada de un proyecto guardado no se recupera.', imageDimensions: 'Imagen no válida o demasiado grande: máximo 16 millones de píxeles y 16.384 por lado. Redúcela antes de importarla.' },
    de: { sourcePolicy: 'Gespeicherte Quellen und Links', sourceSanitized: 'Links ohne Abfrageparameter und Fragmente', sourceNone: 'Quellen und Links ausschließen', sourceFull: 'Vollständige URLs', sourceHelp: 'Gilt für Projekte und Exporte. Pfade, Titel, Beschriftungen und Daten können weiterhin sensibel sein. Aus einem gespeicherten Projekt entfernte Angaben sind nicht wiederherstellbar.', imageDimensions: 'Ungültiges oder zu großes Bild: höchstens 16 Millionen Pixel und 16.384 Pixel pro Seite. Vor dem Import verkleinern.' }
  };
  const memoryLabels = { fr: 'La composition dépasse la limite mémoire de 32 millions de pixels. Réduisez les images ou retirez-en.', en: 'The composition exceeds the 32-million-pixel memory limit. Reduce or remove images.', es: 'La composición supera el límite de memoria de 32 millones de píxeles. Reduce o elimina imágenes.', de: 'Die Zusammenstellung überschreitet die Speichergrenze von 32 Millionen Pixeln. Bilder verkleinern oder entfernen.' };
  const compositionText = key => key === 'historyNotice' ? (historyLabels[ScionosI18n.language] || historyLabels.en) : key === 'memoryLimit' ? (memoryLabels[ScionosI18n.language] || memoryLabels.en) : (sharingLabels[ScionosI18n.language] || sharingLabels.en)[key] || (projectLabels[ScionosI18n.language] || projectLabels.en)[key] || (extraLabels[ScionosI18n.language] || extraLabels.en)[key] || (copyLabels[ScionosI18n.language] || copyLabels.en)[key] || key;

  function markDocumentDirty() {
    documentDirty = true;
    documentRevision += 1;
    clearTimeout(thumbnailTimer);
    thumbnailTimer = setTimeout(() => { persistActiveItem(); refreshComposition(); }, 100);
  }

  function hasPendingEdit() { return Boolean(draftOperation || pendingTextPoint); }

  function finishAnnotationDrag(pointerId, { release = true } = {}) {
    const drag = annotationDrag;
    if (!drag || pointerId !== drag.pointerId) return false;
    annotationDrag = null;
    if (release && canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId);
    return true;
  }

  function allowDocumentAction() {
    if (annotationDrag) { finishAnnotationDrag(annotationDrag.pointerId); showToast(compositionText('pending'), true); return false; }
    if (hasPendingEdit()) { showToast(compositionText('pending'), true); return false; }
    if (compositionBusy || historyConsolidation) { showToast(compositionText('loading')); return false; }
    return true;
  }

  function persistActiveItem() {
    const item = compositionItems.find(entry => entry.id === activeItemId);
    if (!item) return;
    Object.assign(item, { baseImage, operations, redoOperations, annotationUndo, annotationRedo, activeTextBlocks, committedSurface, captureRecord, currentStepNumber, historyRevision });
    updateItemThumbnail(item);
  }

  function selectCompositionItem(id) {
    if (id !== activeItemId && !allowDocumentAction()) return false;
    if (id !== activeItemId && annotationDrag) finishAnnotationDrag(annotationDrag.pointerId);
    persistActiveItem();
    const item = compositionItems.find(entry => entry.id === id);
    activeItemId = item?.id || null;
    baseImage = item?.baseImage || null;
    operations = item?.operations || [];
    redoOperations = item?.redoOperations || [];
    annotationUndo = item?.annotationUndo || [];
    annotationRedo = item?.annotationRedo || [];
    selectedAnnotation = -1;
    activeTextBlocks = item?.activeTextBlocks || [];
    committedSurface = item?.committedSurface || null;
    captureRecord = item?.captureRecord || null;
    currentStepNumber = item?.currentStepNumber || 1;
    historyRevision = item?.historyRevision || 0;
    container.hidden = !item;
    emptyState.hidden = Boolean(item);
    emptyState.textContent = compositionText('empty');
    notice.textContent = '';
    if (item) { renderCanvas(); fitToScreen(); updateRecordMetadata(); updateCaptureNotice(); }
    else { pageTitle.textContent = compositionSettings.title || 'Scionos Capture'; pageMeta.textContent = ''; }
    setEditorReady(Boolean(item));
    updateHistoryButtons();
    updateStepBadge();
    refreshComposition();
    return true;
  }

  function refreshComposition() {
    const list = byId('composition-items');
    const selected = compositionItems.find(item => item.id === activeItemId);
    list.replaceChildren();
    compositionItems.forEach((item, index) => {
      const li = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-pressed', String(item === selected));
      const image = document.createElement('img');
      image.src = item.thumbnail || '';
      image.alt = '';
      const label = document.createElement('span');
      label.textContent = `${index + 1}. ${item.title || compositionText('image')}`;
      button.append(image, label);
      button.addEventListener('click', () => selectCompositionItem(item.id));
      li.append(button);
      list.append(li);
    });
    const index = compositionItems.indexOf(selected);
    byId('composition-count').textContent = `${compositionItems.length} / 30`;
    byId('item-up').disabled = index <= 0;
    byId('item-down').disabled = index < 0 || index >= compositionItems.length - 1;
    byId('item-remove').disabled = !selected;
    byId('btn-save-project').disabled = !compositionItems.length || compositionBusy;
    byId('btn-save-library').disabled = !compositionItems.length || compositionBusy;
    byId('composition-undo').disabled = !compositionUndoStack.length;
    byId('composition-redo').disabled = !compositionRedoStack.length;
    for (const name of ['title', 'caption']) {
      const input = byId(`item-${name}`);
      input.disabled = !selected;
      if (document.activeElement !== input) input.value = selected?.[name] || '';
    }
    const preview = byId('composition-preview');
    preview.replaceChildren();
    preview.style.background = compositionSettings.background;
    if (compositionSettings.title) {
      const heading = document.createElement('p');
      heading.className = 'preview-doc-title';
      heading.style.color = '#111111';
      heading.textContent = compositionSettings.title;
      preview.append(heading);
    }
    const track = document.createElement('div');
    track.className = 'composition-preview-track';
    track.style.flexDirection = compositionSettings.direction === 'horizontal' ? 'row' : 'column';
    track.style.gap = `${Math.min(30, compositionSettings.gap / 4)}px`;
    track.style.padding = `${Math.min(30, compositionSettings.padding / 4)}px`;
    compositionItems.forEach((item, index) => {
      const figure = document.createElement('figure');
      figure.style.width = compositionSettings.direction === 'horizontal' ? '90px' : '210px';
      if (compositionSettings.numbered || item.title) {
        const heading = document.createElement('p');
        heading.className = 'preview-heading';
        heading.textContent = `${compositionSettings.numbered ? `${index + 1}. ` : ''}${item.title}`;
        figure.append(heading);
      }
      const img = document.createElement('img');
      img.src = item.thumbnail || '';
      img.alt = item.title;
      figure.append(img);
      if (item.caption) {
        const caption = document.createElement('figcaption');
        caption.textContent = item.caption;
        figure.append(caption);
      }
      track.append(figure);
    });
    preview.append(track);
  }

  function updateCompositionTexts() {
    document.querySelectorAll('[data-compose]').forEach(element => { element.textContent = compositionText(element.dataset.compose); });
    byId('txt-png').textContent = compositionText('export');
    downloadButton.title = compositionText('export');
    downloadButton.setAttribute('aria-label', compositionText('export'));
    byId('editor-version').textContent = `v${chrome.runtime.getManifest().version}`;
    if (!baseImage) emptyState.textContent = compositionText('empty');
    refreshComposition();
  }

  function makeSessionItem(bitmap, record, metadata = {}) {
    const surface = createSurface(bitmap.width, bitmap.height);
    surface.getContext('2d').drawImage(bitmap, 0, 0);
    const thumbnail = document.createElement('canvas');
    const thumbnailScale = Math.min(1, 220 / Math.max(bitmap.width, bitmap.height));
    thumbnail.width = Math.max(1, Math.round(bitmap.width * thumbnailScale));
    thumbnail.height = Math.max(1, Math.round(bitmap.height * thumbnailScale));
    thumbnail.getContext('2d').drawImage(bitmap, 0, 0, thumbnail.width, thumbnail.height);
    return { id: metadata.id || crypto.randomUUID(), title: metadata.title || '', caption: metadata.caption || '', thumbnail: thumbnail.toDataURL('image/png'), inputBytes: metadata.inputBytes || record.blob?.size || 0, baseImage: bitmap, operations: [], redoOperations: [], annotationUndo: [], annotationRedo: [], activeTextBlocks: record.textCoordinateSpace === 'bitmap' ? [...(record.textBlocks || [])] : [], committedSurface: surface, captureRecord: record, currentStepNumber: 1, historyRevision: 0 };
  }

  function updateItemThumbnail(item) {
    const surface = item.committedSurface;
    if (!surface) { item.thumbnail = ''; return; }
    const scale = Math.min(1, 220 / Math.max(surface.width, surface.height));
    const thumbnail = document.createElement('canvas');
    thumbnail.width = Math.max(1, Math.round(surface.width * scale));
    thumbnail.height = Math.max(1, Math.round(surface.height * scale));
    thumbnail.getContext('2d').drawImage(surface, 0, 0, thumbnail.width, thumbnail.height);
    item.thumbnail = thumbnail.toDataURL('image/png');
  }

  async function importImages(files) {
    if (!allowDocumentAction() || !files.length) return;
    const validTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);
    const rejected = files.filter(file => !validTypes.has(file.type) || file.size > 48 * 1024 * 1024);
    files = files.filter(file => validTypes.has(file.type) && file.size <= 48 * 1024 * 1024);
    if (rejected.length) showToast(`${compositionText('unsupported')} ${rejected.map(file => file.name).join(', ')}`, true);
    if (!files.length) return;
    const total = files.reduce((sum, file) => sum + file.size, 0) + compositionItems.reduce((sum, item) => sum + item.inputBytes, 0);
    if (compositionItems.length + files.length > 30 || total > 128 * 1024 * 1024) { showToast(compositionText('limit'), true); return; }
    compositionBusy = true;
    const additions = [];
    try {
      const failures = [];
      for (const file of files) {
        let bitmap;
        try {
          const header = ScionosCaptureUtils.readImageDimensions(new Uint8Array(await file.arrayBuffer()), file.type);
          if (!header || header.width > 16384 || header.height > 16384 || header.width * header.height > 16000000) throw new Error(compositionText('imageDimensions'));
          const reservedPixels = [...compositionItems, ...additions].reduce((sum, item) => sum + item.committedSurface.width * item.committedSurface.height, 0);
          if (reservedPixels + header.width * header.height > 32000000) throw new Error(compositionText('memoryLimit'));
          bitmap = await createImageBitmap(file);
          // Browser decoders can ignore EXIF for some formats. Both raw and
          // oriented dimensions have the same bounded pixel count.
          const matchesRaw = bitmap.width === header.width && bitmap.height === header.height;
          const matchesOriented = bitmap.width === header.orientedWidth && bitmap.height === header.orientedHeight;
          if ((!matchesRaw && !matchesOriented) || bitmap.width > 16384 || bitmap.height > 16384 || bitmap.width * bitmap.height > 16000000) throw new Error(compositionText('imageDimensions'));
          const dimensions = ScionosCaptureUtils.computeOutputDimensions(bitmap.width, bitmap.height, 1);
          const usedPixels = [...compositionItems, ...additions].reduce((sum, item) => sum + item.committedSurface.width * item.committedSurface.height, 0);
          if (usedPixels + dimensions.width * dimensions.height > 32000000) throw new Error(compositionText('memoryLimit'));
          if (dimensions.reduced) {
            const resized = await createImageBitmap(bitmap, { resizeWidth: dimensions.width, resizeHeight: dimensions.height, resizeQuality: 'high' });
            bitmap.close();
            bitmap = resized;
            showToast(compositionText('reduced'));
          }
          additions.push(makeSessionItem(bitmap, { blob: file, title: file.name || '', url: '', timestamp: Date.now(), scale: dimensions.scale, textBlocks: [], textCoordinateSpace: 'bitmap' }, { title: '', inputBytes: file.size }));
        } catch (error) { bitmap?.close(); failures.push(`${file.name || compositionText('image')}: ${error.message}`); }
      }
      if (!additions.length) throw new Error(failures.join(' '));
      if (failures.length) showToast(compositionText('failure') + failures.join(' '), true);
      persistActiveItem();
      compositionItems.push(...additions);
      resetCompositionHistory();
      compositionBusy = false;
      selectCompositionItem(additions[0].id);
      markDocumentDirty();
    } catch (error) {
      additions.forEach(item => item.baseImage.close());
      showToast(compositionText('failure') + error.message, true);
    } finally { compositionBusy = false; refreshComposition(); }
  }

  function secureProjectSurface(item) {
    let surface = createSurface(item.baseImage.width, item.baseImage.height);
    surface.getContext('2d').drawImage(item.baseImage, 0, 0);
    let annotations = [];
    const model = globalThis.ScionosAnnotationModel;
    const intersects = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
    for (const original of item.operations) {
      const operation = globalThis.structuredClone(original);
      if (operation.kind === 'censor') {
        const bounds = operationBounds(operation, surface.width, surface.height);
        annotations = annotations.filter(annotation => !intersects(model.bounds(annotation, { context: surface.getContext('2d') }), bounds));
        surface = applyOperation(surface, operation);
      } else if (operation.kind === 'crop') {
        // Flatten all prior annotations before cropping, preserving layer order and
        // ensuring removed pixels and text are absent from the portable file.
        for (const annotation of annotations) surface = applyOperation(surface, annotation);
        annotations = [];
        surface = applyOperation(surface, operation);
      } else annotations.push(operation);
    }
    return { surface, annotations };
  }

  function traceExport(stage, details = {}) {
    const events = globalThis.__scionosDiagnostics;
    if (!Array.isArray(events)) return;
    if (events.length >= 500) events.shift();
    events.push({ stage, at: Date.now(), ...details });
  }

  function canvasPngBlob(surface) {
    traceExport('encode-start', { width: surface.width, height: surface.height });
    return new Promise((resolve, reject) => surface.toBlob(blob => {
      traceExport('encode-end', { bytes: blob?.size || 0 });
      if (blob && blob.type === 'image/png') resolve(blob);
      else reject(new Error('PNG encoding failed.'));
    }, 'image/png'));
  }

  // Freeze every item at click time before any encoder can yield to later edits.
  // Export and project snapshots need different pixels; encode only the needed form.
  function freezeComposition(mode) {
    if (!allowDocumentAction() || !compositionItems.length) return null;
    persistActiveItem();
    traceExport('freeze-start', { mode, items: compositionItems.length });
    const frozen = { items: [], settings: { ...compositionSettings }, title: compositionSettings.title,
      exportSettings: readPdfSettings(), revision: documentRevision, thumbnailSurface: null };
    try {
      for (const item of compositionItems) {
        let surface, annotations = [];
        if (mode === 'export') {
          const source = item.committedSurface;
          surface = createSurface(source.width, source.height);
          surface.getContext('2d').drawImage(source, 0, 0);
        } else ({ surface, annotations } = secureProjectSurface(item));
        frozen.items.push({ id: item.id, surface, annotations, width: surface.width, height: surface.height,
          title: item.title, caption: item.caption, url: ScionosCaptureUtils.sanitizeSourceUrl(item.captureRecord.url || '', frozen.exportSettings.sourcePolicy),
          timestamp: item.captureRecord.timestamp || Date.now(), textBlocks: mode === 'export' ? item.activeTextBlocks.map(block => ({ ...block,
            url: ScionosCaptureUtils.sanitizeSourceUrl(block.url || '', frozen.exportSettings.sourcePolicy) })) : [] });
      }
      if (mode === 'library') {
        const source = compositionItems[0].committedSurface;
        const scale = Math.min(1, 220 / Math.max(source.width, source.height));
        frozen.thumbnailSurface = createSurface(Math.max(1, Math.round(source.width * scale)), Math.max(1, Math.round(source.height * scale)));
        frozen.thumbnailSurface.getContext('2d').drawImage(source, 0, 0, frozen.thumbnailSurface.width, frozen.thumbnailSurface.height);
      }
      traceExport('freeze-end', { mode });
      return frozen;
    } catch (error) { releaseFrozenSurfaces(frozen); throw error; }
  }

  function releaseFrozenSurfaces(frozen) {
    for (const item of frozen.items) if (item.surface) { item.surface.width = item.surface.height = 1; item.surface = null; }
    if (frozen.thumbnailSurface) { frozen.thumbnailSurface.width = frozen.thumbnailSurface.height = 1; frozen.thumbnailSurface = null; }
  }

  async function snapshotComposition(mode = 'export') {
    const frozen = freezeComposition(mode);
    if (!frozen) return null;
    try {
      const items = [];
      for (const { surface, ...metadata } of frozen.items) {
        const blob = await canvasPngBlob(surface);
        items.push({ ...metadata, blob });
        surface.width = surface.height = 1;
      }
      const thumbnail = frozen.thumbnailSurface ? await canvasPngBlob(frozen.thumbnailSurface) : null;
      traceExport('snapshot-ready', { mode });
      return { items, thumbnail, settings: frozen.settings, title: frozen.title, exportSettings: frozen.exportSettings, revision: frozen.revision };
    } finally { releaseFrozenSurfaces(frozen); }
  }

  function downloadBlob(blob, extension, title = compositionSettings.title) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${ScionosCaptureUtils.sanitizeFilename(title, 'Scionos_Capture')}_${ScionosCaptureUtils.buildLocalTimestamp()}.${extension}`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 5000);
  }

  async function saveProject() {
    try {
      const snapshot = await snapshotComposition('project');
      if (!snapshot) return;
      const blob = await globalThis.ScionosCompositionUtils.encodeProject({ title: snapshot.title, settings: snapshot.settings, exportSettings: snapshot.exportSettings, items: snapshot.items.map(item => ({ id: item.id, blob: item.blob, annotations: item.annotations, title: item.title, caption: item.caption, url: item.url, timestamp: item.timestamp })) });
      downloadBlob(blob, 'scionos', snapshot.title);
      showToast(compositionText('projectExportRequested'));
    } catch (error) { showToast(compositionText('failure') + error.message, true); }
  }

  function saveLibraryProject() {
    const session = librarySession;
    // Snapshot now, before joining the queue: later edits must not change a click's
    // contents. Attach rejection handling immediately even while a save is pending.
    const pendingSnapshot = snapshotComposition('library').then(snapshot => ({ snapshot }), error => ({ error }));
    session.saves = session.saves.then(() => saveLibrarySnapshot(session, pendingSnapshot));
  }

  async function saveLibrarySnapshot(session, pendingSnapshot) {
    try {
      const { snapshot, error } = await pendingSnapshot;
      if (error) throw error;
      if (!snapshot) return;
      // Only preceding saves from this same document may advance this revision.
      const id = session.id || crypto.randomUUID();
      const expectedRevision = session.revision;
      const blob = await globalThis.ScionosCompositionUtils.encodeProject({ title: snapshot.title, settings: snapshot.settings, exportSettings: snapshot.exportSettings, items: snapshot.items.map(item => ({ id: item.id, blob: item.blob, annotations: item.annotations, title: item.title, caption: item.caption, url: item.url, timestamp: item.timestamp })) });
      const thumbnail = snapshot.thumbnail;
      const metadata = await CaptureStore.saveLibraryProject({ id, title: snapshot.title || 'Scionos Capture', source: snapshot.items[0]?.url || '', thumbnail, blob }, { expectedRevision });
      session.id = id; session.revision = metadata.revision;
      chrome.runtime.sendMessage({ action: 'LIBRARY_PROJECTS_CHANGED' }).catch(() => {});
      if (librarySession === session) {
        if (documentRevision === snapshot.revision) documentDirty = false;
        showToast(compositionText('saved'));
      }
    } catch (error) {
      if (librarySession === session) showToast(compositionText('failure') + error.message, true);
    }
  }

  async function openProject(file, libraryMetadata = null) {
    if (!file || !allowDocumentAction()) return;
    compositionBusy = true;
    const prepared = [];
    try {
      const decoded = await globalThis.ScionosCompositionUtils.decodeProject(file);
      if (decoded.items.reduce((sum, item) => sum + item.width * item.height, 0) > 32000000) throw new Error(compositionText('memoryLimit'));
      for (const item of decoded.items) {
        const bitmap = await createImageBitmap(item.blob);
        const entry = makeSessionItem(bitmap, { blob: item.blob, title: item.title, url: item.url, timestamp: item.timestamp, scale: 1, textBlocks: [], textCoordinateSpace: 'bitmap' }, item);
        entry.operations = (item.annotations || []).map(annotation => ({ ...annotation, id: annotation.id || crypto.randomUUID() }));
        let rendered = createSurface(bitmap.width, bitmap.height);
        rendered.getContext('2d').drawImage(bitmap, 0, 0);
        for (const annotation of entry.operations) rendered = applyOperation(rendered, annotation);
        entry.committedSurface = rendered;
        updateItemThumbnail(entry);
        prepared.push(entry);
      }
      if (hasPendingEdit() || historyConsolidation) throw new Error(compositionText('pending'));
      if (documentDirty && !window.confirm(compositionText('replace'))) { prepared.forEach(item => item.baseImage.close()); return; }
      compositionItems.forEach(item => item.baseImage.close?.());
      compositionItems.splice(0, compositionItems.length, ...prepared);
      resetCompositionHistory();
      activeItemId = null;
      Object.assign(compositionSettings, decoded.settings, { title: decoded.title || '' });
      byId('composition-title').value = compositionSettings.title;
      for (const key of ['direction', 'gap', 'padding', 'background', 'numbered']) {
        const input = byId(`composition-${key}`);
        if (key === 'numbered') input.checked = compositionSettings[key];
        else input.value = compositionSettings[key];
      }
      restorePdfSettings(decoded.exportSettings || {});
      documentRevision += 1;
      documentDirty = false;
      librarySession = { id: libraryMetadata?.id || null, revision: libraryMetadata?.revision ?? null, saves: Promise.resolve() };
      compositionBusy = false;
      selectCompositionItem(prepared[0]?.id);
    } catch (error) { prepared.forEach(item => item.baseImage.close?.()); showToast(compositionText('failure') + error.message, true); }
    finally { compositionBusy = false; refreshComposition(); }
  }

  function readPdfSettings() {
    const band = name => ({ enabled: byId(`pdf-${name}`).checked, title: byId(`pdf-${name}-title`).checked, source: byId(`pdf-${name}-source`).checked, date: byId(`pdf-${name}-date`).checked, pagination: byId(`pdf-${name}-pagination`).checked });
    return { sourcePolicy: ScionosCaptureUtils.normalizeSourcePolicy(byId('source-policy').value), format: byId('pdf-paper').value, orientation: byId('pdf-orientation').value, marginsMm: Math.max(5, Math.min(30, Number(byId('pdf-margin').value) || 12)), scale: byId('pdf-fit').checked ? 'fit' : Math.max(25, Math.min(100, Number(byId('pdf-scale').value) || 100)), header: band('header'), footer: band('footer') };
  }

  function restorePdfSettings(settings) {
    byId('source-policy').value = ScionosCaptureUtils.normalizeSourcePolicy(settings.sourcePolicy);
    if (['A4', 'Letter'].includes(settings.format)) byId('pdf-paper').value = settings.format;
    if (['portrait', 'landscape'].includes(settings.orientation)) byId('pdf-orientation').value = settings.orientation;
    const margin = typeof settings.marginsMm === 'number' ? settings.marginsMm : settings.marginsMm?.top;
    if (Number.isFinite(margin)) byId('pdf-margin').value = margin;
    byId('pdf-fit').checked = settings.scale === undefined || settings.scale === 'fit';
    if (Number.isFinite(settings.scale)) byId('pdf-scale').value = settings.scale;
    for (const name of ['header', 'footer']) {
      const band = settings[name];
      if (typeof band === 'boolean') byId(`pdf-${name}`).checked = band;
      else if (band) {
        byId(`pdf-${name}`).checked = band.enabled;
        for (const key of ['title', 'source', 'date', 'pagination']) byId(`pdf-${name}-${key}`).checked = band[key];
      }
    }
  }

  function updateExportFields() {
    const format = byId('export-format').value;
    byId('pdf-settings').hidden = format !== 'pdf';
    byId('export-quality-field').hidden = !['jpeg', 'webp'].includes(format);
  }

  function openExport(format) {
    if (!allowDocumentAction()) return;
    byId('export-format').value = format;
    byId('export-status').textContent = '';
    updateExportFields();
    byId('export-dialog').showModal();
  }

  async function runCompositionExport(format) {
    const button = byId('export-confirm');
    button.disabled = true;
    byId('export-status').textContent = compositionText('loading');
    traceExport('export-start', { format });
    try {
      const snapshot = await snapshotComposition();
      if (!snapshot) return;
      const exporter = globalThis.ScionosCompositionExport;
      if (['png', 'jpeg', 'webp'].includes(format)) {
        const layout = globalThis.ScionosCompositionUtils.computeLayout(snapshot.items, snapshot.settings);
        const dimensions = ScionosCaptureUtils.computeOutputDimensions(layout.width, layout.height, 1);
        if (dimensions.reduced && !window.confirm(compositionText('reduceBefore').replace('{from}', `${Math.ceil(layout.width)} × ${Math.ceil(layout.height)}`).replace('{to}', `${dimensions.width} × ${dimensions.height}`))) { byId('export-status').textContent = ''; return; }
      }
      if (format === 'pdf') {
        await exporter.print(snapshot, snapshot.exportSettings, byId('print-area'), ScionosI18n.language);
      } else if (format === 'html') downloadBlob(await exporter.html(snapshot, ScionosI18n.language), 'html', snapshot.title);
      else if (format === 'markdown') downloadBlob(await exporter.markdown(snapshot), 'zip', snapshot.title);
      else {
        const quality = Math.max(10, Math.min(100, Number(byId('export-quality').value) || 90)) / 100;
        const result = await exporter.image(snapshot, format, quality);
        downloadBlob(result.blob, format === 'jpeg' ? 'jpg' : format, snapshot.title);
        if (result.reduced) showToast(compositionText('reduced'));
      }
      byId('export-status').textContent = compositionText('done');
      byId('export-dialog').close();
      traceExport('dialog-close', { format });
    } catch (error) { byId('export-status').textContent = compositionText('failure') + error.message; showToast(compositionText('failure') + error.message, true); }
    finally { button.disabled = false; }
  }

  function updateStepBadge() {
    if (stepCounterBadge) {
      stepCounterBadge.textContent = getI18nText('stepCounter', { number: currentStepNumber });
    }
  }

  function updateTexts() {
    document.title = getI18nText('editorTitle');
    const textMap = {
      'txt-tool-select': 'toolCursor', 'txt-tool-draw': 'toolDraw',
      'txt-tool-highlight': 'toolHighlight',
      'txt-tool-arrow': 'toolArrow', 'txt-tool-shape': 'toolShape',
      'txt-tool-text': 'toolText', 'txt-tool-step': 'toolStep',
      'txt-tool-censor': 'toolCensor', 'txt-tool-crop': 'toolCrop',
      'txt-undo': 'toolUndo', 'txt-redo': 'toolRedo',
      'txt-help': 'btnHelp',
      'txt-copy': 'btnCopy', 'txt-pdf': 'btnPrint', 'txt-html': 'btnHtml', 'txt-png': 'btnPng',
      'label-draw-size': 'labelDrawSize', 'label-draw-color': 'labelDrawColor',
      'label-arrow-size': 'labelDrawSize', 'label-arrow-color': 'labelDrawColor',
      'label-shape-type': 'labelShape', 'label-shape-mode': 'labelShapeMode',
      'label-shape-size': 'labelDrawSize', 'label-shape-color': 'labelDrawColor',
      'label-text-size': 'fontSize', 'label-text-color': 'labelTextColor',
      'label-text-bg-color': 'labelBgColor',
      'label-step-color': 'labelColor', 'label-step-size': 'labelDrawSize',
      'txt-step-reset': 'stepReset',
      'label-mode': 'labelMode', 'label-shape': 'labelShape',
      'label-censor-size': 'labelDrawSize',
      'label-censor-color': 'labelColor', 'label-blur': 'labelBlurIntensity',
      'blur-warning': 'blurWarning', 'geometry-title': 'geometryTitle',
      'label-x': 'coordinateX', 'label-y': 'coordinateY',
      'label-width': 'coordinateWidth', 'label-height': 'coordinateHeight',
      'geometry-apply': 'applyCrop', 'geometry-cancel': 'cancelCrop'
    };
    Object.entries(textMap).forEach(([id, key]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = getI18nText(key);
    });
    const autoEl = document.querySelector('[data-i18n="languageAuto"]');
    if (autoEl) autoEl.textContent = getI18nText('languageAuto');

    const drawSizeKeys = ['sizeFine', 'sizeMedium', 'sizeThick', 'sizeVeryThick'];
    if (drawSize) Array.from(drawSize.options).forEach((opt, idx) => { opt.textContent = getI18nText(drawSizeKeys[idx]); });
    if (arrowSize) Array.from(arrowSize.options).forEach((opt, idx) => { opt.textContent = getI18nText(drawSizeKeys[idx]); });
    if (shapeSize) Array.from(shapeSize.options).forEach((opt, idx) => { opt.textContent = getI18nText(drawSizeKeys[idx]); });
    if (stepSize) Array.from(stepSize.options).forEach((opt, idx) => { opt.textContent = getI18nText(drawSizeKeys[idx]); });
    if (censorSize) Array.from(censorSize.options).forEach((opt, idx) => { opt.textContent = getI18nText(drawSizeKeys[idx]); });

    if (shapeType && shapeType.options.length >= 2) {
      shapeType.options[0].textContent = getI18nText('shapeRect');
      shapeType.options[1].textContent = getI18nText('shapeCircle');
    }
    if (shapeFillMode && shapeFillMode.options.length >= 2) {
      shapeFillMode.options[0].textContent = getI18nText('shapeStroke');
      shapeFillMode.options[1].textContent = getI18nText('shapeFill');
    }

    if (censorType && censorType.options.length >= 2) {
      censorType.options[0].textContent = getI18nText('modeColor');
      censorType.options[1].textContent = getI18nText('modeBlur');
    }
    if (censorShape && censorShape.options.length >= 3) {
      censorShape.options[0].textContent = getI18nText('shapeRect');
      censorShape.options[1].textContent = getI18nText('shapeCircle');
      censorShape.options[2].textContent = getI18nText('shapeFree');
    }
    if (textBgColor && textBgColor.options.length >= 4) {
      const bgKeys = ['textBgBlack', 'textBgRed', 'textBgBlue', 'textBgTransparent'];
      Array.from(textBgColor.options).forEach((opt, idx) => {
        if (bgKeys[idx]) opt.textContent = getI18nText(bgKeys[idx]);
      });
    }

    if (textInputOverlay) textInputOverlay.placeholder = getI18nText('textPlaceholder');
    updateStepBadge();

    canvas.setAttribute('aria-label', getI18nText('canvasLabel'));
    copyButton.setAttribute('aria-label', getI18nText('btnCopy'));
    printButton.setAttribute('aria-label', getI18nText('btnPrint'));
    htmlButton.setAttribute('aria-label', getI18nText('btnHtml'));
    downloadButton.setAttribute('aria-label', getI18nText('btnPng'));
    if (btnHelp) {
      btnHelp.setAttribute('aria-label', getI18nText('btnHelp'));
      btnHelp.title = getI18nText('btnHelp');
    }
    document.getElementById('primary-tool-group').setAttribute('aria-label', getI18nText('toolsToolbar'));
    zoomOutButton.setAttribute('aria-label', getI18nText('zoomOut'));
    zoomInButton.setAttribute('aria-label', getI18nText('zoomIn'));
    zoomResetButton.setAttribute('aria-label', getI18nText('zoomFit'));

    const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);
    const ctrlKey = isMac ? '⌘' : 'Ctrl';
    const toolSelect = document.getElementById('tool-select');
    const toolDraw = document.getElementById('tool-draw');
    const toolHighlight = document.getElementById('tool-highlight');
    const toolArrow = document.getElementById('tool-arrow');
    const toolShape = document.getElementById('tool-shape');
    const toolText = document.getElementById('tool-text');
    const toolStep = document.getElementById('tool-step');
    const toolCensor = document.getElementById('tool-censor');
    const toolCrop = document.getElementById('tool-crop');

    if (toolSelect) toolSelect.title = `${getI18nText('toolCursor')} (V)`;
    if (toolDraw) toolDraw.title = `${getI18nText('toolDraw')} (D)`;
    if (toolHighlight) toolHighlight.title = `${getI18nText('toolHighlight')} (H)`;
    if (toolArrow) toolArrow.title = `${getI18nText('toolArrow')} (A)`;
    if (toolShape) toolShape.title = `${getI18nText('toolShape')} (S)`;
    if (toolText) toolText.title = `${getI18nText('toolText')} (T)`;
    if (toolStep) toolStep.title = `${getI18nText('toolStep')} (P)`;
    if (toolCensor) toolCensor.title = `${getI18nText('toolCensor')} (M)`;
    if (toolCrop) toolCrop.title = `${getI18nText('toolCrop')} (C)`;
    if (undoButton) undoButton.title = `${getI18nText('toolUndo')} (${ctrlKey}+Z)`;
    if (redoButton) redoButton.title = `${getI18nText('toolRedo')} (${ctrlKey}+Y)`;
    if (zoomInButton) zoomInButton.title = `${getI18nText('zoomIn')} (+)`;
    if (zoomOutButton) zoomOutButton.title = `${getI18nText('zoomOut')} (-)`;
    if (zoomResetButton) zoomResetButton.title = `${getI18nText('zoomFit')} (0)`;
    if (copyButton) copyButton.title = getI18nText('btnCopy');
    if (printButton) printButton.title = getI18nText('btnPrint');
    if (htmlButton) htmlButton.title = getI18nText('btnHtml');
    if (downloadButton) downloadButton.title = getI18nText('btnPng');

    if (!captureRecord) emptyState.textContent = compositionText('empty');
    updateCompositionTexts();
    updateRecordMetadata();
    updateCaptureNotice();
    updateControlVisibility();
  }

  function updateRecordMetadata() {
    if (!captureRecord) return;
    pageTitle.textContent = captureRecord.title || getI18nText('captureTitle');
    const formattedDate = new Date(captureRecord.timestamp).toLocaleString(ScionosI18n.language);
    pageMeta.textContent = `${captureRecord.url || ''} — ${formattedDate}`;
    pageMeta.title = captureRecord.url || '';
  }

  function updateCaptureNotice() {
    const record = captureRecord;
    if (!record) return;
    notice.textContent = [
      record.scale < 0.9999 ? getI18nText('captureReducedNotice', { percent: Math.round(record.scale * 100) }) : '',
      record.textLayerLimited || (record.textBlocks?.length && record.textCoordinateSpace !== 'bitmap')
        ? getI18nText('textLayerLimitedNotice') : ''
    ].filter(Boolean).join(' ');
  }

  function showToast(message, isError = false) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.toggle('error', isError);
    toast.setAttribute('role', isError ? 'alert' : 'status');
    toast.classList.add('visible');
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 3500);
  }

  function setEditorReady(ready) {
    document.body.setAttribute('aria-busy', String(!ready));
    [downloadButton, htmlButton, printButton, copyButton].forEach(button => { button.disabled = !ready; });
    toolButtons.forEach(button => { button.disabled = !ready; });
    zoomInButton.disabled = !ready;
    zoomOutButton.disabled = !ready;
    zoomResetButton.disabled = !ready;
  }

  const { createSurface, normalizeBounds, normalizeCrop, operationBounds, applyOperation, drawCropPreview, drawAnnotationSelection } =
    globalThis.ScionosEditorOperations.create({ captureUtils: ScionosCaptureUtils });

  function filterTextBlocksForOperation(blocks, operation, surface) {
    const concealsText = operation.kind === 'censor'
      || (operation.kind === 'shape' && operation.mode !== 'stroke');
    if (!concealsText) return blocks;
    const bounds = operationBounds(operation, surface.width, surface.height);
    return ScionosCaptureUtils.filterTextBlocksIntersectingBounds(blocks, bounds);
  }

  function rebuildCommittedSurface() {
    if (!baseImage) return;
    let surface = createSurface(baseImage.width, baseImage.height);
    surface.getContext('2d').drawImage(baseImage, 0, 0);
    let blocks = captureRecord?.textCoordinateSpace === 'bitmap' && Array.isArray(captureRecord.textBlocks)
      ? [...captureRecord.textBlocks] : [];
    operations.forEach(operation => {
      const crop = operation.kind === 'crop' ? normalizeCrop(operation, surface.width, surface.height) : null;
      surface = applyOperation(surface, operation);
      if (crop) {
        blocks = ScionosCaptureUtils.shiftAndCropTextBlocks(blocks, crop);
      } else {
        blocks = filterTextBlocksForOperation(blocks, operation, surface);
      }
    });
    committedSurface = surface;
    activeTextBlocks = blocks;
    renderCanvas();
  }

  function applyCommittedOperation(operation) {
    if (!committedSurface) return;
    const crop = operation.kind === 'crop'
      ? normalizeCrop(operation, committedSurface.width, committedSurface.height) : null;
    committedSurface = applyOperation(committedSurface, operation);
    if (crop) {
      activeTextBlocks = ScionosCaptureUtils.shiftAndCropTextBlocks(activeTextBlocks, crop);
    } else {
      activeTextBlocks = filterTextBlocksForOperation(activeTextBlocks, operation, committedSurface);
    }
    renderCanvas();
  }

  function renderCanvas() {
    if (!committedSurface) return;
    if (canvas.width !== committedSurface.width) canvas.width = committedSurface.width;
    if (canvas.height !== committedSurface.height) canvas.height = committedSurface.height;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(committedSurface, 0, 0);
    if (draftOperation) {
      if (draftOperation.kind === 'crop') drawCropPreview(context, draftOperation, canvas.width, canvas.height);
      else applyOperation(canvas, draftOperation);
    }
    if (currentTool === 'select' && selectedAnnotation >= 0 && operations[selectedAnnotation]) drawAnnotationSelection(context, operations[selectedAnnotation], currentZoom);
    updateAnnotationControls();
    applyZoom(currentZoom);
    updateHistoryButtons();
  }

  function scheduleRender() {
    if (renderScheduled) return;
    renderScheduled = true;
    requestAnimationFrame(() => {
      renderScheduled = false;
      renderCanvas();
    });
  }

  function meaningful(operation) {
    if (!operation) return false;
    if (operation.kind === 'censor' && operation.shape === 'free') return operation.points.length > 0;
    if (operation.kind === 'draw' || operation.kind === 'highlight') return operation.points.length > 1;
    if (operation.kind === 'step') return true;
    if (operation.kind === 'text') return Boolean(operation.text && operation.text.trim().length > 0);
    if (operation.kind === 'arrow') {
      return Math.hypot(operation.end.x - operation.start.x, operation.end.y - operation.start.y) >= 4;
    }
    const bounds = normalizeBounds(operation.start, operation.end);
    return bounds.width >= 2 && bounds.height >= 2;
  }

  function recordAnnotationHistory() {
    annotationUndo.push({ operations: globalThis.structuredClone(operations), step: currentStepNumber });
    if (annotationUndo.length > MAX_OPERATIONS) annotationUndo.shift();
    annotationRedo = [];
  }

  async function commitOperation(operation) {
    if (!meaningful(operation)) {
      cancelDraft();
      return;
    }
    recordAnnotationHistory();
    selectedAnnotation = -1;
    historyRevision += 1;
    if (!['crop', 'censor'].includes(operation.kind)) operation.id = operation.id || crypto.randomUUID();
    operations.push(operation);
    redoOperations = [];
    draftOperation = null;
    geometryPanel.hidden = true;
    applyCommittedOperation(operation);
    markDocumentDirty();

  }

  function updateHistoryButtons() {
    undoButton.disabled = annotationUndo.length === 0;
    redoButton.disabled = annotationRedo.length === 0;
  }

  function applyZoom(value) {
    currentZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value));
    const width = Math.max(1, Math.round(canvas.width * currentZoom));
    const height = Math.max(1, Math.round(canvas.height * currentZoom));
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    container.style.width = `${width}px`;
    container.style.height = `${height}px`;
    zoomText.textContent = `${Math.round(currentZoom * 100)}%`;
    zoomOutButton.disabled = !baseImage || currentZoom <= MIN_ZOOM;
    zoomInButton.disabled = !baseImage || currentZoom >= MAX_ZOOM;
  }

  function fitToScreen() {
    if (!canvas.width) return;
    const style = getComputedStyle(workspace);
    const availableWidth = Math.max(1, workspace.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight));
    applyZoom(Math.min(1, availableWidth / canvas.width));
  }

  function getCanvasCoords(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(canvas.width, (event.clientX - rect.left) * (canvas.width / rect.width))),
      y: Math.max(0, Math.min(canvas.height, (event.clientY - rect.top) * (canvas.height / rect.height)))
    };
  }

  function createCensorOperation(start, end, shape = censorShape.value) {
    return {
      kind: 'censor', type: censorType.value, shape, color: censorColor.value,
      blur: Number(blurIntensity.value), radius: Number(censorSize.value) * 1.5,
      points: shape === 'free' ? [start] : [], start, end
    };
  }

  function syncGeometry(operation) {
    if (!operation || operation.shape === 'free') return;
    const bounds = normalizeBounds(operation.start, operation.end);
    geometryInputs.x.value = Math.round(bounds.x);
    geometryInputs.y.value = Math.round(bounds.y);
    geometryInputs.width.value = Math.max(1, Math.round(bounds.width));
    geometryInputs.height.value = Math.max(1, Math.round(bounds.height));
  }

  function operationFromGeometry() {
    const x = Math.max(0, Number(geometryInputs.x.value) || 0);
    const y = Math.max(0, Number(geometryInputs.y.value) || 0);
    const width = Math.max(1, Number(geometryInputs.width.value) || 1);
    const height = Math.max(1, Number(geometryInputs.height.value) || 1);
    const start = { x, y };
    const end = { x: x + width, y: y + height };
    return currentTool === 'crop' ? { kind: 'crop', start, end } : createCensorOperation(start, end);
  }

  function showGeometry(operation) {
    draftOperation = operation;
    syncGeometry(operation);
    geometryPanel.hidden = false;
    scheduleRender();
  }

  function prepareKeyboardGeometry() {
    if (!baseImage || !['crop', 'censor'].includes(currentTool) || censorShape.value === 'free') return;
    const width = Math.max(20, Math.min(320, canvas.width * 0.45));
    const height = Math.max(20, Math.min(180, canvas.height * 0.35));
    const x = Math.max(0, (canvas.width - width) / 2);
    const y = Math.max(0, (canvas.height - height) / 2);
    const start = { x, y };
    const end = { x: x + width, y: y + height };
    showGeometry(currentTool === 'crop' ? { kind: 'crop', start, end } : createCensorOperation(start, end));
  }

  function cancelDraft() {
    if (annotationDrag) finishAnnotationDrag(annotationDrag.pointerId);
    draftOperation = null;
    const pointerId = activePointerId;
    activePointerId = null;
    if (pointerId !== null && canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId);
    geometryPanel.hidden = true;
    renderCanvas();
  }

  function openTextInput(point) {
    commitTextInput();
    pendingTextPoint = point;
    const rect = canvas.getBoundingClientRect();
    const left = (point.x / canvas.width) * rect.width;
    const top = (point.y / canvas.height) * rect.height;
    textInputOverlay.style.left = `${Math.round(left)}px`;
    textInputOverlay.style.top = `${Math.round(top)}px`;
    textInputOverlay.style.fontSize = `${Math.max(14, Math.round(Number(textSize.value) * currentZoom))}px`;
    textInputOverlay.style.color = textColor.value;
    textInputOverlay.value = '';
    textInputOverlay.hidden = false;
    textInputOverlay.focus();
  }

  function commitTextInput() {
    if (textInputOverlay.hidden || !pendingTextPoint) return;
    const val = textInputOverlay.value.trim();
    if (val) {
      commitOperation({
        kind: 'text',
        x: Math.round(pendingTextPoint.x),
        y: Math.round(pendingTextPoint.y),
        text: val,
        fontSize: Number(textSize.value),
        color: textColor.value,
        bgColor: textBgColor.value
      });
    }
    textInputOverlay.hidden = true;
    textInputOverlay.value = '';
    pendingTextPoint = null;
  }

  function cancelTextInput() {
    textInputOverlay.hidden = true;
    textInputOverlay.value = '';
    pendingTextPoint = null;
  }

  function setActiveTool(tool) {
    if (currentTool === 'text' && tool !== 'text') {
      commitTextInput();
    }
    currentTool = tool;
    toolButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.tool === tool)));
    canvas.style.cursor = tool === 'select' ? 'default' : (tool === 'text' ? 'text' : 'crosshair');
    cancelDraft();
    updateControlVisibility();
  }

  function updateControlVisibility() {
    drawControls.hidden = currentTool !== 'draw' && currentTool !== 'highlight';
    arrowControls.hidden = currentTool !== 'arrow';
    shapeControls.hidden = currentTool !== 'shape';
    textControls.hidden = currentTool !== 'text';
    stepControls.hidden = currentTool !== 'step';
    censorControls.hidden = currentTool !== 'censor';

    if (currentTool === 'shape') {
      shapeSizeField.hidden = shapeFillMode.value !== 'stroke';
    }
    const isBlur = currentTool === 'censor' && censorType.value === 'blur';
    blurField.hidden = !isBlur;
    blurWarning.hidden = !isBlur;
    censorColorField.hidden = currentTool !== 'censor' || censorType.value !== 'color';
    censorSizeField.hidden = currentTool !== 'censor' || censorShape.value !== 'free';

    if (currentTool !== 'text') {
      commitTextInput();
    }
  }

  async function loadCapture() {
    const params = new URLSearchParams(location.search);
    const libraryId = params.get('project');
    const captureId = params.get('capture');
    if (libraryId) {
      try {
        const record = await CaptureStore.getLibraryProject(libraryId);
        if (!record?.blob) throw new Error('Projet introuvable');
        await openProject(record.blob, record);
      } catch (error) { showLoadError(error.message); }
      document.body.setAttribute('aria-busy', 'false');
      return;
    }
    if (!captureId) {
      selectCompositionItem(null);
      document.body.setAttribute('aria-busy', 'false');
      return;
    }
    if (captureRecord && captureRecord.id === captureId && baseImage) {
      container.hidden = false;
      emptyState.hidden = true;
      updateRecordMetadata();
      setEditorReady(true);
      return;
    }
    try {
      const record = await CaptureStore.getCapture(captureId);
      if (!record || !record.blob) throw new Error(getI18nText('captureLoadError'));
      const bitmap = await createImageBitmap(record.blob);
      const item = makeSessionItem(bitmap, record);
      compositionItems.push(item);
      selectCompositionItem(item.id);
      chrome.runtime.sendMessage({ action: 'ACK_CAPTURE_LOADED', captureId }, () => {
        if (chrome.runtime.lastError) console.warn('Capture cleanup acknowledgement failed:', chrome.runtime.lastError.message);
      });
      rebuildCommittedSurface();
      container.hidden = false;
      emptyState.hidden = true;
      updateRecordMetadata();
      setEditorReady(true);
      fitToScreen();
      updateCaptureNotice();
      showToast(getI18nText('captureReady'));
    } catch (error) {
      console.error('Capture loading failed:', error);
      showLoadError(error.message);
    }
  }

  function showLoadError(message) {
    pageTitle.textContent = getI18nText('captureLoadError');
    pageMeta.textContent = '';
    emptyState.hidden = false;
    emptyState.textContent = message;
    container.hidden = true;
    setEditorReady(false);
    document.body.setAttribute('aria-busy', 'false');
  }

  function editableOperations() {
    return operations.map((operation, index) => {
      if (!globalThis.ScionosAnnotationModel.isValid(operation)) return null;
      for (const later of operations.slice(index + 1)) {
        if (later.kind === 'crop') return null;
        if (later.kind === 'censor') {
          const a = globalThis.ScionosAnnotationModel.bounds(operation, { context });
          const b = operationBounds(later, canvas.width, canvas.height);
          if (a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y) return null;
        }
      }
      return operation;
    });
  }

  function updateAnnotationControls() {
    const operation = currentTool === 'select' ? operations[selectedAnnotation] : null;
    const controls = byId('annotation-controls');
    controls.hidden = !operation || !globalThis.ScionosAnnotationModel.isValid(operation);
    if (controls.hidden) return;
    byId('annotation-color').value = /^#[0-9a-f]{6}$/iu.test(operation.color || '') ? operation.color : '#000000';
    byId('annotation-width').value = operation.fontSize || operation.radius || operation.width || 4;
    byId('annotation-text').disabled = operation.kind !== 'text';
    if (document.activeElement !== byId('annotation-text')) byId('annotation-text').value = operation.kind === 'text' ? operation.text : '';
  }

  function updateSelectedAnnotation(next) {
    if (selectedAnnotation < 0 || !next) return;
    recordAnnotationHistory();
    operations[selectedAnnotation] = next;
    historyRevision += 1;
    rebuildCommittedSurface();
    markDocumentDirty();
  }

  canvas.addEventListener('pointerdown', event => {
    if (!baseImage || event.button !== 0 || annotationDrag || activePointerId !== null) return;
    const point = getCanvasCoords(event);
    if (currentTool === 'select') {
      const model = globalThis.ScionosAnnotationModel;
      const choices = editableOperations();
      const current = choices[selectedAnnotation];
      const handle = current ? model.hitHandle(model.bounds(current, { context }), point, { radius: 8 / currentZoom }) : null;
      if (!handle) selectedAnnotation = model.hitTest(choices, point, { context, tolerance: 5 / currentZoom });
      const selected = choices[selectedAnnotation];
      if (selected) {
        annotationDrag = { pointerId: event.pointerId, itemId: activeItemId, index: selectedAnnotation, original: globalThis.structuredClone(selected), point, handle, moved: false };
        canvas.setPointerCapture(event.pointerId);
      }
      renderCanvas();
      return;
    }
    if (currentTool === 'text') {
      event.preventDefault();
      openTextInput(point);
      return;
    }
    if (currentTool === 'step') {
      commitOperation({
        kind: 'step',
        x: Math.round(point.x),
        y: Math.round(point.y),
        number: currentStepNumber,
        color: stepColor.value,
        radius: Number(stepSize.value)
      });
      currentStepNumber++;
      updateStepBadge();
      return;
    }
    activePointerId = event.pointerId;
    canvas.setPointerCapture(activePointerId);
    geometryPanel.hidden = true;
    if (currentTool === 'draw') {
      draftOperation = { kind: 'draw', color: drawColor.value, width: Number(drawSize.value), points: [point] };
    } else if (currentTool === 'highlight') {
      draftOperation = { kind: 'highlight', color: drawColor.value, width: Math.max(12, Number(drawSize.value) * 2), points: [point] };
    } else if (currentTool === 'arrow') {
      draftOperation = { kind: 'arrow', start: point, end: point, color: arrowColor.value, width: Number(arrowSize.value) };
    } else if (currentTool === 'shape') {
      draftOperation = {
        kind: 'shape', shape: shapeType.value, mode: shapeFillMode.value,
        color: shapeColor.value, width: Number(shapeSize.value), start: point, end: point
      };
    } else if (currentTool === 'censor') {
      draftOperation = createCensorOperation(point, point);
    } else {
      draftOperation = { kind: 'crop', start: point, end: point };
    }
  });

  canvas.addEventListener('pointermove', event => {
    if (annotationDrag && currentTool === 'select') {
      if (event.pointerId !== annotationDrag.pointerId || annotationDrag.itemId !== activeItemId) return;
      const point = getCanvasCoords(event);
      const deltaX = point.x - annotationDrag.point.x, deltaY = point.y - annotationDrag.point.y;
      const model = globalThis.ScionosAnnotationModel;
      const next = annotationDrag.handle ? model.resize(annotationDrag.original, annotationDrag.handle, point, { context }) : model.move(annotationDrag.original, deltaX, deltaY);
      if (!annotationDrag.moved && Math.hypot(deltaX, deltaY) > 0.5) { recordAnnotationHistory(); annotationDrag.moved = true; }
      if (annotationDrag.moved) { operations[annotationDrag.index] = next; historyRevision += 1; rebuildCommittedSurface(); markDocumentDirty(); }
      return;
    }
    if (!draftOperation || event.pointerId !== activePointerId) return;
    const point = getCanvasCoords(event);
    if (draftOperation.kind === 'draw' || draftOperation.kind === 'highlight' || draftOperation.shape === 'free') {
      const previous = draftOperation.points[draftOperation.points.length - 1];
      if (!previous || Math.hypot(point.x - previous.x, point.y - previous.y) >= 0.75) draftOperation.points.push(point);
    } else {
      draftOperation.end = point;
    }
    scheduleRender();
  });

  canvas.addEventListener('pointerup', async event => {
    if (annotationDrag && currentTool === 'select') {
      finishAnnotationDrag(event.pointerId);
      return;
    }
    if (!draftOperation || event.pointerId !== activePointerId) return;
    const operation = draftOperation;
    const point = getCanvasCoords(event);
    if (operation.kind !== 'draw' && operation.kind !== 'highlight' && operation.shape !== 'free') operation.end = point;
    else if (operation.points && operation.points.length === 1) operation.points.push(point);
    activePointerId = null;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    if (operation.kind === 'crop' || (operation.kind === 'censor' && operation.shape !== 'free')) showGeometry(operation);
    else await commitOperation(operation);
  });
  canvas.addEventListener('pointercancel', event => {
    if (event.pointerId === activePointerId) cancelDraft();
    else finishAnnotationDrag(event.pointerId, { release: false });
  });
  canvas.addEventListener('lostpointercapture', event => {
    if (event.pointerId === activePointerId) cancelDraft();
    else finishAnnotationDrag(event.pointerId, { release: false });
  });

  canvas.addEventListener('keydown', event => {
    if (currentTool === 'select' && selectedAnnotation >= 0) {
      const selected = operations[selectedAnnotation];
      if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); byId('annotation-delete').click(); return; }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') { event.preventDefault(); byId('annotation-duplicate').click(); return; }
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
        event.preventDefault();
        const step = event.ctrlKey ? 10 : 1;
        const dx = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0;
        const dy = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0;
        const model = globalThis.ScionosAnnotationModel;
        const box = model.bounds(selected, { context });
        const next = event.shiftKey ? model.resize(selected, 'se', { x: box.x + box.width + dx, y: box.y + box.height + dy }, { context }) : model.move(selected, dx, dy);
        updateSelectedAnnotation(next);
        return;
      }
    }
    if (!['crop', 'censor'].includes(currentTool) || censorShape.value === 'free') return;
    if (!draftOperation) prepareKeyboardGeometry();
    if (!draftOperation) return;
    const step = event.ctrlKey ? 10 : 1;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault();
      const dx = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0;
      const dy = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0;
      if (event.shiftKey) draftOperation.end = { x: draftOperation.end.x + dx, y: draftOperation.end.y + dy };
      else {
        draftOperation.start = { x: draftOperation.start.x + dx, y: draftOperation.start.y + dy };
        draftOperation.end = { x: draftOperation.end.x + dx, y: draftOperation.end.y + dy };
      }
      syncGeometry(draftOperation);
      scheduleRender();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      commitOperation(draftOperation);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancelDraft();
    }
  });

  geometryPanel.addEventListener('input', event => {
    if (!Object.values(geometryInputs).includes(event.target)) return;
    draftOperation = operationFromGeometry();
    scheduleRender();
  });
  geometryApply.addEventListener('click', () => commitOperation(draftOperation || operationFromGeometry()));
  geometryCancel.addEventListener('click', cancelDraft);

  toolButtons.forEach(button => button.addEventListener('click', () => {
    const wasActive = currentTool === button.dataset.tool;
    setActiveTool(button.dataset.tool);
    if (wasActive || ['crop', 'censor'].includes(currentTool)) prepareKeyboardGeometry();
  }));

  document.getElementById('editor-toolbar').addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key) || !toolButtons.includes(document.activeElement)) return;
    event.preventDefault();
    const index = toolButtons.indexOf(document.activeElement);
    toolButtons[(index + (event.key === 'ArrowRight' ? 1 : -1) + toolButtons.length) % toolButtons.length].focus();
  });

  function restoreAnnotationHistory(from, to) {
    if (!from.length) return;
    to.push({ operations: globalThis.structuredClone(operations), step: currentStepNumber });
    const state = from.pop();
    operations = state.operations;
    currentStepNumber = state.step;
    selectedAnnotation = -1;
    historyRevision += 1;
    cancelDraft();
    rebuildCommittedSurface();
    updateStepBadge();
    markDocumentDirty();
  }
  undoButton.addEventListener('click', () => restoreAnnotationHistory(annotationUndo, annotationRedo));
  redoButton.addEventListener('click', () => restoreAnnotationHistory(annotationRedo, annotationUndo));

  censorType.addEventListener('change', () => {
    updateControlVisibility();
    if (draftOperation && draftOperation.kind === 'censor') {
      draftOperation.type = censorType.value;
      draftOperation.color = censorColor.value;
      draftOperation.blur = Number(blurIntensity.value);
      scheduleRender();
    }
  });
  censorShape.addEventListener('change', () => {
    cancelDraft();
    updateControlVisibility();
    if (censorShape.value !== 'free') prepareKeyboardGeometry();
  });
  censorColor.addEventListener('input', () => {
    if (draftOperation && draftOperation.kind === 'censor') {
      draftOperation.color = censorColor.value;
      scheduleRender();
    }
  });
  blurIntensity.addEventListener('input', () => {
    blurIntensityValue.textContent = `${blurIntensity.value}px`;
    blurIntensity.setAttribute('aria-valuetext', `${blurIntensity.value}px`);
    if (draftOperation && draftOperation.kind === 'censor') {
      draftOperation.blur = Number(blurIntensity.value);
      scheduleRender();
    }
  });

  if (arrowSize) {
    arrowSize.addEventListener('change', () => {
      if (draftOperation && draftOperation.kind === 'arrow') {
        draftOperation.width = Number(arrowSize.value);
        scheduleRender();
      }
    });
  }
  if (arrowColor) {
    arrowColor.addEventListener('input', () => {
      if (draftOperation && draftOperation.kind === 'arrow') {
        draftOperation.color = arrowColor.value;
        scheduleRender();
      }
    });
  }

  if (shapeType) {
    shapeType.addEventListener('change', () => {
      if (draftOperation && draftOperation.kind === 'shape') {
        draftOperation.shape = shapeType.value;
        scheduleRender();
      }
    });
  }
  if (shapeFillMode) {
    shapeFillMode.addEventListener('change', () => {
      updateControlVisibility();
      if (draftOperation && draftOperation.kind === 'shape') {
        draftOperation.mode = shapeFillMode.value;
        scheduleRender();
      }
    });
  }
  if (shapeSize) {
    shapeSize.addEventListener('change', () => {
      if (draftOperation && draftOperation.kind === 'shape') {
        draftOperation.width = Number(shapeSize.value);
        scheduleRender();
      }
    });
  }
  if (shapeColor) {
    shapeColor.addEventListener('input', () => {
      if (draftOperation && draftOperation.kind === 'shape') {
        draftOperation.color = shapeColor.value;
        scheduleRender();
      }
    });
  }

  if (btnStepReset) {
    btnStepReset.addEventListener('click', () => {
      currentStepNumber = 1;
      markDocumentDirty();
      updateStepBadge();
    });
  }

  if (btnHelp) {
    btnHelp.addEventListener('click', () => {
      window.open(chrome.runtime.getURL('help.html'), '_blank');
    });
  }

  if (textInputOverlay) {
    textInputOverlay.addEventListener('keydown', event => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        commitTextInput();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        cancelTextInput();
      }
    });
    // Preserve the draft when focus moves to document or export controls.
    // Enter applies it and Escape cancels it explicitly.
    textInputOverlay.addEventListener('blur', () => { renderCanvas(); });
  }

  zoomInButton.addEventListener('click', () => applyZoom(currentZoom + 0.15));
  zoomOutButton.addEventListener('click', () => applyZoom(currentZoom - 0.15));
  zoomResetButton.addEventListener('click', fitToScreen);

  byId('annotation-delete').addEventListener('click', () => {
    if (selectedAnnotation < 0) return;
    recordAnnotationHistory(); operations.splice(selectedAnnotation, 1); selectedAnnotation = -1;
    historyRevision += 1; rebuildCommittedSurface(); markDocumentDirty();
  });
  byId('annotation-duplicate').addEventListener('click', () => {
    if (selectedAnnotation < 0) return;
    const copy = globalThis.ScionosAnnotationModel.move(operations[selectedAnnotation], 10, 10);
    copy.id = crypto.randomUUID(); recordAnnotationHistory(); operations.push(copy); selectedAnnotation = operations.length - 1;
    historyRevision += 1; rebuildCommittedSurface(); markDocumentDirty();
  });
  for (const property of ['color', 'width', 'text']) byId(`annotation-${property}`).addEventListener('change', event => {
    const operation = operations[selectedAnnotation];
    if (!operation) return;
    const next = { ...operation };
    if (property === 'color') next.color = event.target.value;
    else if (property === 'text' && operation.kind === 'text' && event.target.value.trim()) next.text = event.target.value;
    else if (property === 'width') next[operation.kind === 'text' ? 'fontSize' : operation.kind === 'step' ? 'radius' : 'width'] = Math.max(1, Math.min(256, Number(event.target.value) || 1));
    updateSelectedAnnotation(next);
  });
  byId('btn-save-library').addEventListener('click', saveLibraryProject);
  byId('btn-open-library').addEventListener('click', () => window.open(chrome.runtime.getURL('library.html'), '_blank'));
  byId('btn-import-images').addEventListener('click', () => { if (allowDocumentAction()) byId('image-files').click(); });
  byId('image-files').addEventListener('change', event => { const files = Array.from(event.target.files); event.target.value = ''; void importImages(files); });
  byId('btn-open-project').addEventListener('click', () => { if (allowDocumentAction()) byId('project-file').click(); });
  byId('project-file').addEventListener('change', event => { const file = event.target.files[0]; event.target.value = ''; void openProject(file); });
  byId('btn-save-project').addEventListener('click', saveProject);
  document.addEventListener('paste', event => {
    const target = event.target;
    if (target && (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable)) return;
    const files = Array.from(event.clipboardData?.items || []).filter(item => item.kind === 'file' && item.type.startsWith('image/')).map(item => item.getAsFile()).filter(Boolean);
    if (files.length) { event.preventDefault(); void importImages(files); }
  });
  for (const key of ['title', 'direction', 'gap', 'padding', 'background', 'numbered']) {
    byId(`composition-${key}`).addEventListener('input', event => {
      const input = event.target;
      rememberComposition();
      compositionSettings[key] = key === 'numbered' ? input.checked : ['gap', 'padding'].includes(key) ? Math.max(0, Math.min(200, Number(input.value) || 0)) : input.value;
      markDocumentDirty();
      refreshComposition();
    });
  }
  for (const key of ['title', 'caption']) {
    byId(`item-${key}`).addEventListener('input', event => {
      const item = compositionItems.find(entry => entry.id === activeItemId);
      if (!item) return;
      rememberComposition();
      item[key] = event.target.value;
      markDocumentDirty();
      refreshComposition();
    });
  }
  function moveCompositionItem(delta) {
    if (!allowDocumentAction()) return;
    const index = compositionItems.findIndex(item => item.id === activeItemId);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= compositionItems.length) return;
    rememberComposition();
    [compositionItems[index], compositionItems[target]] = [compositionItems[target], compositionItems[index]];
    markDocumentDirty();
    refreshComposition();
  }
  byId('composition-undo').addEventListener('click', () => restoreCompositionHistory(compositionUndoStack, compositionRedoStack));
  byId('composition-redo').addEventListener('click', () => restoreCompositionHistory(compositionRedoStack, compositionUndoStack));
  byId('item-up').addEventListener('click', () => moveCompositionItem(-1));
  byId('item-down').addEventListener('click', () => moveCompositionItem(1));
  byId('item-remove').addEventListener('click', () => {
    if (!allowDocumentAction()) return;
    const index = compositionItems.findIndex(item => item.id === activeItemId);
    if (index < 0) return;
    const [removed] = compositionItems.splice(index, 1);
    resetCompositionHistory();
    activeItemId = null;
    removed.baseImage.close?.();
    selectCompositionItem(compositionItems[Math.min(index, compositionItems.length - 1)]?.id);
    markDocumentDirty();
  });
  downloadButton.addEventListener('click', () => openExport('png'));
  htmlButton.addEventListener('click', () => { void runCompositionExport('html'); });
  printButton.addEventListener('click', () => openExport('pdf'));
  copyButton.addEventListener('click', async () => {
    try {
      const snapshot = await snapshotComposition();
      if (!snapshot) return;
      const result = await globalThis.ScionosCompositionExport.image(snapshot, 'png', 1);
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': result.blob })]);
      showToast(getI18nText('copied'));
    } catch (error) { showToast(compositionText('failure') + error.message, true); }
  });
  byId('source-policy').addEventListener('change', markDocumentDirty);
  byId('export-format').addEventListener('change', updateExportFields);
  byId('export-confirm').addEventListener('click', () => { void runCompositionExport(byId('export-format').value); });
  byId('export-cancel').addEventListener('click', () => byId('export-dialog').close());
  byId('pdf-settings').addEventListener('change', () => {
    byId('pdf-scale').disabled = byId('pdf-fit').checked;
    markDocumentDirty();
  });
  document.addEventListener('keydown', event => {
    const active = document.activeElement;
    const typing = active && (/^(INPUT|SELECT|TEXTAREA)$/.test(active.tagName) || active.isContentEditable);
    if (typing) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      (event.shiftKey ? redoButton : undoButton).click();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
      event.preventDefault();
      redoButton.click();
      return;
    }
    if (typing || event.ctrlKey || event.metaKey || event.altKey) return;
    const shortcuts = {
      v: 'select',
      d: 'draw',
      h: 'highlight',
      a: 'arrow',
      s: 'shape',
      t: 'text',
      p: 'step',
      m: 'censor',
      c: 'crop'
    };
    if (shortcuts[event.key.toLowerCase()]) setActiveTool(shortcuts[event.key.toLowerCase()]);
    if (event.key === '+') applyZoom(currentZoom + 0.15);
    if (event.key === '-') applyZoom(currentZoom - 0.15);
    if (event.key === '0') fitToScreen();
  });

  await initI18n();
  const languageMenu = ScionosI18n.setupLanguageMenu({
    button: document.getElementById('language-button'),
    menu: document.getElementById('language-menu'),
    flag: document.getElementById('language-flag'),
    code: document.getElementById('language-code')
  });
  updateTexts();
  updateControlVisibility();
  setEditorReady(false);
  await loadCapture();

  window.addEventListener('scionos-language-change', () => {
    updateTexts();
    languageMenu.update();
  });
  window.addEventListener('beforeunload', event => {
    if (documentDirty || hasPendingEdit()) {
      event.preventDefault();
      event.returnValue = '';
    }
  });
  window.addEventListener('pagehide', () => {
    compositionItems.forEach(item => item.baseImage.close?.());
  });
});
