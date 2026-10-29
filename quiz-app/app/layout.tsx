import type { Metadata, Viewport } from "next";
import { NavBar } from "@/components/NavBar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Scam Shield - cybersecurity awareness challenge",
  description: "A 12-question challenge on WhatsApp scams, phishing, online fraud and staying safe.",
};

export const viewport: Viewport = { themeColor: "#ffffff" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <NavBar />
        {children}
      </body>
    </html>
  );
}
