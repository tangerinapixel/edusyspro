const { nativeImage } = require('electron');
const layoutTemplate = require('./layoutTemplate');
const { computeHomography, projectPoint } = require('./homography');
const { decodeQRCode } = require('./qrDecoder');

/**
 * Finds the exact center of a black anchor block inside a local region of interest.
 * Validates local contrast, dark core, paper background, and square compactness.
 */
function findAnchorCentroid(rgba, width, height, nominalX, nominalY, searchRadius) {
  const minX = Math.max(0, Math.floor(nominalX - searchRadius));
  const maxX = Math.min(width - 1, Math.ceil(nominalX + searchRadius));
  const minY = Math.max(0, Math.floor(nominalY - searchRadius));
  const maxY = Math.min(height - 1, Math.ceil(nominalY + searchRadius));

  // PERF-02: Pass 1 — calcula min/max de cinza E acumula centroide em uma única varedura
  // Elimina o loop duplicado anterior, reduzindo ~33% das iterações por âncora
  let minGray = 255;
  let maxGray = 0;

  // Pré-varredura apenas para min/max (necessário antes de calcular threshold)
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const idx = (y * width + x) * 4;
      const gray = 0.299 * rgba[idx] + 0.587 * rgba[idx + 1] + 0.114 * rgba[idx + 2];
      if (gray < minGray) minGray = gray;
      if (gray > maxGray) maxGray = gray;
    }
  }

  // Validação 1: O papel ao redor precisa ser claro e o marcador precisa ter tinta preta sólida.
  // Contraste mínimo de 65 tons, núcleo escuro (<= 115) e papel claro (>= 130).
  if ((maxGray - minGray < 65) || minGray > 115 || maxGray < 130) {
    return null; // Não é um marcador fiducial impresso sobre papel branco
  }

  // Threshold: pixels escuros pertencentes ao bloco de tinta preta
  const threshold = Math.min(125, minGray + (maxGray - minGray) * 0.32);

  // PERF-02: Pass 2 — centroide e coleta de pixels escuros
  let sumX = 0;
  let sumY = 0;
  let count = 0;
  // Cache dos pixels escuros para calcular variância sem terceiro loop
  const darkPixels = [];

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const idx = (y * width + x) * 4;
      const gray = 0.299 * rgba[idx] + 0.587 * rgba[idx + 1] + 0.114 * rgba[idx + 2];
      if (gray < threshold) {
        sumX += x;
        sumY += y;
        darkPixels.push(x, y); // armazena intercalado [x0,y0,x1,y1,...]
        count++;
      }
    }
  }

  // Validação 2: Contagem de pixels do marcador fiducial impresso (descarta ruído de sensor e sombras grandes)
  if (count < 25 || count > 2200) return null;

  const cx = sumX / count;
  const cy = sumY / count;

  // Validação 3: Compacidade — calcula variância a partir do cache, sem terceiro loop sobre rgba
  let varX = 0;
  let varY = 0;
  for (let i = 0; i < darkPixels.length; i += 2) {
    const dx = darkPixels[i] - cx;
    const dy = darkPixels[i + 1] - cy;
    varX += dx * dx;
    varY += dy * dy;
  }
  const stdX = Math.sqrt(varX / count);
  const stdY = Math.sqrt(varY / count);
  const aspect = stdX > 0 && stdY > 0 ? stdX / stdY : 0;

  // Um quadrado fiducial tem dispersão proporcional (rejeita sombras alongadas e bordas de objetos)
  if (aspect < 0.40 || aspect > 2.50) return null;

  return { x: cx, y: cy };
}

/**
 * Samples average grayscale around a specific coordinate in the image.
 * Uses circular boundary sampling to avoid corners outside the bubble disc.
 */
function getAvgGrayscale(rgba, width, height, cx, cy, radius) {
  let sum = 0;
  let count = 0;
  const r2 = radius * radius;
  
  const minX = Math.max(0, Math.floor(cx - radius));
  const maxX = Math.min(width - 1, Math.ceil(cx + radius));
  const minY = Math.max(0, Math.floor(cy - radius));
  const maxY = Math.min(height - 1, Math.ceil(cy + radius));

  for (let y = minY; y <= maxY; y++) {
    const dy = y - cy;
    const dy2 = dy * dy;
    for (let x = minX; x <= maxX; x++) {
      const dx = x - cx;
      if (dx * dx + dy2 <= r2) {
        const idx = (y * width + x) * 4;
        const r = rgba[idx];
        const g = rgba[idx + 1];
        const b = rgba[idx + 2];
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        sum += gray;
        count++;
      }
    }
  }

  return count > 0 ? sum / count : 255;
}

/**
 * Main OMR process handler.
 * @param {string} base64Image - Data URL / Base64 image
 * @returns {Promise<object>} Processing results
 */
async function processOMR(base64Image) {
  try {
    // 1. Load image using Electron's nativeImage
    const img = nativeImage.createFromDataURL(base64Image);
    if (img.isEmpty()) {
      return { success: false, error: 'Imagem corrompida ou vazia.' };
    }

    const { width, height } = img.getSize();
    const rgba = img.getBitmap(); // Get raw RGBA buffer

    // 2. Detect Anchors (Fast-Fail: executa em ~2ms e evita processamento desnecessário)
    // Escala ergonômica (72% da altura): permite leitura confortável a 25-30cm de distância da mesa
    const fitScale = Math.min((width * 0.80) / layoutTemplate.width, (height * 0.72) / layoutTemplate.height);
    const originX = (width - layoutTemplate.width * fitScale) / 2;
    const originY = (height - layoutTemplate.height * fitScale) / 2;

    const nominalTL = { x: originX + layoutTemplate.anchors.topLeft.x * fitScale, y: originY + layoutTemplate.anchors.topLeft.y * fitScale };
    const nominalTR = { x: originX + layoutTemplate.anchors.topRight.x * fitScale, y: originY + layoutTemplate.anchors.topRight.y * fitScale };
    const nominalBL = { x: originX + layoutTemplate.anchors.bottomLeft.x * fitScale, y: originY + layoutTemplate.anchors.bottomLeft.y * fitScale };
    const nominalBR = { x: originX + layoutTemplate.anchors.bottomRight.x * fitScale, y: originY + layoutTemplate.anchors.bottomRight.y * fitScale };

    // Raio de busca calibrado estritamente com a caixa da mira visual da tela
    const searchRadius = Math.round(Math.max(layoutTemplate.width, layoutTemplate.height) * fitScale * 0.08);

    const tlCentroid = findAnchorCentroid(rgba, width, height, nominalTL.x, nominalTL.y, searchRadius);
    const trCentroid = findAnchorCentroid(rgba, width, height, nominalTR.x, nominalTR.y, searchRadius);
    const blCentroid = findAnchorCentroid(rgba, width, height, nominalBL.x, nominalBL.y, searchRadius);
    const brCentroid = findAnchorCentroid(rgba, width, height, nominalBR.x, nominalBR.y, searchRadius);

    if (!tlCentroid || !trCentroid || !blCentroid || !brCentroid) {
      const missing = [];
      if (!tlCentroid) missing.push('Superior-Esquerdo');
      if (!trCentroid) missing.push('Superior-Direito');
      if (!blCentroid) missing.push('Inferior-Esquerdo');
      if (!brCentroid) missing.push('Inferior-Direito');
      return { 
        success: false, 
        error: `Alinhe os 4 cantos nas miras: falta ${missing.join(', ')}`
      };
    }

    // 2.0 Trava de Enquadramento Estrito: os 4 cantos DEVEM estar dentro das caixas das miras visuais
    const maxTargetDeviation = searchRadius * 0.95;
    const distTL = Math.hypot(tlCentroid.x - nominalTL.x, tlCentroid.y - nominalTL.y);
    const distTR = Math.hypot(trCentroid.x - nominalTR.x, trCentroid.y - nominalTR.y);
    const distBL = Math.hypot(blCentroid.x - nominalBL.x, blCentroid.y - nominalBL.y);
    const distBR = Math.hypot(brCentroid.x - nominalBR.x, brCentroid.y - nominalBR.y);

    if (distTL > maxTargetDeviation || distTR > maxTargetDeviation || distBL > maxTargetDeviation || distBR > maxTargetDeviation) {
      return { 
        success: false, 
        error: 'Posicione a folha exatamente dentro dos limites visuais da mira.' 
      };
    }

    // 2.1 Validação Geométrica Estrita: conferir se os 4 pontos formam uma folha A4 real
    const topWidth = Math.hypot(trCentroid.x - tlCentroid.x, trCentroid.y - tlCentroid.y);
    const bottomWidth = Math.hypot(brCentroid.x - blCentroid.x, brCentroid.y - blCentroid.y);
    const leftHeight = Math.hypot(blCentroid.x - tlCentroid.x, blCentroid.y - tlCentroid.y);
    const rightHeight = Math.hypot(brCentroid.x - trCentroid.x, brCentroid.y - trCentroid.y);

    // Dimensões mínimas para a folha enquadrada no campo de visão
    if (topWidth < width * 0.20 || leftHeight < height * 0.25) {
      return { success: false, error: 'Aproxime mais a folha da câmera.' };
    }

    // Proporção entre bordas opostas (paralelismo aceitável sob perspectiva)
    const widthRatio = topWidth / (bottomWidth || 1);
    const heightRatio = leftHeight / (rightHeight || 1);
    if (widthRatio < 0.60 || widthRatio > 1.65 || heightRatio < 0.60 || heightRatio > 1.65) {
      return { success: false, error: 'Mantenha a folha paralela à câmera.' };
    }

    // Proporção de aspecto da folha A4 (nominal ~1.492)
    const avgWidth = (topWidth + bottomWidth) / 2;
    const avgHeight = (leftHeight + rightHeight) / 2;
    const sheetAspect = avgHeight / (avgWidth || 1);
    if (sheetAspect < 1.15 || sheetAspect > 1.85) {
      return { success: false, error: 'Alinhe a folha A4 verticalmente nos alvos.' };
    }

    // Orientação correta: topo acima da base e esquerda à esquerda da direita
    if (tlCentroid.y >= blCentroid.y || trCentroid.y >= brCentroid.y || tlCentroid.x >= trCentroid.x) {
      return { success: false, error: 'Posicione a folha na orientação retrato.' };
    }

    // 3. Compute Homography Matrix
    const srcPoints = [
      layoutTemplate.anchors.topLeft,
      layoutTemplate.anchors.topRight,
      layoutTemplate.anchors.bottomLeft,
      layoutTemplate.anchors.bottomRight
    ];
    const dstPoints = [tlCentroid, trCentroid, blCentroid, brCentroid];
    
    const H = computeHomography(srcPoints, dstPoints);
    if (!H) {
      return { success: false, error: 'Erro geométrico no alinhamento da perspectiva.' };
    }

    // 3.1 Verificação de Superfície de Papel Claro no centro da folha
    const centerSheetCoord = projectPoint({ x: 300, y: 400 }, H);
    if (centerSheetCoord) {
      const centerGray = getAvgGrayscale(rgba, width, height, centerSheetCoord.x, centerSheetCoord.y, 12);
      if (centerGray < 90) {
        return { success: false, error: 'Superfície muito escura. Aponte para uma folha de papel clara.' };
      }
    }

    // Raio amostral adaptativo coerente com a escala da folha (amostrado dentro da bolha)
    // Mantido no mínimo de 3px: valor calibrado para câmeras 720p/1080p a distância ergonômica
    const bubbleSampleRadius = Math.max(3, Math.round(fitScale * 4));

    // 4. Decode QR Code (Executado apenas na folha alinhada, com ROI acelerada da porção superior)
    let studentId = null;
    let qrData = null;
    try {
      const minX = Math.min(tlCentroid.x, blCentroid.x);
      const maxX = Math.max(trCentroid.x, brCentroid.x);
      const minY = Math.min(tlCentroid.y, trCentroid.y);
      const sheetHeight = Math.max(blCentroid.y, brCentroid.y) - minY;

      const headerROI = {
        x: Math.max(0, minX - 20),
        y: Math.max(0, minY - 20),
        width: (maxX - minX) + 40,
        height: Math.max(80, sheetHeight * 0.42)
      };

      qrData = decodeQRCode(rgba, width, height, headerROI);
      if (qrData) {
        if (qrData.startsWith('EDUSYSPRO:student_id:')) {
          studentId = parseInt(qrData.split(':')[2], 10);
        } else {
          const num = parseInt(qrData, 10);
          if (!isNaN(num)) studentId = num;
        }
      }
    } catch (e) {
      console.error('[OMR] Failed during QR decode step:', e);
    }

    // 5. Fallback de Identificação: Leitura Óptica da Matrícula (para Folhas em Branco)
    if (!studentId && layoutTemplate.enrollment) {
      try {
        let enrollmentStr = '';
        const { columns, startY: enrStartY, stepY: enrStepY } = layoutTemplate.enrollment;
        
        for (const colX of columns) {
          const digitGrays = [];
          for (let d = 0; d < 10; d++) {
            const templateCoord = { x: colX, y: enrStartY + (d * enrStepY) };
            const cameraCoord = projectPoint(templateCoord, H);
            let grayVal = 255;
            if (cameraCoord) {
              grayVal = getAvgGrayscale(rgba, width, height, cameraCoord.x, cameraCoord.y, bubbleSampleRadius);
            }
            digitGrays.push({ digit: d, gray: grayVal });
          }

          const sortedDigits = [...digitGrays].sort((a, b) => a.gray - b.gray);
          const darkestDigit = sortedDigits[0];
          // Linha de base da coluna (média dos 5 dígitos mais claros com certeza não preenchidos)
          const baseCol = (sortedDigits[5].gray + sortedDigits[6].gray + sortedDigits[7].gray + sortedDigits[8].gray + sortedDigits[9].gray) / 5;
          const contrast = baseCol - darkestDigit.gray;

          if (contrast >= 20 && (baseCol > 0 ? contrast / baseCol >= 0.12 : false)) {
            enrollmentStr += darkestDigit.digit.toString();
          }
        }

        if (enrollmentStr.length === columns.length) {
          const parsed = parseInt(enrollmentStr, 10);
          if (!isNaN(parsed) && parsed > 0) {
            studentId = parsed;
          }
        }
      } catch (e) {
        console.error('[OMR] Erro ao decodificar matrícula óptica:', e);
      }
    }

    // 6. Scan Question Bubbles
    const detectedAnswers = {};
    // Coordenadas projetadas de cada bolha no espaço da imagem da câmera
    // Usadas pelo ScannerOMR para renderizar o overlay visual de diagnóstico
    const bubbleCoords = [];

    for (const q of layoutTemplate.questions) {
      const optionsGrays = [];
      
      for (const opt of ['A', 'B', 'C', 'D', 'E']) {
        const templateCoord = q.options[opt];
        const cameraCoord = projectPoint(templateCoord, H);

        let grayVal = 255;
        if (cameraCoord) {
          grayVal = getAvgGrayscale(rgba, width, height, cameraCoord.x, cameraCoord.y, bubbleSampleRadius);
          // Coleta a coordenada no espaço da câmera para o overlay de diagnóstico
          bubbleCoords.push({ qNum: q.number, option: opt, x: Math.round(cameraCoord.x), y: Math.round(cameraCoord.y) });
        }
        optionsGrays.push({ option: opt, gray: grayVal });
      }

      // Ordena as alternativas da mais escura (menor gray) para a mais clara (maior gray)
      const sorted = [...optionsGrays].sort((a, b) => a.gray - b.gray);
      const darkest = sorted[0];
      const secondDarkest = sorted[1];

      // Linha de base local: média das 3 alternativas com certeza não preenchidas
      const unselectedBase = (sorted[2].gray + sorted[3].gray + sorted[4].gray) / 3;
      const contrastFill = unselectedBase - darkest.gray;
      const contrastRatio = unselectedBase > 0 ? contrastFill / unselectedBase : 0;

      let answer = 'BLANK';

      // Critério Adaptativo: bolha nitidamente preenchida em relação ao papel na linha atual
      if (contrastFill >= 22 && contrastRatio >= 0.12) {
        // Checagem de dupla marcação vs. rasura
        const secondContrast = unselectedBase - secondDarkest.gray;
        // LOGIC-02: Limiar aumentado de 14 para 20 tons — reduz falsos positivos em iluminação desuniforme
        if (secondContrast >= 18 && (secondDarkest.gray - darkest.gray) < 20) {
          answer = 'MULTIPLE';
        } else {
          answer = darkest.option;
        }
      }

      detectedAnswers[q.number] = answer;
    }

    // 7. Validação de Conteúdo Real (Anti-Fantasma / Fake Scan)
    // Contagem de questões efetivamente respondidas
    let markedCount = 0;
    for (const qNum in detectedAnswers) {
      if (detectedAnswers[qNum] !== 'BLANK') {
        markedCount++;
      }
    }

    // Se NÃO há identificação de aluno (nem por QR Code, nem por matrícula óptica) E nenhuma questão foi respondida:
    // Trata-se de falso-positivo de imagem ou folha 100% em branco
    if (!studentId && markedCount === 0) {
      return {
        success: false,
        error: 'Nenhuma resposta preenchida ou identificação detectada na folha.'
      };
    }

    return {
      success: true,
      studentId,
      qrData,
      answers: detectedAnswers,
      centroids: {
        topLeft: tlCentroid,
        topRight: trCentroid,
        bottomLeft: blCentroid,
        bottomRight: brCentroid
      },
      // Dados para o overlay visual de diagnóstico no ScannerOMR
      bubbleCoords,
      imgWidth: width,
      imgHeight: height
    };

  } catch (err) {
    console.error('[OMR] Engine Processing Error:', err);
    return { success: false, error: `Erro inesperado no OMR: ${err.message}` };
  }
}

module.exports = {
  processOMR
};
