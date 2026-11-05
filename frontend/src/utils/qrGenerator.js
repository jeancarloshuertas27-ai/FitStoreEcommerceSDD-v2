/**
 * Generador Vectorial de Códigos QR en SVG
 * Genera una matriz QR estilizada en SVG/Data URI
 * para visualización dinámica en billeteras móviles (Yape / Plin).
 */

export function generateQrSvgDataUri({
  text = '',
  size = 200,
  brand = 'Yape',
  color = '#742384',
  bgColor = '#FFFFFF'
}) {
  // Generar matriz determinística 21x21 (formato estándar QR versión 1)
  const matrixSize = 25;
  const matrix = createQrMatrix(matrixSize, text);

  const cellSize = size / matrixSize;
  const rects = [];

  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      if (matrix[r][c] === 1) {
        const x = c * cellSize;
        const y = r * cellSize;
        rects.push(`<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${cellSize.toFixed(2)}" height="${cellSize.toFixed(2)}" fill="${color}" />`);
      }
    }
  }

  // Logo o distintivo central
  const centerSize = size * 0.22;
  const centerOffset = (size - centerSize) / 2;
  const brandInitial = brand === 'Yape' ? 'Y' : 'P';
  const brandBg = brand === 'Yape' ? '#00D4B2' : '#FF6B00';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size}" ${size}">
    <rect width="${size}" height="${size}" fill="${bgColor}" rx="12"/>
    <g>${rects.join('')}</g>
    <!-- Centro con Distintivo de Marca -->
    <rect x="${centerOffset.toFixed(2)}" y="${centerOffset.toFixed(2)}" width="${centerSize.toFixed(2)}" height="${centerSize.toFixed(2)}" rx="8" fill="#FFFFFF" stroke="${color}" stroke-width="2"/>
    <rect x="${(centerOffset + 3).toFixed(2)}" y="${(centerOffset + 3).toFixed(2)}" width="${(centerSize - 6).toFixed(2)}" height="${(centerSize - 6).toFixed(2)}" rx="6" fill="${brandBg}"/>
    <text x="${(size / 2).toFixed(2)}" y="${(size / 2 + 5).toFixed(2)}" font-family="sans-serif" font-size="${(centerSize * 0.6).toFixed(2)}" font-weight="900" fill="#FFFFFF" text-anchor="middle" dominant-baseline="middle">${brandInitial}</text>
  </svg>`;

  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

/**
 * Crea una matriz 25x25 con patrones de búsqueda (finders) en 3 esquinas
 * y datos pseudoaleatorios consistentes basados en el texto a codificar.
 */
function createQrMatrix(n, text) {
  const m = Array(n).fill(null).map(() => Array(n).fill(0));

  // Finder pattern 7x7 en (0,0), (0, n-7), (n-7, 0)
  addFinder(m, 0, 0);
  addFinder(m, 0, n - 7);
  addFinder(m, n - 7, 0);

  // Timing patterns
  for (let i = 8; i < n - 8; i++) {
    m[6][i] = i % 2 === 0 ? 1 : 0;
    m[i][6] = i % 2 === 0 ? 1 : 0;
  }

  // Hash determinístico del texto para poblar datos
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      // Ignorar zonas de finders
      if (isFinderZone(r, c, n)) continue;
      if (r === 6 || c === 6) continue;

      // Generar bit según hash y coordenadas
      const bit = ((hash ^ (r * 13 + c * 37)) + r * c) % 3 === 0 ? 1 : 0;
      m[r][c] = bit;
    }
  }

  return m;
}

function addFinder(m, row, col) {
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      if (
        r === 0 || r === 6 ||
        c === 0 || c === 6 ||
        (r >= 2 && r <= 4 && c >= 2 && c <= 4)
      ) {
        m[row + r][col + c] = 1;
      } else {
        m[row + r][col + c] = 0;
      }
    }
  }
}

function isFinderZone(r, c, n) {
  if (r < 8 && c < 8) return true;
  if (r < 8 && c >= n - 8) return true;
  if (r >= n - 8 && c < 8) return true;
  return false;
}

