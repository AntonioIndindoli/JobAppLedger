import type { Metadata } from "next";
import "./globals.css";
import "leaflet/dist/leaflet.css";

export const metadata: Metadata = {
  title: "JobHazel",
  description: "Track job applications, interviews, tasks, and imports.",
  icons: {
    icon: "/JobHazelIcon.png",
    shortcut: "/JobHazelIcon.png",
    apple: "/JobHazelIcon.png",
  },
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
