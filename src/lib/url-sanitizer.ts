export interface ExternalUrlCheck {
  isValid: boolean;
  sanitizedUrl: string;
  error?: string;
  isGitHubRelease?: boolean;
  isGitHubRepo?: boolean;
  isMediaEmbed?: boolean;
  embedType?: "youtube" | "vimeo" | "image" | "none";
}

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

const ALLOWED_IFRAME_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "youtu.be",
  "player.vimeo.com",
  "vimeo.com",
]);

const ALLOWED_IMAGE_HOSTS = new Set([
  "raw.githubusercontent.com",
  "user-images.githubusercontent.com",
  "avatars.githubusercontent.com",
  "github.com",
  "cdn.discordapp.com",
  "media.discordapp.net",
  "i.imgur.com",
]);

export function validateAndSanitizeUrl(rawUrl: string, options?: { requireGitHubRelease?: boolean }): ExternalUrlCheck {
  if (!rawUrl || typeof rawUrl !== "string") {
    return { isValid: false, sanitizedUrl: "", error: "URL is required" };
  }

  const trimmed = rawUrl.trim();
  if (trimmed.length > 2048) {
    return { isValid: false, sanitizedUrl: "", error: "URL exceeds maximum length of 2048 characters" };
  }

  try {
    const parsed = new URL(trimmed);

    // Protocol check
    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
      return { isValid: false, sanitizedUrl: "", error: "Only http and https protocols are allowed" };
    }

    // SSRF / Localhost prevention
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("172.16.") ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal")
    ) {
      return { isValid: false, sanitizedUrl: "", error: "Local or private network URLs are prohibited" };
    }

    const isGitHubRelease = hostname === "github.com" && parsed.pathname.includes("/releases");
    const isGitHubRepo = hostname === "github.com" && parsed.pathname.split("/").filter(Boolean).length >= 2;

    if (options?.requireGitHubRelease && !isGitHubRelease) {
      return { isValid: false, sanitizedUrl: "", error: "URL must be a valid GitHub Release link (e.g. https://github.com/owner/repo/releases/...)" };
    }

    let isMediaEmbed = false;
    let embedType: "youtube" | "vimeo" | "image" | "none" = "none";

    if (ALLOWED_IFRAME_HOSTS.has(hostname)) {
      isMediaEmbed = true;
      embedType = hostname.includes("vimeo") ? "vimeo" : "youtube";
    } else if (ALLOWED_IMAGE_HOSTS.has(hostname)) {
      isMediaEmbed = true;
      embedType = "image";
    }

    return {
      isValid: true,
      sanitizedUrl: parsed.toString(),
      isGitHubRelease,
      isGitHubRepo,
      isMediaEmbed,
      embedType,
    };
  } catch {
    return { isValid: false, sanitizedUrl: "", error: "Malformed URL" };
  }
}