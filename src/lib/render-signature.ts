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

  const photoCell = template.showPhoto
    ? `<td style="padding-right:14px;vertical-align:top;">
        ${
          user.photoUrl
            ? `<img src="${escapeHtml(user.photoUrl)}" width="64" height="64" alt="" style="border-radius:50%;display:block;object-fit:cover;" />`
            : `<div style="width:64px;height:64px;border-radius:50%;background:${escapeHtml(color)};color:#fff;font:600 18px ${escapeHtml(font)};text-align:center;line-height:64px;">${escapeHtml(initials)}</div>`
        }
      </td>`
    : "";

  const logoRow =
    template.showLogo
      ? `<tr><td style="padding-top:10px;font:700 13px ${escapeHtml(font)};color:${escapeHtml(color)};letter-spacing:0.04em;text-transform:uppercase;">${escapeHtml(template.logoAlt || user.company)}</td></tr>`
      : "";

  const social =
    template.showSocial && (user.linkedIn || user.twitter || user.website)
      ? `<tr><td style="padding-top:8px;font:12px ${escapeHtml(font)};">
          ${user.linkedIn ? `<a href="${escapeHtml(user.linkedIn)}" style="color:${escapeHtml(accent)};text-decoration:none;margin-right:10px;">LinkedIn</a>` : ""}
          ${user.twitter ? `<a href="${escapeHtml(user.twitter)}" style="color:${escapeHtml(accent)};text-decoration:none;margin-right:10px;">X</a>` : ""}
          ${user.website ? `<a href="${escapeHtml(user.website)}" style="color:${escapeHtml(accent)};text-decoration:none;">Website</a>` : ""}
        </td></tr>`
      : "";

  const cta =
    template.ctaLabel && template.ctaUrl
      ? `<tr><td style="padding-top:10px;">
          <a href="${escapeHtml(ctaHref)}" style="display:inline-block;background:${escapeHtml(accent)};color:#fff;text-decoration:none;font:600 12px ${escapeHtml(font)};padding:8px 12px;border-radius:4px;">${escapeHtml(template.ctaLabel)}</a>
        </td></tr>`
      : "";

  const banner =
    live && campaign
      ? `<tr><td style="padding-top:12px;">
          <a href="${escapeHtml(bannerHref)}" style="display:block;background:${escapeHtml(campaign.backgroundColor)};color:${escapeHtml(campaign.textColor)};text-decoration:none;font:600 12px ${escapeHtml(font)};padding:10px 12px;border-radius:4px;">
            ${escapeHtml(campaign.bannerText)}
          </a>
        </td></tr>`
      : "";

  const disclaimer = template.disclaimer
    ? `<tr><td style="padding-top:10px;font:10px ${escapeHtml(font)};color:#6b7280;max-width:420px;line-height:1.4;">${escapeHtml(template.disclaimer)}</td></tr>`
    : "";

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
      ${logoRow}
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
          ${logoRow}${social}${cta}${banner}${disclaimer}
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
          ${logoRow}
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
