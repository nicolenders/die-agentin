import type { Locale } from "@/lib/i18n/config";

// Beschriftung der Publikationsarten. Steht hier, weil die Publikationsseite
// und der Lebenslauf dieselben Wörter brauchen — zwei Kopien derselben Liste
// laufen erfahrungsgemäß auseinander.

const DE: Record<string, string> = {
  BOOK: "Buch",
  ARTICLE: "Fachartikel",
  WHITEPAPER: "Whitepaper",
  COURSE: "Kurs",
  REPOSITORY: "Repository",
  PODCAST: "Podcast",
  INTERVIEW: "Interview",
  VIDEO: "Video",
};

const EN: Record<string, string> = {
  BOOK: "Book",
  ARTICLE: "Article",
  WHITEPAPER: "Whitepaper",
  COURSE: "Course",
  REPOSITORY: "Repository",
  PODCAST: "Podcast",
  INTERVIEW: "Interview",
  VIDEO: "Video",
};

/** Unbekannte Arten geben ihren Rohwert zurück, statt zu verschwinden. */
export function publicationTypeLabel(type: string, locale: Locale = "de"): string {
  return (locale === "en" ? EN : DE)[type] ?? type;
}
