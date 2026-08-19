import { describe, it, expect } from "vitest";
import { adminNav, groupAdminNav } from "./admin-nav";

describe("groupAdminNav", () => {
  it("beginnt eine neue Gruppe bei jedem Eintrag mit `section`", () => {
    const groups = groupAdminNav([
      { href: "/admin", label: "Start", icon: "dashboard" },
      { href: "/a", label: "A", icon: "plan", section: "Erste" },
      { href: "/b", label: "B", icon: "mission" },
      { href: "/c", label: "C", icon: "stats", section: "Zweite" },
    ]);
    expect(groups.map((g) => g.section)).toEqual([undefined, "Erste", "Zweite"]);
    expect(groups[1]?.items.map((i) => i.href)).toEqual(["/a", "/b"]);
  });

  it("verliert keinen Eintrag der echten Navigation", () => {
    const groups = groupAdminNav();
    const flat = groups.flatMap((g) => g.items);
    expect(flat).toHaveLength(adminNav.length);
    expect(flat.map((i) => i.href)).toEqual(adminNav.map((i) => i.href));
  });

  it("kommt mit einer leeren Liste zurecht", () => {
    expect(groupAdminNav([])).toEqual([]);
  });
});
