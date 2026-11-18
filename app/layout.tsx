
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FIND MALI Admin Console",
  description: "Private administration dashboard for FIND MALI"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
