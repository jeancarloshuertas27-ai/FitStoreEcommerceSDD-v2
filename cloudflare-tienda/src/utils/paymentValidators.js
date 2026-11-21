/**
 * Utilidades financieras compatibles con Cloudflare Workers (Web Crypto).
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

export function isTrivialOtp(code) {
  const str = String(code ?? '').trim();
  if (/^(\d)\1{5}$/.test(str)) return true;
  if (/^(\d{2})\1{2}$/.test(str)) return true;
  if (/^(\d{3})\1$/.test(str)) return true;
  const d = str.split('').map(Number);
  const steps = d.slice(1).map((x, i) => x - d[i]);
  return steps.length === 5 && (steps.every((s) => s === 1) || steps.every((s) => s === -1));
}

export function validateOTP(code) {
  const str = String(code ?? '').trim();
  if (!/^\d{6}$/.test(str)) {
    return false;
  }
  return !isTrivialOtp(str);
}

export function validatePhone(phone) {
  const str = String(phone ?? '').trim();
  return /^9\d{8}$/.test(str);
}

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

function randomInt(max) {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] % max;
}

function randomSixDigits() {
  return String(randomInt(1000000)).padStart(6, '0');
}

export function generateYapeHash() {
  return `YAPE-AUTO-${randomSixDigits()}`;
}

export function generateCipHash() {
  return `CIP-AUTO-${randomSixDigits()}`;
}

export function generateCipReference() {
  return `CIP-2026-${randomSixDigits()}`;
}

export function generateAuthHash() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += chars[randomInt(chars.length)];
  }
  return `AUTH-${suffix}`;
}
