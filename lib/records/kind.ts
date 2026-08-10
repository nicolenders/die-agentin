// Art eines „Ausbildung"-Eintrags. Steuert die Registerkarten im Admin und die
// getrennten Bereiche auf der öffentlichen Seite.
export const CERT_KINDS = ["CERTIFICATION", "MVP", "TRAINING", "AWARD"] as const;
export type CertKind = (typeof CERT_KINDS)[number];

export const CERT_KIND_LABEL: Record<CertKind, string> = {
  CERTIFICATION: "Zertifizierungen",
  MVP: "MVP Awards",
  TRAINING: "Schulungen & Trainings",
  AWARD: "Auszeichnungen",
};

export const CERT_KIND_LABEL_EN: Record<CertKind, string> = {
  CERTIFICATION: "Certifications",
  MVP: "MVP Awards",
  TRAINING: "Trainings & courses",
  AWARD: "Awards",
};

export function toCertKind(value: string | null | undefined): CertKind {
  return value && (CERT_KINDS as readonly string[]).includes(value)
    ? (value as CertKind)
    : "CERTIFICATION";
}

// Unterteilung der Zertifizierungen (kind = CERTIFICATION) in Microsoft- und
// methodische Zertifizierungen. Für andere Arten ohne Bedeutung.
export const CERT_FAMILIES = ["MICROSOFT", "METHODICAL"] as const;
export type CertFamily = (typeof CERT_FAMILIES)[number];

export const CERT_FAMILY_LABEL: Record<CertFamily, string> = {
  MICROSOFT: "Microsoft-Zertifizierungen",
  METHODICAL: "Methodische Zertifizierungen",
};

export const CERT_FAMILY_LABEL_EN: Record<CertFamily, string> = {
  MICROSOFT: "Microsoft certifications",
  METHODICAL: "Methodological certifications",
};

// Kurzform für Dropdown/Chips im Admin.
export const CERT_FAMILY_SHORT: Record<CertFamily, string> = {
  MICROSOFT: "Microsoft",
  METHODICAL: "Methodisch",
};

export function toCertFamily(value: string | null | undefined): CertFamily {
  return value && (CERT_FAMILIES as readonly string[]).includes(value)
    ? (value as CertFamily)
    : "MICROSOFT";
}
