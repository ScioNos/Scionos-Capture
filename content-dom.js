// DOM and layout services used by page capture workflows.
(function registerContentDom(globalScope) {
  function createContentDom({ Utils, text }) {
    const SCROLLABLE_OVERFLOW_VALUES = new Set(['auto', 'overlay', 'scroll']);

    // region is in surface CSS coordinates; returned rectangles are relative to it.
    // Export only complete words whose painted visibility can be established.
    function extractDomTextBlocks(region, surface = getDocumentScrollSurface()) {
      const blocks = [];
      blocks.limited = false;
      if (!region || region.width <= 0 || region.height <= 0) return blocks;
      const position = surface.getPosition();
      const viewport = surface.isDocument
        ? { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight }
        : surface.getCaptureRect();
      const originX = viewport.left - position.x;
      const originY = viewport.top - position.y;
      const clip = { left: originX + region.x, top: originY + region.y,
        right: originX + region.x + region.width, bottom: originY + region.y + region.height };
      const overlaps = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      const deadline = Date.now() + 500;
      const painted = [];
      for (const element of document.querySelectorAll('body *')) {
        if (Date.now() >= deadline) { blocks.limited = true; return blocks; }
        if (element.closest('[data-scionos-capture]')) continue;
        const rect = element.getBoundingClientRect();
        if (overlaps(rect, clip) && isRenderedVisible(element)) painted.push({ element, rect });
      }
      const ancestorReliability = new WeakMap();
      const colorContext = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
      colorContext.canvas.width = colorContext.canvas.height = 1;
      const colors = new Map();
      const opaqueColor = color => {
        if (!colors.has(color)) {
          colorContext.clearRect(0, 0, 1, 1);
          colorContext.fillStyle = 'transparent';
          colorContext.fillStyle = color;
          colorContext.fillRect(0, 0, 1, 1);
          colors.set(color, colorContext.getImageData(0, 0, 1, 1).data[3] === 255);
        }
        return colors.get(color);
      };
      const root = surface.isDocument ? (document.body || document.documentElement) : surface.element;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      try {
        textNodes: for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          if (Date.now() >= deadline) { blocks.limited = true; break; }
          const parent = node.parentElement;
          if (!parent || !node.nodeValue.trim() || parent.closest('script, style, noscript, template, [data-scionos-capture]')) continue;
          if (!isRenderedVisible(parent)) continue;
          const computed = getComputedStyle(parent);
          const link = parent.closest('a');
          for (const match of node.nodeValue.matchAll(/\S+/gu)) {
            if (Date.now() >= deadline || blocks.length >= 1500) { blocks.limited = true; break textNodes; }
            const range = document.createRange();
            range.setStart(node, match.index);
            range.setEnd(node, match.index + match[0].length);
            const rects = Array.from(range.getClientRects());
            const rect = range.getBoundingClientRect();
            if (!rect.width || !rect.height || !overlaps(rect, clip)) continue;
            let reliable = opaqueColor(computed.color) && opaqueColor(computed.webkitTextFillColor || computed.color)
              && computed.textTransform === 'none' && rects.length === 1 && rect.left >= clip.left && rect.right <= clip.right
              && rect.top >= clip.top && rect.bottom <= clip.bottom
              && rect.left >= viewport.left && rect.right <= Math.min(window.innerWidth, viewport.left + viewport.width)
              && rect.top >= viewport.top && rect.bottom <= Math.min(window.innerHeight, viewport.top + viewport.height);
            // Geometric overlaps are rejected even for pointer-events:none or a layer behind
            // the text. This deliberately prefers an image-only word to a privacy leak.
            if (reliable) reliable = !painted.some(item => item.element !== parent
              && !item.element.contains(parent) && !parent.contains(item.element) && overlaps(item.rect, rect));
            if (reliable) {
              for (let ancestor = parent; ancestor && reliable; ancestor = ancestor.parentElement) {
                if (!ancestorReliability.has(ancestor)) {
                  const style = getComputedStyle(ancestor);
                  let safe = parseFloat(style.opacity || '1') === 1 && style.filter === 'none'
                    && style.clipPath === 'none' && style.clip === 'auto'
                    && (!style.maskImage || style.maskImage === 'none')
                    && (!style.webkitMaskImage || style.webkitMaskImage === 'none')
                    && (!style.webkitTextSecurity || style.webkitTextSecurity === 'none');
                  for (const pseudo of ['::before', '::after']) {
                    const content = getComputedStyle(ancestor, pseudo).content;
                    if (content && content !== 'none' && content !== 'normal') safe = false;
                  }
                  ancestorReliability.set(ancestor, safe);
                }
                reliable = ancestorReliability.get(ancestor);
              }
            }
            if (reliable) {
              // Hit testing also catches clipping by nested overflow containers.
              for (const x of [rect.left + 0.5, (rect.left + rect.right) / 2, rect.right - 0.5]) {
                for (const y of [rect.top + 0.5, (rect.top + rect.bottom) / 2, rect.bottom - 0.5]) {
                  const hit = document.elementFromPoint(x, y);
                  if (!hit || !(hit === parent || parent.contains(hit))) reliable = false;
                }
              }
            }
            if (!reliable || blocks.length >= 1500) { blocks.limited = true; continue; }
            blocks.push({ text: match[0], x: rect.left - clip.left, y: rect.top - clip.top,
              width: rect.width, height: rect.height, fontSize: parseFloat(computed.fontSize) || 14,
              fontFamily: computed.fontFamily || 'sans-serif', isLink: Boolean(link && link.href),
              url: link && link.href ? link.href : null });
          }
        }
      } catch (error) { blocks.limited = true; console.warn('DOM text extraction failed:', error); }
      return blocks;
    }

    function isRenderedVisible(element) {
      try {
        if (element && typeof element.checkVisibility === 'function') {
          return element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
        }
      } catch {
        // Fall through to the computed-style check below.
      }
      const computed = window.getComputedStyle(element);
      return computed.visibility !== 'hidden'
        && computed.display !== 'none'
        && parseFloat(computed.opacity || '1') > 0.05;
    }

    function getDocumentScrollSurface() {
      const element = document.scrollingElement || document.documentElement;
      return {
        element,
        isDocument: true,
        getMetrics() {
          const viewportWidth = Math.max(1, element.clientWidth);
          const viewportHeight = Math.max(1, element.clientHeight);
          const scrollbarWidth = Math.max(0, window.innerWidth - viewportWidth);
          const scrollbarHeight = Math.max(0, window.innerHeight - viewportHeight);
          const measuredWidth = Math.max(element.scrollWidth, viewportWidth);
          const measuredHeight = Math.max(element.scrollHeight, viewportHeight);
          return {
            fullWidth: measuredWidth - viewportWidth <= scrollbarWidth + 2 ? viewportWidth : measuredWidth,
            fullHeight: measuredHeight - viewportHeight <= scrollbarHeight + 2 ? viewportHeight : measuredHeight,
            viewportWidth, viewportHeight
          };
        },
        getPosition() {
          return { x: window.scrollX, y: window.scrollY };
        },
        scrollTo(x, y) {
          window.scrollTo(x, y);
        },
        getCaptureRect() {
          return { left: 0, top: 0, width: element.clientWidth, height: element.clientHeight };
        }
      };
    }

    function getElementScrollSurface(element) {
      return {
        element,
        isDocument: false,
        getMetrics() {
          return {
            fullWidth: Math.max(element.scrollWidth, element.clientWidth),
            fullHeight: Math.max(element.scrollHeight, element.clientHeight),
            viewportWidth: Math.max(1, element.clientWidth),
            viewportHeight: Math.max(1, element.clientHeight)
          };
        },
        getPosition() {
          return { x: element.scrollLeft, y: element.scrollTop };
        },
        scrollTo(x, y) {
          element.scrollLeft = x;
          element.scrollTop = y;
          if (typeof element.scrollTo === 'function') {
            try {
              element.scrollTo({ left: x, top: y, behavior: 'instant' });
            } catch (_error) { void _error; }
          }
        },
        getCaptureRect() {
          const rect = element.getBoundingClientRect();
          return {
            left: rect.left + element.clientLeft,
            top: rect.top + element.clientTop,
            width: element.clientWidth,
            height: element.clientHeight
          };
        }
      };
    }

    function hasScrollRange(metrics) {
      return metrics.fullWidth > metrics.viewportWidth + 2
        || metrics.fullHeight > metrics.viewportHeight + 2;
    }

    function isVisibleScrollCandidate(element) {
      if (!element || element === document.documentElement || element.closest('[data-scionos-capture]')) return false;
      if (element.scrollWidth <= element.clientWidth + 2 && element.scrollHeight <= element.clientHeight + 2) return false;
      const rect = element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0
        || rect.left < -8 || rect.top < -8
        || rect.right > window.innerWidth + 8 || rect.bottom > window.innerHeight + 8) return false;
      const styles = getComputedStyle(element);
      const canScrollX = element.scrollWidth > element.clientWidth + 2
        && SCROLLABLE_OVERFLOW_VALUES.has(styles.overflowX);
      const canScrollY = element.scrollHeight > element.clientHeight + 2
        && SCROLLABLE_OVERFLOW_VALUES.has(styles.overflowY);
      return canScrollX || canScrollY;
    }

    function isScrollableElement(element) {
      if (!element || element === document.documentElement || element === document.body) return false;
      if (element.closest && element.closest('[data-scionos-capture]')) return false;
      if (element.scrollWidth <= element.clientWidth + 2 && element.scrollHeight <= element.clientHeight + 2) return false;
      const rect = element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0
        || rect.bottom <= 0 || rect.top >= window.innerHeight
        || rect.right <= 0 || rect.left >= window.innerWidth) return false;
      const styles = getComputedStyle(element);
      if (styles.display === 'none' || styles.visibility === 'hidden') return false;
      const canScrollX = element.scrollWidth > element.clientWidth + 2
        && SCROLLABLE_OVERFLOW_VALUES.has(styles.overflowX);
      const canScrollY = element.scrollHeight > element.clientHeight + 2
        && SCROLLABLE_OVERFLOW_VALUES.has(styles.overflowY);
      if (!canScrollX && !canScrollY) return false;

      return true;
    }

    function findScrollSurface() {
      const documentSurface = getDocumentScrollSurface();
      if (hasScrollRange(documentSurface.getMetrics())) return documentSurface;

      const candidates = [document.body, ...document.querySelectorAll('body *')]
        .filter(isVisibleScrollCandidate)
        .map(element => ({
          surface: getElementScrollSurface(element),
          score: Math.max(1, element.scrollWidth) * Math.max(1, element.scrollHeight)
        }))
        .sort((first, second) => second.score - first.score);

      return candidates[0] ? candidates[0].surface : documentSurface;
    }

    function findScrollSurfaceAtPoint(clientX, clientY) {
      const rawElements = document.elementsFromPoint(clientX, clientY);
      const elements = rawElements.filter(el => !el.closest || !el.closest('[data-scionos-capture]'));

      // Strategy 1: Check elements under cursor and their ancestor chain
      for (const element of elements) {
        let candidate = element;
        while (candidate && candidate !== document.body && candidate !== document.documentElement) {
          if (isScrollableElement(candidate)) return getElementScrollSurface(candidate);
          candidate = candidate.parentElement;
        }
      }

      // Strategy 2: If clicked on a header, border or non-scrollable wrapper (e.g. Messenger chat header/dock),
      // inspect enclosing container cards/dialogs under the point for scrollable descendants
      const scannedContainers = new Set();
      for (const element of elements) {
        let container = element;
        while (container && container !== document.body && container !== document.documentElement) {
          if (scannedContainers.has(container)) {
            container = container.parentElement;
            continue;
          }
          scannedContainers.add(container);
          const scrollableChildren = Array.from(container.querySelectorAll('*')).filter(isScrollableElement);
          if (scrollableChildren.length > 0) {
            scrollableChildren.sort((first, second) => {
              const scoreFirst = (first.scrollHeight - first.clientHeight) * Math.max(1, first.clientWidth);
              const scoreSecond = (second.scrollHeight - second.clientHeight) * Math.max(1, second.clientWidth);
              return scoreSecond - scoreFirst;
            });
            return getElementScrollSurface(scrollableChildren[0]);
          }
          container = container.parentElement;
        }
      }

      // Strategy 3: Probe downward in case a top header was clicked
      for (const offset of [35, 70]) {
        const probeY = Math.min(window.innerHeight - 10, clientY + offset);
        if (probeY !== clientY) {
          const probeElements = document.elementsFromPoint(clientX, probeY)
            .filter(el => !el.closest || !el.closest('[data-scionos-capture]'));
          for (const element of probeElements) {
            let candidate = element;
            while (candidate && candidate !== document.body && candidate !== document.documentElement) {
              if (isScrollableElement(candidate)) return getElementScrollSurface(candidate);
              candidate = candidate.parentElement;
            }
          }
        }
      }

      return getDocumentScrollSurface();
    }

    function getSurfaceMaxScroll(surface) {
      return {
        x: Math.max(0, surface.element.scrollWidth - surface.element.clientWidth),
        y: Math.max(0, surface.element.scrollHeight - surface.element.clientHeight)
      };
    }

    function assertSurfacePosition(surface, target) {
      const actual = surface.getPosition();
      const maxScroll = getSurfaceMaxScroll(surface);
      const expectedX = Math.min(Math.max(0, target.x), maxScroll.x);
      const expectedY = Math.min(Math.max(0, target.y), maxScroll.y);
      if ((expectedX > 2 && actual.x < expectedX - 2) || (expectedY > 2 && actual.y < expectedY - 2)) {
        throw new Error(text('fullScrollError'));
      }
      return { x: Math.round(actual.x), y: Math.round(actual.y) };
    }

    async function settleVisibleResources() {
      if (document.fonts && document.fonts.ready) {
        await Promise.race([document.fonts.ready, Utils.delay(2000)]).catch(() => undefined);
      }
      const images = Array.from(document.images).filter(image => {
        const rect = image.getBoundingClientRect();
        return rect.bottom > 0 && rect.right > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth;
      });
      await Promise.race([
        Promise.all(images.map(image => image.complete ? Promise.resolve() : image.decode().catch(() => undefined))),
        Utils.delay(2000)
      ]);
    }

    async function stabilizePageDimensions(surface, range) {
      const deadline = Date.now() + 5000;
      await settleVisibleResources();
      let previous = surface.getMetrics();
      let stablePasses = 0;
      for (let pass = 0; pass < 4 && stablePasses < 2 && Date.now() < deadline; pass += 1) {
        let positions = Utils.buildScrollPositions(previous.fullHeight, previous.viewportHeight);
        if (range) {
          const rangeTop = typeof range.top === 'number' ? range.top : (Number(range.y) || 0);
          const rangeBottom = typeof range.bottom === 'number'
            ? range.bottom
            : (rangeTop + (Number(range.height) || previous.viewportHeight));
          const scoped = positions.filter(y => y + previous.viewportHeight > rangeTop && y < rangeBottom);
          if (scoped.length) positions = scoped;
        }
        const originalX = surface.getPosition().x;
        for (const y of positions) {
          if (Date.now() >= deadline) break;
          surface.scrollTo(originalX, y);
          await Utils.waitForPaint();
          if (Date.now() >= deadline) break;
          await Utils.delay(Math.min(120, Math.max(0, deadline - Date.now())));
          if (Date.now() >= deadline) break;
          assertSurfacePosition(surface, { x: originalX, y });
        }
        const next = surface.getMetrics();
        stablePasses = Math.abs(next.fullHeight - previous.fullHeight) <= 2
          && Math.abs(next.fullWidth - previous.fullWidth) <= 2
          ? stablePasses + 1 : 0;
        previous = next;
      }
      return previous;
    }

    function suspendPageMotion() {
      const style = document.createElement('style');
      style.dataset.scionosCapture = 'motion';
      style.textContent = `
        *, *::before, *::after {
          animation-play-state: paused !important;
          transition-property: none !important;
          caret-color: transparent !important;
          scroll-behavior: auto !important;
        }
      `;
      document.documentElement.appendChild(style);
      return () => style.remove();
    }

    function createAnchoredElementManager(surface) {
      let hidden = [];
      const seen = new WeakMap();
      return {
        prepare(tileIndex = 0, totalTiles = 1, writtenRect = null) {
          hidden = [];
          const capture = surface.isDocument
            ? { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight }
            : surface.getCaptureRect();
          const bounds = writtenRect || { left: capture.left, top: capture.top,
            right: capture.left + capture.width, bottom: capture.top + capture.height };
          const visible = [];
          const position = surface.getPosition();
          for (const element of document.querySelectorAll('body *')) {
            if (!element.isConnected || element.closest('[data-scionos-capture]')
                || (!surface.isDocument && (element === surface.element || element.contains(surface.element)))) continue;
            const rect = element.getBoundingClientRect();
            if (!rect.width || !rect.height || rect.right <= capture.left || rect.left >= capture.left + capture.width
                || rect.bottom <= capture.top || rect.top >= capture.top + capture.height) continue;
            const styles = getComputedStyle(element);
            if (styles.visibility === 'hidden' || styles.display === 'none') continue;
            const fixed = styles.position === 'fixed';
            const sticky = styles.position === 'sticky';
            const top = parseFloat(styles.top), bottom = parseFloat(styles.bottom);
            const left = parseFloat(styles.left), right = parseFloat(styles.right);
            const verticalPin = sticky && (Math.abs(rect.top - capture.top - top) <= 4
              || Math.abs(rect.bottom - capture.top - capture.height + bottom) <= 4);
            const horizontalPin = sticky && (Math.abs(rect.left - capture.left - left) <= 4
              || Math.abs(rect.right - capture.left - capture.width + right) <= 4);
            const external = !surface.isDocument && styles.position === 'absolute' && !surface.element.contains(element);
            const bottomFixed = fixed && rect.top > capture.top + capture.height / 2;
            const firstPosition = seen.get(element);
            // A vertical sticky header still needs all columns of its first row.
            // A horizontal sticky sidebar still needs all rows of its first column.
            const repeated = firstPosition && (fixed || external
              || (verticalPin && Math.abs(position.y - firstPosition.y) > 2)
              || (horizontalPin && Math.abs(position.x - firstPosition.x) > 2));
            const shouldHide = repeated || (bottomFixed && tileIndex < totalTiles - 1);
            if (shouldHide) {
              hidden.push(ScionosContentUtils.snapshotInlineStyle(element, 'visibility'));
              element.style.setProperty('visibility', 'hidden', 'important');
            } else if (rect.right > bounds.left && rect.left < bounds.right && rect.bottom > bounds.top && rect.top < bounds.bottom) {
              visible.push(element);
            }
          }
          visible.forEach(element => { if (!seen.has(element)) seen.set(element, position); });
        },
        restore() {
          hidden.forEach(ScionosContentUtils.restoreInlineStyle);
          hidden = [];
        }
      };
    }

    function layoutChangedError() {
      const error = new Error(text('layoutChangedError'));
      error.code = 'LAYOUT_CHANGED';
      return error;
    }

    function assertStableMetrics(surface, baseline) {
      const current = surface.getMetrics();
      if (Math.abs(current.fullWidth - baseline.fullWidth) > 2
          || Math.abs(current.fullHeight - baseline.fullHeight) > 2
          || Math.abs(current.viewportWidth - baseline.viewportWidth) > 2
          || Math.abs(current.viewportHeight - baseline.viewportHeight) > 2) {
        throw layoutChangedError();
      }
      return current;
    }

    function getSurfaceCaptureCrop(surface, image) {
      if (surface.isDocument) {
        const element = surface.element;
        const scrollbarWidth = Math.max(0, window.innerWidth - element.clientWidth);
        const rootLeft = document.documentElement.getBoundingClientRect().left;
        const contentLeft = rootLeft > 0 && rootLeft <= scrollbarWidth + 1 ? rootLeft : 0;
        return Utils.computeCaptureViewportMetrics({
          bitmapWidth: image.width, bitmapHeight: image.height,
          innerWidth: window.innerWidth, innerHeight: window.innerHeight,
          contentWidth: element.clientWidth, contentHeight: element.clientHeight, contentLeft
        });
      }

      const rect = surface.getCaptureRect();
      const metrics = Utils.computeCaptureViewportMetrics({
        bitmapWidth: image.width, bitmapHeight: image.height,
        innerWidth: window.innerWidth, innerHeight: window.innerHeight
      });
      const left = Math.max(0, Math.round(rect.left * metrics.scaleX));
      const top = Math.max(0, Math.round(rect.top * metrics.scaleY));
      const right = Math.max(left + 1, Math.min(image.width, Math.round((rect.left + rect.width) * metrics.scaleX)));
      const bottom = Math.max(top + 1, Math.min(image.height, Math.round((rect.top + rect.height) * metrics.scaleY)));
      return { ...metrics, crop: { x: left, y: top, width: right - left, height: bottom - top } };
    }

    return Object.freeze({
      extractDomTextBlocks, getDocumentScrollSurface, getElementScrollSurface,
      hasScrollRange, isVisibleScrollCandidate, isScrollableElement,
      findScrollSurface, findScrollSurfaceAtPoint, getSurfaceMaxScroll,
      assertSurfacePosition, settleVisibleResources, stabilizePageDimensions,
      suspendPageMotion, createAnchoredElementManager, layoutChangedError,
      assertStableMetrics, getSurfaceCaptureCrop
    });
  }

  globalScope.ScionosContentDom = Object.freeze({ create: createContentDom });
})(typeof globalThis !== 'undefined' ? globalThis : this);