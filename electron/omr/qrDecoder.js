const jsQR = require('jsqr');

/**
 * Decodes QR Code from raw RGBA buffer, with optional ROI (Region Of Interest) optimization.
 * @param {Buffer|Uint8Array|Uint8ClampedArray} rgbaBuffer - Image raw buffer (RGBA bytes)
 * @param {number} width - Width of the image in pixels
 * @param {number} height - Height of the image in pixels
 * @param {object|null} roi - Optional bounding box { x, y, width, height } for focused fast scan
 * @returns {string|null} The decoded QR code text, or null if not found/error
 */
function decodeQRCode(rgbaBuffer, width, height, roi = null) {
  try {
    // 1. Otimização por ROI: Se fornecido, analisa apenas a fração superior da folha (até 8x mais rápido)
    if (roi && roi.width > 30 && roi.height > 30) {
      const rx = Math.max(0, Math.floor(roi.x));
      const ry = Math.max(0, Math.floor(roi.y));
      const rw = Math.min(width - rx, Math.ceil(roi.width));
      const rh = Math.min(height - ry, Math.ceil(roi.height));

      if (rw > 30 && rh > 30) {
        const subData = new Uint8ClampedArray(rw * rh * 4);
        for (let row = 0; row < rh; row++) {
          const srcStart = ((ry + row) * width + rx) * 4;
          const srcEnd = srcStart + rw * 4;
          subData.set(rgbaBuffer.subarray(srcStart, srcEnd), row * rw * 4);
        }
        const code = jsQR(subData, rw, rh);
        if (code && code.data) {
          return code.data;
        }
      }
    }

    // 2. Fallback de Segurança: subregião expandida centralizada (70% w × 65% h)
    // Evita escanear o frame 1280×720 inteiro — reduz ~60% do custo do jsQR no fallback
    const fbW = Math.round(width * 0.70);
    const fbH = Math.round(height * 0.65);
    const fbX = Math.round((width - fbW) / 2);
    const fbY = Math.round((height - fbH) / 2);
    const fbData = new Uint8ClampedArray(fbW * fbH * 4);
    for (let row = 0; row < fbH; row++) {
      const srcStart = ((fbY + row) * width + fbX) * 4;
      fbData.set(rgbaBuffer.subarray(srcStart, srcStart + fbW * 4), row * fbW * 4);
    }
    const fbCode = jsQR(fbData, fbW, fbH);
    return fbCode ? fbCode.data : null;
  } catch (e) {
    console.error('[OMR] QR Decoder Error:', e);
    return null;
  }
}

module.exports = {
  decodeQRCode
};
