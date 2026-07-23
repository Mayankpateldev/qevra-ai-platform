import { and, count, desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { auditEvents, products, recipes } from "../../../db/schema";
import { platformErrorResponse, requirePlatformUser, stableId } from "../../../lib/platform";

const PHARMA_FAMILY = "Pharmaceutical products";
const MAX_PHARMA_TYPES = 100;

export async function GET() {
  try {
    const user = await requirePlatformUser();
    const rows = await getDb().select({
      productId: products.id, family: products.family, sku: products.sku, variant: products.variant,
      productStatus: products.status, attributesJson: products.attributesJson,
      recipeId: recipes.id, recipeName: recipes.name, taskType: recipes.taskType, recipeStatus: recipes.status,
      cameraProfile: recipes.cameraProfile, activeModelId: recipes.activeModelId, updatedAt: recipes.updatedAt,
    }).from(products).innerJoin(recipes, eq(recipes.productId, products.id))
      .where(eq(products.organizationId, user.organizationId)).orderBy(desc(recipes.updatedAt)).limit(500);
    return Response.json({ catalog: rows, limits: { pharmaTypes: MAX_PHARMA_TYPES } });
  } catch (error) { return platformErrorResponse(error); }
}

export async function POST(request: Request) {
  try {
    const user = await requirePlatformUser(["admin", "ml_engineer", "quality_engineer"]);
    const payload = await request.json() as { sku?: string; variant?: string; dosage?: string; shape?: string; color?: string; imprint?: string; packageLayout?: string };
    const sku = payload.sku?.trim().slice(0, 80) ?? "";
    const variant = payload.variant?.trim().slice(0, 120) ?? "";
    if (!sku || !variant) return Response.json({ error: "Medicine SKU and variant name are required" }, { status: 400 });
    const db = getDb();
    const [usage] = await db.select({ value: count() }).from(products).where(and(eq(products.organizationId, user.organizationId), eq(products.family, PHARMA_FAMILY)));
    if ((usage?.value ?? 0) >= MAX_PHARMA_TYPES) return Response.json({ error: `The current catalog limit is ${MAX_PHARMA_TYPES} pharmaceutical types` }, { status: 409 });
    const key = await stableId(`${user.organizationId}:${sku.toLowerCase()}:${variant.toLowerCase()}`);
    const productId = `product_pharma_${key}`;
    const recipeId = `recipe_pharma_${key}`;
    const existing = await db.select({ id: products.id }).from(products).where(and(eq(products.organizationId, user.organizationId), eq(products.sku, sku), eq(products.variant, variant))).limit(1);
    if (existing.length) return Response.json({ error: "This medicine SKU and variant is already enrolled" }, { status: 409 });
    const attributes = { dosage: payload.dosage?.trim() || null, shape: payload.shape?.trim() || null, color: payload.color?.trim() || null, imprint: payload.imprint?.trim() || null, packageLayout: payload.packageLayout?.trim() || null, productionApproved: false };
    const product = { id: productId, organizationId: user.organizationId, family: PHARMA_FAMILY, sku, variant, status: "enrolling" as const, attributesJson: JSON.stringify(attributes) };
    const recipe = { id: recipeId, organizationId: user.organizationId, productId, name: `${variant} visual inspection`, taskType: "hybrid" as const, cameraProfile: "calibration-required", status: "draft" as const };
    await db.batch([
      db.insert(products).values(product), db.insert(recipes).values(recipe),
      db.insert(auditEvents).values({ id: crypto.randomUUID(), organizationId: user.organizationId, actorEmail: user.email, action: "pharma.product_enrolled", entityType: "product", entityId: productId, detailJson: JSON.stringify({ sku, variant, recipeId, attributes }) }),
    ]);
    return Response.json({ catalogItem: { ...product, ...recipe, productId, recipeId, productStatus: product.status, recipeStatus: recipe.status }, capacity: { used: (usage?.value ?? 0) + 1, limit: MAX_PHARMA_TYPES } }, { status: 201 });
  } catch (error) { return platformErrorResponse(error); }
}
