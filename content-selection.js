// Accessible adjustment and element picking shared by capture workflows.
(function registerSelection(globalScope) {
  function create({ dom, text }) {
    function adjust(surface, initial, { cancelled = () => false, element = null, lockHorizontal = false } = {}) {
      return new Promise(resolve => {
        const overlay = document.createElement('dialog');
        overlay.dataset.scionosCapture = 'adjustment';
        overlay.setAttribute('aria-label', text('selectionTitle'));
        Object.assign(overlay.style, { position: 'fixed', inset: '0', margin: '0', padding: '0', border: '0', maxWidth: 'none', maxHeight: 'none', width: '100vw', height: '100vh', background: 'transparent', color: '#f8fafc', overflow: 'hidden' });
        const box = document.createElement('div');
        box.tabIndex = 0; box.setAttribute('aria-label', text('selectionTitle'));
        Object.assign(box.style, { position: 'fixed', border: '2px solid #38bdf8', boxShadow: '0 0 0 9999px #030a1466', cursor: 'move', boxSizing: 'border-box' });
        const panel = document.createElement('form');
        Object.assign(panel.style, { position: 'fixed', right: '12px', top: '12px', maxWidth: '280px', maxHeight: 'calc(100vh - 24px)', overflowY: 'auto', padding: '12px', background: '#07111f', border: '1px solid #38bdf8', borderRadius: '8px', font: '13px system-ui', zIndex: '2' });
        const title = document.createElement('strong'); title.textContent = text('selectionTitle');
        const instructions = document.createElement('p'); instructions.textContent = text('selectionInstructions');
        const status = document.createElement('p'); status.setAttribute('role', 'status');
        panel.append(title, instructions);
        const inputs = {};
        for (const [name, key] of [['x','coordinateX'],['y','coordinateY'],['width','coordinateWidth'],['height','coordinateHeight']]) {
          const label = document.createElement('label'); label.textContent = text(key); label.style.display = 'block';
          const input = document.createElement('input'); input.name = name; input.type = 'number'; input.step = '1'; input.min = name === 'width' || name === 'height' ? '5' : '0';
          input.style.cssText = 'width:90px;margin:4px;color:#fff;background:#101d2f;border:1px solid #a9bad0;padding:5px';
          input.disabled = lockHorizontal && (name === 'x' || name === 'width');
          inputs[name] = input; label.append(input); panel.append(label);
        }
        let region = { ...initial }, ended = false, drag = null;
        const finish = value => { if (ended) return; ended = true; overlay.close(); overlay.remove(); window.removeEventListener('scroll', render, true); window.removeEventListener('keydown', keydown, true); resolve(value); };
        function render() {
          const rect = dom.surfaceRectToClient(surface, region);
          Object.assign(box.style, { left: rect.left + 'px', top: rect.top + 'px', width: Math.max(5, rect.right - rect.left) + 'px', height: Math.max(5, rect.bottom - rect.top) + 'px' });
          for (const name of Object.keys(inputs)) inputs[name].value = String(Math.round(region[name]));
        }
        function update(next) {
          const m = surface.getMetrics();
          if (!Object.values(next).every(Number.isFinite)) return;
          const x = lockHorizontal ? initial.x : Math.max(0, Math.min(m.fullWidth - 5, Math.round(next.x)));
          const y = Math.max(0, Math.min(m.fullHeight - 5, Math.round(next.y)));
          const width = lockHorizontal ? initial.width : Math.max(5, Math.min(m.fullWidth - x, Math.round(next.width)));
          region = { x, y, width, height: Math.max(5, Math.min(m.fullHeight - y, Math.round(next.height))) };
          render();
        }
        function shift(dx, dy, handle, origin = region) {
          const next = { ...origin };
          if (!handle) { next.x += dx; next.y += dy; }
          else {
            if (handle.includes('w')) { next.x += dx; next.width -= dx; }
            if (handle.includes('e')) next.width += dx;
            if (handle.includes('n')) { next.y += dy; next.height -= dy; }
            if (handle.includes('s')) next.height += dy;
          }
          update(next);
        }
        function keydown(event) {
          if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); finish(null); return; }
          if (event.target.closest('input,select')) return;
          if (event.key === 'Enter' && !event.target.closest('button')) { event.preventDefault(); panel.requestSubmit(); return; }
          const directions = { ArrowLeft: [-1,0], ArrowRight: [1,0], ArrowUp: [0,-1], ArrowDown: [0,1] };
          if (directions[event.key] && (event.target === box || event.target.dataset.handle)) {
            event.preventDefault(); const [dx,dy] = directions[event.key]; shift(dx * (event.shiftKey ? 10 : 1), dy * (event.shiftKey ? 10 : 1), event.target.dataset.handle);
          }
        }
        for (const [handle, left, top] of [['nw',0,0],['n',50,0],['ne',100,0],['e',100,50],['se',100,100],['s',50,100],['sw',0,100],['w',0,50]]) {
          const button = document.createElement('button'); button.type = 'button'; button.dataset.handle = handle; button.setAttribute('aria-label', text('selectionTitle') + ' ' + handle.toUpperCase());
          button.style.cssText = `position:absolute;left:${left}%;top:${top}%;transform:translate(-50%,-50%);width:16px;height:16px;padding:0;background:#07111f;border:2px solid #38bdf8;cursor:${handle}-resize`;
          button.disabled = lockHorizontal && handle !== 'n' && handle !== 's';
          if (button.disabled) button.style.display = 'none';
          box.append(button);
        }
        box.addEventListener('pointerdown', event => { if (event.button !== 0) return; event.preventDefault(); event.stopPropagation(); box.focus(); drag = { x: event.clientX, y: event.clientY, handle: event.target.dataset.handle, region: { ...region } }; box.setPointerCapture(event.pointerId); });
        box.addEventListener('pointermove', event => { if (!drag) return; const rect = surface.getCaptureRect(); shift((event.clientX-drag.x)/(rect.scaleX||1),(event.clientY-drag.y)/(rect.scaleY||1),drag.handle,drag.region); });
        box.addEventListener('pointerup', () => { drag = null; });
        box.addEventListener('pointercancel', () => { drag = null; });
        panel.addEventListener('change', () => update(Object.fromEntries(Object.entries(inputs).map(([name,input])=>[name,Number(input.value)]))));
        const elementBounds = element?.getBoundingClientRect();
        panel.addEventListener('submit', event => {
          event.preventDefault(); if (cancelled()) return finish(null);
          update(Object.fromEntries(Object.entries(inputs).map(([name,input])=>[name,Number(input.value)])));
          const current = element?.getBoundingClientRect();
          if (element && (!element.isConnected || Math.abs(current.width-elementBounds.width)>2 || Math.abs(current.height-elementBounds.height)>2
            || Math.abs(current.left-elementBounds.left)>2 || Math.abs(current.top-elementBounds.top)>2)) { status.textContent = text('elementUnavailable'); return; }
          finish({ ...region });
        });
        for (const [key, value] of [['selectionCapture','capture'],['selectionRestart','restart'],['selectionCancel','cancel']]) {
          const button=document.createElement('button'); button.type=value==='capture'?'submit':'button'; button.textContent=text(key); button.dataset.selectionAction=value;
          button.style.cssText='padding:7px;margin:4px;background:#101d2f;color:#fff;border:1px solid #a9bad0;border-radius:4px';
          if(value==='cancel')button.addEventListener('click',()=>finish(null));
          if(value==='restart')button.addEventListener('click',()=>finish({ restart:true }));
          panel.append(button);
        }
        panel.append(status); overlay.append(box,panel); (document.fullscreenElement || document.documentElement).append(overlay);
        overlay.addEventListener('cancel', event=>{event.preventDefault();finish(null);});
        window.addEventListener('keydown',keydown,true); window.addEventListener('scroll',render,true);
        overlay.showModal(); update(region); box.focus();
      });
    }
    function pickElement() {
      return new Promise(resolve=>{
        const overlay=document.createElement('dialog'); overlay.dataset.scionosCapture='element-selection'; overlay.setAttribute('aria-label',text('elementTitle')); overlay.tabIndex=0;
        overlay.style.cssText='position:fixed;inset:0;margin:0;border:0;padding:0;max-width:none;max-height:none;width:100vw;height:100vh;background:transparent;cursor:crosshair';
        const outline=document.createElement('div');outline.style.cssText='position:fixed;pointer-events:none;border:2px solid #38bdf8;background:#38bdf822;box-sizing:border-box';
        const panel=document.createElement('div');panel.style.cssText='position:fixed;right:12px;top:12px;background:#07111f;color:white;padding:12px;font:13px system-ui;border:1px solid #38bdf8;max-width:260px';
        const label=document.createElement('p'); label.textContent=text('selectionInstructions');panel.append(label);
        let selected=null, history=[], full=false, ended=false, locked=false;
        const finish=value=>{if(ended)return;ended=true;overlay.close();overlay.remove();resolve(value);};
        const draw=()=>{if(!selected?.isConnected)return;const r=selected.getBoundingClientRect();Object.assign(outline.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});};
        const parent=()=>{locked=true;if(selected?.parentElement && selected.parentElement!==document.documentElement){history.push(selected);selected=selected.parentElement;draw();}};
        const child=()=>{locked=true;if(history.length){selected=history.pop();draw();}};
        for(const [key,action] of [['selectionParent',parent],['selectionChild',child],['selectionCapture',()=>finish(selected?{element:selected,full}:null)],['selectionCancel',()=>finish(null)]]){const b=document.createElement('button');b.type='button';b.textContent=text(key);b.style.cssText='padding:7px;margin:4px';b.addEventListener('click',action);panel.append(b);}
        const mode=document.createElement('select');mode.setAttribute('aria-label',text('elementTitle'));for(const [value,key]of [['visible','elementVisible'],['full','elementFull']]){const o=document.createElement('option');o.value=value;o.textContent=text(key);mode.append(o);}mode.addEventListener('change',()=>{full=mode.value==='full';});panel.append(mode);
        overlay.addEventListener('pointermove',event=>{if(panel.contains(event.target)||locked)return;overlay.close();try{let el=document.elementFromPoint(event.clientX,event.clientY);while(el?.shadowRoot){const nested=el.shadowRoot.elementFromPoint(event.clientX,event.clientY);if(!nested||nested===el)break;el=nested;}if(el&&!el.closest('[data-scionos-capture]')){selected=el;history=[];draw();}}finally{overlay.showModal();}});
        overlay.addEventListener('click',event=>{if(panel.contains(event.target))return;event.preventDefault();event.stopPropagation();if(selected)finish({element:selected,full});});
        overlay.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();finish(null);}if(event.key==='ArrowUp'&&!event.target.closest('select')){event.preventDefault();parent();}if(event.key==='ArrowDown'&&!event.target.closest('select')){event.preventDefault();child();}if(event.key==='Enter'&&event.target===overlay){event.preventDefault();if(selected)finish({element:selected,full});}});
        overlay.addEventListener('cancel',event=>{event.preventDefault();finish(null);});overlay.append(outline,panel);(document.fullscreenElement || document.documentElement).append(overlay);overlay.showModal();overlay.close();selected=document.elementFromPoint(window.innerWidth/2,window.innerHeight/2);overlay.showModal();draw();overlay.focus();
      });
    }
    return Object.freeze({adjust,pickElement});
  }
  globalScope.ScionosContentSelection=Object.freeze({create});
})(globalThis);
