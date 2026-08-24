// Kopf des Lebenslaufs: Name, Kurztitel, Kontaktzeile — und rechts das
// Bewerbungsfoto. Genau die Anordnung, die eine Personalabteilung erwartet.
//
// Das Foto kommt aus dem Lebenslauf-Profil; ist dort keins gepflegt, greift
// das Porträt der Legende. Bewusst ohne AssetImage: Der Lebenslauf ist ein
// Dokument zum Drucken, keine Bildergalerie mit Lightbox.

export interface CvContactLine {
  label: string;
  href?: string;
}

export default function CvHead({
  name,
  headline,
  photo,
  contact,
}: {
  name: string;
  headline: string | null;
  photo: { url: string; alt: string } | null;
  contact: CvContactLine[];
}) {
  return (
    <header className="cv-head">
      <div className="cv-head-text">
        {headline ? <p className="cv-head-role">{headline}</p> : null}
        <h1 className="cv-head-name">{name}</h1>
        {contact.length > 0 ? (
          <ul className="cv-contact">
            {contact.map((item) => (
              <li key={item.label}>
                {item.href ? (
                  <a href={item.href} rel="noopener noreferrer">
                    {item.label}
                  </a>
                ) : (
                  item.label
                )}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {photo ? (
        <div className="cv-photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.url} alt={photo.alt} />
        </div>
      ) : null}
    </header>
  );
}
