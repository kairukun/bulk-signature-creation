"use client";

import { useEffect, useMemo } from "react";
import { renderSignatureHtml } from "@/lib/render-signature";
import { useStore } from "@/lib/store";
import type { Campaign, DirectoryUser, SignatureTemplate } from "@/lib/types";

export function SignaturePreview({
  user,
  template,
  campaign,
  device = "desktop",
}: {
  user: DirectoryUser;
  template: SignatureTemplate;
  campaign?: Campaign | null;
  device?: "desktop" | "mobile";
}) {
  const { recordCampaignView } = useStore();
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const html = useMemo(
    () => renderSignatureHtml({ user, template, campaign, origin }),
    [user, template, campaign, origin],
  );

  useEffect(() => {
    if (campaign?.id) recordCampaignView(campaign.id);
    // Count once per template/campaign pair mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaign?.id, template.id]);

  return (
    <div className={`preview-frame ${device}`}>
      <div className="preview-chrome">
        <span />
        <span />
        <span />
        <em>New message · {user.email}</em>
      </div>
      <div className="preview-body">
        <p className="preview-meta">To: customer@example.com</p>
        <p className="preview-meta">Subject: Following up</p>
        <div className="preview-message">
          <p>Hi there,</p>
          <p>Thanks for your time today — here are the next steps we discussed.</p>
          <p>Best,</p>
        </div>
        <div
          className="signature-html"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
}
