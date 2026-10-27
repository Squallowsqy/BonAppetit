import type { Metadata, Viewport } from "next";
import { AuthSessionProvider } from "@/components/AuthSessionProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "BonAppétit !",
  description:
    "Des dîners calés sur ton magasin et ton budget. Gratuit, sans abonnement.",
  applicationName: "BonAppétit !",
  appleWebApp: {
    capable: true,
    title: "BonAppétit !",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#f2f2f7",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased">
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}
