import { getAllFeatureFlags, setFeatureFlag, FeatureFlagKey, DEFAULT_FEATURE_FLAGS } from "@/lib/flags";
import { requirePermission } from "@/lib/rbac";
import { validateCsrfOrigin } from "@/lib/csrf";
import { handleApiError, generateRequestId } from "@/lib/errors";
import { checkRateLimitAsync, getClientIp } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const updateFlagSchema = z.object({
  flag: z.string().min(1),
  enabled: z.boolean(),
});

export async function GET(req: NextRequest) {
  try {
    await requirePermission("settings.manage", req);
    const flags = await getAllFeatureFlags();
    return NextResponse.json({ flags });
  } catch (err: any) {
    return handleApiError(err, { publicMessage: "Failed to load system settings.", route: "/api/admin/settings" });
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminUser = await requirePermission("settings.manage", req);

    const csrf = validateCsrfOrigin(req);
    if (!csrf.isValid) {
      return csrf.errorResponse!;
    }

    const clientIp = getClientIp(req);
    const rate = await checkRateLimitAsync(`admin_settings:${adminUser.id}:${clientIp}`, {
      maxRequests: 15,
      windowSeconds: 60,
      failClosed: true,
    });
    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many settings requests. Please wait." }, { status: 429 });
    }

    const body = await req.json();
    const { flag, enabled } = updateFlagSchema.parse(body);

    if (!(flag in DEFAULT_FEATURE_FLAGS)) {
      return NextResponse.json({ error: `Unknown feature flag: '${flag}'.` }, { status: 400 });
    }

    const requestId = generateRequestId();
    await setFeatureFlag(flag as FeatureFlagKey, enabled, adminUser.id, requestId);

    return NextResponse.json({
      success: true,
      flag,
      enabled,
      requestId,
      message: `Feature flag '${flag}' updated to ${enabled}.`,
    });
  } catch (err: any) {
    return handleApiError(err, { publicMessage: "Failed to update feature flag.", route: "/api/admin/settings" });
  }
}