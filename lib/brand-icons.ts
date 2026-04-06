/** Watch brand emoji icons for display in tables and UI */
export const BRAND_ICONS: Record<string, string> = {
  ROLEX: "👑",
  "PATEK PHILIPPE": "🏛️",
  "AUDEMARS PIGUET": "🔷",
  "RICHARD MILLE": "💎",
  OMEGA: "Ω",
  CARTIER: "🐆",
  BREITLING: "✈️",
  HUBLOT: "⬡",
  "TAG HEUER": "🏎️",
  TUDOR: "🛡️",
  IWC: "⚙️",
  PANERAI: "⚓",
  BREGUET: "🕰️",
  BLANCPAIN: "🌊",
  "A.LANGE & SOHNE": "🇩🇪",
  "VACHERON CONSTATIN": "🏔️",
  BVLGARI: "🐍",
  "JAEGER LECOULTRE": "🔄",
  ZENITH: "⭐",
  "FP JOURNE": "🎨",
  "GIRARD PERREGAUX": "🌉",
  "GRAND SEIKO": "🗻",
  "GLASHUTTE ORIGINAL": "🔧",
  LONGINES: "🐴",
  "ULYSSE NARDIN": "⛵",
  OTHER: "⌚",
  SERVICE: "🛠️",
};

export function getBrandIcon(name: string): string {
  return BRAND_ICONS[name.toUpperCase().trim()] ?? "⌚";
}
