import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { auditEvents, datasets, recipes } from "../../../db/schema";
import { platformErrorResponse, requirePlatformUser } from "../../../lib/platform";

export async function GET() {
  try {
    const user = await requirePlatformUser();
    const rows = await getDb().select().from(datasets).where(eq(datasets.organizationId, user.organizationId)).orderBy(desc(datasets.updatedAt));
    return Response.json({ datasets: rows });
  } catch (error) { return platformErrorResponse(error); }
}

export async function POST(request: Request) {
  try {
    const user = await requirePlatformUser(["admin", "ml_engineer", "quality_engineer"]);
    const payload = await request.json() as { recipeId?: string; name?: string };
    const recipeId = payload.recipeId?.trim() ?? "";
    const name = payload.name?.trim().slice(0, 120) ?? "";
    if (!recipeId || !name) return Response.json({ error: "recipeId and name are required" }, { status: 400 });
    const db = getDb();
    const [recipe] = await db.select({ id: recipes.id }).from(recipes).where(and(eq(recipes.id, recipeId), eq(recipes.organizationId, user.organizationId))).limit(1);
    if (!recipe) return Response.json({ error: "Recipe not found" }, { status: 404 });
    const id = crypto.randomUUID();
    const row = { id, organizationId: user.organizationId, recipeId, name, status: "collecting" as const };
    await db.batch([
      db.insert(datasets).values(row),
      db.insert(auditEvents).values({ id: crypto.randomUUID(), organizationId: user.organizationId, actorEmail: user.email, action: "dataset.created", entityType: "dataset", entityId: id, detailJson: JSON.stringify({ recipeId, name }) }),
    ]);
    return Response.json({ dataset: row }, { status: 201 });
  } catch (error) { return platformErrorResponse(error); }
}
