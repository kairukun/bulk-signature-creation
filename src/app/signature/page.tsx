import type { Metadata } from "next";
import { COMPANY_NAME } from "@/lib/constants";
import { SignatureStudio } from "./studio";

export const metadata: Metadata = {
  title: `Email signature · ${COMPANY_NAME}`,
  description:
    "Build your Dossani Paradise Management email signature from FindMi or by hand, then paste it into Outlook.",
};

export default function SignaturePage() {
  return <SignatureStudio />;
}
