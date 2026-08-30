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
  "images.unsplash.com",
]);

const FORBIDDEN_SCHEMES = ["javascript:", "data:", "blob:", "file:", "vbscript:"];

/**
 * Universal external URL sanitizer and validator.
 * Validates protocol, hostname, blocks private IPs/SSRF, and never triggers outbound network requests.
 */
export function validateAndSanitizeUrl(
  rawUrl: string,
  options?: {
    requireGitHubRelease?: boolean;
    requireGitHubRepo?: boolean;
    requireImageHostOrExt?: boolean;
    allowBlank?: boolean;
  }
): ExternalUrlCheck {
  if (!rawUrl || typeof rawUrl !== "string") {
    if (options?.allowBlank) {
      return { isValid: true, sanitizedUrl: "" };
    }
    return { isValid: false, sanitizedUrl: "", error: "URL is mandatory." };
  }

  const trimmed = rawUrl.trim();
  if (trimmed === "" && options?.allowBlank) {
    return { isValid: true, sanitizedUrl: "" };
  }

  if (trimmed.length > 2048) {
    return { isValid: false, sanitizedUrl: "", error: "URL exceeds maximum length of 2048 characters." };
  }

  const lower = trimmed.toLowerCase();
  for (const forbidden of FORBIDDEN_SCHEMES) {
    if (lower.startsWith(forbidden)) {
      return { isValid: false, sanitizedUrl: "", error: `Prohibited scheme: ${forbidden}` };
    }
  }

  try {
    const parsed = new URL(trimmed);

    // Protocol check (http/https strictly)
    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
      return { isValid: false, sanitizedUrl: "", error: "Only http: and https: protocols are permitted." };
    }

    // SSRF / Localhost / Private Network prevention
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname === "::1" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("172.16.") ||
      hostname.startsWith("169.254.") ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal")
    ) {
      return { isValid: false, sanitizedUrl: "", error: "Access to local, private, or loopback network addresses is prohibited." };
    }

    const isGitHubRelease =
      hostname === "github.com" &&
      /^\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/releases(\/.*)?$/.test(parsed.pathname);

    const isGitHubRepo =
      hostname === "github.com" &&
      /^\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(\/.*)?$/.test(parsed.pathname);

    if (options?.requireGitHubRelease && !isGitHubRelease) {
      return {
        isValid: false,
        sanitizedUrl: "",
        error: "URL must be a valid GitHub Release link (e.g. https://github.com/owner/repo/releases/tag/v1.0.0).",
      };
    }

    if (options?.requireGitHubRepo && !isGitHubRepo) {
      return {
        isValid: false,
        sanitizedUrl: "",
        error: "URL must be a valid GitHub Repository link (e.g. https://github.com/owner/repo).",
      };
    }

    if (options?.requireImageHostOrExt) {
      const isAllowedHost = ALLOWED_IMAGE_HOSTS.has(hostname);
      const hasImageExt = /\.(png|jpg|jpeg|webp|svg|gif)$/i.test(parsed.pathname);
      if (!isAllowedHost && !hasImageExt) {
        return {
          isValid: false,
          sanitizedUrl: "",
          error: "Preview image must be hosted on an approved image provider or end with a valid image extension (.png, .webp, .jpg).",
        };
      }
    }

    let isMediaEmbed = false;
    let embedType: "youtube" | "vimeo" | "image" | "none" = "none";

    if (ALLOWED_IFRAME_HOSTS.has(hostname)) {
      isMediaEmbed = true;
      embedType = hostname.includes("vimeo") ? "vimeo" : "youtube";
    } else if (ALLOWED_IMAGE_HOSTS.has(hostname) || /\.(png|jpg|jpeg|webp|svg|gif)$/i.test(parsed.pathname)) {
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
    return { isValid: false, sanitizedUrl: "", error: "Malformed URL syntax." };
  }
}