/**
 * OMR Layout Template Map for EduSys Pro
 * Updated for the official A4 sheet layout:
 * Width: 600, Height: 848 (Aspect ratio approx 1:1.414 matching A4)
 */
const layoutTemplate = {
  width: 600,
  height: 848,
  
  // Anchor Points (Fiducial markers) at the 4 corners
  // Centered at offset 48px (representing 17mm from edges in 600x848 space)
  anchors: {
    topLeft: { x: 48, y: 48 },
    topRight: { x: 552, y: 48 },
    bottomLeft: { x: 48, y: 800 },
    bottomRight: { x: 552, y: 800 }
  },

  // QR Code Area bounding box
  qrArea: {
    x: 250,
    y: 40,
    width: 100,
    height: 100
  },

  // Mapeamento das 4 colunas de bolhas de Matrícula (Dígitos 0 a 9)
  enrollment: {
    columns: [96, 118, 139, 161],
    startY: 257,
    stepY: 20
  },

  // Questions 1 to 20 bubble coordinates
  questions: []
};

// Generate coordinates milimetricamente calibradas com a folha impressa A4
const startY = 246;
const stepY = 40;

// Column 1 (Questions 1 - 10)
// Centros das bolhas A, B, C, D, E (espaçadas em 23px ~ 8mm físicos)
const col1X = [243, 266, 289, 311, 334];

for (let i = 0; i < 10; i++) {
  const qNum = i + 1;
  const y = startY + (i * stepY);
  layoutTemplate.questions.push({
    number: qNum,
    column: 1,
    y: y,
    options: {
      A: { x: col1X[0], y },
      B: { x: col1X[1], y },
      C: { x: col1X[2], y },
      D: { x: col1X[3], y },
      E: { x: col1X[4], y }
    }
  });
}

// Column 2 (Questions 11 - 20)
// Centros das bolhas A, B, C, D, E (deslocadas 166px ~ 58mm físicos à direita)
const col2X = [409, 432, 455, 477, 500];

for (let i = 0; i < 10; i++) {
  const qNum = i + 11;
  const y = startY + (i * stepY);
  layoutTemplate.questions.push({
    number: qNum,
    column: 2,
    y: y,
    options: {
      A: { x: col2X[0], y },
      B: { x: col2X[1], y },
      C: { x: col2X[2], y },
      D: { x: col2X[3], y },
      E: { x: col2X[4], y }
    }
  });
}

module.exports = layoutTemplate;
