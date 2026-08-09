import RenderDocument from "./RenderDocument";
import { parseRichValue, isRichEmpty } from "@/lib/content/rich";

// Rendert einen gespeicherten Rich-Text-Feldwert als Blockinhalt (Absätze,
// Listen, Zitate, Akzente). Verträgt sowohl TipTap-JSON als auch alten
// Plain-Text (siehe lib/content/rich.ts). Kein dangerouslySetInnerHTML.
export default function RichText({
  value,
  locale,
}: {
  value: string | null | undefined;
  locale: string;
}) {
  if (isRichEmpty(value)) return null;
  return <RenderDocument doc={parseRichValue(value)} assets={{}} locale={locale} />;
}
