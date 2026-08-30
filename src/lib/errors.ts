import { nanoid } from "nanoid";
import { NextResponse } from "next/server";

export interface ApiErrorOptions {
  status?: number;
  publicMessage?: string;
  internalDetails?: unknown;
}

/**
 * Handles API errors safely in production.
 * Desensitizes internal error details, logs with a unique requestId, and masks secrets.
 */
export function handleApiError(err: unknown, options: ApiErrorOptions = {}): NextResponse {
  const requestId = `req_${nanoid(12)}`;
  const status = options.status || 500;
  const isProd = process.env.NODE_ENV === "production";

  const rawMessage = err instanceof Error ? err.message : String(err);

  // Mask any accidental tokens/secrets in logs
  const sanitizedLog = rawMessage
    .replace(/(ey[a-zA-Z0-9_-]{20,})/g, "[REDACTED_JWT]")
    .replace(/(valax_session_[a-zA-Z0-9_-]+)/g, "[REDACTED_SESSION]")
    .replace(/(VALAX-ENT-[a-zA-Z0-9_-]+)/g, "[REDACTED_KEY]");

  console.error(`[API Error][${requestId}] Status ${status}:`, sanitizedLog, options.internalDetails || "");

  const userMessage = isProd
    ? options.publicMessage || "An internal error occurred. Please try again later."
    : options.publicMessage || rawMessage;

  return NextResponse.json(
    {
      error: userMessage,
      requestId,
    },
    { status }
  );
}