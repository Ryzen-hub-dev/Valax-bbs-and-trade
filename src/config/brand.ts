/**
 * Valax Scrub Brand & Visual Token Configuration
 * Central source of truth for branding, logos, assets and theme tokens.
 */

export const BRAND = {
  name: "Valax Scrub",
  subproject: "BBS & Trade",
  fullTitle: "Valax Scrub BBS and Trade",
  description: "Official developer community, technical discussion boards, verified digital asset marketplace, and Utility Credit ledger.",
  
  // Official Brand Asset Paths
  logo: {
    png: "/logo.png",
    webp: "/logo.webp",
    favicon: "/favicon.ico",
    faviconPng: "/favicon.png",
    alt: "Valax Scrub Emblem",
    width: 80,
    height: 80,
  },

  // Official Domains
  domains: {
    mainSite: "https://valaxscrub.shop",
    subplatform: "https://bbs-and-trade.valaxscrub.shop",
    stagingVercel: "https://valax-bbs-and-trade.vercel.app",
  },

  // Color Tokens
  colors: {
    primary: {
      gold: "#F59E0B",
      goldHover: "#D97706",
      goldGlow: "rgba(245, 158, 11, 0.25)",
    },
    accent: {
      blue: "#3B82F6",
      indigo: "#6366F1",
      emerald: "#10B981",
      purple: "#8B5CF6",
    },
    surface: {
      bg: "#0B0F19",
      card: "rgba(15, 23, 42, 0.6)",
      cardBorder: "rgba(30, 41, 59, 0.8)",
      subtle: "rgba(30, 41, 59, 0.4)",
    },
  },
} as const;