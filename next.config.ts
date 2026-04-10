import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@whiskeysockets/baileys",
    "jimp",
    "sharp",
  ],
  async rewrites() {
    return [
      { source: "/stats/script.js", destination: "https://cloud.umami.is/script.js" },
      { source: "/stats/api/send", destination: "https://cloud.umami.is/api/send" },
    ];
  },
};

export default nextConfig;
