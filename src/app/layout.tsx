import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Spectral } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import { AppearanceProvider } from "@/components/AppearanceProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { BottomTabs } from "@/components/BottomTabs";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { SplashLinks } from "@/components/SplashLinks";
import { NO_FLASH_SCRIPT } from "@/app/noFlashScript";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const spectral = Spectral({
  variable: "--font-spectral",
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Onyx",
  description: "Strength progress tracker",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Onyx",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef3fc" },
    { media: "(prefers-color-scheme: dark)", color: "#070a10" },
  ],
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html
      lang="en"
      data-theme="cobalt"
      data-mode="dark"
      className={`${geistSans.variable} ${geistMono.variable} ${spectral.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <SplashLinks />
      <body className="min-h-full flex flex-col">
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }} />
        <AppearanceProvider>
          <ThemeProvider>
            {children}
            <BottomTabs />
            <ServiceWorkerRegister />
          </ThemeProvider>
        </AppearanceProvider>
      </body>
    </html>
  );
}
