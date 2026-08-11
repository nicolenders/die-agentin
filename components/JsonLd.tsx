// Server-Component: gibt strukturierte Daten als <script type="application/ld+json">
// aus (Phase 13.3). Der Inhalt ist ein bereits serialisierter JSON-String
// (kein dangerouslySetInnerHTML auf gespeicherten Nutzerinhalten — das hier ist
// ausschließlich vom Server erzeugtes, kontrolliertes JSON).
export default function JsonLd({ json }: { json: string }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
