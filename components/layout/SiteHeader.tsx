"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./SiteHeader.module.scss";
import BrandMark from "@/components/BrandMark";
import { locales, type Locale } from "@/lib/i18n/config";

export interface HeaderNavItem {
  href: string;
  segment: string;
  label: string;
}

interface SiteHeaderProps {
  locale: Locale;
  brand: { name: string; domain: string };
  navItems: HeaderNavItem[];
  labels: { menu: string; selectLanguage: string };
}

/**
 * Kopfzeile der öffentlichen Seiten. Client-Komponente, weil sie den aktiven
 * Navigationspunkt aus dem Pfad ableitet, das Mobilmenü umschaltet und den
 * Sprachwechsel unter Beibehaltung des Pfades erzeugt.
 */
export default function SiteHeader({
  locale,
  brand,
  navItems,
  labels,
}: SiteHeaderProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() ?? `/${locale}`;

  const currentSegment = pathname.replace(new RegExp(`^/(de|en)`), "").replace(/^\//, "");

  function switchLocalePath(target: Locale): string {
    const rest = pathname.replace(new RegExp(`^/(de|en)`), "");
    return `/${target}${rest || ""}` || `/${target}`;
  }

  return (
    <header className={styles.top}>
      <div className={`wrap ${styles.topbar}`}>
        <Link className={styles.brand} href={`/${locale}`} aria-label={brand.name}>
          <BrandMark size={40} className={styles.sigil} />
          <span className={styles.brandText}>
            <b>{brand.name}</b>
            <span>{brand.domain}</span>
          </span>
        </Link>

        <button
          className={`btn ghost ${styles.menuToggle}`}
          aria-expanded={open}
          aria-controls="main-nav"
          onClick={() => setOpen((v) => !v)}
        >
          {labels.menu}
        </button>

        <nav
          id="main-nav"
          className={`${styles.nav} ${open ? styles.open : ""}`}
          aria-label={brand.name}
        >
          {navItems.map((item) => {
            const isActive =
              item.segment === ""
                ? currentSegment === ""
                : currentSegment === item.segment ||
                  currentSegment.startsWith(`${item.segment}/`);
            return (
              <Link
                key={item.segment || "hq"}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="lang" role="group" aria-label={labels.selectLanguage}>
          {locales.map((code) => (
            <Link
              key={code}
              href={switchLocalePath(code)}
              aria-current={code === locale ? "true" : undefined}
              hrefLang={code}
              className="lang-btn"
            >
              {code.toUpperCase()}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
