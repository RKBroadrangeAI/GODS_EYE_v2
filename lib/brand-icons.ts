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

/** Map brand names → image filenames in /brands/ */
export const BRAND_IMAGE_MAP: Record<string, string> = {
  ROLEX: "rolex.png",
  "PATEK PHILIPPE": "patek-philippe.png",
  "AUDEMARS PIGUET": "audemars-piguet.png",
  "RICHARD MILLE": "richard-mille.png",
  OMEGA: "omega.png",
  CARTIER: "cartier.png",
  BREITLING: "breitling.png",
  HUBLOT: "hublot.png",
  "TAG HEUER": "tag-heuer.png",
  TUDOR: "tudor.png",
  IWC: "iwc.png",
  PANERAI: "panerai.png",
  BREGUET: "breguet.png",
  BLANCPAIN: "blancpain.png",
  "A.LANGE & SOHNE": "a-lange-sohne.png",
  "VACHERON CONSTATIN": "vacheron-constantin.png",
  BVLGARI: "bvlgari.png",
  "JAEGER LECOULTRE": "jaeger-lecoultre.png",
  ZENITH: "zenith.png",
  "FP JOURNE": "fp-journe.png",
  "GIRARD PERREGAUX": "girard-perregaux.png",
  "GRAND SEIKO": "grand-seiko.png",
  "GLASHUTTE ORIGINAL": "glashutte-original.png",
  LONGINES: "longines.png",
  "ULYSSE NARDIN": "ulysse-nardin.png",
};

/** Returns the emoji icon for use in text-only contexts (e.g. chart labels) */
export function getBrandIcon(name: string): string {
  return BRAND_ICONS[name.toUpperCase().trim()] ?? "⌚";
}

/** Returns the image path for a brand, or null if not found */
export function getBrandImagePath(name: string): string | null {
  const file = BRAND_IMAGE_MAP[name.toUpperCase().trim()];
  return file ? `/brands/${file}` : null;
}
