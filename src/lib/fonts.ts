/** Outlook-safe font stacks for HTML email signatures */
export const SIGNATURE_FONTS = [
  {
    id: "georgia",
    label: "Georgia",
    value: "Georgia, 'Times New Roman', Times, serif",
  },
  {
    id: "times",
    label: "Times New Roman",
    value: "'Times New Roman', Times, serif",
  },
  {
    id: "garamond",
    label: "Garamond",
    value: "Garamond, Georgia, 'Times New Roman', serif",
  },
  {
    id: "palatino",
    label: "Palatino",
    value: "'Palatino Linotype', Palatino, 'Book Antiqua', serif",
  },
  {
    id: "arial",
    label: "Arial",
    value: "Arial, Helvetica, sans-serif",
  },
  {
    id: "calibri",
    label: "Calibri",
    value: "Calibri, Arial, Helvetica, sans-serif",
  },
  {
    id: "segoe",
    label: "Segoe UI",
    value: "'Segoe UI', Tahoma, Arial, sans-serif",
  },
  {
    id: "verdana",
    label: "Verdana",
    value: "Verdana, Geneva, sans-serif",
  },
  {
    id: "tahoma",
    label: "Tahoma",
    value: "Tahoma, Geneva, sans-serif",
  },
  {
    id: "trebuchet",
    label: "Trebuchet MS",
    value: "'Trebuchet MS', Arial, Helvetica, sans-serif",
  },
] as const;

export const DEFAULT_SIGNATURE_FONT = SIGNATURE_FONTS[1].value;

/** Default body text size for signatures (px). */
export const DEFAULT_SIGNATURE_FONT_SIZE = 12;

/** Default logo display width (px). */
export const DEFAULT_LOGO_WIDTH = 48;

export function resolveFontSize(fontSize: number | undefined | null): number {
  const n = Number(fontSize);
  if (!Number.isFinite(n)) return DEFAULT_SIGNATURE_FONT_SIZE;
  return Math.min(20, Math.max(10, Math.round(n)));
}

export function resolveLogoWidth(logoWidth: number | undefined | null): number {
  const n = Number(logoWidth);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_LOGO_WIDTH;
  return Math.min(220, Math.max(24, Math.round(n)));
}

/** Relative sizes derived from the template body font size. */
export function signatureFontScale(fontSize: number | undefined | null) {
  const body = resolveFontSize(fontSize);
  return {
    body,
    name: body,
    thankYou: body,
    title: body,
    company: body,
    companySecondary: body,
    disclaimer: Math.max(8, body - 3),
    cta: body,
    photoInitials: body + 6,
  };
}

/** Turn ALL CAPS / shouty text into Title Case; leave mixed-case alone. */
export function unshout(text: string): string {
  const value = text.trim();
  if (!value) return value;

  const letters = value.replace(/[^A-Za-z]/g, "");
  if (letters.length < 2) return value;

  const upper = letters.replace(/[^A-Z]/g, "").length;
  const lower = letters.replace(/[^a-z]/g, "").length;
  // Only rewrite when almost everything is uppercase
  if (upper < letters.length * 0.85 || lower > letters.length * 0.15) {
    return value;
  }

  return value
    .toLowerCase()
    .replace(/\b([a-z])/g, (m) => m.toUpperCase())
    .replace(/\b(Llc|Llp|Inc|Ltd)\b/g, (m) => m.toUpperCase());
}
