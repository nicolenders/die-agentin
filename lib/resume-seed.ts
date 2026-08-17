// Startdaten für den klassischen Lebenslauf, extrahiert aus Nicoles bisherigen
// Profil-/CV-Dokumenten. Wird einmalig über den Admin-Button „Vorlagedaten laden"
// in die Tabellen ResumeProfile/ResumeEntry übernommen und ist danach frei
// pflegbar. Bewusst als Entwurf: Nicole prüft und ergänzt.

export interface ResumeSeedEntry {
  section: "CAREER" | "EDUCATION" | "SKILL" | "PROJECT";
  title: string;
  subtitle?: string;
  location?: string;
  periodFrom?: string;
  periodTo?: string;
  description?: string;
  tags?: string[];
}

export const RESUME_PROFILE_SEED = {
  headline: "Lead Developer & Evangelist · Microsoft 365 & Azure",
  location: "Bonn",
  summary:
    "Erfahrene Lead Developerin mit Schwerpunkt auf Cloud-Lösungen rund um Microsoft 365 und Azure. Ich leite Entwicklungsteams und konzipiere und implementiere Lösungen mit SharePoint, Teams, der Power Platform und Azure, zunehmend ergänzt um künstliche Intelligenz (Microsoft 365 Copilot, generative KI, Agenten). Als Software-Architektin verbinde ich technische Tiefe mit klarer Kommunikation von Lösungsarchitekturen und enger Zusammenarbeit mit Stakeholdern. Microsoft MVP für Microsoft 365 (seit 2020) und Autorin mehrerer Fachbücher.",
};

export const RESUME_ENTRIES_SEED: ResumeSeedEntry[] = [
  // ---- Beruflicher Werdegang ----
  { section: "CAREER", title: "Lead Developer & Evangelist", subtitle: "conet Deutschland GmbH (vormals CONET Solutions GmbH)", location: "Bonn", periodFrom: "04/2025", periodTo: "heute", description: "Konzeption und Entwicklung von Cloud-Lösungen, insbesondere auf Basis von Microsoft Azure unter Nutzung bestehender Microsoft-365-Dienste." },
  { section: "CAREER", title: "Team Lead Microsoft Power BI", subtitle: "CONET Solutions GmbH", periodFrom: "04/2023", periodTo: "06/2023", description: "Leitung des Teams für Datenaufbereitung, -transformation und Visualisierung im Umfeld von Microsoft 365 und angrenzenden Systemlandschaften." },
  { section: "CAREER", title: "Team Lead Workplace Technology Scouts", subtitle: "CONET Solutions GmbH", periodFrom: "04/2022", periodTo: "03/2023", description: "Geschäftsentwicklung im Umfeld Microsoft 365." },
  { section: "CAREER", title: "Managing Consultant", subtitle: "CONET Solutions GmbH", periodFrom: "04/2021", periodTo: "03/2025", description: "Beratung und Coaching im Themenfeld Modern Workplace (Microsoft 365, insb. Teams, Power Platform, Mixed Reality) im Beratungs- und Entwicklungskontext." },
  { section: "CAREER", title: "Team Lead SharePoint", subtitle: "CONET Solutions GmbH", periodFrom: "04/2019", periodTo: "03/2021", description: "Leitung des Entwickler-Teams mit Fokus auf Microsoft SharePoint (On-Premises und Cloud)." },
  { section: "CAREER", title: "Senior Consultant / Senior Software Engineer", subtitle: "CONET Solutions GmbH", periodFrom: "04/2014", periodTo: "03/2019", description: "Beratung und Entwicklung von SharePoint-basierten Lösungen (SharePoint 2007 bis 2019)." },
  { section: "CAREER", title: "Software Engineer / Consultant", subtitle: "CONET Solutions GmbH", periodFrom: "06/2008", periodTo: "03/2014", description: "Beratung zu Microsoft SharePoint; Entwicklung mit C#, .NET, HTML und JavaScript im Web- und SharePoint-Umfeld." },
  { section: "CAREER", title: "Duales Studium / Ausbildung Fachinformatik AE", subtitle: "CONET Solutions GmbH", periodFrom: "08/2005", periodTo: "06/2008", description: "Software-Entwicklung (C#, ASP.NET, mobile Lösungen, SharePoint)." },

  // ---- Ausbildung ----
  { section: "EDUCATION", title: "Diplom-Wirtschaftsinformatikerin (FH)", subtitle: "FOM Hochschule für Ökonomie & Management, Siegen", description: "Studium der Wirtschaftsinformatik." },
  { section: "EDUCATION", title: "Staatlich anerkannte Fachinformatikerin, Anwendungsentwicklung", subtitle: "CONET Solutions GmbH (dual)", periodFrom: "08/2005", periodTo: "06/2008" },

  // ---- Technische Fähigkeiten ----
  { section: "SKILL", title: "Microsoft 365 & Collaboration", description: "SharePoint (Administration, Customizing, Entwicklung, Online-Konfiguration), Teams (Beratung, Entwicklung, Toolkit), Viva Engage, Loop, Planner, Whiteboard, Microsoft Graph, Office-Apps, InfoPath." },
  { section: "SKILL", title: "Azure", description: "App Service, Automation, DevOps, CLI, AI Foundry, Entra ID, CosmosDB, SQL, Tenant-Härtung, Lizenzberatung." },
  { section: "SKILL", title: "Power Platform", description: "Dataverse, Power Apps, Power Automate." },
  { section: "SKILL", title: "Künstliche Intelligenz", description: "Generative AI, Large Language Models, Retrieval-Augmented Generation (RAG), Microsoft Copilot (Beratung & Einführung), Copilot Studio, Agentenentwicklung." },
  { section: "SKILL", title: "Entwicklung", description: ".NET, C#, TypeScript, JavaScript, React, Node.js, SPFx, PnP PowerShell, REST API, Git, Docker; Softwarearchitektur, Clean Code, Test-Driven Development." },
  { section: "SKILL", title: "Methoden & Beratung", description: "Agile Führung, SCRUM, Kanban, Product Owner, Requirements Engineering, Cloud- & Data-Governance, Change Management, technische Projektleitung, Moderation & Präsentation." },

  // ---- Projektreferenzen (Auswahl) ----
  { section: "PROJECT", title: "Power Platform Governance", subtitle: "INFORM GmbH", periodFrom: "08/2024", periodTo: "06/2025", description: "Solution Architect. Einführung einer Power-Platform-Governance: Anforderungsaufnahme, Beratung zu Citizen Development, maßgeschneiderte Governance, Pipelines.", tags: ["Azure DevOps", "Power Automate", "SharePoint"] },
  { section: "PROJECT", title: "Lotus-Notes-Ablösung (model-driven Power App)", subtitle: "Henkel", periodFrom: "08/2024", periodTo: "09/2025", description: "Solution Architect. Model-driven Power App inkl. Berechtigungskonzept, SharePoint-Dokumentenintegration, Datenmodell, Business Rules/Flows und Migration.", tags: ["Dataverse", "Power Apps", "SharePoint", "Sharegate"] },
  { section: "PROJECT", title: "Delivery Factory (LowCode/NoCode)", subtitle: "BMW AG", periodFrom: "01/2024", periodTo: "heute", description: "Tech Stack Lead & Developer. Temporäre Teamführung, Value Assessments, Coaching von Citizen Developers, Power-Platform-Lösungen.", tags: ["Power Platform", "Azure", "Confluence"] },
  { section: "PROJECT", title: "GenAI HR-Bot", subtitle: "conet Technologies", periodFrom: "12/2023", periodTo: "11/2024", description: "Solution Architect. Anforderungen, Softwarearchitektur, UI-Entwicklung, Azure-Ressourcen, Deployment.", tags: ["React", "C#", "Azure App Service", "CosmosDB", "Azure AI Foundry", "Azure DevOps"] },
  { section: "PROJECT", title: "Intranet auf SharePoint SE", subtitle: "Auswärtiges Amt", periodFrom: "07/2022", periodTo: "01/2023", description: "Solution Architect. Konzeption, Teamkoordination, WebParts/Application Customizer, Code Reviews.", tags: ["SPFx", "React", "TypeScript", "PnP", "Docker"] },
  { section: "PROJECT", title: "Social Intranet", subtitle: "Deutsche Gesetzliche Unfallversicherung (DGUV)", periodFrom: "06/2022", periodTo: "03/2023", description: "Solution Architect. Provisionierung, News-Freigabeprozess, Beratungsdienstleistungen.", tags: ["Azure Automation", "Azure Functions", "Power Automate", "SPFx", "React", "Microsoft Graph"] },
  { section: "PROJECT", title: "Teams-App-Entwicklung", subtitle: "Bayer AG", periodFrom: "11/2021", periodTo: "07/2022", description: "Solution Architect & Software Engineer.", tags: ["Teams Toolkit", "React", "Microsoft Graph", "Azure App Service", "CosmosDB"] },
  { section: "PROJECT", title: "Social Intranet auf Microsoft 365", subtitle: "Ministerium der Deutschsprachigen Gemeinschaft Belgiens", periodFrom: "04/2020", periodTo: "06/2025", description: "Solution Architect, Consultant, Developer.", tags: ["SharePoint Online", "Viva Engage", "Teams", "SPFx", "Power Platform"] },
  { section: "PROJECT", title: "SharePoint-2019-Lösung", subtitle: "Deutsche Börse AG", periodFrom: "10/2019", periodTo: "07/2020", description: "Solution Architect & Software Engineer. Konzeption, Beratung, Teamkoordination.", tags: ["SPFx", "React", "TypeScript", "PnP"] },
  { section: "PROJECT", title: "Aufbau AMS & ERP-DB", subtitle: "Bundesrechnungshof", periodFrom: "07/2018", periodTo: "12/2021", description: "Consultant & Projektleiterin. Projektleitung, Konzeption, Lösungskomponenten.", tags: ["SharePoint 2016", "SPFx", "React", "PnP"] },
  { section: "PROJECT", title: "Profitbuilder", subtitle: "CLAAS", periodFrom: "04/2017", periodTo: "12/2021", description: "Solution Architect & Software Engineer.", tags: ["SharePoint 2013/2016/Online", "SPFx", "React", "Nintex"] },
];
