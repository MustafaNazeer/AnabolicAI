import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Spectral } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import { appName } from "@/lib/app";
import { CHROME_COLOR } from "@/lib/chrome";
import { AppearanceProvider } from "@/components/AppearanceProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { BottomTabs } from "@/components/BottomTabs";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { HostWarning } from "@/components/HostWarning";
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
  title: appName,
  description: "Strength progress tracker",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: appName,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: CHROME_COLOR.light },
    { media: "(prefers-color-scheme: dark)", color: CHROME_COLOR.dark },
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
      data-theme="crimson"
      data-mode="dark"
      className={`${geistSans.variable} ${geistMono.variable} ${spectral.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <SplashLinks />
      <body className="min-h-full flex flex-col">
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }} />
        <AppearanceProvider>
          <ThemeProvider>
            {/* Above the page rather than in Settings, because the case this
                exists for is someone staring at a screen that looks fine and
                having no reason to go looking. Both values are read here
                because the layout is a server component; the client only ever
                supplies its own host. */}
            <HostWarning
              canonicalHost={process.env.VERCEL_PROJECT_PRODUCTION_URL}
              vercelEnv={process.env.VERCEL_ENV}
            />
            {children}
            <BottomTabs />
            <ServiceWorkerRegister />
          </ThemeProvider>
        </AppearanceProvider>
      </body>
    </html>
  );
}
