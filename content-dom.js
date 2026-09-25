// DOM and layout services used by page capture workflows.
(function registerContentDom(globalScope) {
  function createContentDom({ Utils, text }) {
    const SCROLLABLE_OVERFLOW_VALUES = new Set(['auto', 'overlay', 'scroll']);

    function extractDomTextBlocks(region) {
      const blocks = [];
      if (!region || region.width <= 0 || region.height <= 0) return blocks;
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;

      const targetLeft = Number.isFinite(region.left) ? region.left : (Number.isFinite(region.x) ? region.x : 0);
      const targetTop = Number.isFinite(region.top) ? region.top : (Number.isFinite(region.y) ? region.y : 0);
      const targetRight = targetLeft + region.width;
      const targetBottom = targetTop + region.height;

      try {
        const walker = document.createTreeWalker(
          document.body || document.documentElement,
          NodeFilter.SHOW_TEXT,
          {
            acceptNode(node) {
              if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
              const parent = node.parentElement;
              if (!parent) return NodeFilter.FILTER_REJECT;
              const tag = parent.tagName;
              if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'TEMPLATE') {
                return NodeFilter.FILTER_REJECT;
              }
              if (parent.closest('[data-scionos-capture]')) return NodeFilter.FILTER_REJECT;
              return NodeFilter.FILTER_ACCEPT;
            }
          }
        );

        let currentNode = walker.nextNode();
        let count = 0;
        const MAX_BLOCKS = 1500;
        while (currentNode && count < MAX_BLOCKS) {
          const parent = currentNode.parentElement;
          const range = document.createRange();
          range.selectNodeContents(currentNode);
          const rect = range.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            const docLeft = rect.left + scrollX;
            const docTop = rect.top + scrollY;
            const docRight = docLeft + rect.width;
            const docBottom = docTop + rect.height;

            if (
              docRight > targetLeft &&
              docLeft < targetRight &&
              docBottom > targetTop &&
              docTop < targetBottom
            ) {
              const computed = window.getComputedStyle(parent);
              if (computed.visibility !== 'hidden' && computed.display !== 'none' && parseFloat(computed.opacity || '1') > 0.05) {
                const link = parent.closest('a');
                blocks.push({
                  text: currentNode.nodeValue.trim(),
                  x: Math.round(docLeft - targetLeft),
                  y: Math.round(docTop - targetTop),
                  width: Math.round(rect.width),
                  height: Math.round(rect.height),
                  fontSize: Math.round(parseFloat(computed.fontSize) || 14),
                  fontFamily: computed.fontFamily || 'sans-serif',
                  isLink: Boolean(link && link.href),
                  url: link && link.href ? link.href : null
                });
                count += 1;
              }
            }
          }
          currentNode = walker.nextNode();
        }
      } catch (_error) {
        console.warn('DOM text extraction failed:', _error);
      }
      return blocks;
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
      const styles = getComputedStyle(element);
      const canScrollX = element.scrollWidth > element.clientWidth + 2
        && SCROLLABLE_OVERFLOW_VALUES.has(styles.overflowX);
      const canScrollY = element.scrollHeight > element.clientHeight + 2
        && SCROLLABLE_OVERFLOW_VALUES.has(styles.overflowY);
      if (!canScrollX && !canScrollY) return false;

      const rect = element.getBoundingClientRect();
      return rect.width > 0
        && rect.height > 0
        && rect.left >= -8
        && rect.top >= -8
        && rect.right <= window.innerWidth + 8
        && rect.bottom <= window.innerHeight + 8;
    }

    function isScrollableElement(element) {
      if (!element || element === document.documentElement || element === document.body) return false;
      if (element.closest && element.closest('[data-scionos-capture]')) return false;
      const styles = getComputedStyle(element);
      if (styles.display === 'none' || styles.visibility === 'hidden') return false;
      const canScrollX = element.scrollWidth > element.clientWidth + 2
        && SCROLLABLE_OVERFLOW_VALUES.has(styles.overflowX);
      const canScrollY = element.scrollHeight > element.clientHeight + 2
        && SCROLLABLE_OVERFLOW_VALUES.has(styles.overflowY);
      if (!canScrollX && !canScrollY) return false;

      const rect = element.getBoundingClientRect();
      return rect.width > 0
        && rect.height > 0
        && rect.bottom > 0
        && rect.top < window.innerHeight
        && rect.right > 0
        && rect.left < window.innerWidth;
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
      for (const element of elements) {
        let container = element;
        while (container && container !== document.body && container !== document.documentElement) {
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
      await settleVisibleResources();
      const startedAt = Date.now();
      let previous = surface.getMetrics();
      let stablePasses = 0;
      for (let pass = 0; pass < 4 && stablePasses < 2 && Date.now() - startedAt < 5000; pass += 1) {
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
          surface.scrollTo(originalX, y);
          await Utils.waitForPaint();
          await Utils.delay(120);
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

    function createAnchoredElementManager(surface, captureBounds) {
      let hidden = [];
      const bounds = captureBounds || (surface.isDocument
        ? { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight }
        : surface.getCaptureRect());

      const classifyElement = element => {
        if (!element.isConnected || element.closest('[data-scionos-capture]')) return null;
        if (!surface.isDocument && (element === surface.element || element.contains(surface.element))) return null;

        const styles = getComputedStyle(element);
        const isFixedOrSticky = ['fixed', 'sticky'].includes(styles.position);
        const isExternalAbsolute = !surface.isDocument
          && styles.position === 'absolute'
          && !surface.element.contains(element);

        if (!isFixedOrSticky && !isExternalAbsolute) return null;

        const rect = element.getBoundingClientRect();
        if (rect.width < 1 || rect.height < 1 || rect.bottom <= 0 || rect.right <= 0) return null;

        const overlapsHorizontally = rect.right > bounds.left && rect.left < bounds.right;
        const overlapsVertically = rect.bottom > bounds.top && rect.top < bounds.bottom;
        if (!overlapsHorizontally || !overlapsVertically) return null;

        if (surface.isDocument && styles.position === 'fixed') {
          const viewportCenter = window.innerHeight / 2;
          const isBottom = rect.top > viewportCenter || (Number.parseFloat(styles.bottom) <= 10 && rect.bottom >= window.innerHeight - 15);
          return isBottom ? 'bottom' : 'top';
        }

        const surfaceRect = surface.isDocument
          ? { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight }
          : surface.getCaptureRect();

        const top = Number.parseFloat(styles.top);
        const bottom = Number.parseFloat(styles.bottom);
        const isAnchoredTop = Number.isFinite(top) && Math.abs(rect.top - (surfaceRect.top + top)) <= 4;
        const isAnchoredBottom = Number.isFinite(bottom) && Math.abs(rect.bottom - (surfaceRect.bottom - bottom)) <= 4;

        if (isAnchoredTop) return 'top';
        if (isAnchoredBottom) return 'bottom';

        const midY = (bounds.top + bounds.bottom) / 2;
        return rect.top >= midY ? 'bottom' : 'top';
      };

      return {
        prepare(tileIndex = 0, totalTiles = 1) {
          hidden = [];
          for (const element of document.querySelectorAll('body *')) {
            const anchorType = classifyElement(element);
            if (!anchorType) continue;

            const shouldHide = (anchorType === 'top' && tileIndex > 0)
              || (anchorType === 'bottom' && tileIndex < totalTiles - 1 && totalTiles > 1);

            if (shouldHide) {
              hidden.push({
                element,
                value: element.style.getPropertyValue('visibility'),
                priority: element.style.getPropertyPriority('visibility')
              });
              element.style.setProperty('visibility', 'hidden', 'important');
            }
          }
        },
        restore() {
          hidden.forEach(({ element, value, priority }) => {
            if (!element.isConnected) return;
            if (value) element.style.setProperty('visibility', value, priority);
            else element.style.removeProperty('visibility');
          });
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