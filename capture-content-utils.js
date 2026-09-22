// Focused helpers for content-script state restoration.
(function registerContentUtils(globalScope) {
  function snapshotInlineStyle(element, property) {
    const style = element && element.style;
    return {
      element,
      property,
      value: style ? style.getPropertyValue(property) : '',
      priority: style ? style.getPropertyPriority(property) : ''
    };
  }

  function restoreInlineStyle(snapshot) {
    if (!snapshot || !snapshot.element || !snapshot.element.style) return;
    if (snapshot.value) {
      snapshot.element.style.setProperty(snapshot.property, snapshot.value, snapshot.priority);
    } else {
      snapshot.element.style.removeProperty(snapshot.property);
    }
  }

  function createScrollSurfaceStateTracker() {
    const states = new Map();

    function remember(surface) {
      if (!surface || !surface.element || states.has(surface.element)) return;
      states.set(surface.element, {
        surface,
        position: surface.getPosition(),
        scrollBehavior: snapshotInlineStyle(surface.element, 'scroll-behavior')
      });
    }

    function restore() {
      Array.from(states.values()).reverse().forEach(({ surface, position, scrollBehavior }) => {
        if (!surface.element || !surface.element.isConnected) return;
        surface.scrollTo(position.x, position.y);
        restoreInlineStyle(scrollBehavior);
      });
    }

    function reset(surface) {
      restore();
      states.clear();
      remember(surface);
    }

    return { remember, restore, reset };
  }

  globalScope.ScionosContentUtils = {
    createScrollSurfaceStateTracker,
    snapshotInlineStyle,
    restoreInlineStyle
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
