export type ZoneId = "cameroun" | "europe";

export function zoneLabel(zone: ZoneId) {
  return zone === "europe" ? "Europe · EUR" : "Cameroun · XAF";
}

export function readStoredZone(): ZoneId {
  if (typeof window === "undefined") return "cameroun";
  const stored = window.localStorage.getItem("on-zone");
  return stored === "europe" ? "europe" : "cameroun";
}

export function persistZone(zone: ZoneId): void {
  window.localStorage.setItem("on-zone", zone);
  document.cookie = `on-zone=${zone}; path=/; max-age=31536000; samesite=lax`;
}
