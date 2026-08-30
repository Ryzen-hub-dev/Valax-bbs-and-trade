import { nanoid } from "nanoid";
import { NextResponse } from "next/server";

export interface ApiErrorResponse {
  error: string;
  requestId: string;
  timestamp: string;
}

export function generateRequestId(): string {
  return `req_${nanoid(12)}`;
}

const SENSITIVE_PATTERNS = [
  /Bearer\s+[A-Za-z0-9._~+/-]+=*/gi,
  /discord[_\-a-z0-9]*token[:=\s]+["']?[A-Za-z0-9._\-]+["']?/gi,
  /client[_\-a-z0-9]*secret[:=\s]+["']?[A-Za-z0-9._\-]+["']?/gi,
  /turso[_\-a-z0-9]*token[:=\s]+["']?[A-Za-z0-9._\-]+["']?/gi,
  /paypal[_\-a-z0-9]*secret[:=\s]+["']?[A-Za-z0-9._\-]+["']?/gi,
  /VALAX-ENT-[A-Z0-9]{6}-[A-Z0-9]{6}/g,
  /session[_\-a-z0-9]*token[:=\s]+["']?[A-Za-z0-9._\-]+["']?/gi,
  /password[:=\s]+["']?[^"'\s]+["']?/gi,
];

export function redactSensitiveData(message: string): string {
  if (!message || typeof message !== "string") return "";
  let redacted = message;
  for (const pattern of SENSITIVE_PATTERNS) {
    redacted = redacted.replace(pattern, "[REDACTED_SECRET]");
  }
  return redacted;
}

export function sanitizeErrorMessage(err: unknown): string {
  if (!err) return "An unexpected error occurred.";
  if (typeof err === "string") return redactSensitiveData(err);
  if (err instanceof Error) {
    if ((err as any).name === "ZodError" || (err as any).issues) {
      return "Invalid request payload format.";
    }
    if (err.message.startsWith("FEATURE_DISABLED")) {
      return err.message.replace("FEATURE_DISABLED: ", "");
    }
    if (err.message.startsWith("UNAUTHORIZED_ADMIN")) {
      return "Forbidden. Administrative privileges required.";
    }
    if (err.message.startsWith("UNAUTHORIZED")) {
      return "Unauthorized. Please log in with Discord.";
    }
    if (process.env.NODE_ENV !== "production") {
      return redactSensitiveData(err.message);
    }
    return "A server exception occurred while processing your request.";
  }
  return "An unexpected server exception occurred.";
}

export function handleApiError(
  err: unknown,
  options?: { status?: number; publicMessage?: string; route?: string }
): NextResponse<ApiErrorResponse> {
  const requestId = generateRequestId();
  const timestamp = new Date().toISOString();
  const route = options?.route || "unknown_route";

  let status = options?.status || 500;
  if (err instanceof Error) {
    if ((err as any).name === "ZodError" || (err as any).issues) {
      status = 400;
    } else if (err.message.startsWith("FEATURE_DISABLED")) {
      status = 403;
    } else if (err.message.startsWith("UNAUTHORIZED_ADMIN") || err.message.startsWith("UNAUTHORIZED_MODERATOR")) {
      status = 403;
    } else if (err.message.startsWith("UNAUTHORIZED")) {
      status = 401;
    }
  }

  const errorName = err instanceof Error ? err.name : "UnknownError";
  const rawMsg = err instanceof Error ? err.message : String(err || "");
  const safeMessage = redactSensitiveData(rawMsg);

  console.error(`[API Error] [${requestId}] [${route}] [${status}] ${errorName}: ${safeMessage}`);

  const userFacingError = options?.publicMessage || sanitizeErrorMessage(err);

  return NextResponse.json(
    {
      error: userFacingError,
      requestId,
      timestamp,
    },
    { status }
  );
}