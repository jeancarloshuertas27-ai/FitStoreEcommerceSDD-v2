/**
 * Reglas antifraude de OTP Yape/Plin (espejo de la validación del backend).
 * Rechaza: dígitos idénticos (000000), secuencias (123456 / 654321) y patrones repetidos (121212, 123123).
 */
export function isTrivialOtp(code) {
  const str = String(code ?? '').trim();
  if (/^(\d)\1{5}$/.test(str)) return true;
  if (/^(\d{2})\1{2}$/.test(str)) return true;
  if (/^(\d{3})\1$/.test(str)) return true;
  const d = str.split('').map(Number);
  const steps = d.slice(1).map((x, i) => x - d[i]);
  return steps.length === 5 && (steps.every((s) => s === 1) || steps.every((s) => s === -1));
}
