import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import { APP_NAME, COMPANY_NAME } from "@/lib/constants";
import "./globals.css";

const display = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const body = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: `Internal Microsoft 365 email signature tool for ${COMPANY_NAME}.`,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} h-full`}>
      <body
        className="min-h-full antialiased"
        style={
          {
            ["--font-display"]: "var(--font-fraunces), Georgia, serif",
            ["--font-body"]: "var(--font-manrope), 'Segoe UI', sans-serif",
          } as CSSProperties
        }
      >
        {children}
      </body>
    </html>
  );
}
