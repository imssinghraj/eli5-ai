import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ELI5 AI Explainer — Understand Anything",
  description:
    "Ask ELI5 AI to explain any topic at your level — from 5-year-old simple to expert-level deep dives.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
