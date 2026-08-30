import { requireFeatureFlag } from "@/lib/flags";
import { db } from "@/db";
import { products, users, productVersions } from "@/db/schema";
import { getCurrentSession } from "@/lib/auth";
import { validateCsrfOrigin } from "@/lib/csrf";
import { validateAndSanitizeUrl } from "@/lib/url-sanitizer";
import { verifyGitHubRelease, GitHubUrlSchema } from "@/lib/github-validator";
import { handleApiError } from "@/lib/errors";
import { desc, eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const productCreateSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100),
  shortDescription: z.string().min(10, "Short description must be at least 10 characters").max(255),
  description: z.string().min(20, "Detailed description must be at least 20 characters").max(5000),
  category: z.string().min(2).max(50),
  tokenPrice: z.number().int().refine((val) => Number.isSafeInteger(val) && val > 0 && val <= 1000000, {
    message: "Utility Credit price must be a positive integer between 1 and 1,000,000.",
  }),
  fiatPriceUsd: z.number().int().nonnegative().optional().default(0),
  version: z.string().min(1).max(20).default("1.0.0"),
  releaseTag: z.string().min(1, "Release tag is required").max(64),
  repositoryUrl: z.string().url("Valid GitHub Repository URL is required"),
  releaseUrl: z.string().url("Valid GitHub Release URL is required"),
  releaseAssetUrl: z.string().url().optional().or(z.literal("")),
  releaseChecksum: z.string().regex(/^[a-fA-F0-9]{64}$/, "Checksum must be 64-character SHA-256").optional().or(z.literal("")),
  licenseTerms: z.string().max(1000).optional().default("Standard Valax License"),
  supportUrl: z.string().url().optional().or(z.literal("")),
  compatibility: z.string().min(1).max(100).default("Valax Standard"),
  changelog: z.string().max(1000).default("Initial release"),
  previewImageUrl: z.string().url().optional().or(z.literal("")),
  externalDemoUrl: z.string().url().optional().or(z.literal("")),
  documentationUrl: z.string().url().optional().or(z.literal("")),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "12", 10)));
    const offset = (page - 1) * limit;

    const baseWhere = and(
      eq(products.status, "active"),
      eq(products.moderationStatus, "approved"),
      category ? eq(products.category, category) : undefined
    );

    const items = await db
      .select({
        id: products.id,
        title: products.title,
        slug: products.slug,
        shortDescription: products.shortDescription,
        category: products.category,
        tokenPrice: products.tokenPrice,
        fiatPriceUsd: products.fiatPriceUsd,
        version: products.releaseVersion,
        releaseTag: products.releaseTag,
        repositoryUrl: products.repositoryUrl,
        releaseUrl: products.releaseUrl,
        verificationStatus: products.verificationStatus,
        salesCount: products.salesCount,
        ratingAverage: products.ratingAverage,
        previewImageUrl: products.previewImageUrl,
        createdAt: products.createdAt,
        developer: {
          id: users.id,
          username: users.username,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(products)
      .leftJoin(users, eq(products.developerId, users.id))
      .where(baseWhere)
      .orderBy(desc(products.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({ products: items, page, limit });
  } catch (err: any) {
    return handleApiError(err, { publicMessage: "Failed to load marketplace catalog.", route: "/api/market/products" });
  }
}

export async function POST(req: NextRequest) {
  await requireFeatureFlag("PRODUCT_PUBLISH_ENABLED");
  const session = await getCurrentSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized. Please log in with Discord." }, { status: 401 });
  }

  const csrf = validateCsrfOrigin(req);
  if (!csrf.isValid) {
    return csrf.errorResponse!;
  }

  try {
    const rawBody = await req.text();
    if (rawBody.length > 50000) {
      return NextResponse.json({ error: "Product payload too large." }, { status: 413 });
    }

    const body = JSON.parse(rawBody || "{}");
    const validated = productCreateSchema.parse(body);

    // 1. Validate GitHub Repository & Release Metadata
    const releaseCheck = await verifyGitHubRelease({
      repositoryUrl: validated.repositoryUrl,
      releaseUrl: validated.releaseUrl,
      releaseTag: validated.releaseTag,
      releaseVersion: validated.version,
    });

    if (!releaseCheck.isValid) {
      return NextResponse.json({
        error: `GitHub Release Verification Failed: ${releaseCheck.errorMessage || "Invalid repository or release tag."}`,
      }, { status: 400 });
    }

    // 2. Strict Universal Sanitization of External Links
    const previewCheck = validateAndSanitizeUrl(validated.previewImageUrl || "", { requireImageHostOrExt: true, allowBlank: true });
    if (!previewCheck.isValid) {
      return NextResponse.json({ error: `Invalid Preview Image URL: ${previewCheck.error}` }, { status: 400 });
    }

    const demoCheck = validateAndSanitizeUrl(validated.externalDemoUrl || "", { allowBlank: true });
    if (!demoCheck.isValid) {
      return NextResponse.json({ error: `Invalid Demo URL: ${demoCheck.error}` }, { status: 400 });
    }

    const docCheck = validateAndSanitizeUrl(validated.documentationUrl || "", { allowBlank: true });
    if (!docCheck.isValid) {
      return NextResponse.json({ error: `Invalid Documentation URL: ${docCheck.error}` }, { status: 400 });
    }

    const supportCheck = validateAndSanitizeUrl(validated.supportUrl || "", { allowBlank: true });
    if (!supportCheck.isValid) {
      return NextResponse.json({ error: `Invalid Support URL: ${supportCheck.error}` }, { status: 400 });
    }

    const slug = `${validated.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${nanoid(6)}`;
    const productId = `prod_${nanoid(16)}`;
    const versionId = `pver_${nanoid(16)}`;

    // 3. Create Product Record
    const newProduct = {
      id: productId,
      developerId: session.user.id,
      title: validated.title,
      slug,
      shortDescription: validated.shortDescription,
      description: validated.description,
      category: validated.category,
      tokenPrice: validated.tokenPrice,
      fiatPriceUsd: validated.fiatPriceUsd,
      version: validated.version,
      compatibility: validated.compatibility,
      changelog: validated.changelog,
      githubOwner: releaseCheck.owner,
      githubRepo: releaseCheck.repo,
      repositoryUrl: validated.repositoryUrl,
      releaseUrl: releaseCheck.releaseUrl,
      releaseTag: releaseCheck.tag,
      releaseVersion: validated.version,
      releaseAssetUrl: releaseCheck.assetUrl || validated.releaseAssetUrl || null,
      releaseCommitSha: releaseCheck.commitSha || null,
      releaseChecksum: validated.releaseChecksum || null,
      licenseTerms: validated.licenseTerms || "Standard Valax License",
      supportUrl: supportCheck.sanitizedUrl || null,
      verificationStatus: "verified" as const,
      lastVerifiedAt: new Date(),
      githubReleaseUrl: releaseCheck.releaseUrl,
      githubRepositoryUrl: validated.repositoryUrl,
      externalDemoUrl: demoCheck.sanitizedUrl || null,
      documentationUrl: docCheck.sanitizedUrl || null,
      previewImageUrl: previewCheck.sanitizedUrl || null,
      status: "draft" as const,
      moderationStatus: "pending" as const,
      salesCount: 0,
      ratingAverage: 5.0,
    };

    await db.insert(products).values(newProduct);

    // 4. Create Initial Product Version History Record
    await db.insert(productVersions).values({
      id: versionId,
      productId: productId,
      version: validated.version,
      releaseTag: releaseCheck.tag,
      releaseUrl: releaseCheck.releaseUrl,
      releaseAssetUrl: releaseCheck.assetUrl || validated.releaseAssetUrl || null,
      releaseCommitSha: releaseCheck.commitSha || null,
      releaseChecksum: validated.releaseChecksum || null,
      changelog: validated.changelog,
      status: "active",
    });

    return NextResponse.json({
      success: true,
      product: newProduct,
      message: "Product submitted with verified GitHub Release. Pending administrator review.",
    }, { status: 201 });
  } catch (err: any) {
    return handleApiError(err, { publicMessage: "Failed to publish digital product.", route: "/api/market/products" });
  }
}