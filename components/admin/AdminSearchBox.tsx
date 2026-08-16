// Globale Suche in der Kopfleiste. Ein schlichtes GET-Formular — es braucht kein
// JavaScript und führt auf die Ergebnisseite, die dort nach Bereichen gefiltert
// werden kann. Der eingegebene Text steht auf der Ergebnisseite erneut im dortigen
// Suchfeld; hier bleibt das Feld leer und lädt so zur nächsten Suche ein.
export default function AdminSearchBox() {
  return (
    <form className="admin-search" action="/admin/suche" method="get" role="search">
      <input
        className="f"
        type="search"
        name="q"
        placeholder="Alles durchsuchen …"
        aria-label="Zentrale durchsuchen"
      />
      <button className="btn ghost sm" type="submit">Suchen</button>
    </form>
  );
}
