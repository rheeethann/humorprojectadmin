import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reality Check Admin",
  description: "Manage Reality Check users and generated content.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
