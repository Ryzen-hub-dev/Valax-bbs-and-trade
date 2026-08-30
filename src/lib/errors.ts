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

export function sanitizeErrorMessage(err: unknown): string {
  if (!err) return "An unexpected error occurred.";
  if (typeof err === "string") return err;
  if (err instanceof Error) {
    if (process.env.NODE_ENV !== "production") {
      return err.message;
    }
    return "A server exception occurred while processing your request.";
  }
  return "An unexpected server exception occurred.";
}

export function handleApiError(
  err: unknown,
  options?: { status?: number; publicMessage?: string }
): NextResponse<ApiErrorResponse> {
  const requestId = generateRequestId();
  const timestamp = new Date().toISOString();
  const status = options?.status || 500;

  console.error(`[API Error] [${requestId}]`, err);

  const error = options?.publicMessage || sanitizeErrorMessage(err);

  return NextResponse.json(
    {
      error,
      requestId,
      timestamp,
    },
    { status }
  );
}