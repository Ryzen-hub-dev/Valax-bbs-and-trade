import { NextRequest, NextResponse } from "next/server";
import { getSafeOrigin } from "@/config/origins";

export interface CsrfValidationResult {
  isValid: boolean;
  safeOrigin?: string;
  errorResponse?: NextResponse;
}

const STATE_MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Validates CSRF origin/referer on state-mutating requests.
 * Fails closed if headers are missing or untrusted.
 */
export function validateCsrfOrigin(req: NextRequest): CsrfValidationResult {
  const method = req.method.toUpperCase();
  if (!STATE_MUTATING_METHODS.has(method)) {
    return { isValid: true };
  }

  const originHeader = req.headers.get("origin");
  const refererHeader = req.headers.get("referer");
  const candidate = originHeader || refererHeader;

  if (!candidate || candidate.trim() === "") {
    return {
      isValid: false,
      errorResponse: NextResponse.json(
        { error: "CSRF validation failed: Origin or Referer header is mandatory for state-mutating requests." },
        { status: 403 }
      ),
    };
  }

  const safeOrigin = getSafeOrigin(candidate);
  if (!safeOrigin) {
    return {
      isValid: false,
      errorResponse: NextResponse.json(
        { error: "CSRF validation failed: Untrusted request origin." },
        { status: 403 }
      ),
    };
  }

  return {
    isValid: true,
    safeOrigin,
  };
}