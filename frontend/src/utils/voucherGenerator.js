/**
 * Generador de Comprobantes Bancarios Peruanos (Canvas / SVG Data URI)
 * Simula comprobantes oficiales y auténticos de Yape, Plin y BCP
 * para demostraciones inmediatas y pruebas en 1 clic.
 */

export function generateDemoVoucher({
  method = 'Yape',
  amount = 0,
  operationNumber = '',
  ownerName = 'Jeancarlos José Huertas Quichca',
  destination = '',
  date = new Date()
}) {
  const formattedAmount = `S/ ${Number(amount).toFixed(2)}`;
  const now = date instanceof Date ? date : new Date(date);
  const formattedDate = now.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  const formattedTime = now.toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  // Intentar renderizar con Canvas en navegador
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    const width = 420;
    const height = 560;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      if (method === 'Yape') {
        renderYapeVoucher(ctx, { width, height, formattedAmount, operationNumber, ownerName, destination, formattedDate, formattedTime });
      } else if (method === 'Plin') {
        renderPlinVoucher(ctx, { width, height, formattedAmount, operationNumber, ownerName, destination, formattedDate, formattedTime });
      } else {
        renderBcpVoucher(ctx, { width, height, formattedAmount, operationNumber, ownerName, destination, formattedDate, formattedTime });
      }
      return canvas.toDataURL('image/png');
    }
  }

  // Fallback vectorial SVG en Base64
  return generateSvgVoucherFallback({ method, formattedAmount, operationNumber, ownerName, destination, formattedDate, formattedTime });
}

function renderYapeVoucher(ctx, { width, height, formattedAmount, operationNumber, ownerName, destination, formattedDate, formattedTime }) {
  // Fondo Degradado Yape
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, '#742384');
  grad.addColorStop(1, '#4A0E5C');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Tarjeta central blanca
  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, 24, 40, width - 48, height - 80, 20);
  ctx.fill();

  // Encabezado Yape Badge
  ctx.fillStyle = '#00D4B2';
  roundRect(ctx, width / 2 - 60, 25, 120, 32, 16);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('¡Yapeaste!', width / 2, 46);

  // Monto
  ctx.fillStyle = '#742384';
  ctx.font = '900 36px sans-serif';
  ctx.fillText(formattedAmount, width / 2, 115);

  ctx.fillStyle = '#64748B';
  ctx.font = '13px sans-serif';
  ctx.fillText('Pago exitoso a través de Yape', width / 2, 140);

  // Línea divisoria
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(48, 160);
  ctx.lineTo(width - 48, 160);
  ctx.stroke();

  // Datos de la Operación
  ctx.textAlign = 'left';

  drawField(ctx, 'Destinatario:', ownerName, 48, 195, 215);
  drawField(ctx, 'Número de Yape:', destination || '924046690', 48, 245, 265);
  drawField(ctx, 'Fecha y hora:', `${formattedDate} • ${formattedTime}`, 48, 295, 315);
  drawField(ctx, 'N° de Operación:', operationNumber || 'OP-849120', 48, 345, 365, '#00D4B2');

  // Sello de seguridad FitStore
  ctx.fillStyle = '#F8FAFC';
  roundRect(ctx, 44, 400, width - 88, 70, 12);
  ctx.fill();

  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('FitStore Pro - Suplementos & Nutrición', width / 2, 428);
  ctx.fillStyle = '#64748B';
  ctx.font = '11px sans-serif';
  ctx.fillText('Comprobante emitido automáticamente', width / 2, 450);

  // Footer
  ctx.fillStyle = '#94A3B8';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('Seguridad BCP / Yape Perú', width / 2, height - 55);
}

function renderPlinVoucher(ctx, { width, height, formattedAmount, operationNumber, ownerName, destination, formattedDate, formattedTime }) {
  // Fondo Degradado Plin
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, '#00A8FF');
  grad.addColorStop(1, '#0047AB');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Tarjeta central blanca
  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, 24, 40, width - 48, height - 80, 20);
  ctx.fill();

  // Encabezado Plin Badge
  ctx.fillStyle = '#FF6B00';
  roundRect(ctx, width / 2 - 70, 25, 140, 32, 16);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('¡Envío Plin Exitoso!', width / 2, 46);

  // Monto
  ctx.fillStyle = '#0052CC';
  ctx.font = '900 36px sans-serif';
  ctx.fillText(formattedAmount, width / 2, 115);

  ctx.fillStyle = '#64748B';
  ctx.font = '13px sans-serif';
  ctx.fillText('Transferencia móvil inmediata Plin', width / 2, 140);

  // Línea divisoria
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(48, 160);
  ctx.lineTo(width - 48, 160);
  ctx.stroke();

  // Datos
  ctx.textAlign = 'left';
  drawField(ctx, 'Titular Receptor:', ownerName, 48, 195, 215);
  drawField(ctx, 'Celular Plin:', destination || '983064501', 48, 245, 265);
  drawField(ctx, 'Fecha y hora:', `${formattedDate} • ${formattedTime}`, 48, 295, 315);
  drawField(ctx, 'N° de Operación:', operationNumber || 'PLIN-492015', 48, 345, 365, '#FF6B00');

  // Sello
  ctx.fillStyle = '#F8FAFC';
  roundRect(ctx, 44, 400, width - 88, 70, 12);
  ctx.fill();

  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('FitStore Pro - Suplementos & Nutrición', width / 2, 428);
  ctx.fillStyle = '#64748B';
  ctx.font = '11px sans-serif';
  ctx.fillText('Constancia de transferencia interbancaria móvil', width / 2, 450);

  // Footer
  ctx.fillStyle = '#94A3B8';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('Red Interbancaria Plin Perú', width / 2, height - 55);
}

function renderBcpVoucher(ctx, { width, height, formattedAmount, operationNumber, ownerName, destination, formattedDate, formattedTime }) {
  // Fondo BCP Azul Marino Institucional
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, '#002A8F');
  grad.addColorStop(1, '#00144D');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Tarjeta central blanca
  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, 24, 40, width - 48, height - 80, 20);
  ctx.fill();

  // Encabezado BCP Badge Naranja
  ctx.fillStyle = '#FF7800';
  roundRect(ctx, width / 2 - 80, 25, 160, 32, 16);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Constancia BCP Exitosa', width / 2, 46);

  // Monto
  ctx.fillStyle = '#002A8F';
  ctx.font = '900 36px sans-serif';
  ctx.fillText(formattedAmount, width / 2, 115);

  ctx.fillStyle = '#64748B';
  ctx.font = '13px sans-serif';
  ctx.fillText('Transferencia Directa a Cuenta BCP', width / 2, 140);

  // Línea
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(48, 160);
  ctx.lineTo(width - 48, 160);
  ctx.stroke();

  // Campos
  ctx.textAlign = 'left';
  drawField(ctx, 'Beneficiario:', ownerName, 48, 195, 215);
  drawField(ctx, 'Cuenta Destino BCP:', destination || '22079349234041', 48, 245, 265);
  drawField(ctx, 'Fecha y hora:', `${formattedDate} • ${formattedTime}`, 48, 295, 315);
  drawField(ctx, 'N° de Operación:', operationNumber || 'BCP-938201', 48, 345, 365, '#FF7800');

  // Sello
  ctx.fillStyle = '#F8FAFC';
  roundRect(ctx, 44, 400, width - 88, 70, 12);
  ctx.fill();

  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('FitStore Pro - Suplementos & Nutrición', width / 2, 428);
  ctx.fillStyle = '#64748B';
  ctx.font = '11px sans-serif';
  ctx.fillText('Transferencia Bancaria en Soles (PEN)', width / 2, 450);

  // Footer
  ctx.fillStyle = '#94A3B8';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('Banco de Crédito del Perú BCP', width / 2, height - 55);
}

function drawField(ctx, label, value, x, labelY, valueY, highlightColor = null) {
  ctx.fillStyle = '#64748B';
  ctx.font = '11px sans-serif';
  ctx.fillText(label, x, labelY);

  ctx.fillStyle = highlightColor || '#0F172A';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(value, x, valueY);
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function generateSvgVoucherFallback({ method, formattedAmount, operationNumber, ownerName, destination, formattedDate, formattedTime }) {
  const brandColor = method === 'Yape' ? '#742384' : method === 'Plin' ? '#00A8FF' : '#002A8F';
  const badgeColor = method === 'Yape' ? '#00D4B2' : method === 'Plin' ? '#FF6B00' : '#FF7800';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="560" viewBox="0 0 420 560">
    <rect width="420" height="560" fill="${brandColor}" rx="24"/>
    <rect x="24" y="40" width="372" height="480" fill="#ffffff" rx="16"/>
    <rect x="130" y="24" width="160" height="32" rx="16" fill="${badgeColor}"/>
    <text x="210" y="45" font-family="sans-serif" font-size="14" font-weight="bold" fill="#ffffff" text-anchor="middle">Comprobante ${method}</text>
    <text x="210" y="115" font-family="sans-serif" font-size="34" font-weight="900" fill="${brandColor}" text-anchor="middle">${formattedAmount}</text>
    <text x="210" y="140" font-family="sans-serif" font-size="13" fill="#64748b" text-anchor="middle">Pago Confirmado a Titular</text>
    <line x1="48" y1="160" x2="372" y2="160" stroke="#e2e8f0" stroke-width="1"/>
    <text x="48" y="195" font-family="sans-serif" font-size="11" fill="#64748b">Titular Receptor:</text>
    <text x="48" y="215" font-family="sans-serif" font-size="14" font-weight="bold" fill="#0f172a">${ownerName}</text>
    <text x="48" y="245" font-family="sans-serif" font-size="11" fill="#64748b">Cuenta / Teléfono:</text>
    <text x="48" y="265" font-family="sans-serif" font-size="14" font-weight="bold" fill="#0f172a">${destination}</text>
    <text x="48" y="295" font-family="sans-serif" font-size="11" fill="#64748b">Fecha y Hora:</text>
    <text x="48" y="315" font-family="sans-serif" font-size="14" font-weight="bold" fill="#0f172a">${formattedDate} • ${formattedTime}</text>
    <text x="48" y="345" font-family="sans-serif" font-size="11" fill="#64748b">N° de Operación:</text>
    <text x="48" y="365" font-family="sans-serif" font-size="14" font-weight="bold" fill="${badgeColor}">${operationNumber}</text>
    <rect x="44" y="400" width="332" height="70" rx="12" fill="#f8fafc"/>
    <text x="210" y="428" font-family="sans-serif" font-size="12" font-weight="bold" fill="#0f172a" text-anchor="middle">FitStore Pro - Nutrición Deportiva</text>
    <text x="210" y="450" font-family="sans-serif" font-size="11" fill="#64748b" text-anchor="middle">Comprobante Oficial Verificado</text>
  </svg>`;

  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

export function generateRandomOperationNumber(prefix = 'OP') {
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}-${randomNum}`;
}

