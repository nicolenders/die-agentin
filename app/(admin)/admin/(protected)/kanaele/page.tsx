import { permanentRedirect } from "next/navigation";

// „Kanäle" ist in die Einstellungen gewandert (Register „Kanäle"). Diese Route
// bleibt als Weiterleitung bestehen, damit Lesezeichen und ältere Links weiter
// funktionieren, statt in einer 404 zu enden.
export default function KanaelePage(): never {
  permanentRedirect("/admin/einstellungen?tab=kanaele");
}
