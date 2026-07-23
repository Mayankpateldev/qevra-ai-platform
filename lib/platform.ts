import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";
import { getChatGPTUser } from "../app/chatgpt-auth";
import { getDb } from "../db";
import { organizations, products, recipes, users } from "../db/schema";

export type PlatformRole = "admin" | "ml_engineer" | "quality_engineer" | "operator" | "reviewer";

const PRIMARY_ORGANIZATION_ID = "org_qualvanta_primary";

export class PlatformError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

function configuredAdminEmails(): Set<string> {
  const runtime = env as unknown as { QEVRA_ADMIN_EMAILS?: string; QUALVANTA_ADMIN_EMAILS?: string };
  const configured = runtime.QEVRA_ADMIN_EMAILS ?? runtime.QUALVANTA_ADMIN_EMAILS ?? "";
  return new Set(configured.split(",").map(value => value.trim().toLowerCase()).filter(Boolean));
}

export async function requirePlatformUser(allowedRoles?: PlatformRole[]) {
  const identity = await getChatGPTUser();
  if (!identity) throw new PlatformError(401, "Authentication required");

  const db = getDb();
  await db.insert(organizations).values({
    id: PRIMARY_ORGANIZATION_ID,
    name: "QEVRA AI Primary Organization",
    slug: "qevra-primary",
  }).onConflictDoUpdate({
    target: organizations.id,
    set: { name: "QEVRA AI Primary Organization", slug: "qevra-primary" },
  });
  await ensureBenchmarkCatalog();

  const normalizedEmail = identity.email.toLowerCase();
  const initialRole: PlatformRole = configuredAdminEmails().has(normalizedEmail) ? "admin" : "reviewer";
  const userId = `usr_${await stableId(normalizedEmail)}`;
  await db.insert(users).values({
    id: userId,
    organizationId: PRIMARY_ORGANIZATION_ID,
    email: normalizedEmail,
    displayName: identity.displayName,
    role: initialRole,
  }).onConflictDoNothing();
  if (initialRole === "admin") {
    await db.update(users).set({ role: "admin", updatedAt: new Date().toISOString() })
      .where(and(eq(users.organizationId, PRIMARY_ORGANIZATION_ID), eq(users.email, normalizedEmail)));
  }

  const [user] = await db.select().from(users).where(and(eq(users.organizationId, PRIMARY_ORGANIZATION_ID), eq(users.email, normalizedEmail))).limit(1);
  if (!user) throw new PlatformError(403, "User provisioning failed");
  if (allowedRoles && !allowedRoles.includes(user.role as PlatformRole)) throw new PlatformError(403, "Your role cannot perform this action");
  return user;
}

async function ensureBenchmarkCatalog() {
  const db = getDb();
  const catalog = [
    { key: "metal_nut", family: "Machined components", sku: "BENCH-NUT", variant: "MVTec metal nut", taskType: "anomaly" as const },
    { key: "bottle", family: "Packaging", sku: "BENCH-BOTTLE", variant: "MVTec bottle", taskType: "anomaly" as const },
    { key: "cable", family: "Electronics assemblies", sku: "BENCH-CABLE", variant: "MVTec cable", taskType: "anomaly" as const },
    { key: "pill", family: "Pharmaceutical products", sku: "BENCH-PILL", variant: "MVTec pill family", taskType: "anomaly" as const },
  ];
  for (const item of catalog) {
    await db.insert(products).values({
      id: `product_${item.key}`,
      organizationId: PRIMARY_ORGANIZATION_ID,
      family: item.family,
      sku: item.sku,
      variant: item.variant,
      status: "enrolling",
      attributesJson: JSON.stringify({ source: "public-benchmark", productionApproved: false }),
    }).onConflictDoNothing();
    await db.insert(recipes).values({
      id: `recipe_${item.key}`,
      organizationId: PRIMARY_ORGANIZATION_ID,
      productId: `product_${item.key}`,
      name: `${item.variant} anomaly recipe`,
      taskType: item.taskType,
      status: "validation",
      cameraProfile: "benchmark-input",
    }).onConflictDoNothing();
  }
}

export function platformErrorResponse(error: unknown): Response {
  if (error instanceof PlatformError) return Response.json({ error: error.message }, { status: error.status });
  const message = error instanceof Error ? error.message : "Unexpected platform error";
  console.error(error);
  return Response.json({ error: message }, { status: 500 });
}

export async function stableId(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).slice(0, 12).map(byte => byte.toString(16).padStart(2, "0")).join("");
}

export function qualityDataBucket() {
  const runtime = env as unknown as { QUALITY_DATA?: R2BucketLike };
  if (!runtime.QUALITY_DATA) throw new PlatformError(503, "Dataset object storage is not configured");
  return runtime.QUALITY_DATA;
}

type R2BucketLike = {
  put(key: string, value: ArrayBuffer | ArrayBufferView | Blob | string, options?: { httpMetadata?: { contentType?: string }; customMetadata?: Record<string, string> }): Promise<unknown>;
};
