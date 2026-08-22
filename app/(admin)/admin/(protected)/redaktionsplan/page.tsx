import { permanentRedirect } from "next/navigation";

// Aus dem „Redaktionsplan" ist der Terminkalender geworden: Er beantwortet, wann
// ein Einsatz ansteht und wann eine Depesche erscheint. Diese Route bleibt als
// Weiterleitung bestehen, damit Lesezeichen nicht in einer 404 enden.
export default function RedaktionsplanPage(): never {
  permanentRedirect("/admin/terminkalender");
}
