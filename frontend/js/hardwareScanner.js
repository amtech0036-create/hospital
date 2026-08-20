/**
 * Hardware Barcode Scanner Listener Utility (USB & Bluetooth Scanners)
 * Uses 15-30ms keypress inter-character timing threshold to distinguish
 * high-speed hardware scanner bursts from manual keyboard typing.
 */

class HardwareBarcodeScanner {
  constructor(options = {}) {
    this.timingThreshold = options.timingThreshold || 25; // 25ms threshold
    this.minBarcodeLength = options.minBarcodeLength || 4;
    this.onScan = options.onScan || function () {};
    this.buffer = '';
    this.lastKeyTime = 0;

    this.init();
  }

  init() {
    window.addEventListener('keydown', (e) => this.handleKeyDown(e), true);
  }

  handleKeyDown(e) {
    const target = e.target;
    // Don't intercept if user is intentionally typing into an editable field, unless it's designated as scanner-friendly
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) && !target.hasAttribute('data-scanner-input')) {
      // If timing is extremely fast (< 25ms), it's likely a scanner anyway
      const now = Date.now();
      if (now - this.lastKeyTime > this.timingThreshold) {
        this.buffer = '';
      }
      this.lastKeyTime = now;

      if (e.key === 'Enter') {
        if (this.buffer.length >= this.minBarcodeLength) {
          e.preventDefault();
          this.triggerScan(this.buffer.trim());
          this.buffer = '';
        }
      } else if (e.key.length === 1) {
        this.buffer += e.key;
      }
      return;
    }

    const now = Date.now();
    const timeDiff = now - this.lastKeyTime;
    this.lastKeyTime = now;

    if (timeDiff > this.timingThreshold) {
      this.buffer = '';
    }

    if (e.key === 'Enter' || e.key === 'Tab') {
      if (this.buffer.length >= this.minBarcodeLength) {
        e.preventDefault();
        e.stopPropagation();
        this.triggerScan(this.buffer.trim());
        this.buffer = '';
      }
    } else if (e.key.length === 1) {
      this.buffer += e.key;
    }
  }

  triggerScan(barcode) {
    if (typeof this.onScan === 'function') {
      this.onScan(barcode);
    }
  }
}

if (typeof window !== 'undefined') {
  window.HardwareBarcodeScanner = HardwareBarcodeScanner;
}
