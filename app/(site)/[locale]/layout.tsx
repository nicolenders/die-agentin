import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "@/styles/globals.scss";
import { isLocale, locales, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { mainNav } from "@/lib/nav";
import { fontVariables } from "@/lib/fonts";
import { siteOrigin } from "@/lib/site";
import SiteHeader, { type HeaderNavItem } from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import JsonLd from "@/components/JsonLd";
import PageviewTracker from "@/components/analytics/PageviewTracker";
import { getPersonInput } from "@/lib/queries/person";
import { personNode, webSiteNode, graph } from "@/lib/seo/jsonld";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  // canonical/OG-Basis immer unter dem kanonischen Host (Phase 1.2b), unabhängig
  // vom Request-Host. Die vollständige per-Route-canonical + hreflang folgt in
  // Phase 13; hier wird die host-unabhängige Basis gesetzt.
  const siteUrl = siteOrigin();
  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: `${dict.brand.name} — nicolenders.com`,
      template: `%s · ${dict.brand.name}`,
    },
    description: dict.hq.lead,
    alternates: {
      languages: {
        de: "/de",
        en: "/en",
        "x-default": "/de",
      },
      // RSS-Autodiscovery: Feed-Reader und Browser finden den Feed automatisch.
      types: {
        "application/rss+xml": [
          {
            url: locale === "en" ? "/feed.en.xml" : "/feed.xml",
            title: `${dict.brand.name} — ${dict.dispatch.namePlural}`,
          },
        ],
      },
    },
    openGraph: {
      siteName: "nicolenders.com",
      locale: locale === "de" ? "de_DE" : "en_US",
      type: "website",
    },
    robots: { index: true, follow: true },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const typedLocale: Locale = locale;
  const dict = await getDictionary(typedLocale);

  // Site-weite strukturierte Daten (Phase 13.3): Person + WebSite.
  const person = await getPersonInput(typedLocale);
  const siteJsonLd = graph([personNode(person), webSiteNode(dict.brand.name, typedLocale)]);

  const navItems: HeaderNavItem[] = mainNav.map((item) => ({
    segment: item.segment,
    href: item.segment ? `/${typedLocale}/${item.segment}` : `/${typedLocale}`,
    label: item.label(dict),
  }));

  return (
    <html lang={typedLocale} className={fontVariables}>
      <body>
        <JsonLd json={siteJsonLd} />
        <PageviewTracker />
        <a className="skip-link" href="#main-content">
          {dict.nav.skipToContent}
        </a>
        <SiteHeader
          locale={typedLocale}
          brand={{ name: dict.brand.name, domain: dict.brand.domain }}
          navItems={navItems}
          labels={{
            menu: dict.nav.menu,
            selectLanguage: dict.nav.selectLanguage,
          }}
        />
        <main id="main-content" className="wrap" tabIndex={-1}>
          {children}
        </main>
        <SiteFooter locale={typedLocale} dict={dict} />
      </body>
    </html>
  );
}
