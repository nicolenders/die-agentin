// Deutsche Texte — Quellsprache. Die Struktur dieses Objekts definiert den
// Typ `Dictionary`; die englische Fassung muss dieselbe Form erfüllen.

const de = {
  brand: {
    name: "DIE AGENTIN",
    domain: "NICOLENDERS.COM",
    tagline: "Microsoft AI & Modern Work. Keine losen Enden.",
  },
  // Meta-Titel und -Beschreibungen je Route (Audit 1.2/1.4). Jede Route hat
  // ihre eigene Description; keine darf doppelt vorkommen, keine dynamischen
  // Zahlen (die veralten still im Suchergebnis), alle höchstens 155 Zeichen.
  meta: {
    titleDefault: "Nicole Enders · DIE AGENTIN · Microsoft AI & Modern Work",
    home: "Nicole Enders, Microsoft MVP seit 2020: Vorträge, Beratung und Umsetzung rund um Microsoft AI, Copilot Studio und Modern Work.",
    legende:
      "Wer hinter der Agentin steckt: Microsoft MVP seit 2020, Autorin, Speakerin. Mission, Arbeitsweise und das Codebuch zur Seite.",
    einsaetze:
      "Alle Auftritte auf der Weltkarte: Konferenzen, Meetups und Online-Events, filterbar nach Jahr, Werkzeug und Identität.",
    identitaeten:
      "Fünf Identitäten, unter denen ich arbeite: Schwerpunkte, Werkzeuge und die Einsätze, die dazu gehören.",
    depeschen:
      "Meldungen, Einordnungen und Nachschlagewerke zwischen den Einsätzen, jede Depesche einer Identität zugeordnet.",
    briefings:
      "Das komplette Vortragsrepertoire zu Microsoft AI, Copilot, Modern Work und Power Platform, filterbar nach Thema.",
    publikationen: "Fachbücher und Online-Kurse zu Microsoft 365, Teams und Power Platform.",
    ausbildung: "Microsoft-Zertifizierungen, MVP-Auszeichnungen und Schulungen im Überblick.",
    akte: "Das Speaker-Kit für Veranstalter: Bios zum Kopieren, Pressefoto, Vortragsformate, Themen und Kontakt.",
    cv: "Beruflicher Werdegang, Projektreferenzen, Zertifizierungen und Publikationen von Nicole Enders.",
    impressum: "Anbieterkennzeichnung nach § 5 DDG und § 18 Abs. 2 MStV.",
    datenschutz: "Wie diese Website mit personenbezogenen Daten umgeht.",
    barrierefreiheit:
      "Selbstverpflichtung zur Barrierefreiheit dieser Website und Kontakt für Rückmeldungen.",
  },
  nav: {
    hq: "HQ",
    einsaetze: "Einsätze",
    briefings: "Briefings",
    publikationen: "Publikationen",
    // „Ausbildung" heißt im Deutschen Berufsausbildung; die Seite zeigt aber
    // Zertifizierungen, Awards und Schulungen — und der Lebenslauf hat eine
    // eigene Sektion „Ausbildung" im Sinne von Education (Audit 2.6).
    // Der Route-Slug /ausbildung bleibt: eine Label-Änderung ist kein
    // Redirect-Risiko wert.
    ausbildung: "Nachweise",
    // War als einziges Footer-Label direkt im Code (Audit 6.9).
    akte: "Akte (Speaker-Kit)",
    legende: "Legende",
    identitaeten: "Identitäten",
    menu: "Menü",
    skipToContent: "Zum Inhalt springen",
    selectLanguage: "Sprache wählen",
    viewSite: "Website ansehen",
  },
  common: {
    readMore: "Weiterlesen",
    back: "Zurück",
    loadMore: "Weitere laden",
    all: "Alle",
    language: "Sprache",
    published: "Veröffentlicht",
    updated: "Aktualisiert",
    readingTime: "Lesezeit",
    minutes: "Min.",
    source: "Quelle",
    openEventSite: "Veranstaltungswebsite",
    emptyTitle: "Noch nichts hier",
    loading: "Wird geladen …",
    // Transparenzhinweis am Bild (Audit 6.9). Stand bisher fest auf Deutsch und
    // erschien so auch auf /en.
    aiGenerated: "KI-generiert",
    aiGeneratedShort: "KI",
    aiGeneratedImage: "KI-generiertes Bild",
  },
  langNotice: {
    // Fallback-Hinweis, wenn EN fehlt (SPEC §8)
    onlyGerman: "Dieser Beitrag ist bisher nur auf Deutsch verfügbar.",
    onlyGermanShort: "Nur auf Deutsch",
  },
  hq: {
    eyebrow: "Hauptquartier · Status aktiv",
    titleLine1: "Ich verbinde Menschen",
    titleLine2Prefix: "mit ",
    titleHighlight: "intelligenten Lösungen",
    // „Funde" und „Dossiers" gibt es auf der Seite nicht mehr (Audit 2.2).
    // Achtung: der Hero rendert `HomeContent.lead` aus der DB, dieser Text ist
    // nur der Fallback — die Live-Fassung wird im Admin gepflegt.
    lead: "Nicole Enders, Microsoft MVP seit 2020, 7× in Folge. Ich entwerfe, baue und erkläre Lösungen rund um Microsoft AI und Modern Work. Hier laufen Einsätze, Identitäten und Depeschen zusammen.",
    // Fallback für die Rollenzeile, wenn im Admin keine Rollen gepflegt sind
    // (`lib/queries/home.ts`). Kein toter Key.
    roles: ["ARCHITECT", "ADVISOR", "DEVELOPER", "TRAINER", "SPEAKER"],
    nextMission: "Nächster Einsatz",
    recent: "Zuletzt eingegangen",
    countMissions: "Einsätze",
    countCountries: "Länder",
    countBriefings: "Briefings",
    countMvp: "MVP Awards",
    countCertifications: "Zertifizierungen",
    countBooks: "Bücher",
    countIdentities: "Identitäten",
    countCopiesSold: "verkaufte Exemplare",
    // Singularformen für die Kennzahlen (Phase 10.4: „1 Einsätze" vermeiden).
    sgMissions: "Einsatz",
    sgCountries: "Land",
    sgBriefings: "Briefing",
    sgCertifications: "Zertifizierung",
    sgBooks: "Buch",
    sgIdentities: "Identität",
    sgCopiesSold: "verkauftes Exemplar",
    mostRequested: "Meistgefragtes Briefing",
    openMissionFile: "Einsatzakte öffnen",
    showMissionOnMap: "Auf der Karte zeigen",
    allBriefings: "Alle Briefings",
    noMission: "Zurzeit ist kein Einsatz geplant.",
  },
  // Depeschen (Phase 3). `name`/`namePlural` sind die EINZIGE Quelle des
  // öffentlich sichtbaren Namens — ein Namenswechsel passiert nur hier.
  dispatch: {
    name: "Depesche",
    namePlural: "Depeschen",
    eyebrow: "Depeschen · aus dem Feld",
    // Sichtbare H1 der Übersichtsseite (Audit 6.1). Ohne Kennzahlen: die
    // veralten still und stehen dann im Suchergebnis.
    headline: "Zwischen den Einsätzen.",
    title: "Arbeit an den Identitäten",
    lead: "Zwischen den Einsätzen: Meldungen, Einordnungen und Nachschlagewerke. Jede Depesche gehört zu einer Identität: die Arbeit daran, sie glaubhaft zu verkörpern.",
    filterByFormat: "Nach Format filtern",
    updatedLabel: "Aktualisiert",
    empty: "Noch nichts im Umlauf. Die erste Depesche geht in Kürze raus. Bis dahin findest du die Praxis in den Einsätzen.",
    emptyFiltered: "Zu dieser Auswahl liegt nichts vor. Filter lockern oder zurücksetzen.",
    formats: {
      NOTE: "Meldung",
      ANALYSIS: "Einordnung",
      REFERENCE: "Nachschlagewerk",
      BACKSTAGE: "Backstage",
    },
  },
  briefing: {
    // Auf einer Seite, deren Wert die Häufigkeit ist, liest sich „0×" wie ein
    // Defekt. Noch nicht gehaltene Briefings bekommen deshalb ein Label statt
    // eines Zählers (Audit 4.6).
    newInRepertoire: "Neu im Repertoire",
    workshop: "Workshop",
    deliveredCount: "gehalten",
    // Vortragsformate der Akte (Audit 6.4), gespeist aus den Dauern der
    // gepflegten Briefings.
    formatsHeading: "Formate",
    formatsLead:
      "Was ich anbiete, mit den Dauern aus dem laufenden Repertoire. Alle Formate auf Deutsch und auf Englisch.",
    formats: {
      LIGHTNING: "Lightning Talk",
      SESSION: "Session",
      LONG_SESSION: "Long Session",
      WORKSHOP: "Workshop",
    },
    pressPhoto: "Pressefoto",
    pressPhotoDownload: "Pressefoto herunterladen",
    pressPhotoCredit: "Bildnachweis",
  },
  identity: {
    eyebrow: "Identitäten · Decknamen",
    headline: "Fünf Identitäten, eine Haltung.",
    title: "Die Identitäten",
    // Ich-Form wie auf der übrigen Seite (Audit 2.3).
    lead: "Je nach Thema trete ich unter verschiedenen Identitäten auf, parallel und dauerhaft aktiv. Jede ist offen als meine eigene ausgewiesen.",
    empty: "Noch keine Identität veröffentlicht.",
    focusLabel: "Aktueller Fokus",
    coverage: "Belege",
    languagesLabel: "Sprachen",
  },
  footer: {
    contentHeading: "Inhalte",
    aboutHeading: "Die Agentin selbst",
    legalHeading: "Rechtliches",
    imprint: "Impressum",
    privacy: "Datenschutzerklärung",
    accessibility: "Erklärung zur Barrierefreiheit",
    cookies: "Cookie-Einstellungen",
    rss: "RSS-Feed",
    // Die Sprachverfügbarkeit steht schon im DE/EN-Umschalter im Kopf — und
    // widersprach dem Hinweis „bisher nur auf Deutsch" (Audit 2.4).
    rights: "Alle Rechte vorbehalten.",
  },
  errors: {
    notFound: "Diese Akte existiert nicht.",
    // Die Handlungsaufforderung gehört in den Button darunter, nicht in den
    // Fließtext (Audit 2.5, 6.6).
    notFoundHint: "Entweder wurde sie verlegt, oder sie war nie angelegt.",
    backToHq: "Zurück zum HQ",
  },
} as const;

export default de;
