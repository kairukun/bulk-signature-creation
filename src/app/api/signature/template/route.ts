import { NextResponse } from "next/server";
import { DEMO_TEMPLATES } from "@/lib/demo-data";
import { blobConfigured, getSharedState } from "@/lib/shared-state";
import type { SignatureTemplate } from "@/lib/types";

function fallbackTemplate(): SignatureTemplate {
  return (
    DEMO_TEMPLATES.find((template) => template.id === "t-dossani") ??
    DEMO_TEMPLATES[0]
  );
}

function pickCorporateTemplate(
  templates: SignatureTemplate[],
): SignatureTemplate | undefined {
  return (
    templates.find((template) => template.id === "t-dossani") ??
    templates.find((template) => template.layout === "corporate")
  );
}

export async function GET() {
  const fallback = fallbackTemplate();

  try {
    if (blobConfigured()) {
      const document = await getSharedState();
      const fromBlob = document
        ? pickCorporateTemplate(document.state.templates)
        : undefined;
      if (fromBlob) {
        return NextResponse.json({
          ok: true,
          source: "shared",
          template: fromBlob,
        });
      }
    }
  } catch {
    // Employee studio still works from the baked fallback.
  }

  return NextResponse.json({
    ok: true,
    source: "fallback",
    template: fallback,
  });
}
