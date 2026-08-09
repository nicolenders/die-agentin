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
