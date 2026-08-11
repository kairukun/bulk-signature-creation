import { DEFAULT_LOGO_PATH } from "./constants";
import type { Campaign, DirectoryUser, SignatureTemplate } from "./types";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function trackingUrl(origin: string, campaignId: string, targetUrl: string): string {
  const params = new URLSearchParams({
    to: targetUrl,
    src: "signature",
  });
  return `${origin}/api/track/${campaignId}?${params.toString()}`;
}

function isCampaignLive(campaign?: Campaign | null): boolean {
  if (!campaign || !campaign.active) return false;
  const today = new Date().toISOString().slice(0, 10);
  return campaign.startDate <= today && campaign.endDate >= today;
}

function absoluteAssetUrl(origin: string, url: string): string {
  if (!url) return "";
  if (url.startsWith("data:") || url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  if (!origin) return url;
  return `${origin.replace(/\/$/, "")}${url.startsWith("/") ? url : `/${url}`}`;
}

function websiteHref(website: string): string {
  if (!website) return "#";
  if (website.startsWith("http://") || website.startsWith("https://")) return website;
  return `https://${website.replace(/^\/\//, "")}`;
}

function websiteLabel(template: SignatureTemplate, user: DirectoryUser): string {
  if (template.websiteDisplay) return template.websiteDisplay;
  const raw = user.website || "";
  return raw.replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

export function resolveTemplateForUser(
  user: DirectoryUser,
  templates: SignatureTemplate[],
): SignatureTemplate | undefined {
  if (user.signatureId) {
    const direct = templates.find((t) => t.id === user.signatureId);
    if (direct) return direct;
  }

  const byDept = templates.find(
    (t) =>
      t.assignedDepartments.includes(user.department) ||
      t.assignedDepartments.includes("All"),
  );
  if (byDept) return byDept;

  const byGroup = templates.find((t) =>
    t.assignedGroups.some((g) => user.groups.includes(g)),
  );
  return byGroup ?? templates[0];
}

function logoBlock(template: SignatureTemplate, origin: string): string {
  if (!template.showLogo) return "";
  const width = template.logoWidth || 56;
  const src = absoluteAssetUrl(origin, template.logoUrl || DEFAULT_LOGO_PATH);
  const line1 = template.companyNameLine1 || template.logoAlt;
  const line2 = template.companyNameLine2;
  const line2Color = template.companyNameLine2Color || template.accentColor;
  const font = template.fontFamily;
  const color = template.primaryColor;

  const image = src
    ? `<img src="${escapeHtml(src)}" width="${width}" height="${width}" alt="${escapeHtml(template.logoAlt || "Logo")}" style="display:block;border:0;outline:none;text-decoration:none;width:${width}px;height:auto;max-width:${width}px;" />`
    : "";

  const nameCell = `
    <td style="vertical-align:middle;padding-left:${image ? "10px" : "0"};">
      <div style="font:700 14px ${escapeHtml(font)};color:${escapeHtml(color)};letter-spacing:0.03em;line-height:1.15;text-transform:uppercase;">
        ${escapeHtml(line1)}
      </div>
      ${
        line2
          ? `<div style="font:700 12px ${escapeHtml(font)};color:${escapeHtml(line2Color)};letter-spacing:0.06em;line-height:1.2;text-transform:uppercase;margin-top:2px;">${escapeHtml(line2)}</div>`
          : ""
      }
    </td>`;

  return `<table cellpadding="0" cellspacing="0" border="0" style="margin-top:10px;margin-bottom:8px;">
    <tr>
      ${image ? `<td style="vertical-align:middle;">${image}</td>` : ""}
      ${nameCell}
    </tr>
  </table>`;
}

export function renderSignatureHtml(options: {
  user: DirectoryUser;
  template: SignatureTemplate;
  campaign?: Campaign | null;
  origin?: string;
}): string {
  const { user, template, campaign, origin = "" } = options;
  const color = template.primaryColor;
  const accent = template.accentColor;
  const font = template.fontFamily;
  const live = isCampaignLive(campaign);

  const ctaHref =
    live && campaign && origin
      ? trackingUrl(origin, campaign.id, template.ctaUrl || campaign.bannerUrl)
      : template.ctaUrl;

  const bannerHref =
    live && campaign && origin
      ? trackingUrl(origin, campaign.id, campaign.bannerUrl)
      : campaign?.bannerUrl ?? "#";

  const initials = user.displayName
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const street =
    user.streetAddress ||
    (user.location.includes(",") ? "" : user.location) ||
    "";
  const cityStateZip =
    user.cityStateZip ||
    (user.streetAddress ? user.location : user.location) ||
    "";

  const photoCell = template.showPhoto
    ? `<td style="padding-right:14px;vertical-align:top;">
        ${
          user.photoUrl
            ? `<img src="${escapeHtml(user.photoUrl)}" width="64" height="64" alt="" style="border-radius:50%;display:block;object-fit:cover;" />`
            : `<div style="width:64px;height:64px;border-radius:50%;background:${escapeHtml(color)};color:#fff;font:600 18px ${escapeHtml(font)};text-align:center;line-height:64px;">${escapeHtml(initials)}</div>`
        }
      </td>`
    : "";

  const logoHtml = logoBlock(template, origin);

  const social =
    template.showSocial && (user.linkedIn || user.twitter || user.website)
      ? `<tr><td style="padding-top:8px;font:12px ${escapeHtml(font)};">
          ${user.linkedIn ? `<a href="${escapeHtml(user.linkedIn)}" style="color:${escapeHtml(accent)};text-decoration:none;margin-right:10px;">LinkedIn</a>` : ""}
          ${user.twitter ? `<a href="${escapeHtml(user.twitter)}" style="color:${escapeHtml(accent)};text-decoration:none;margin-right:10px;">X</a>` : ""}
          ${user.website ? `<a href="${escapeHtml(websiteHref(user.website))}" style="color:${escapeHtml(accent)};text-decoration:none;">Website</a>` : ""}
        </td></tr>`
      : "";

  const cta =
    template.ctaLabel && template.ctaUrl
      ? `<tr><td style="padding-top:10px;">
          <a href="${escapeHtml(ctaHref)}" style="display:inline-block;background:${escapeHtml(accent)};color:#fff;text-decoration:none;font:600 12px Arial, Helvetica, sans-serif;padding:8px 12px;border-radius:4px;">${escapeHtml(template.ctaLabel)}</a>
        </td></tr>`
      : "";

  const banner =
    live && campaign
      ? `<tr><td style="padding-top:12px;">
          <a href="${escapeHtml(bannerHref)}" style="display:block;background:${escapeHtml(campaign.backgroundColor)};color:${escapeHtml(campaign.textColor)};text-decoration:none;font:600 12px Arial, Helvetica, sans-serif;padding:10px 12px;border-radius:4px;">
            ${escapeHtml(campaign.bannerText)}
          </a>
        </td></tr>`
      : "";

  const disclaimer = template.disclaimer
    ? `<tr><td style="padding-top:12px;font:9px Arial, Helvetica, sans-serif;color:#333333;max-width:520px;line-height:1.35;">${escapeHtml(template.disclaimer)}</td></tr>`
    : "";

  if (template.layout === "corporate") {
    const web = websiteLabel(template, user);
    const webHref = websiteHref(user.website || template.websiteDisplay || web);
    return `<table cellpadding="0" cellspacing="0" border="0" style="font-family:${escapeHtml(font)};color:${escapeHtml(color)};max-width:560px;">
      ${
        template.showThankYou !== false
          ? `<tr><td style="font:700 15px ${escapeHtml(font)};color:${escapeHtml(color)};padding-bottom:8px;">Thank You,</td></tr>`
          : ""
      }
      <tr><td style="font:700 16px Arial, Helvetica, sans-serif;color:${escapeHtml(color)};text-transform:uppercase;letter-spacing:0.02em;">${escapeHtml(user.displayName)}</td></tr>
      <tr><td style="font:italic 13px Arial, Helvetica, sans-serif;color:${escapeHtml(color)};text-transform:uppercase;padding-top:2px;">${escapeHtml(user.jobTitle)}</td></tr>
      <tr><td>${logoHtml}</td></tr>
      ${street ? `<tr><td style="font:12px Arial, Helvetica, sans-serif;color:${escapeHtml(color)};">${escapeHtml(street)}</td></tr>` : ""}
      ${cityStateZip ? `<tr><td style="font:12px Arial, Helvetica, sans-serif;color:${escapeHtml(color)};">${escapeHtml(cityStateZip)}</td></tr>` : ""}
      ${user.phone ? `<tr><td style="font:12px Arial, Helvetica, sans-serif;color:${escapeHtml(color)};">${escapeHtml(user.phone)}</td></tr>` : ""}
      <tr><td style="font:12px Arial, Helvetica, sans-serif;color:${escapeHtml(color)};padding-top:2px;">
        Email: <a href="mailto:${escapeHtml(user.email)}" style="color:${escapeHtml(color)};text-decoration:underline;">${escapeHtml(user.email)}</a>
      </td></tr>
      <tr><td style="font:12px Arial, Helvetica, sans-serif;color:${escapeHtml(color)};">
        Website: <a href="${escapeHtml(webHref)}" style="color:${escapeHtml(color)};text-decoration:underline;">${escapeHtml(web)}</a>
      </td></tr>
      ${cta}${banner}${disclaimer}
    </table>`;
  }

  if (template.layout === "compact") {
    return `<table cellpadding="0" cellspacing="0" border="0" style="font-family:${escapeHtml(font)};color:#111827;">
      <tr>
        <td style="font:700 14px ${escapeHtml(font)};color:${escapeHtml(color)};">${escapeHtml(user.displayName)}</td>
        <td style="padding:0 8px;color:#9ca3af;">|</td>
        <td style="font:12px ${escapeHtml(font)};color:#374151;">${escapeHtml(user.jobTitle)}</td>
      </tr>
      <tr>
        <td colspan="3" style="padding-top:4px;font:12px ${escapeHtml(font)};">
          <a href="mailto:${escapeHtml(user.email)}" style="color:${escapeHtml(accent)};text-decoration:none;">${escapeHtml(user.email)}</a>
          ${user.phone ? ` · ${escapeHtml(user.phone)}` : ""}
        </td>
      </tr>
      ${cta}${banner}${disclaimer}
    </table>`;
  }

  if (template.layout === "stacked") {
    return `<table cellpadding="0" cellspacing="0" border="0" style="font-family:${escapeHtml(font)};color:#111827;max-width:360px;">
      <tr><td>${logoHtml}</td></tr>
      <tr><td style="padding-top:8px;font:700 16px ${escapeHtml(font)};color:${escapeHtml(color)};">${escapeHtml(user.displayName)}</td></tr>
      <tr><td style="font:13px ${escapeHtml(font)};color:#4b5563;">${escapeHtml(user.jobTitle)} · ${escapeHtml(user.department)}</td></tr>
      <tr><td style="padding-top:6px;font:12px ${escapeHtml(font)};"><a href="mailto:${escapeHtml(user.email)}" style="color:${escapeHtml(accent)};text-decoration:none;">${escapeHtml(user.email)}</a></td></tr>
      <tr><td style="font:12px ${escapeHtml(font)};color:#374151;">${escapeHtml(user.phone)}${user.location ? ` · ${escapeHtml(user.location)}` : ""}</td></tr>
      ${social}${cta}${banner}${disclaimer}
    </table>`;
  }

  if (template.layout === "modern") {
    return `<table cellpadding="0" cellspacing="0" border="0" style="font-family:${escapeHtml(font)};color:#111827;">
      <tr>
        ${photoCell}
        <td style="vertical-align:top;border-left:3px solid ${escapeHtml(accent)};padding-left:14px;">
          <div style="font:700 17px ${escapeHtml(font)};color:${escapeHtml(color)};">${escapeHtml(user.displayName)}</div>
          <div style="font:13px ${escapeHtml(font)};color:#4b5563;margin-top:2px;">${escapeHtml(user.jobTitle)}</div>
          <div style="font:12px ${escapeHtml(font)};color:#6b7280;margin-top:2px;">${escapeHtml(user.company)} · ${escapeHtml(user.department)}</div>
          <div style="margin-top:8px;font:12px ${escapeHtml(font)};">
            <a href="mailto:${escapeHtml(user.email)}" style="color:${escapeHtml(accent)};text-decoration:none;">${escapeHtml(user.email)}</a><br/>
            ${escapeHtml(user.phone)}${user.mobile ? `<br/>${escapeHtml(user.mobile)}` : ""}
          </div>
        </td>
      </tr>
      <tr><td colspan="2">
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr><td>${logoHtml}</td></tr>
          ${social}${cta}${banner}${disclaimer}
        </table>
      </td></tr>
    </table>`;
  }

  // classic
  return `<table cellpadding="0" cellspacing="0" border="0" style="font-family:${escapeHtml(font)};color:#111827;">
    <tr>
      ${photoCell}
      <td style="vertical-align:top;">
        <table cellpadding="0" cellspacing="0" border="0">
          <tr><td>${logoHtml}</td></tr>
          <tr><td style="padding-top:4px;font:700 16px ${escapeHtml(font)};color:${escapeHtml(color)};">${escapeHtml(user.displayName)}</td></tr>
          <tr><td style="font:13px ${escapeHtml(font)};color:#4b5563;">${escapeHtml(user.jobTitle)}</td></tr>
          <tr><td style="font:12px ${escapeHtml(font)};color:#6b7280;">${escapeHtml(user.company)} | ${escapeHtml(user.department)}</td></tr>
          <tr><td style="padding-top:8px;font:12px ${escapeHtml(font)};">
            <a href="mailto:${escapeHtml(user.email)}" style="color:${escapeHtml(accent)};text-decoration:none;">${escapeHtml(user.email)}</a>
            ${user.phone ? `<span style="color:#9ca3af;"> · </span>${escapeHtml(user.phone)}` : ""}
          </td></tr>
          ${user.location ? `<tr><td style="font:12px ${escapeHtml(font)};color:#6b7280;">${escapeHtml(user.location)}</td></tr>` : ""}
          ${social}${cta}${banner}${disclaimer}
        </table>
      </td>
    </tr>
  </table>`;
}
