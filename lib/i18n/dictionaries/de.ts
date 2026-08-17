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
    signale: "Signale",
    dossiers: "Dossiers",
    einsaetze: "Einsätze",
    briefings: "Briefings",
    publikationen: "Publikationen",
    ausbildung: "Ausbildung",
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
    lead: "Nicole Enders — Microsoft MVP seit 2020, 7× in Folge. Ich entwerfe, baue und erkläre Lösungen rund um Microsoft AI und Modern Work. Hier laufen meine Funde, Dossiers und Einsätze zusammen.",
    roles: ["ARCHITECT", "ADVISOR", "DEVELOPER", "TRAINER", "SPEAKER"],
    nextMission: "Nächster Einsatz",
    lastSignal: "Letztes Signal",
    classification: "Klassifizierung: öffentlich",
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
  feed: {
    eyebrow: "Signale · laufende Meldungen",
    title: "Was mir aufgefallen ist",
    lead: "Kurze Meldungen aus der Microsoft- und KI-Welt, geteilte Funde mit Einordnung und Notizen aus dem Hintergrund.",
    filterByType: "Nach Typ filtern",
    empty: "Sobald ich etwas teile, erscheint es hier. Schau bald wieder vorbei.",
    types: {
      SIGNAL: "Signal",
      NOTE: "Kurzmeldung",
      BACKSTAGE: "Backstage",
    },
  },
  // Depeschen (Phase 3). `name`/`namePlural` sind die EINZIGE Quelle des
  // öffentlich sichtbaren Namens — ein Namenswechsel passiert nur hier.
  dispatch: {
    name: "Depesche",
    namePlural: "Depeschen",
    eyebrow: "Depeschen · aus dem Feld",
    title: "Arbeit an den Identitäten",
    lead: "Zwischen den Einsätzen: Meldungen, Einordnungen und Nachschlagewerke. Jede Depesche gehört zu einer Identität — sie ist die Arbeit daran, sie glaubhaft zu verkörpern.",
    filterByFormat: "Nach Format filtern",
    updatedLabel: "Aktualisiert",
    empty: "Sobald eine Depesche eingeht, erscheint sie hier.",
    formats: {
      NOTE: "Meldung",
      ANALYSIS: "Einordnung",
      REFERENCE: "Nachschlagewerk",
      BACKSTAGE: "Backstage",
    },
  },
  identity: {
    eyebrow: "Identitäten · Decknamen",
    title: "Die Identitäten",
    lead: "Nicole tritt je nach Thema unter verschiedenen Identitäten auf — parallel und dauerhaft aktiv. Jede ist offen als ihre eigene ausgewiesen.",
    empty: "Noch keine Identität veröffentlicht.",
    focusLabel: "Aktueller Fokus",
    coverage: "Was hier belegt wird",
    languagesLabel: "Sprachen",
  },
  footer: {
    contentHeading: "Inhalte",
    aboutHeading: "Über mich als Agentin",
    legalHeading: "Rechtliches",
    imprint: "Impressum",
    privacy: "Datenschutzerklärung",
    accessibility: "Erklärung zur Barrierefreiheit",
    cookies: "Cookie-Einstellungen",
    rss: "RSS-Feed",
    rights: "Alle Inhalte in DE und EN verfügbar.",
  },
  errors: {
    notFound: "Diese Seite gibt es nicht.",
    notFoundHint: "Vielleicht wurde sie verschoben. Zurück zum HQ.",
  },
} as const;

export default de;
