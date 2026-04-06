/** Lead source emoji icons for display in tables and UI */
export const LEAD_ICONS: Record<string, string> = {
  BEZEL: "💎",
  CHRONO24: "⏱️",
  EBAY: "🛒",
  FACEBOOK: "📘",
  GRAILZEE: "🏆",
  INSTAGRAM: "📸",
  "LOCAL RETAIL": "🏪",
  PHONE: "📞",
  REFERRAL: "🤝",
  REPEAT: "🔄",
  "WALK IN": "🚶",
  WEBSITE: "🌐",
  WHOLESALE: "📦",
  AUCTION: "🔨",
  "DEALER SHOW": "🎪",
  EMAIL: "📧",
  TWITTER: "🐦",
  TIKTOK: "🎵",
  YOUTUBE: "▶️",
  OTHER: "📋",
};

export function getLeadIcon(name: string): string {
  return LEAD_ICONS[name.toUpperCase().trim()] ?? "📋";
}
