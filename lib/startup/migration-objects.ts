// Welche Tabellen legt eine Migration an?
//
// Der Grund für diese Datei ist ein Fehlerbild, das zweimal zugeschlagen hat:
// Wird eine Migration von Hand in der Datenbank ausgeführt, aber nicht in
// `_prisma_migrations` eingetragen, dann versucht `migrate deploy` sie beim
// nächsten Start erneut — und scheitert daran, dass es die Tabelle schon gibt.
// Der Lauf bricht ab, und ALLE späteren Migrationen bleiben liegen. Genau so
// blieben fünf Migrationen offen, obwohl vier davon längst wirksam waren.
//
// Von außen sieht beides gleich aus: „nicht angewendet". Die Unterscheidung
// trifft die Frage, ob die Objekte schon da sind. Steht die Tabelle bereits,
// fehlt nur die Buchführung — und die Abhilfe ist eine völlig andere.
//
// Deshalb wird die Migration hier gelesen statt geraten. Eine fest verdrahtete
// Liste wäre beim nächsten Zusatz sofort veraltet.

/**
 * Tabellennamen aus den `CREATE TABLE`-Anweisungen einer Migration.
 *
 * Absichtlich nur `CREATE TABLE`: Das ist die Anweisung, die zuverlässig
 * scheitert, wenn das Objekt schon existiert, und damit die, an der ein Lauf
 * hängen bleibt. Ein `ALTER TABLE ... ADD` scheitert zwar auch, ist aber ohne
 * Spaltenprüfung nicht sicher zu beurteilen — dafür gibt es hier keinen Bedarf,
 * weil jede blockierende Migration in diesem Projekt eine Tabelle anlegt.
 */
export function createdTables(sql: string): string[] {
  const found = new Set<string>();
  const pattern = /CREATE\s+TABLE\s+(?:\[dbo\]\.)?\[([^\]]+)\]/gi;
  for (const match of sql.matchAll(pattern)) {
    const name = match[1]?.trim();
    if (name) found.add(name);
  }
  return [...found];
}
