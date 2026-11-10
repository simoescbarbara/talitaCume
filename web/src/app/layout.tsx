import type { Metadata, Viewport } from "next";
import { Allura, Cormorant_Garamond, Jost } from "next/font/google";
import { AccountProvider } from "@/components/AccountProvider";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { copy } from "@/lib/copy";
import "./globals.css";

// The emblem's three voices: a high-contrast serif ("TALITA"), a flowing script ("cumi"),
// and a light geometric sans in spaced capitals ("PROJETO", "MENINA LEVANTA!") that also carries the interface.
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});
const allura = Allura({ subsets: ["latin"], weight: "400", variable: "--font-allura", display: "swap" });
const jost = Jost({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-jost", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Talita Cumi: terapia com fé e ciência para mulheres", template: "%s | Talita Cumi" },
  description:
    "Encontre psicólogas e psicólogos cristãos com CRP verificado e marque sua sessão online ou presencial. Menina, levanta!",
};

export const viewport: Viewport = {
  themeColor: "#fcf9f3",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${cormorant.variable} ${allura.variable} ${jost.variable}`}>
      <body>
        <a className="skip" href="#main">
          {copy.skip}
        </a>
        <AccountProvider>
          <SiteHeader />
          <main id="main">{children}</main>
          <SiteFooter />
        </AccountProvider>
      </body>
    </html>
  );
}
