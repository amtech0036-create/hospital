/**
 * Thermal Label Printer Utility (50mm x 25mm / 2" x 1")
 * Supports standard ESC/POS raw command string generation and CSS printable thermal label DOM builder
 * for Blood Collection Tubes, MRI Trays, and Patient Wristbands.
 */

class ThermalLabelPrinter {
  /**
   * Generates CSS/HTML 50mm x 25mm printable label content.
   */
  static buildLabelHtml({ labelType = 'specimen', patientName, uhid, barcode, testName, department, date }) {
    const formattedDate = date ? new Date(date).toLocaleDateString() : new Date().toLocaleDateString();

    return `
      <div class="thermal-label-container" style="width: 50mm; height: 25mm; padding: 1.5mm; font-family: Arial, sans-serif; font-size: 8pt; border: 1px dashed #000; box-sizing: border-box; page-break-after: always; background: #fff;">
        <div style="font-weight: bold; font-size: 8.5pt; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 47mm;">
          ${patientName || 'PATIENT NAME'}
        </div>
        <div style="font-size: 7pt; margin-bottom: 1mm; display: flex; justify-content: space-between;">
          <span>UHID: <strong>${uhid || 'UHID-0000'}</strong></span>
          <span>${labelType.toUpperCase()}</span>
        </div>
        <div style="text-align: center; margin-top: 0.5mm;">
          <svg class="thermal-barcode-svg" data-barcode="${barcode}" style="max-width: 44mm; height: 10mm;"></svg>
          <div style="font-family: monospace; font-size: 6.5pt; margin-top: 0.5mm;">${barcode}</div>
        </div>
        <div style="font-size: 6.5pt; display: flex; justify-content: space-between; margin-top: 0.5mm;">
          <span>${testName ? testName.slice(0, 18) : department || 'DIAGNOSTIC'}</span>
          <span>${formattedDate}</span>
        </div>
      </div>
    `;
  }

  /**
   * Generates ESC/POS Binary/Hex commands for Direct Network / Serial Thermal Label Printers.
   */
  static generateEscPosCommands({ patientName, uhid, barcode, testName }) {
    // ESC/POS Command Constants
    const ESC = '\x1B';
    const GS = '\x1D';
    const INIT = `${ESC}@`;
    const ALIGN_CENTER = `${ESC}a\x01`;
    const ALIGN_LEFT = `${ESC}a\x00`;
    const BOLD_ON = `${ESC}E\x01`;
    const BOLD_OFF = `${ESC}E\x00`;

    // Code128 Barcode Command (GS k 73 len bytes)
    const barcodeCmd = `${GS}k\x49${String.fromCharCode(barcode.length)}${barcode}`;

    let commands = '';
    commands += INIT;
    commands += ALIGN_LEFT;
    commands += BOLD_ON + (patientName || 'PATIENT NAME') + BOLD_OFF + '\n';
    commands += `UHID: ${uhid || ''}\n`;
    commands += `Test: ${testName || ''}\n`;
    commands += ALIGN_CENTER;
    commands += barcodeCmd + '\n';
    commands += `${barcode}\n`;
    commands += `${ESC}d\x03`; // Feed 3 lines
    commands += `${GS}V\x41\x00`; // Cut paper

    return commands;
  }
}

if (typeof window !== 'undefined') {
  window.ThermalLabelPrinter = ThermalLabelPrinter;
}
