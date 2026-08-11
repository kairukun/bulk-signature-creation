import {
  COMPANY_NAME,
  COMPANY_WEBSITE_DISPLAY,
  DOSSANI_DISCLAIMER,
} from "@/lib/constants";
import { DEFAULT_SIGNATURE_FONT } from "@/lib/fonts";
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
  const color = template?.primaryColor || "#1F4E79";
  const accent = template?.companyNameLine2Color || template?.accentColor || "#C0392B";
  const font = template?.fontFamily || DEFAULT_SIGNATURE_FONT;
  const line1 = escapeHtml(template?.companyNameLine1 || "Dossani Paradise");
  const line2 = escapeHtml(template?.companyNameLine2 || "Management");
  const website = escapeHtml(template?.websiteDisplay || COMPANY_WEBSITE_DISPLAY);
  const disclaimer = escapeHtml(template?.disclaimer || DOSSANI_DISCLAIMER);
  const showThankYou = template?.showThankYou !== false;

  return `<table cellpadding="0" cellspacing="0" border="0" style="font-family:${escapeHtml(font)};color:${escapeHtml(color)};max-width:560px;">
  ${
    showThankYou
      ? `<tr><td style="font:700 15px ${escapeHtml(font)};color:${escapeHtml(color)};padding-bottom:8px;">Thank You,</td></tr>`
      : ""
  }
  <tr><td style="font:700 16px ${escapeHtml(font)};color:${escapeHtml(color)};">%%DisplayName%%</td></tr>
  <tr><td style="font:italic 13px ${escapeHtml(font)};color:${escapeHtml(color)};padding-top:2px;">%%Title%%</td></tr>
  <tr><td style="padding-top:10px;font:700 14px ${escapeHtml(font)};color:${escapeHtml(color)};">${line1}</td></tr>
  <tr><td style="font:700 12px ${escapeHtml(font)};color:${escapeHtml(accent)};">${line2}</td></tr>
  <tr><td style="font:12px ${escapeHtml(font)};color:${escapeHtml(color)};padding-top:8px;">%%Street%%</td></tr>
  <tr><td style="font:12px ${escapeHtml(font)};color:${escapeHtml(color)};">%%City%%, %%State%% %%Zip%%</td></tr>
  <tr><td style="font:12px ${escapeHtml(font)};color:${escapeHtml(color)};">%%PhoneNumber%%</td></tr>
  <tr><td style="font:12px ${escapeHtml(font)};color:${escapeHtml(color)};padding-top:2px;">Email: <a href="mailto:%%Email%%" style="color:${escapeHtml(color)};text-decoration:underline;">%%Email%%</a></td></tr>
  <tr><td style="font:12px ${escapeHtml(font)};color:${escapeHtml(color)};">Website: <a href="https://${website}" style="color:${escapeHtml(color)};text-decoration:underline;">${website}</a></td></tr>
  <tr><td style="padding-top:12px;font:9px ${escapeHtml(font)};color:#333333;max-width:520px;line-height:1.35;">${disclaimer}<span style="display:none !important;font-size:0;line-height:0;max-height:0;overflow:hidden;">${TRANSPORT_RULE_MARKER}</span></td></tr>
</table>`;
}

export function transportRuleSummary(userCount: number): string {
  return `${COMPANY_NAME} outbound signature rule "${TRANSPORT_RULE_NAME}" prepared for ${userCount} directory recipients. Rule uses Entra disclaimer tokens; per-person FindMi HTML is in the HTML pack.`;
}
