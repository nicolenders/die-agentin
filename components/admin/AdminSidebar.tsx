"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import BrandMark from "@/components/BrandMark";
import EntityIcon from "@/components/admin/EntityIcon";
import { groupAdminNav } from "@/lib/admin-nav";

/** Aus „Statische Seiten" wird „statische-seiten" — brauchbar als id. */
function slugForId(section: string): string {
  return section
    .toLowerCase()
    .replace(/[äöüß]/g, (c) => ({ "ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss" })[c] ?? c)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// Seitliche Navigation der Redaktion. Client-Komponente wegen der Ableitung des
// aktiven Punkts aus dem Pfad. Styling über die globalen Admin-Klassen
// (styles/admin.scss), analog zum Admin-Mockup.
//
// Die Gruppen sind echte Listen mit einer Überschrift, nicht nur ein
// Zwischen-`div`: vorher las ein Screenreader hier achtzehn Links am Stück ohne
// jede Gliederung vor. Nebenbei behebt das eine ungültige Verschachtelung —
// ein `div` stand in einem `span`.
export default function AdminSidebar() {
  const pathname = usePathname() ?? "/admin";
  const groups = groupAdminNav();

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
        {groups.map((group) => {
          const headingId = group.section ? `adminnav-${slugForId(group.section)}` : undefined;
          return (
            <div key={group.section ?? "start"}>
              {group.section ? (
                <h2 className="sec" id={headingId}>
                  {group.section}
                </h2>
              ) : null}
              <ul aria-labelledby={headingId}>
                {group.items.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} aria-current={isActive(item.href) ? "page" : undefined}>
                      <EntityIcon name={item.icon} size={17} />
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
