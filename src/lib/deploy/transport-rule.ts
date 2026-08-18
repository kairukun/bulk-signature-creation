import {
  COMPANY_NAME,
  COMPANY_WEBSITE_DISPLAY,
  DEFAULT_LOGO_PATH,
  DOSSANI_DISCLAIMER,
  BRAND_NAVY,
  BRAND_RED,
} from "@/lib/constants";
import {
  DEFAULT_LOGO_WIDTH,
  DEFAULT_SIGNATURE_FONT,
  resolveLogoWidth,
  signatureFontScale,
} from "@/lib/fonts";
import type { SignatureTemplate } from "@/lib/types";

export const TRANSPORT_RULE_NAME = "DPM-Corporate-Signature";
export const TRANSPORT_RULE_MARKER = "DPM-SIGNATURE-RULE-MARKER";

const HOSTED_LOGO_URL = "https://bulk-signature-creation.vercel.app/dpm-signature-logo.png";

/** Escape text for use inside an HTML attribute or element body. */
function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function hostedLogoSrc(template?: SignatureTemplate | null): string {
  const raw = template?.logoUrl || DEFAULT_LOGO_PATH;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  return HOSTED_LOGO_URL;
}

/**
 * Build corporate disclaimer HTML for Exchange Online transport rules.
 * Uses Microsoft disclaimer macros (%%FieldName%%) resolved from sender Entra attributes.
 * @see https://learn.microsoft.com/en-us/exchange/security-and-compliance/mail-flow-rules/disclaimers-signatures-footers-or-headers
 */
export function buildTokenDisclaimerHtml(
  template?: SignatureTemplate | null,
): string {
  const color = template?.primaryColor || BRAND_NAVY;
  const accent = template?.companyNameLine2Color || template?.accentColor || BRAND_RED;
  const font = template?.fontFamily || DEFAULT_SIGNATURE_FONT;
  const sizes = signatureFontScale(template?.fontSize);
  const line1Raw = (template?.companyNameLine1 || "").trim();
  const line2Raw = (template?.companyNameLine2 || "").trim();
  const line1 = escapeHtml(line1Raw);
  const line2 = escapeHtml(line2Raw);
  const website = escapeHtml(template?.websiteDisplay || COMPANY_WEBSITE_DISPLAY);
  const disclaimer = escapeHtml(template?.disclaimer || DOSSANI_DISCLAIMER);
  const showThankYou = template?.showThankYou !== false;
  const width = resolveLogoWidth(template?.logoWidth || DEFAULT_LOGO_WIDTH);
  const logoSrc = hostedLogoSrc(template);
  const showLogo = template?.showLogo !== false;

  return `<table cellpadding="0" cellspacing="0" border="0" style="font-family:${escapeHtml(font)};color:${escapeHtml(color)};max-width:560px;">
  ${
    showThankYou
      ? `<tr><td style="font:700 ${sizes.thankYou}px ${escapeHtml(font)};color:${escapeHtml(color)};padding-bottom:8px;">Thank You,</td></tr>`
      : ""
  }
  <tr><td style="font:700 ${sizes.name}px ${escapeHtml(font)};color:${escapeHtml(color)};">%%DisplayName%%</td></tr>
  <tr><td style="font:italic ${sizes.title}px ${escapeHtml(font)};color:${escapeHtml(color)};padding-top:2px;">%%Title%%</td></tr>
  ${
    showLogo
      ? `<tr><td style="padding-top:10px;padding-bottom:8px;"><img src="${escapeHtml(logoSrc)}" width="${width}" alt="${escapeHtml(template?.logoAlt || COMPANY_NAME)}" style="display:block;border:0;outline:none;text-decoration:none;width:${width}px;height:auto;max-width:${width}px;" /></td></tr>`
      : ""
  }
  ${
    line1
      ? `<tr><td style="padding-top:10px;font:700 ${sizes.company}px ${escapeHtml(font)};color:${escapeHtml(color)};">${line1}</td></tr>`
      : ""
  }
  ${
    line2
      ? `<tr><td style="font:700 ${sizes.companySecondary}px ${escapeHtml(font)};color:${escapeHtml(accent)};">${line2}</td></tr>`
      : ""
  }
  <tr><td style="font:${sizes.body}px ${escapeHtml(font)};color:${escapeHtml(color)};padding-top:8px;">%%Street%%</td></tr>
  <tr><td style="font:${sizes.body}px ${escapeHtml(font)};color:${escapeHtml(color)};">%%City%%, %%State%% %%Zip%%</td></tr>
  <tr><td style="font:${sizes.body}px ${escapeHtml(font)};color:${escapeHtml(color)};">%%PhoneNumber%%</td></tr>
  <tr><td style="font:${sizes.body}px ${escapeHtml(font)};color:${escapeHtml(color)};padding-top:2px;">Email: <a href="mailto:%%Email%%" style="color:${escapeHtml(color)};text-decoration:underline;">%%Email%%</a></td></tr>
  <tr><td style="font:${sizes.body}px ${escapeHtml(font)};color:${escapeHtml(color)};">Website: <a href="https://${website}" style="color:${escapeHtml(color)};text-decoration:underline;">${website}</a></td></tr>
  <tr><td style="padding-top:12px;font:${sizes.disclaimer}px ${escapeHtml(font)};color:#333333;max-width:520px;line-height:1.35;">${disclaimer}<span style="display:none !important;font-size:0;line-height:0;max-height:0;overflow:hidden;">${TRANSPORT_RULE_MARKER}</span></td></tr>
</table>`;
}

export function transportRuleSummary(userCount: number): string {
  return `${COMPANY_NAME} outbound signature rule "${TRANSPORT_RULE_NAME}" prepared for ${userCount} directory recipients. Rule uses Entra disclaimer tokens; per-person FindMi HTML is in the HTML pack.`;
}
