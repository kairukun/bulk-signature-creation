import {
  COMPANY_NAME,
  COMPANY_WEBSITE_DISPLAY,
  DOSSANI_DISCLAIMER,
  BRAND_NAVY,
  BRAND_RED,
  SIGNATURE_DISCLAIMER,
  SIGNATURE_INK,
  SIGNATURE_LINK,
} from "@/lib/constants";
import {
  DEFAULT_SIGNATURE_FONT,
  signatureFontScale,
} from "@/lib/fonts";
import type { SignatureTemplate } from "@/lib/types";

export const TRANSPORT_RULE_NAME = "DPM-Corporate-Signature";
export const TRANSPORT_RULE_MARKER = "DPM-SIGNATURE-RULE-MARKER";

/** Escape text for use inside an HTML attribute or element body. */
function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * Build corporate disclaimer HTML for Exchange Online transport rules.
 * Uses Microsoft disclaimer macros (%%FieldName%%) resolved from sender Entra attributes.
 * @see https://learn.microsoft.com/en-us/exchange/security-and-compliance/mail-flow-rules/disclaimers-signatures-footers-or-headers
 */
export function buildTokenDisclaimerHtml(
  template?: SignatureTemplate | null,
): string {
  const navy = template?.primaryColor || BRAND_NAVY;
  const accent = template?.companyNameLine2Color || template?.accentColor || BRAND_RED;
  const font = template?.fontFamily || DEFAULT_SIGNATURE_FONT;
  const sizes = signatureFontScale(template?.fontSize);
  const line1Raw = (template?.companyNameLine1 || "DOSSANI PARADISE").trim();
  const line2Raw = (template?.companyNameLine2 || "MANAGEMENT").trim();
  const line1 = escapeHtml(line1Raw);
  const line2 = escapeHtml(line2Raw);
  const website = escapeHtml(template?.websiteDisplay || COMPANY_WEBSITE_DISPLAY);
  const disclaimer = escapeHtml(template?.disclaimer || DOSSANI_DISCLAIMER);
  const showThankYou = template?.showThankYou !== false;

  return `<table cellpadding="0" cellspacing="0" border="0" style="font-family:${escapeHtml(font)};font-size:${sizes.body}px;color:${SIGNATURE_INK};max-width:560px;">
  ${
    showThankYou
      ? `<tr><td style="font:${sizes.thankYou}px ${escapeHtml(font)};color:${SIGNATURE_INK};padding-bottom:4px;">Thank You,</td></tr>`
      : ""
  }
  <tr><td style="font:${sizes.name}px ${escapeHtml(font)};color:${SIGNATURE_INK};">%%DisplayName%%</td></tr>
  <tr><td style="font:italic ${sizes.title}px ${escapeHtml(font)};color:${SIGNATURE_INK};padding-top:1px;">%%Title%%</td></tr>
  ${
    line1
      ? `<tr><td style="padding-top:10px;font:${sizes.company}px ${escapeHtml(font)};color:${escapeHtml(navy)};letter-spacing:0.04em;">${line1}</td></tr>`
      : ""
  }
  ${
    line2
      ? `<tr><td style="font:${sizes.companySecondary}px ${escapeHtml(font)};color:${escapeHtml(accent)};letter-spacing:0.12em;">${line2}</td></tr>`
      : ""
  }
  <tr><td style="font:${sizes.body}px ${escapeHtml(font)};color:${SIGNATURE_INK};padding-top:8px;">%%Street%%</td></tr>
  <tr><td style="font:${sizes.body}px ${escapeHtml(font)};color:${SIGNATURE_INK};">%%City%%, %%State%% %%Zip%%</td></tr>
  <tr><td style="font:${sizes.body}px ${escapeHtml(font)};color:${SIGNATURE_INK};">Office: %%PhoneNumber%%</td></tr>
  <tr><td style="font:${sizes.body}px ${escapeHtml(font)};color:${SIGNATURE_INK};">Email: <a href="mailto:%%Email%%" style="color:${SIGNATURE_LINK};text-decoration:underline;">%%Email%%</a></td></tr>
  <tr><td style="font:${sizes.body}px ${escapeHtml(font)};color:${SIGNATURE_INK};">Website: <a href="https://${website}" style="color:${SIGNATURE_LINK};text-decoration:underline;">${website}</a></td></tr>
  <tr><td style="padding-top:12px;font:${sizes.disclaimer}px ${escapeHtml(font)};color:${SIGNATURE_DISCLAIMER};max-width:520px;line-height:1.35;">${disclaimer}<span style="display:none !important;font-size:0;line-height:0;max-height:0;overflow:hidden;">${TRANSPORT_RULE_MARKER}</span></td></tr>
</table>`;
}

export function transportRuleSummary(userCount: number): string {
  return `${COMPANY_NAME} outbound signature rule "${TRANSPORT_RULE_NAME}" prepared for ${userCount} directory recipients. Rule uses Entra disclaimer tokens; per-person FindMi HTML is in the HTML pack.`;
}
