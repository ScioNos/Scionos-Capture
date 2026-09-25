// Canvas primitives and operation rendering for the screenshot editor.
(function registerEditorOperations(globalScope) {
  function createEditorOperations({ captureUtils }) {
    const ScionosCaptureUtils = captureUtils;

    function createSurface(width, height) {
      const surface = document.createElement('canvas');
      surface.width = Math.max(1, Math.round(width));
      surface.height = Math.max(1, Math.round(height));
      return surface;
    }

    function normalizeBounds(start, end) {
      return {
        x: Math.min(start.x, end.x),
        y: Math.min(start.y, end.y),
        width: Math.abs(end.x - start.x),
        height: Math.abs(end.y - start.y)
      };
    }

    function normalizeCrop(operation, sourceWidth, sourceHeight) {
      const bounds = normalizeBounds(operation.start, operation.end);
      const x = Math.max(0, Math.min(sourceWidth - 1, Math.floor(bounds.x)));
      const y = Math.max(0, Math.min(sourceHeight - 1, Math.floor(bounds.y)));
      const width = Math.max(1, Math.min(sourceWidth - x, Math.floor(bounds.width)));
      const height = Math.max(1, Math.min(sourceHeight - y, Math.floor(bounds.height)));
      return { x, y, width, height };
    }

    function operationBounds(operation, sourceWidth, sourceHeight) {
      let bounds;
      if (operation.shape === 'free') {
        const xs = operation.points.map(point => point.x);
        const ys = operation.points.map(point => point.y);
        bounds = {
          x: Math.min(...xs) - operation.radius,
          y: Math.min(...ys) - operation.radius,
          width: Math.max(...xs) - Math.min(...xs) + operation.radius * 2,
          height: Math.max(...ys) - Math.min(...ys) + operation.radius * 2
        };
      } else {
        bounds = normalizeBounds(operation.start, operation.end);
      }
      const padding = operation.type === 'blur' ? operation.blur * 2 : 0;
      const x = Math.max(0, Math.floor(bounds.x - padding));
      const y = Math.max(0, Math.floor(bounds.y - padding));
      return {
        x,
        y,
        width: Math.max(1, Math.min(sourceWidth - x, Math.ceil(bounds.width + padding * 2))),
        height: Math.max(1, Math.min(sourceHeight - y, Math.ceil(bounds.height + padding * 2)))
      };
    }

    function drawPath(targetContext, operation) {
      if (!operation.points.length) return;
      targetContext.save();
      targetContext.strokeStyle = operation.color;
      targetContext.fillStyle = operation.color;
      targetContext.lineWidth = operation.width;
      targetContext.lineCap = 'round';
      targetContext.lineJoin = 'round';
      if (operation.points.length === 1) {
        targetContext.beginPath();
        targetContext.arc(operation.points[0].x, operation.points[0].y, operation.width / 2, 0, Math.PI * 2);
        targetContext.fill();
      } else {
        targetContext.beginPath();
        targetContext.moveTo(operation.points[0].x, operation.points[0].y);
        operation.points.slice(1).forEach(point => targetContext.lineTo(point.x, point.y));
        targetContext.stroke();
      }
      targetContext.restore();
    }

    function createCensorPath(targetContext, operation) {
      if (operation.shape === 'free') {
        operation.points.forEach(point => {
          targetContext.moveTo(point.x + operation.radius, point.y);
          targetContext.arc(point.x, point.y, operation.radius, 0, Math.PI * 2);
        });
        return;
      }
      const bounds = normalizeBounds(operation.start, operation.end);
      if (operation.shape === 'circle') {
        targetContext.ellipse(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2, bounds.width / 2, bounds.height / 2, 0, 0, Math.PI * 2);
      } else {
        targetContext.rect(bounds.x, bounds.y, bounds.width, bounds.height);
      }
    }

    function drawCensorShape(targetContext, operation) {
      targetContext.beginPath();
      createCensorPath(targetContext, operation);
      targetContext.fill();
    }

    function applyCensor(surface, operation) {
      const targetContext = surface.getContext('2d');
      if (operation.type === 'color') {
        targetContext.save();
        targetContext.fillStyle = operation.color;
        drawCensorShape(targetContext, operation);
        targetContext.restore();
        return;
      }

      const bounds = operationBounds(operation, surface.width, surface.height);
      const source = createSurface(bounds.width, bounds.height);
      source.getContext('2d').drawImage(
        surface, bounds.x, bounds.y, bounds.width, bounds.height,
        0, 0, bounds.width, bounds.height
      );
      targetContext.save();
      targetContext.beginPath();
      createCensorPath(targetContext, operation);
      targetContext.clip();
      targetContext.filter = `blur(${operation.blur}px)`;
      targetContext.drawImage(source, bounds.x, bounds.y);
      targetContext.restore();
    }

    function drawArrow(targetContext, operation) {
      const { start, end, color, width } = operation;
      const headLength = Math.max(14, width * 3.5);
      const arrow = ScionosCaptureUtils.computeArrowPoints(start, end, headLength, Math.PI / 6);
      targetContext.save();
      targetContext.strokeStyle = color;
      targetContext.fillStyle = color;
      targetContext.lineWidth = width;
      targetContext.lineCap = 'round';
      targetContext.lineJoin = 'round';

      targetContext.beginPath();
      targetContext.moveTo(start.x, start.y);
      targetContext.lineTo(end.x, end.y);
      targetContext.stroke();

      targetContext.beginPath();
      targetContext.moveTo(end.x, end.y);
      targetContext.lineTo(arrow.left.x, arrow.left.y);
      targetContext.lineTo(arrow.right.x, arrow.right.y);
      targetContext.closePath();
      targetContext.fill();
      targetContext.restore();
    }

    function drawShape(targetContext, operation) {
      const { shape, mode, color, width, start, end } = operation;
      const bounds = normalizeBounds(start, end);
      targetContext.save();
      if (mode === 'stroke') {
        targetContext.strokeStyle = color;
        targetContext.lineWidth = width || 4;
        targetContext.lineCap = 'round';
        targetContext.lineJoin = 'round';
        if (shape === 'circle') {
          targetContext.beginPath();
          targetContext.ellipse(
            bounds.x + bounds.width / 2, bounds.y + bounds.height / 2,
            Math.max(1, bounds.width / 2), Math.max(1, bounds.height / 2), 0, 0, Math.PI * 2
          );
          targetContext.stroke();
        } else {
          targetContext.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
        }
      } else {
        targetContext.fillStyle = color;
        if (shape === 'circle') {
          targetContext.beginPath();
          targetContext.ellipse(
            bounds.x + bounds.width / 2, bounds.y + bounds.height / 2,
            Math.max(1, bounds.width / 2), Math.max(1, bounds.height / 2), 0, 0, Math.PI * 2
          );
          targetContext.fill();
        } else {
          targetContext.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
        }
      }
      targetContext.restore();
    }

    function drawStepBadge(targetContext, operation) {
      const { x, y, number, color, radius } = operation;
      const r = Math.max(12, radius || 18);
      targetContext.save();
      targetContext.shadowColor = 'rgba(0, 0, 0, 0.4)';
      targetContext.shadowBlur = 4;
      targetContext.shadowOffsetX = 1;
      targetContext.shadowOffsetY = 1;

      targetContext.beginPath();
      targetContext.arc(x, y, r, 0, Math.PI * 2);
      targetContext.fillStyle = color;
      targetContext.fill();

      targetContext.shadowColor = 'transparent';
      targetContext.strokeStyle = '#ffffff';
      targetContext.lineWidth = Math.max(2, Math.round(r * 0.12));
      targetContext.stroke();

      targetContext.fillStyle = '#ffffff';
      targetContext.font = `bold ${Math.round(r * 1.1)}px system-ui, -apple-system, sans-serif`;
      targetContext.textAlign = 'center';
      targetContext.textBaseline = 'middle';
      targetContext.fillText(String(number), x, y + 1);
      targetContext.restore();
    }

    function drawText(targetContext, operation) {
      const { x, y, text, fontSize, color, bgColor } = operation;
      if (!text) return;
      const size = Math.max(12, fontSize || 20);
      targetContext.save();
      targetContext.font = `bold ${size}px "Segoe UI", system-ui, sans-serif`;

      const lines = text.split('\n');
      const lineHeight = size * 1.35;
      let maxWidth = 0;
      lines.forEach(line => {
        const w = targetContext.measureText(line).width;
        if (w > maxWidth) maxWidth = w;
      });

      const paddingX = Math.round(size * 0.4);
      const paddingY = Math.round(size * 0.3);
      const totalHeight = lines.length * lineHeight;

      if (bgColor && bgColor !== 'transparent') {
        targetContext.fillStyle = bgColor;
        const rx = x - paddingX;
        const ry = y - paddingY;
        const rw = maxWidth + paddingX * 2;
        const rh = totalHeight + paddingY * 2;
        if (typeof targetContext.roundRect === 'function') {
          targetContext.beginPath();
          targetContext.roundRect(rx, ry, rw, rh, 6);
          targetContext.fill();
        } else {
          targetContext.fillRect(rx, ry, rw, rh);
        }
      }

      targetContext.fillStyle = color || '#ffffff';
      targetContext.textBaseline = 'top';
      targetContext.textAlign = 'left';
      lines.forEach((line, index) => {
        targetContext.fillText(line, x, y + index * lineHeight);
      });
      targetContext.restore();
    }

    function applyOperation(surface, operation) {
      if (operation.kind === 'crop') {
        const crop = normalizeCrop(operation, surface.width, surface.height);
        const cropped = createSurface(crop.width, crop.height);
        cropped.getContext('2d').drawImage(
          surface, crop.x, crop.y, crop.width, crop.height,
          0, 0, crop.width, crop.height
        );
        return cropped;
      }
      const ctx = surface.getContext('2d');
      if (operation.kind === 'draw') drawPath(ctx, operation);
      if (operation.kind === 'censor') applyCensor(surface, operation);
      if (operation.kind === 'arrow') drawArrow(ctx, operation);
      if (operation.kind === 'shape') drawShape(ctx, operation);
      if (operation.kind === 'step') drawStepBadge(ctx, operation);
      if (operation.kind === 'text') drawText(ctx, operation);
      return surface;
    }

    function drawCropPreview(targetContext, operation, width, height) {
      const crop = normalizeCrop(operation, width, height);
      targetContext.save();
      targetContext.fillStyle = 'rgba(3, 10, 20, .48)';
      targetContext.beginPath();
      targetContext.rect(0, 0, width, height);
      targetContext.rect(crop.x, crop.y, crop.width, crop.height);
      targetContext.fill('evenodd');
      targetContext.strokeStyle = '#38bdf8';
      targetContext.lineWidth = 2;
      targetContext.setLineDash([7, 5]);
      targetContext.strokeRect(crop.x, crop.y, crop.width, crop.height);
      targetContext.restore();
    }

    return Object.freeze({ createSurface, normalizeBounds, normalizeCrop, operationBounds, applyOperation, drawCropPreview });
  }

  globalScope.ScionosEditorOperations = Object.freeze({ create: createEditorOperations });
})(typeof globalThis !== 'undefined' ? globalThis : this);