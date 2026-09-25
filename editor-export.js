// PNG, HTML, print and clipboard actions for the screenshot editor.
(function registerEditorExport(globalScope) {
  function bindEditorExport({ buttons, getCommittedSurface, getCaptureRecord, getTextBlocks, getI18nText, getLanguage, showToast, cancelDraft }) {
    const { downloadButton, htmlButton, printButton, copyButton } = buttons;
    const current = {
      get committedSurface() { return getCommittedSurface(); },
      get captureRecord() { return getCaptureRecord(); },
      get activeTextBlocks() { return getTextBlocks(); }
    };

    function canvasToBlob() {
      return new Promise((resolve, reject) => {
        current.committedSurface.toBlob(blob => blob ? resolve(blob) : reject(new Error('Image preparation failed.')), 'image/png');
      });
    }

    downloadButton.addEventListener('click', async () => {
      try {
        const blob = await canvasToBlob();
        const link = document.createElement('a');
        const title = current.captureRecord && current.captureRecord.title ? current.captureRecord.title : '';
        const baseName = ScionosCaptureUtils.sanitizeFilename(title, 'Scionos_Capture');
        const dateStr = new Date().toISOString().slice(0, 10);
        link.download = `${baseName}_${dateStr}.png`;
        link.href = URL.createObjectURL(blob);
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 5000);
        showToast(getI18nText('savedPng'));
      } catch (error) {
        showToast(getI18nText('exportError') + error.message, true);
      }
    });
    htmlButton.addEventListener('click', async () => {
      try {
        if (!current.committedSurface) return;
        const imageBlob = await canvasToBlob();
        const estimatedHtmlBytes = 32 + Math.ceil(imageBlob.size * 4 / 3);
        if (estimatedHtmlBytes > ScionosCaptureUtils.MAX_HTML_EXPORT_BYTES) {
          throw new Error('The HTML export exceeds the supported size limit.');
        }
        const dataUrl = await ScionosCaptureUtils.blobToDataUrl(imageBlob);
        const htmlContent = ScionosCaptureUtils.buildHtmlReport({
          title: current.captureRecord && current.captureRecord.title ? current.captureRecord.title : getI18nText('captureTitle'),
          url: current.captureRecord && current.captureRecord.url ? current.captureRecord.url : '',
          timestamp: current.captureRecord && current.captureRecord.timestamp ? current.captureRecord.timestamp : Date.now(),
          width: current.committedSurface.width,
          height: current.committedSurface.height,
          dataUrl,
          lang: getLanguage(),
          texts: {
            appName: getI18nText('appName'),
            reportSource: getI18nText('reportSource'),
            reportDate: getI18nText('reportDate'),
            reportDimensions: getI18nText('reportDimensions'),
            reportZoomFit: getI18nText('reportZoomFit'),
            reportZoomReset: getI18nText('reportZoomReset'),
            reportCopied: getI18nText('reportCopied'),
            btnPng: getI18nText('btnPng'),
            btnCopy: getI18nText('btnCopy'),
            btnPrint: getI18nText('btnPrint')
          }
        });
        if (htmlContent.length > ScionosCaptureUtils.MAX_HTML_EXPORT_BYTES) {
          throw new Error('The HTML export exceeds the supported size limit.');
        }

        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        const link = document.createElement('a');
        const title = current.captureRecord && current.captureRecord.title ? current.captureRecord.title : '';
        const baseName = ScionosCaptureUtils.sanitizeFilename(title, 'Scionos_Capture');
        const dateStr = new Date().toISOString().slice(0, 10);
        link.download = `${baseName}_${dateStr}.html`;
        link.href = URL.createObjectURL(blob);
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 5000);
        showToast(getI18nText('savedHtml'));
      } catch (error) {
        showToast(getI18nText('exportError') + error.message, true);
      }
    });
    printButton.addEventListener('click', async () => {
      try {
        cancelDraft();
        if (!current.committedSurface) return;
        const printArea = document.getElementById('print-area');
        if (printArea) {
          const title = current.captureRecord && current.captureRecord.title ? current.captureRecord.title : getI18nText('captureTitle');
          const safeUrl = ScionosCaptureUtils.sanitizeUrl(current.captureRecord && current.captureRecord.url ? current.captureRecord.url : '');
          const rawUrl = current.captureRecord && current.captureRecord.url ? current.captureRecord.url : '';
          const dateFormatted = current.captureRecord && current.captureRecord.timestamp
            ? new Date(current.captureRecord.timestamp).toLocaleString(getLanguage())
            : new Date().toLocaleString(getLanguage());
          const dataUrl = URL.createObjectURL(await canvasToBlob());

          const textSpans = (current.activeTextBlocks || []).map(block => {
            const left = (block.x / current.committedSurface.width * 100).toFixed(3);
            const top = (block.y / current.committedSurface.height * 100).toFixed(3);
            const width = (block.width / current.committedSurface.width * 100).toFixed(3);
            const height = (block.height / current.committedSurface.height * 100).toFixed(3);
            const fontSize = Math.max(8, Math.round(block.fontSize || 12));
            if (block.href) {
              const safeHref = ScionosCaptureUtils.sanitizeUrl(block.href);
              return `<a href="${ScionosCaptureUtils.escapeHtml(safeHref)}" target="_blank" rel="noopener noreferrer" style="left:${left}%; top:${top}%; width:${width}%; height:${height}%; font-size:${fontSize}px;">${ScionosCaptureUtils.escapeHtml(block.text)}</a>`;
            }
            return `<span style="left:${left}%; top:${top}%; width:${width}%; height:${height}%; font-size:${fontSize}px;">${ScionosCaptureUtils.escapeHtml(block.text)}</span>`;
          }).join('');

          printArea.innerHTML = `
            <div class="print-header">
              <h1>${ScionosCaptureUtils.escapeHtml(title)}</h1>
              <div class="print-meta">
                ${rawUrl ? `<span><strong>${ScionosCaptureUtils.escapeHtml(getI18nText('reportSource'))} :</strong> <a href="${ScionosCaptureUtils.escapeHtml(safeUrl)}">${ScionosCaptureUtils.escapeHtml(rawUrl)}</a></span>` : ''}
                <span><strong>${ScionosCaptureUtils.escapeHtml(getI18nText('reportDate'))} :</strong> ${ScionosCaptureUtils.escapeHtml(dateFormatted)}</span>
                <span><strong>${ScionosCaptureUtils.escapeHtml(getI18nText('reportDimensions'))} :</strong> ${current.committedSurface.width} × ${current.committedSurface.height} px</span>
              </div>
            </div>
            <div class="print-image-wrap">
              <img src="${dataUrl}" alt="${ScionosCaptureUtils.escapeHtml(title)}">
              <div class="searchable-text-layer" aria-hidden="true">${textSpans}</div>
            </div>
          `;
          const revokePrintUrl = () => {
            URL.revokeObjectURL(dataUrl);
            window.removeEventListener('afterprint', revokePrintUrl);
          };
          window.addEventListener('afterprint', revokePrintUrl, { once: true });
          setTimeout(revokePrintUrl, 60_000);
        }
        showToast(getI18nText('printOpened'));
        window.print();
      } catch (error) {
        showToast(getI18nText('exportError') + error.message, true);
      }
    });
    copyButton.addEventListener('click', async () => {
      try {
        const blob = await canvasToBlob();
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        showToast(getI18nText('copySuccess'));
      } catch (error) {
        showToast(getI18nText('copyError') + error.message, true);
      }
    });
  }

  globalScope.ScionosEditorExport = Object.freeze({ bind: bindEditorExport });
})(typeof globalThis !== 'undefined' ? globalThis : this);