// Online-Events auf der Karte (Phase 8.3). Damit sie sich visuell von echten
// Orten trennen, bekommen sie deterministische Koordinaten auf einem Ring um die
// Antarktis: countryCode "AQ", city "Online", Längengrad über den Ring verteilt,
// Breitengrad zwischen −72 und −78. Deterministisch (index-basiert), damit ein
// erneuter Import dieselben Koordinaten erzeugt.

export interface OnlineCoords {
  lat: number;
  lon: number;
  countryCode: "AQ";
  city: "Online";
}

export function antarcticaCoords(index: number): OnlineCoords {
  const i = Math.abs(Math.trunc(index));
  // 37 ist teilerfremd zu 360 → gute Streuung ohne Häufung.
  const lon = -180 + ((i * 37) % 360);
  const lat = -72 - ((i * 13) % 7); // −72 … −78
  return { lat, lon, countryCode: "AQ", city: "Online" };
}

export function isOnlineEvent(countryCode: string | null | undefined, city: string | null | undefined): boolean {
  return (countryCode ?? "").toUpperCase() === "AQ" || (city ?? "").trim().toLowerCase() === "online";
}
