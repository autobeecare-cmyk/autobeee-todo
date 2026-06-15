// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { TopBar } from "@/components/layout/TopBar";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { QuickAdd } from "@/components/layout/QuickAdd";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { NotificationPermission } from "@/components/NotificationPermission";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Autobee OS",
  description: "Internal operating system for the Autobee startup team",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Autobee OS",
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Autobee OS",
    description: "Internal operating system for the Autobee startup team",
    siteName: "Autobee OS",
    images: [
      {
        url: "/icon-512.png",
        width: 512,
        height: 512,
        alt: "Autobee OS Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#FFC107",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} bg-background text-foreground antialiased`} suppressHydrationWarning>
        <Providers>
          {/* Desktop sidebar */}
          <Sidebar />

          {/* Top bar (mobile menu + search + quick add) */}
          <TopBar />

          {/* Main content — offset for sidebar on desktop handled by PageWrapper */}
          <main
            className="min-h-screen pt-14 pb-20 md:pb-6"
            id="main-content"
          >
            <PageWrapper>
              {children}
            </PageWrapper>
          </main>

          {/* Mobile bottom nav */}
          <BottomNav />

          {/* Global overlays */}
          <CommandPalette />
          <QuickAdd />
          <NotificationPermission />
        </Providers>
      </body>
    </html>
  );
}
