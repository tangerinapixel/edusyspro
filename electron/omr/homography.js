/**
 * Homography Solver and Projective Coordinate Mapping
 * Solves standard perspective projection using pure Javascript.
 */

/**
 * Solves a system of linear equations Ax = B using Gaussian elimination.
 * @param {Array<Array<number>>} A - Matrix (8x8)
 * @param {Array<number>} B - Vector (8)
 * @returns {Array<number>|null} Solution vector x (8), or null if singular
 */
function solveLinearSystem(A, B) {
  const n = B.length;
  // Augment matrix A with B
  for (let i = 0; i < n; i++) {
    A[i].push(B[i]);
  }
  
  // Gaussian elimination with row pivoting
  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(A[k][i]) > Math.abs(A[maxRow][i])) {
        maxRow = k;
      }
    }
    
    // Swap rows
    const temp = A[i];
    A[i] = A[maxRow];
    A[maxRow] = temp;

    // Check for singular matrix
    const pivot = A[i][i];
    if (Math.abs(pivot) < 1e-9) {
      return null; 
    }
    
    // Eliminate column entries below pivot
    for (let k = i + 1; k < n; k++) {
      const factor = A[k][i] / pivot;
      for (let j = i; j <= n; j++) {
        A[k][j] -= factor * A[i][j];
      }
    }
  }

  // Back substitution
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = A[i][n];
    for (let j = i + 1; j < n; j++) {
      sum -= A[i][j] * x[j];
    }
    x[i] = sum / A[i][i];
  }
  return x;
}

/**
 * Computes the 3x3 Homography Matrix mapping srcPoints to dstPoints.
 * @param {Array<{x, y}>} srcPoints - Array of 4 source points (template)
 * @param {Array<{x, y}>} dstPoints - Array of 4 destination points (camera image)
 * @returns {Array<Array<number>>|null} 3x3 homography matrix or null
 */
function computeHomography(srcPoints, dstPoints) {
  if (srcPoints.length !== 4 || dstPoints.length !== 4) {
    throw new Error('Homography requires exactly 4 point pairs');
  }

  const A = [];
  const B = [];

  for (let i = 0; i < 4; i++) {
    const { x, y } = srcPoints[i];
    const { x: u, y: v } = dstPoints[i];

    A.push([x, y, 1, 0, 0, 0, -x * u, -y * u]);
    B.push(u);

    A.push([0, 0, 0, x, y, 1, -x * v, -y * v]);
    B.push(v);
  }

  const h = solveLinearSystem(A, B);
  if (!h) return null;

  // Construct 3x3 matrix where H[2][2] = 1
  return [
    [h[0], h[1], h[2]],
    [h[3], h[4], h[5]],
    [h[6], h[7], 1.0]
  ];
}

/**
 * Projects a point in template coordinates into the camera coordinate system using H.
 * @param {{x, y}} point - Template point coordinate
 * @param {Array<Array<number>>} H - Homography matrix
 * @returns {{x, y}|null} Projected camera point or null
 */
function projectPoint(point, H) {
  const { x, y } = point;
  const w = H[2][0] * x + H[2][1] * y + 1.0;
  if (Math.abs(w) < 1e-9) return null;
  
  return {
    x: (H[0][0] * x + H[0][1] * y + H[0][2]) / w,
    y: (H[1][0] * x + H[1][1] * y + H[1][2]) / w
  };
}

module.exports = {
  computeHomography,
  projectPoint
};
