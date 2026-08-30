import { db } from "@/db";
import { products, users } from "@/db/schema";
import { getCurrentSession } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { validateAndSanitizeUrl } from "@/lib/url-sanitizer";
import { nanoid } from "nanoid";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createProductSchema = z.object({
  title: z.string().min(3).max(100),
  shortDescription: z.string().min(10).max(200),
  description: z.string().min(20).max(20000),
  category: z.enum(["Scripts", "Templates", "Tools", "Services"]),
  tokenPrice: z.number().int().min(0).max(1000000),
  version: z.string().min(1).max(20).default("1.0.0"),
  compatibility: z.string().max(100).default("Valax Standard"),
  changelog: z.string().max(5000).default("Initial release"),
  githubRepositoryUrl: z.string().url().optional().or(z.literal("")),
  githubReleaseUrl: z.string().url(),
  externalDemoUrl: z.string().url().optional().or(z.literal("")),
  documentationUrl: z.string().url().optional().or(z.literal("")),
  previewImageUrl: z.string().url().optional().or(z.literal("")),
});

export async function POST(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rate = checkRateLimit(`publish:${session.user.id}`, { maxRequests: 3, windowSeconds: 300 });
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many product submissions. Please wait." }, { status: 429 });
  }

  try {
    const body = await req.json();
    const parsed = createProductSchema.parse(body);

    // Validate GitHub release URL strictly
    const releaseCheck = validateAndSanitizeUrl(parsed.githubReleaseUrl, { requireGitHubRelease: true });
    if (!releaseCheck.isValid) {
      return NextResponse.json({ error: releaseCheck.error || "Invalid GitHub Release URL" }, { status: 400 });
    }

    const productId = `prod_${nanoid(16)}`;
    const slug = `${parsed.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "asset"}-${nanoid(8)}`;

    await db.insert(products).values({
      id: productId,
      developerId: session.user.id,
      title: parsed.title,
      slug,
      shortDescription: parsed.shortDescription,
      description: parsed.description,
      category: parsed.category,
      tokenPrice: parsed.tokenPrice,
      version: parsed.version,
      compatibility: parsed.compatibility,
      changelog: parsed.changelog,
      githubRepositoryUrl: parsed.githubRepositoryUrl || null,
      githubReleaseUrl: releaseCheck.sanitizedUrl,
      externalDemoUrl: parsed.externalDemoUrl || null,
      documentationUrl: parsed.documentationUrl || null,
      previewImageUrl: parsed.previewImageUrl || null,
      status: "active",
      moderationStatus: "approved", // Auto-approved or pending based on policy
    });

    return NextResponse.json({ success: true, slug });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Invalid product data" }, { status: 400 });
  }
}