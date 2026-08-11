import { TRANSPORT_RULE_MARKER } from "@/lib/deploy/transport-rule";

export type PublishAudience = "all" | "selected";

export function normalizePublishEmails(emails: unknown): string[] {
  if (!Array.isArray(emails)) return [];
  const cleaned = emails
    .map((value) => String(value || "").trim().toLowerCase())
    .filter((email) => email.includes("@"));
  return [...new Set(cleaned)].sort((a, b) => a.localeCompare(b));
}

export function resolvePublishEmails(options: {
  audience?: PublishAudience | string;
  emails?: unknown;
  fallbackCount?: number;
}): {
  audience: PublishAudience;
  emails: string[];
  recipientCount: number;
  label: string;
} {
  const audience: PublishAudience =
    options.audience === "selected" ? "selected" : "all";
  const emails =
    audience === "selected" ? normalizePublishEmails(options.emails) : [];

  if (audience === "selected") {
    return {
      audience,
      emails,
      recipientCount: emails.length,
      label:
        emails.length === 1
          ? `1 selected mailbox (${emails[0]})`
          : `${emails.length} selected mailboxes`,
    };
  }

  const count = Number(options.fallbackCount ?? 0);
  return {
    audience: "all",
    emails: [],
    recipientCount: count,
    label: `${count} directory recipient${count === 1 ? "" : "s"} (all)`,
  };
}

/** Exchange transport-rule condition/action parameters for org-wide or sender list. */
export function buildTransportRuleParameters(options: {
  disclaimerHtml: string;
  fromEmails?: string[];
}): Record<string, unknown> {
  const emails = normalizePublishEmails(options.fromEmails || []);
  const shared = {
    ApplyHtmlDisclaimerText: options.disclaimerHtml,
    ApplyHtmlDisclaimerLocation: "Append",
    ApplyHtmlDisclaimerFallbackAction: "Wrap",
    ExceptIfBodyContainsWords: [TRANSPORT_RULE_MARKER],
    SentToScope: "NotInOrganization",
    Mode: "Enforce",
  };

  if (emails.length) {
    return {
      ...shared,
      From: emails,
      // Clear org-wide sender scope when targeting specific mailboxes.
      FromScope: null,
    };
  }

  return {
    ...shared,
    FromScope: "InOrganization",
    // Clear any previous selected-sender list when publishing to all.
    From: null,
  };
}
