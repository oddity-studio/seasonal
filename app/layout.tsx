import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Seasonal — Video Creator",
  description: "Create videos with Remotion",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
