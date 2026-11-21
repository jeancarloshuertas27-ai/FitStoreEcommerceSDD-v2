import crypto from 'node:crypto';

/**
 * Valida un número de tarjeta usando el algoritmo de Luhn (módulo 10).
 * @param {string|number} number - Número de tarjeta (puede contener espacios o guiones).
 * @returns {boolean}
 */
export function validateLuhn(number) {
  const cleaned = String(number ?? '').replace(/[\s-]/g, '');
  if (!/^\d{2,}$/.test(cleaned)) {
    return false;
  }

  let sum = 0;
  let alt = false;
  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = Number(cleaned[i]);
    if (alt) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    sum += digit;
    alt = !alt;
  }

  return sum % 10 === 0;
}

/**
 * Valida un código OTP de Yape/Plin: exactamente 6 dígitos numéricos
 * y rechaza secuencias triviales con todos los dígitos iguales (000000..999999).
 * @param {string|number} code
 * @returns {boolean}
 */
export function validateOTP(code) {
  const str = String(code ?? '').trim();
  if (!/^\d{6}$/.test(str)) {
    return false;
  }
  return !isTrivialOtp(str);
}

/**
 * Detecta códigos OTP triviales o falsos de 6 dígitos:
 *  - todos los dígitos iguales (000000, 111111, ...)
 *  - secuencias consecutivas ascendentes o descendentes (123456, 654321, 012345, 543210)
 *  - patrones repetidos de 2 o 3 dígitos (121212, 123123, 989898)
 * @param {string|number} code
 * @returns {boolean}
 */
export function isTrivialOtp(code) {
  const str = String(code ?? '').trim();
  if (/^(\d)\1{5}$/.test(str)) return true;
  if (/^(\d{2})\1{2}$/.test(str)) return true;
  if (/^(\d{3})\1$/.test(str)) return true;
  const digits = str.split('').map(Number);
  const steps = digits.slice(1).map((d, i) => d - digits[i]);
  if (steps.length === 5 && (steps.every((s) => s === 1) || steps.every((s) => s === -1))) {
    return true;
  }
  return false;
}

/**
 * Valida un número celular peruano: exactamente 9 dígitos numéricos que inician en 9.
 * @param {string|number} phone
 * @returns {boolean}
 */
export function validatePhone(phone) {
  const str = String(phone ?? '').trim();
  return /^9\d{8}$/.test(str);
}

/**
 * Valida la fecha de vencimiento de una tarjeta en formato MM/AA,
 * asegurando que sea igual o posterior al mes y año actual.
 * @param {string} expiry
 * @returns {boolean}
 */
export function validateCardExpiry(expiry) {
  const str = String(expiry ?? '').trim();
  const match = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(str);
  if (!match) {
    return false;
  }

  const expMonth = Number(match[1]);
  const expYear = 2000 + Number(match[2]);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  if (expYear > currentYear) return true;
  if (expYear === currentYear && expMonth >= currentMonth) return true;
  return false;
}

/**
 * Genera 6 dígitos numéricos aleatorios con relleno de ceros.
 * @returns {string}
 */
function randomSixDigits() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

/**
 * Genera hash de auditoría para Yape/Plin: YAPE-AUTO-XXXXXX
 * @returns {string}
 */
export function generateYapeHash() {
  return `YAPE-AUTO-${randomSixDigits()}`;
}

/**
 * Genera hash de auditoría para transferencia CIP verificada: CIP-AUTO-XXXXXX
 * @returns {string}
 */
export function generateCipHash() {
  return `CIP-AUTO-${randomSixDigits()}`;
}

/**
 * Genera código de referencia CIP con vigencia de 24 horas: CIP-2026-XXXXXX
 * @returns {string}
 */
export function generateCipReference() {
  return `CIP-2026-${randomSixDigits()}`;
}

/**
 * Genera código de autorización de tarjeta: AUTH-XXXXXX (alfanumérico en mayúsculas).
 * @returns {string}
 */
export function generateAuthHash() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += chars[crypto.randomInt(0, chars.length)];
  }
  return `AUTH-${suffix}`;
}
