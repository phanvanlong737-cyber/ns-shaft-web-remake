export class Input {
  constructor(onPause, onBlur, root = window) {
    this.keys = new Set();
    this.touches = new Map();
    this.controller = new AbortController();
    const options = { signal: this.controller.signal };
    root.addEventListener('keydown', event => {
      if (event.target.closest?.('input, textarea, select, dialog')) return;
      if (['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD', 'Space', 'Escape'].includes(event.code)) {
        event.preventDefault();
        this.keys.add(event.code);
        if (!event.repeat && ['Space', 'Escape'].includes(event.code)) onPause();
      }
    }, options);
    root.addEventListener('keyup', event => this.keys.delete(event.code), options);
    root.addEventListener('blur', () => { this.clear(); onBlur(); }, options);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { this.clear(); onBlur(); }
    }, options);
  }

  bindTouch(button, direction) {
    const options = { signal: this.controller.signal };
    button.addEventListener('pointerdown', event => {
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      this.touches.set(event.pointerId, direction);
      button.classList.add('pressed');
    }, options);
    const release = event => {
      this.touches.delete(event.pointerId);
      if (![...this.touches.values()].includes(direction)) button.classList.remove('pressed');
    };
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, release, options);
  }

  read() {
    const touch = [...this.touches.values()];
    return { left: this.keys.has('ArrowLeft') || this.keys.has('KeyA') || touch.includes('left'),
      right: this.keys.has('ArrowRight') || this.keys.has('KeyD') || touch.includes('right') };
  }

  clear() {
    this.keys.clear(); this.touches.clear();
    document.querySelectorAll('.pressed').forEach(button => button.classList.remove('pressed'));
  }

  dispose() { this.controller.abort(); this.clear(); }
}
