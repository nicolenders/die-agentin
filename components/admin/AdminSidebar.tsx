"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import BrandMark from "@/components/BrandMark";
import EntityIcon from "@/components/admin/EntityIcon";
import { adminNav } from "@/lib/admin-nav";

// Seitliche Navigation der Redaktion. Client-Komponente wegen der Ableitung des
// aktiven Punkts aus dem Pfad. Styling über die globalen Admin-Klassen
// (styles/admin.scss), analog zum Admin-Mockup.
export default function AdminSidebar() {
  const pathname = usePathname() ?? "/admin";

  function isActive(href: string): boolean {
    if (href === "/admin") return pathname === "/admin";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <aside className="aside">
      <div className="brand">
        <BrandMark size={36} className="sigil" />
        <span>
          <b>DIE AGENTIN</b>
          <small>ZENTRALE</small>
        </span>
      </div>
      <span className="roleChip">ROLLE: ADMIN / EDITOR</span>
      <nav aria-label="Redaktionsnavigation">
        {adminNav.map((item) => (
          <span key={item.href}>
            {item.section ? <div className="sec">{item.section}</div> : null}
            <Link href={item.href} aria-current={isActive(item.href) ? "page" : undefined}>
              <EntityIcon name={item.icon} size={17} />
              {item.label}
            </Link>
          </span>
        ))}
      </nav>
    </aside>
  );
}
