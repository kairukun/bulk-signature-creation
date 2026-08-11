import {
  renderSignatureHtml,
  resolveTemplateForUser,
} from "@/lib/render-signature";
import type { Campaign, DirectoryUser, SignatureTemplate } from "@/lib/types";

export interface SignaturePackRecipient {
  id: string;
  email: string;
  displayName: string;
  jobTitle: string;
  findMiRole?: string;
  storeName?: string;
  storeNumber?: string;
  phone: string;
  streetAddress?: string;
  cityStateZip?: string;
  templateId?: string;
  templateName?: string;
  html: string;
}

export function buildSignatureHtmlPack(options: {
  users: DirectoryUser[];
  templates: SignatureTemplate[];
  campaigns?: Campaign[];
  companyName: string;
  origin?: string;
}): {
  generatedAt: string;
  company: string;
  count: number;
  note: string;
  recipients: SignaturePackRecipient[];
} {
  const {
    users,
    templates,
    campaigns = [],
    companyName,
    origin = "",
  } = options;

  const recipients = users.map((user) => {
    const template = resolveTemplateForUser(user, templates);
    const campaign = template
      ? campaigns.find((c) => c.id === template.campaignId)
      : undefined;

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      jobTitle: user.jobTitle,
      findMiRole: user.findMiRole,
      storeName: user.storeName,
      storeNumber: user.storeNumber,
      phone: user.phone,
      streetAddress: user.streetAddress,
      cityStateZip: user.cityStateZip,
      templateId: template?.id,
      templateName: template?.name,
      html: template
        ? renderSignatureHtml({
            user,
            template,
            campaign,
            origin,
          })
        : "",
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    company: companyName,
    count: recipients.length,
    note: "FindMi-accurate per-person HTML for audit or manual use. The Exchange transport rule uses token-based corporate HTML (%%DisplayName%%, etc.).",
    recipients,
  };
}
