import { db } from "@/db";
import { products, users } from "@/db/schema";
import { getCurrentSession } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { validateAndSanitizeUrl } from "@/lib/url-sanitizer";
import { handleApiError } from "@/lib/errors";
import { eq, and, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createProductSchema = z.object({
  title: z.string().min(3).max(100),
  shortDescription: z.string().min(10).max(200),
  description: z.string().min(20).max(20000),
  category: z.enum(["Scripts", "Templates", "Tools", "Services"]),
  tokenPrice: z.number().refine(
    (val) => Number.isSafeInteger(val) && val > 0 && val <= 1000000,
    { message: "Price must be a positive whole integer between 1 and 1,000,000 Utility Credits." }
  ),
  version: z.string().min(1).max(20).default("1.0.0"),
  compatibility: z.string().max(100).default("Valax Standard"),
  changelog: z.string().max(5000).default("Initial release"),
  githubRepositoryUrl: z.string().url().optional().or(z.literal("")),
  githubReleaseUrl: z.string().url(),
  externalDemoUrl: z.string().url().optional().or(z.literal("")),
  documentationUrl: z.string().url().optional().or(z.literal("")),
  previewImageUrl: z.string().url().optional().or(z.literal("")),
});

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const category = searchParams.get("category");

    const query = db
      .select({
        id: products.id,
        title: products.title,
        slug: products.slug,
        shortDescription: products.shortDescription,
        category: products.category,
        tokenPrice: products.tokenPrice,
        version: products.version,
        salesCount: products.salesCount,
        ratingAverage: products.ratingAverage,
        createdAt: products.createdAt,
        developer: {
          username: users.username,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(products)
      .innerJoin(users, eq(products.developerId, users.id))
      .where(
        category
          ? and(eq(products.status, "active"), eq(products.moderationStatus, "approved"), eq(products.category, category))
          : and(eq(products.status, "active"), eq(products.moderationStatus, "approved"))
      )
      .orderBy(desc(products.createdAt))
      .limit(50);

    const items = await query;
    return NextResponse.json(items);
  } catch (err: any) {
    return handleApiError(err, { publicMessage: "Failed to retrieve marketplace catalog." });
  }
}

export async function POST(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
  }

  const rate = checkRateLimit(`publish:${session.user.id}`, { maxRequests: 3, windowSeconds: 300 });
  if (!rate.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded. Please wait a few minutes before publishing again." }, { status: 429 });
  }

  try {
    const body = await req.json();
    const parsed = createProductSchema.parse(body);

    // Validate GitHub release URL strictly
    const releaseCheck = validateAndSanitizeUrl(parsed.githubReleaseUrl, { requireGitHubRelease: true });
    if (!releaseCheck.isValid) {
      return NextResponse.json({ error: releaseCheck.error || "Invalid GitHub Release URL. Must link to an official GitHub release." }, { status: 400 });
    }

    const productId = `prod_${nanoid(16)}`;
    const slug = `${parsed.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "asset"}-${nanoid(8)}`;

    // Strictly enforce initial draft and pending moderation status
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
      status: "draft",
      moderationStatus: "pending",
      salesCount: 0,
      ratingAverage: 5.0,
    });

    return NextResponse.json({
      success: true,
      slug,
      message: "Asset submitted successfully. It will become publicly visible once approved by a platform moderator.",
    });
  } catch (err: any) {
    return handleApiError(err, { publicMessage: "Invalid product submission data." });
  }
}