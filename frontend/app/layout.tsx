import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JobAppLedger",
  description: "Track job applications, interviews, tasks, and imports.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
