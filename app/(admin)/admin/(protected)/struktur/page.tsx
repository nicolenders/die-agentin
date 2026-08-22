import { permanentRedirect } from "next/navigation";

// Die „Stammdaten" sind in die Einstellungen gewandert (Register „Fachgebiete").
// Schlagworte, Weiterleitungen und Zertifizierungs-Kategorien gibt es nicht
// mehr — sie wurden gepflegt, ohne je etwas zu bewirken. Diese Route bleibt als
// Weiterleitung bestehen, damit Lesezeichen nicht in einer 404 enden.
export default function StrukturPage(): never {
  permanentRedirect("/admin/einstellungen?tab=fachgebiete");
}
