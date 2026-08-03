// Focus Module v2 — Animation Controller
// Orchestrates 3D date transitions, row enter/exit, and progress bar animations.

class FocusAnimations {
  constructor() {
    this._transitioning = false;
  }

  get isTransitioning() {
    return this._transitioning;
  }

  // ── 3D Date Transition ──
  // direction: 1 (forward/next) or -1 (backward/prev)
  // callback: called after the out-animation completes (render new content, then in-animate)
  animateDateTransition(direction, contentArea, callback) {
    if (this._transitioning || !contentArea) {
      callback();
      return;
    }
    this._transitioning = true;

    const outClass = direction > 0 ? 'slide-out-left' : 'slide-out-right';
    const inClass = direction > 0 ? 'slide-in-from-right' : 'slide-in-from-left';

    // Phase 1: Slide out current content
    contentArea.classList.add(outClass);

    const onOutEnd = () => {
      contentArea.removeEventListener('animationend', onOutEnd);
      contentArea.classList.remove(outClass);

      // Phase 2: Render new content
      callback();

      // Phase 3: Slide in new content
      contentArea.classList.add(inClass);
      const onInEnd = () => {
        contentArea.removeEventListener('animationend', onInEnd);
        contentArea.classList.remove(inClass);
        this._transitioning = false;
      };
      contentArea.addEventListener('animationend', onInEnd, { once: true });
    };

    contentArea.addEventListener('animationend', onOutEnd, { once: true });
  }

  // ── Row Exit Animation ──
  // Returns a promise that resolves after exit animation completes
  animateRowExit(rowEl) {
    return new Promise(resolve => {
      if (!rowEl) { resolve(); return; }
      rowEl.classList.add('fv2-exiting');
      rowEl.addEventListener('animationend', () => {
        rowEl.remove();
        resolve();
      }, { once: true });
      // Safety timeout in case animationend doesn't fire
      setTimeout(() => {
        if (rowEl.parentNode) rowEl.remove();
        resolve();
      }, 350);
    });
  }
}

window.FocusAnimations = FocusAnimations;
