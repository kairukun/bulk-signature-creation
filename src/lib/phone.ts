import {
  COMPANY_MAIN_PHONE,
  COMPANY_MAIN_PHONE_DIGITS,
} from "./constants";

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

function formatTenDigit(digits: string): string {
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

/**
 * Normalize phone display for signatures / directory:
 * - 10-digit numbers → XXX-XXX-XXXX
 * - bare 2–4 digit extensions → HQ main + xEXT
 * - "main,ext" / "main ext.N" / "main xN" → dashed main + xEXT
 */
export function formatPhoneNumber(raw: string | null | undefined): string {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return "";

  // Extension-only (support staff in FindMi).
  if (/^\d{2,4}$/.test(trimmed)) {
    return `${COMPANY_MAIN_PHONE} x${trimmed}`;
  }

  const extMatch = trimmed.match(
    /^(.*?)(?:\s*[,/]\s*|\s*(?:ext\.?|x|extension)\s*)(\d{2,4})\s*$/i,
  );
  if (extMatch) {
    const mainDigits = digitsOnly(extMatch[1]);
    const ext = extMatch[2];
    if (mainDigits.length === 10) {
      return `${formatTenDigit(mainDigits)} x${ext}`;
    }
    if (mainDigits.length === 11 && mainDigits.startsWith("1")) {
      return `${formatTenDigit(mainDigits.slice(1))} x${ext}`;
    }
    if (!mainDigits) {
      return `${COMPANY_MAIN_PHONE} x${ext}`;
    }
  }

  const digits = digitsOnly(trimmed);
  if (digits.length === 10) return formatTenDigit(digits);
  if (digits.length === 11 && digits.startsWith("1")) {
    return formatTenDigit(digits.slice(1));
  }

  // Already dashed / mixed — if we can still find 10 consecutive digits, reformat.
  const ten = digits.match(/(\d{10})/);
  if (ten && digits.length <= 11) {
    return formatTenDigit(ten[1]);
  }

  return trimmed;
}

/** True when the value is only a short office extension. */
export function isShortExtension(raw: string | null | undefined): boolean {
  return /^\d{2,4}$/.test(String(raw || "").trim());
}

export function companyMainPhoneDigits(): string {
  return COMPANY_MAIN_PHONE_DIGITS;
}
