/* ============================================================
   EasySkillOS Docs — Diagram Zoom / Pan
   Features: wheel zoom · drag pan · pinch-to-zoom · toolbar
             (zoom-in / zoom-out / fit / fullscreen) · keyboard
             shortcuts inside fullscreen · double-click to fit
   ============================================================ */

(function () {
  'use strict';

  const ZOOM_MIN   = 0.2;
  const ZOOM_MAX   = 8;
  const ZOOM_STEP  = 0.2;   // button step
  const WHEEL_SENS = 0.001; // wheel delta multiplier

  // SVG pixel dimensions used for the "fit" calculation
  function svgNaturalSize(svg) {
    const vb = svg.getAttribute('viewBox');
    if (vb) {
      const [,, w, h] = vb.split(/[\s,]+/).map(Number);
      if (w && h) return { w, h };
    }
    const rect = svg.getBoundingClientRect();
    return { w: rect.width || 800, h: rect.height || 600 };
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  // ── Per-diagram controller ───────────────────────────────────
  function DiagramZoom(section) {
    const mermaidDiv = section.querySelector('.mermaid');
    if (!mermaidDiv) return;

    // Toolbar ── inserted before the mermaid div
    const toolbar = document.createElement('div');
    toolbar.className = 'dz-toolbar';
    toolbar.innerHTML = `
      <div class="dz-toolbar__left">
        <button class="dz-btn dz-btn--icon" data-action="zoom-out" title="Zoom out (−)">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="9" cy="9" r="6"/><line x1="14" y1="14" x2="18" y2="18"/>
            <line x1="6" y1="9" x2="12" y2="9"/>
          </svg>
        </button>
        <div class="dz-scale-badge" title="Current zoom level">100%</div>
        <button class="dz-btn dz-btn--icon" data-action="zoom-in" title="Zoom in (+)">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="9" cy="9" r="6"/><line x1="14" y1="14" x2="18" y2="18"/>
            <line x1="9" y1="6" x2="9" y2="12"/><line x1="6" y1="9" x2="12" y2="9"/>
          </svg>
        </button>
      </div>
      <div class="dz-toolbar__right">
        <button class="dz-btn" data-action="fit" title="Fit to width">Fit</button>
        <button class="dz-btn" data-action="reset" title="Reset to 100%">1:1</button>
        <button class="dz-btn dz-btn--icon dz-btn--fullscreen" data-action="fullscreen" title="Fullscreen (F)">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 8V3h5M17 8V3h-5M3 12v5h5M17 12v5h-5"/>
          </svg>
        </button>
      </div>
    `;

    // Viewport wrapper — overflow:hidden, fixed height for pan/zoom
    const viewport = document.createElement('div');
    viewport.className = 'dz-viewport';
    viewport.setAttribute('tabindex', '0');

    // Stage — receives the transform
    const stage = document.createElement('div');
    stage.className = 'dz-stage';

    // Restructure DOM: section > toolbar + viewport > stage > mermaidDiv
    mermaidDiv.parentNode.insertBefore(toolbar, mermaidDiv);
    mermaidDiv.parentNode.insertBefore(viewport, mermaidDiv);
    viewport.appendChild(stage);
    stage.appendChild(mermaidDiv);

    let scale  = 1;
    let tx     = 0;
    let ty     = 0;
    let svg    = null; // set once Mermaid renders

    const scaleBadge = toolbar.querySelector('.dz-scale-badge');

    function applyTransform() {
      stage.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
      scaleBadge.textContent = Math.round(scale * 100) + '%';
    }

    // Fit diagram to the viewport width (called once after SVG render)
    function fitToViewport(animate) {
      if (!svg) return;
      const vpW  = viewport.clientWidth  || viewport.offsetWidth;
      const vpH  = viewport.clientHeight || viewport.offsetHeight;
      const nat  = svgNaturalSize(svg);
      const fitS = Math.min(vpW / nat.w, vpH / nat.h, 1); // never upscale beyond 100%
      scale = clamp(fitS, ZOOM_MIN, ZOOM_MAX);
      // Center the scaled diagram
      tx = (vpW  - nat.w * scale) / 2;
      ty = (vpH  - nat.h * scale) / 2;
      if (animate) {
        stage.style.transition = 'transform 300ms ease';
        applyTransform();
        setTimeout(() => { stage.style.transition = ''; }, 320);
      } else {
        applyTransform();
      }
    }

    function zoomAround(newScale, pivotX, pivotY) {
      // pivotX/Y are in stage-parent (viewport) coordinates
      const ratio  = newScale / scale;
      tx = pivotX - ratio * (pivotX - tx);
      ty = pivotY - ratio * (pivotY - ty);
      scale = newScale;
      applyTransform();
    }

    function zoomCenter(newScale) {
      const vpW = viewport.offsetWidth;
      const vpH = viewport.offsetHeight;
      zoomAround(newScale, vpW / 2, vpH / 2);
    }

    // ── Toolbar buttons ─────────────────────────────────────────
    toolbar.addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      if (action === 'zoom-in')    zoomCenter(clamp(scale + ZOOM_STEP, ZOOM_MIN, ZOOM_MAX));
      if (action === 'zoom-out')   zoomCenter(clamp(scale - ZOOM_STEP, ZOOM_MIN, ZOOM_MAX));
      if (action === 'fit')        fitToViewport(true);
      if (action === 'reset') {
        scale = 1;
        const vpW = viewport.offsetWidth;
        const vpH = viewport.offsetHeight;
        if (svg) {
          const nat = svgNaturalSize(svg);
          tx = (vpW - nat.w) / 2;
          ty = (vpH - nat.h) / 2;
        } else { tx = 0; ty = 0; }
        stage.style.transition = 'transform 300ms ease';
        applyTransform();
        setTimeout(() => { stage.style.transition = ''; }, 320);
      }
      if (action === 'fullscreen') openFullscreen();
    });

    // ── Mouse wheel zoom ─────────────────────────────────────────
    viewport.addEventListener('wheel', e => {
      e.preventDefault();
      const rect = viewport.getBoundingClientRect();
      const pivotX = e.clientX - rect.left;
      const pivotY = e.clientY - rect.top;
      const delta  = -e.deltaY * WHEEL_SENS;
      const newScale = clamp(scale * (1 + delta * 4), ZOOM_MIN, ZOOM_MAX);
      zoomAround(newScale, pivotX, pivotY);
    }, { passive: false });

    // ── Mouse drag pan ───────────────────────────────────────────
    let dragStartX = 0, dragStartY = 0, dragTx = 0, dragTy = 0;
    let dragging = false;

    viewport.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      dragging  = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      dragTx    = tx;
      dragTy    = ty;
      viewport.classList.add('dz-viewport--dragging');
      e.preventDefault();
    });

    window.addEventListener('mousemove', e => {
      if (!dragging) return;
      tx = dragTx + (e.clientX - dragStartX);
      ty = dragTy + (e.clientY - dragStartY);
      applyTransform();
    });

    window.addEventListener('mouseup', () => {
      if (!dragging) return;
      dragging = false;
      viewport.classList.remove('dz-viewport--dragging');
    });

    // ── Double-click to fit ──────────────────────────────────────
    viewport.addEventListener('dblclick', () => fitToViewport(true));

    // ── Touch pinch zoom + drag ──────────────────────────────────
    let lastTouchDist = null;
    let touchStartTx  = 0, touchStartTy  = 0;
    let touchMidX     = 0, touchMidY     = 0;
    let singleTouchStartX = 0, singleTouchStartY = 0;

    viewport.addEventListener('touchstart', e => {
      if (e.touches.length === 2) {
        lastTouchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        touchStartTx = tx;
        touchStartTy = ty;
        const rect = viewport.getBoundingClientRect();
        touchMidX = ((e.touches[0].clientX + e.touches[1].clientX) / 2) - rect.left;
        touchMidY = ((e.touches[0].clientY + e.touches[1].clientY) / 2) - rect.top;
      } else if (e.touches.length === 1) {
        singleTouchStartX = e.touches[0].clientX;
        singleTouchStartY = e.touches[0].clientY;
        dragTx = tx;
        dragTy = ty;
      }
    }, { passive: true });

    viewport.addEventListener('touchmove', e => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        if (lastTouchDist) {
          const ratio    = dist / lastTouchDist;
          const newScale = clamp(scale * ratio, ZOOM_MIN, ZOOM_MAX);
          zoomAround(newScale, touchMidX, touchMidY);
          lastTouchDist  = dist;
        }
      } else if (e.touches.length === 1) {
        e.preventDefault();
        tx = dragTx + (e.touches[0].clientX - singleTouchStartX);
        ty = dragTy + (e.touches[0].clientY - singleTouchStartY);
        applyTransform();
      }
    }, { passive: false });

    viewport.addEventListener('touchend', () => { lastTouchDist = null; }, { passive: true });

    // ── Fullscreen modal ─────────────────────────────────────────
    const modal = document.createElement('div');
    modal.className = 'dz-modal';
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('role', 'dialog');
    modal.innerHTML = `
      <div class="dz-modal__backdrop"></div>
      <div class="dz-modal__inner">
        <div class="dz-modal__toolbar">
          <div class="dz-toolbar__left">
            <button class="dz-btn dz-btn--icon" data-fs-action="zoom-out" title="Zoom out">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="9" cy="9" r="6"/><line x1="14" y1="14" x2="18" y2="18"/>
                <line x1="6" y1="9" x2="12" y2="9"/>
              </svg>
            </button>
            <div class="dz-scale-badge dz-modal__scale">100%</div>
            <button class="dz-btn dz-btn--icon" data-fs-action="zoom-in" title="Zoom in">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="9" cy="9" r="6"/><line x1="14" y1="14" x2="18" y2="18"/>
                <line x1="9" y1="6" x2="9" y2="12"/><line x1="6" y1="9" x2="12" y2="9"/>
              </svg>
            </button>
          </div>
          <div class="dz-modal__title"></div>
          <div class="dz-toolbar__right">
            <button class="dz-btn" data-fs-action="fit">Fit</button>
            <button class="dz-btn" data-fs-action="reset">1:1</button>
            <button class="dz-btn dz-btn--icon" data-fs-action="close" title="Close (Esc)">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="4" y1="4" x2="16" y2="16"/>
                <line x1="16" y1="4" x2="4" y2="16"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="dz-modal__viewport">
          <div class="dz-modal__stage"></div>
        </div>
        <div class="dz-modal__hint">Scroll to zoom · Drag to pan · Double-click to fit · Esc to close</div>
      </div>
    `;
    document.body.appendChild(modal);

    const fsViewport  = modal.querySelector('.dz-modal__viewport');
    const fsStage     = modal.querySelector('.dz-modal__stage');
    const fsScaleBadge = modal.querySelector('.dz-modal__scale');
    const fsTitle     = modal.querySelector('.dz-modal__title');
    let fsScale = 1, fsTx = 0, fsTy = 0;
    let fsDragging = false, fsDragStartX = 0, fsDragStartY = 0, fsDragTx = 0, fsDragTy = 0;

    function fsApply() {
      fsStage.style.transform = `translate(${fsTx}px, ${fsTy}px) scale(${fsScale})`;
      fsScaleBadge.textContent = Math.round(fsScale * 100) + '%';
    }

    function fsFit(animate) {
      const svgEl = fsStage.querySelector('svg');
      if (!svgEl) return;
      const vpW = fsViewport.offsetWidth;
      const vpH = fsViewport.offsetHeight;
      const nat = svgNaturalSize(svgEl);
      fsScale = clamp(Math.min(vpW / nat.w, vpH / nat.h), ZOOM_MIN, ZOOM_MAX);
      fsTx = (vpW - nat.w * fsScale) / 2;
      fsTy = (vpH - nat.h * fsScale) / 2;
      if (animate) {
        fsStage.style.transition = 'transform 300ms ease';
        fsApply();
        setTimeout(() => { fsStage.style.transition = ''; }, 320);
      } else {
        fsApply();
      }
    }

    function fsZoomAround(newScale, px, py) {
      const ratio = newScale / fsScale;
      fsTx = px - ratio * (px - fsTx);
      fsTy = py - ratio * (py - fsTy);
      fsScale = newScale;
      fsApply();
    }

    function openFullscreen() {
      if (!svg) return;
      const titleEl = section.querySelector('.diagram-title');
      fsTitle.textContent = titleEl ? titleEl.textContent.trim() : '';

      // Clone the SVG into the modal stage
      fsStage.innerHTML = '';
      const clone = svg.cloneNode(true);
      clone.removeAttribute('style');
      clone.removeAttribute('width');
      clone.removeAttribute('height');
      fsStage.appendChild(clone);

      modal.classList.add('dz-modal--open');
      document.body.style.overflow = 'hidden';

      // Give browser a frame to lay out before measuring
      requestAnimationFrame(() => requestAnimationFrame(() => {
        fsScale = 1; fsTx = 0; fsTy = 0;
        fsFit(false);
      }));
    }

    function closeFullscreen() {
      modal.classList.remove('dz-modal--open');
      document.body.style.overflow = '';
      fsStage.innerHTML = '';
    }

    modal.querySelector('[data-fs-action="close"]')?.addEventListener('click', closeFullscreen);
    modal.querySelector('.dz-modal__backdrop')?.addEventListener('click', closeFullscreen);
    modal.querySelector('[data-fs-action="fit"]')?.addEventListener('click', () => fsFit(true));
    modal.querySelector('[data-fs-action="reset"]')?.addEventListener('click', () => {
      const svgEl = fsStage.querySelector('svg');
      if (!svgEl) return;
      const nat = svgNaturalSize(svgEl);
      fsScale = 1;
      fsTx = (fsViewport.offsetWidth  - nat.w) / 2;
      fsTy = (fsViewport.offsetHeight - nat.h) / 2;
      fsStage.style.transition = 'transform 300ms ease';
      fsApply();
      setTimeout(() => { fsStage.style.transition = ''; }, 320);
    });
    modal.querySelector('[data-fs-action="zoom-in"]')?.addEventListener('click', () => {
      fsZoomAround(clamp(fsScale + ZOOM_STEP, ZOOM_MIN, ZOOM_MAX),
        fsViewport.offsetWidth / 2, fsViewport.offsetHeight / 2);
    });
    modal.querySelector('[data-fs-action="zoom-out"]')?.addEventListener('click', () => {
      fsZoomAround(clamp(fsScale - ZOOM_STEP, ZOOM_MIN, ZOOM_MAX),
        fsViewport.offsetWidth / 2, fsViewport.offsetHeight / 2);
    });

    // Fullscreen wheel
    fsViewport.addEventListener('wheel', e => {
      e.preventDefault();
      const rect = fsViewport.getBoundingClientRect();
      const newScale = clamp(fsScale * (1 + (-e.deltaY * WHEEL_SENS) * 4), ZOOM_MIN, ZOOM_MAX);
      fsZoomAround(newScale, e.clientX - rect.left, e.clientY - rect.top);
    }, { passive: false });

    // Fullscreen drag
    fsViewport.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      fsDragging = true;
      fsDragStartX = e.clientX; fsDragStartY = e.clientY;
      fsDragTx = fsTx; fsDragTy = fsTy;
      fsViewport.classList.add('dz-viewport--dragging');
      e.preventDefault();
    });
    window.addEventListener('mousemove', e => {
      if (!fsDragging) return;
      fsTx = fsDragTx + (e.clientX - fsDragStartX);
      fsTy = fsDragTy + (e.clientY - fsDragStartY);
      fsApply();
    });
    window.addEventListener('mouseup', () => {
      if (!fsDragging) return;
      fsDragging = false;
      fsViewport.classList.remove('dz-viewport--dragging');
    });

    // Fullscreen double-click to fit
    fsViewport.addEventListener('dblclick', () => fsFit(true));

    // Fullscreen touch
    let fsLastDist = null;
    fsViewport.addEventListener('touchstart', e => {
      if (e.touches.length === 2) {
        fsLastDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const rect = fsViewport.getBoundingClientRect();
        touchMidX = ((e.touches[0].clientX + e.touches[1].clientX) / 2) - rect.left;
        touchMidY = ((e.touches[0].clientY + e.touches[1].clientY) / 2) - rect.top;
      } else if (e.touches.length === 1) {
        singleTouchStartX = e.touches[0].clientX;
        singleTouchStartY = e.touches[0].clientY;
        fsDragTx = fsTx; fsDragTy = fsTy;
      }
    }, { passive: true });
    fsViewport.addEventListener('touchmove', e => {
      if (e.touches.length === 2 && fsLastDist) {
        e.preventDefault();
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        fsZoomAround(clamp(fsScale * (dist / fsLastDist), ZOOM_MIN, ZOOM_MAX), touchMidX, touchMidY);
        fsLastDist = dist;
      } else if (e.touches.length === 1) {
        e.preventDefault();
        fsTx = fsDragTx + (e.touches[0].clientX - singleTouchStartX);
        fsTy = fsDragTy + (e.touches[0].clientY - singleTouchStartY);
        fsApply();
      }
    }, { passive: false });
    fsViewport.addEventListener('touchend', () => { fsLastDist = null; }, { passive: true });

    // Global keyboard shortcuts (only when this modal is open)
    document.addEventListener('keydown', e => {
      if (!modal.classList.contains('dz-modal--open')) return;
      if (e.key === 'Escape')       closeFullscreen();
      if (e.key === '=' || e.key === '+') fsZoomAround(clamp(fsScale + ZOOM_STEP, ZOOM_MIN, ZOOM_MAX), fsViewport.offsetWidth/2, fsViewport.offsetHeight/2);
      if (e.key === '-')            fsZoomAround(clamp(fsScale - ZOOM_STEP, ZOOM_MIN, ZOOM_MAX), fsViewport.offsetWidth/2, fsViewport.offsetHeight/2);
      if (e.key === '0')            fsFit(true);
    });

    // ── Wait for Mermaid to render the SVG ───────────────────────
    function onSvgReady(el) {
      svg = el;
      // Remove max-width constraint that Mermaid/CSS adds so our transform isn't clipped
      svg.style.maxWidth = 'none';
      svg.style.display  = 'block';

      // Set fixed pixel size based on viewBox so scale math is accurate
      const nat = svgNaturalSize(svg);
      svg.setAttribute('width',  nat.w);
      svg.setAttribute('height', nat.h);

      // Set viewport height to diagram height (capped at 600px so page isn't too tall)
      const vpH = Math.min(nat.h, 600);
      viewport.style.height = vpH + 'px';

      fitToViewport(false);
    }

    // Check if Mermaid already rendered (synchronously — unlikely but safe)
    const existingSvg = mermaidDiv.querySelector('svg');
    if (existingSvg) {
      onSvgReady(existingSvg);
    } else {
      const obs = new MutationObserver(() => {
        const el = mermaidDiv.querySelector('svg');
        if (el) { obs.disconnect(); onSvgReady(el); }
      });
      obs.observe(mermaidDiv, { childList: true, subtree: true });
    }
  }

  // ── Init all diagram sections ─────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.diagram-section').forEach(section => {
      new DiagramZoom(section);
    });
  });

})();
