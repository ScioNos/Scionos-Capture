// Local project library. Stored projects remain under explicit user control.
(function initializeLibrary() {
  'use strict';
  const MiB = 1024 * 1024;
  const strings = {
    fr: { title:'Bibliothèque', newProject:'Nouveau document', intro:'Vos projets sont conservés localement dans ce navigateur.', search:'Rechercher par titre ou source', settings:'Stockage local', retention:'Durée de conservation', forever:'Sans expiration', days7:'7 jours', days30:'30 jours', days90:'90 jours', budget:'Limite (Mio)', saveSettings:'Enregistrer les réglages', retentionHelp:'Les projets expirés sont supprimés automatiquement. Exportez vos projets pour les conserver séparément.', deleteAll:'Supprimer tous les projets', empty:'Aucun projet enregistré.', noMatch:'Aucun projet ne correspond à la recherche.', open:'Ouvrir', rename:'Renommer', duplicate:'Dupliquer', export:'Exporter', remove:'Supprimer', renamePrompt:'Nouveau titre du projet :', duplicateSuffix:' — copie', deleteConfirm:'Supprimer ce projet de la bibliothèque ?', deleteAllConfirm:'Supprimer définitivement tous les projets de la bibliothèque ?', saved:'Réglages enregistrés.', removed:'Projet supprimé.', allRemoved:'Tous les projets ont été supprimés.', renamed:'Projet renommé.', duplicated:'Projet dupliqué.', failed:'Opération impossible : ', invalidBudget:'La limite doit être un entier entre 64 et 1024 Mio.', used:'{used} Mio utilisés sur {limit} Mio', updated:'Modifié le {date}', untitled:'Sans titre', loading:'Chargement…' },
    en: { title:'Library', newProject:'New document', intro:'Your projects are stored locally in this browser.', search:'Search by title or source', settings:'Local storage', retention:'Retention period', forever:'No expiration', days7:'7 days', days30:'30 days', days90:'90 days', budget:'Limit (MiB)', saveSettings:'Save settings', retentionHelp:'Expired projects are deleted automatically. Export projects to keep a separate copy.', deleteAll:'Delete all projects', empty:'No saved projects.', noMatch:'No projects match your search.', open:'Open', rename:'Rename', duplicate:'Duplicate', export:'Export', remove:'Delete', renamePrompt:'New project title:', duplicateSuffix:' — copy', deleteConfirm:'Delete this project from the library?', deleteAllConfirm:'Permanently delete all library projects?', saved:'Settings saved.', removed:'Project deleted.', allRemoved:'All projects deleted.', renamed:'Project renamed.', duplicated:'Project duplicated.', failed:'Operation failed: ', invalidBudget:'The limit must be a whole number between 64 and 1024 MiB.', used:'{used} MiB used of {limit} MiB', updated:'Updated {date}', untitled:'Untitled', loading:'Loading…' },
    es: { title:'Biblioteca', newProject:'Nuevo documento', intro:'Tus proyectos se guardan localmente en este navegador.', search:'Buscar por título o fuente', settings:'Almacenamiento local', retention:'Periodo de conservación', forever:'Sin caducidad', days7:'7 días', days30:'30 días', days90:'90 días', budget:'Límite (MiB)', saveSettings:'Guardar ajustes', retentionHelp:'Los proyectos caducados se eliminan automáticamente. Exporta los proyectos para guardar una copia aparte.', deleteAll:'Eliminar todos los proyectos', empty:'No hay proyectos guardados.', noMatch:'Ningún proyecto coincide con la búsqueda.', open:'Abrir', rename:'Renombrar', duplicate:'Duplicar', export:'Exportar', remove:'Eliminar', renamePrompt:'Nuevo título del proyecto:', duplicateSuffix:' — copia', deleteConfirm:'¿Eliminar este proyecto de la biblioteca?', deleteAllConfirm:'¿Eliminar definitivamente todos los proyectos de la biblioteca?', saved:'Ajustes guardados.', removed:'Proyecto eliminado.', allRemoved:'Todos los proyectos se eliminaron.', renamed:'Proyecto renombrado.', duplicated:'Proyecto duplicado.', failed:'No se pudo completar: ', invalidBudget:'El límite debe ser un entero entre 64 y 1024 MiB.', used:'{used} MiB utilizados de {limit} MiB', updated:'Modificado el {date}', untitled:'Sin título', loading:'Cargando…' },
    de: { title:'Bibliothek', newProject:'Neues Dokument', intro:'Ihre Projekte werden lokal in diesem Browser gespeichert.', search:'Nach Titel oder Quelle suchen', settings:'Lokaler Speicher', retention:'Aufbewahrungsdauer', forever:'Kein Ablauf', days7:'7 Tage', days30:'30 Tage', days90:'90 Tage', budget:'Limit (MiB)', saveSettings:'Einstellungen speichern', retentionHelp:'Abgelaufene Projekte werden automatisch gelöscht. Exportieren Sie Projekte für eine separate Kopie.', deleteAll:'Alle Projekte löschen', empty:'Keine gespeicherten Projekte.', noMatch:'Keine passenden Projekte gefunden.', open:'Öffnen', rename:'Umbenennen', duplicate:'Duplizieren', export:'Exportieren', remove:'Löschen', renamePrompt:'Neuer Projekttitel:', duplicateSuffix:' — Kopie', deleteConfirm:'Dieses Projekt aus der Bibliothek löschen?', deleteAllConfirm:'Alle Projekte in der Bibliothek endgültig löschen?', saved:'Einstellungen gespeichert.', removed:'Projekt gelöscht.', allRemoved:'Alle Projekte wurden gelöscht.', renamed:'Projekt umbenannt.', duplicated:'Projekt dupliziert.', failed:'Vorgang fehlgeschlagen: ', invalidBudget:'Das Limit muss eine ganze Zahl zwischen 64 und 1024 MiB sein.', used:'{used} MiB von {limit} MiB belegt', updated:'Geändert am {date}', untitled:'Ohne Titel', loading:'Wird geladen…' }
  };
  const byId = id => document.getElementById(id);
  const text = (key, values = {}) => Object.entries(values).reduce((message, [name, value]) => message.replaceAll(`{${name}}`, String(value)), (strings[ScionosI18n.language] || strings.en)[key] || key);
  let records = [];
  let settings = { quotaBytes: 256 * MiB, retentionDays: null };
  let urls = [];
  let busy = false;
  let refreshRevision = 0;
  let browserStorage = null;

  const retentionDescriptions = {
    fr: 'La durée choisie s’applique aux prochains enregistrements ou mises à jour. Les échéances existantes restent inchangées. Les projets expirés sont supprimés automatiquement.',
    en: 'The selected period applies to future saves or updates. Existing expiry dates stay unchanged. Expired projects are deleted automatically.',
    es: 'El periodo elegido se aplica a los próximos guardados o actualizaciones. Las fechas existentes no cambian. Los proyectos caducados se eliminan automáticamente.',
    de: 'Die gewählte Dauer gilt für künftige Speicherungen oder Aktualisierungen. Bestehende Ablaufdaten bleiben unverändert. Abgelaufene Projekte werden automatisch gelöscht.'
  };
  function notifyChanged() {
    try { chrome.runtime.sendMessage({ action: 'LIBRARY_PROJECTS_CHANGED' }, () => { void chrome.runtime.lastError; }); }
    catch (error) { console.warn('Library change notification failed:', error); }
  }
  const expiresLabels = { fr: 'Expire le', en: 'Expires', es: 'Caduca el', de: 'Läuft ab am' };
  function setStatus(message, error = false) {
    const status = byId('library-status');
    status.textContent = message;
    status.classList.toggle('error', error);
    status.setAttribute('role', error ? 'alert' : 'status');
  }
  function revokeThumbnails() { urls.forEach(url => URL.revokeObjectURL(url)); urls = []; }
  function setBusy(value) {
    busy = value;
    for (const button of document.querySelectorAll('#project-list button, #save-preferences, #delete-all')) button.disabled = value;
  }
  function dateLabel(value) {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? text('updated', { date: date.toLocaleString(ScionosI18n.language) }) : '';
  }
  function openProject(id) { location.href = chrome.runtime.getURL(`editor.html?project=${encodeURIComponent(id)}`); }
  function download(blob, title) {
    const anchor = document.createElement('a');
    const name = Array.from(String(title || 'Scionos_Capture'), char => char.codePointAt(0) < 32 || /[\\/:*?"<>|]/u.test(char) ? '_' : char).join('').trim().slice(0, 100) || 'Scionos_Capture';
    const url = URL.createObjectURL(blob);
    anchor.href = url;
    anchor.download = `${name}.scionos`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
  async function run(action, success) {
    if (busy) return;
    setBusy(true);
    try {
      await action();
      notifyChanged();
      await refresh();
      if (success) setStatus(text(success));
    } catch (error) {
      try { await refresh(); } catch (refreshError) { console.warn('Library refresh failed:', refreshError); }
      notifyChanged();
      setStatus(text('failed') + (error?.message || String(error)), true);
    } finally { setBusy(false); }
  }
  function cardButton(label, handler, danger = false) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = text(label);
    if (danger) button.className = 'danger';
    button.addEventListener('click', handler);
    return button;
  }
  function render() {
    revokeThumbnails();
    const list = byId('project-list');
    list.replaceChildren();
    const search = byId('library-search').value.trim().toLocaleLowerCase(ScionosI18n.language);
    const visible = records.filter(record => [record.title, record.source].some(value => String(value || '').toLocaleLowerCase(ScionosI18n.language).includes(search)));
    byId('library-empty').hidden = visible.length > 0;
    byId('library-empty').textContent = text(records.length ? 'noMatch' : 'empty');
    for (const record of visible) {
      const li = document.createElement('li');
      li.className = 'card';
      const image = document.createElement('img');
      image.className = 'thumbnail';
      image.alt = '';
      if (record.thumbnail instanceof Blob && record.thumbnail.size && /^image\/(png|jpeg|webp)$/u.test(record.thumbnail.type)) {
        const url = URL.createObjectURL(record.thumbnail); urls.push(url); image.src = url;
      } else { image.hidden = true; }
      const body = document.createElement('div'); body.className = 'card-content';
      const title = document.createElement('h2'); title.textContent = record.title || text('untitled');
      const meta = document.createElement('p'); meta.className = 'meta';
      const expiration = record.expiresAt == null ? '' : `${expiresLabels[ScionosI18n.language] || expiresLabels.en} ${new Date(record.expiresAt).toLocaleString(ScionosI18n.language)}`;
      meta.textContent = [record.source || '', dateLabel(record.updatedAt), expiration].filter(Boolean).join(' · ');
      const actions = document.createElement('div'); actions.className = 'actions';
      actions.append(
        cardButton('open', () => openProject(record.id)),
        cardButton('rename', () => {
          const titleValue = window.prompt(text('renamePrompt'), record.title || '');
          if (titleValue === null) return;
          const newTitle = titleValue.trim();
          if (!newTitle || newTitle === record.title) return;
          void run(async () => {
            const current = await CaptureStore.getLibraryProject(record.id);
            if (!current || current.revision !== record.revision) throw new Error('Project changed or no longer exists.');
            const project = await globalThis.ScionosCompositionUtils.decodeProject(current.blob);
            project.title = newTitle;
            project.settings.title = newTitle;
            const blob = await globalThis.ScionosCompositionUtils.encodeProject(project);
            await CaptureStore.saveLibraryProject({ id: current.id, title: newTitle, source: current.source, thumbnail: current.thumbnail, blob }, { expectedRevision: current.revision });
          }, 'renamed');
        }),
        cardButton('duplicate', () => { void run(async () => {
          const current = await CaptureStore.getLibraryProject(record.id);
          if (!current || current.revision !== record.revision) throw new Error('Project changed or no longer exists.');
          const newTitle = (record.title || text('untitled')) + text('duplicateSuffix');
          const project = await globalThis.ScionosCompositionUtils.decodeProject(current.blob);
          project.title = newTitle;
          project.settings.title = newTitle;
          const blob = await globalThis.ScionosCompositionUtils.encodeProject(project);
          await CaptureStore.saveLibraryProject({ id: crypto.randomUUID(), title: newTitle, source: current.source, thumbnail: current.thumbnail, blob }, { expectedRevision: null });
        }, 'duplicated'); }),
        cardButton('export', () => { void run(async () => { const project = await CaptureStore.getLibraryProject(record.id); if (!project || project.revision !== record.revision) throw new Error('Project changed or no longer exists.'); download(project.blob, project.title); }); }),
        cardButton('remove', () => { if (window.confirm(text('deleteConfirm'))) void run(() => CaptureStore.deleteLibraryProject(record.id, record.revision), 'removed'); }, true)
      );
      body.append(title, meta, actions); li.append(image, body); list.append(li);
    }
    const total = records.reduce((sum, record) => sum + (Number(record.size) || 0), 0);
    byId('storage-estimate').textContent = text('used', { used: (total / MiB).toFixed(2), limit: (settings.quotaBytes / MiB).toFixed(0) });
    if (browserStorage && Number.isFinite(browserStorage.usage) && Number.isFinite(browserStorage.quota)) {
      const labels = { fr: 'Navigateur', en: 'Browser', es: 'Navegador', de: 'Browser' };
      byId('storage-estimate').textContent += ` · ${labels[ScionosI18n.language] || labels.en}: ${(browserStorage.usage / MiB).toFixed(2)} / ${(browserStorage.quota / MiB).toFixed(0)} MiB`;
    }
    if (busy) for (const button of list.querySelectorAll('button')) button.disabled = true;
  }
  async function refresh() {
    const revision = ++refreshRevision;
    const expired = await CaptureStore.purgeExpiredLibraryProjects(Date.now());
    if (expired.length) notifyChanged();
    const [nextRecords, nextSettings] = await Promise.all([CaptureStore.listLibraryProjects(), CaptureStore.getLibrarySettings()]);
    if (revision !== refreshRevision) return;
    records = nextRecords.sort((a, b) => b.updatedAt - a.updatedAt);
    settings = nextSettings;
    try { browserStorage = navigator.storage?.estimate ? await navigator.storage.estimate() : null; }
    catch { browserStorage = null; }
    if (revision !== refreshRevision) return;
    byId('retention-days').value = String(settings.retentionDays ?? 0);
    byId('budget-mib').value = String(settings.quotaBytes / MiB);
    render();
  }
  function updateLanguage() {
    document.title = `${text('title')} — Scionos Capture`;
    document.querySelectorAll('[data-text]').forEach(element => { element.textContent = text(element.dataset.text); });
    document.querySelector('[data-text="retentionHelp"]').textContent = retentionDescriptions[ScionosI18n.language] || retentionDescriptions.en;
    document.querySelector('[data-i18n="languageAuto"]').textContent = getI18nText('languageAuto');
    render();
  }
  document.addEventListener('DOMContentLoaded', async () => {
    await initI18n();
    ScionosI18n.setupLanguageMenu({ button: byId('language-button'), menu: byId('language-menu'), flag: byId('language-flag'), code: byId('language-code') });
    updateLanguage();
    byId('new-project').addEventListener('click', () => { location.href = chrome.runtime.getURL('editor.html'); });
    byId('library-search').addEventListener('input', render);
    byId('save-preferences').addEventListener('click', () => {
      const quota = Number(byId('budget-mib').value);
      const retentionDays = Number(byId('retention-days').value);
      if (!Number.isInteger(quota) || quota < 64 || quota > 1024 || ![0, 7, 30, 90].includes(retentionDays)) { setStatus(text('invalidBudget'), true); return; }
      void run(() => CaptureStore.setLibrarySettings({ quotaBytes: quota * MiB, retentionDays: retentionDays || null }), 'saved');
    });
    byId('delete-all').addEventListener('click', () => {
      if (!records.length || !window.confirm(text('deleteAllConfirm'))) return;
      void run(async () => { for (const record of records) await CaptureStore.deleteLibraryProject(record.id, record.revision); }, 'allRemoved');
    });
    window.addEventListener('scionos-language-change', updateLanguage);
    window.addEventListener('pagehide', revokeThumbnails);
    setStatus(text('loading'));
    try { await refresh(); setStatus(''); } catch (error) { setStatus(text('failed') + (error?.message || String(error)), true); }
  });
})();
