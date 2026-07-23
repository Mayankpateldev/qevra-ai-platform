import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { auditEvents, models, recipes } from "../../../db/schema";
import { platformErrorResponse, requirePlatformUser } from "../../../lib/platform";

export async function GET(request: Request) {
  try {
    const user = await requirePlatformUser();
    const recipeId = new URL(request.url).searchParams.get("recipeId");
    const where = recipeId
      ? and(eq(models.organizationId, user.organizationId), eq(models.recipeId, recipeId))
      : eq(models.organizationId, user.organizationId);
    const rows = await getDb().select().from(models).where(where).orderBy(desc(models.createdAt)).limit(200);
    return Response.json({ models: rows });
  } catch (error) { return platformErrorResponse(error); }
}

export async function PATCH(request: Request) {
  try {
    const user = await requirePlatformUser(["admin", "quality_engineer"]);
    const payload = await request.json() as { modelId?: string; action?: string; comment?: string };
    const modelId = payload.modelId?.trim() ?? "";
    const action = payload.action;
    if (!modelId || !["approve", "reject", "retire"].includes(String(action))) return Response.json({ error: "modelId and a valid action are required" }, { status: 400 });
    const db = getDb();
    const [model] = await db.select().from(models).where(and(eq(models.id, modelId), eq(models.organizationId, user.organizationId))).limit(1);
    if (!model) return Response.json({ error: "Model not found" }, { status: 404 });
    if (action === "approve" && model.status !== "candidate") return Response.json({ error: "Only candidate models can be approved" }, { status: 409 });
    if (action === "reject" && model.status !== "candidate") return Response.json({ error: "Only candidate models can be rejected" }, { status: 409 });
    if (action === "retire" && !["approved", "deployed"].includes(model.status)) return Response.json({ error: "Only approved or deployed models can be retired" }, { status: 409 });
    const status = action === "approve" ? "approved" as const : action === "reject" ? "rejected" as const : "retired" as const;
    const approval = action === "approve" ? { approvedBy: user.email, approvedAt: new Date().toISOString() } : {};
    await db.batch([
      db.update(models).set({ status, ...approval, updatedAt: new Date().toISOString() }).where(and(eq(models.id, modelId), eq(models.organizationId, user.organizationId))),
      ...(action === "retire" ? [db.update(recipes).set({ activeModelId: null, status: "retired", updatedAt: new Date().toISOString() }).where(and(eq(recipes.id, model.recipeId), eq(recipes.activeModelId, modelId), eq(recipes.organizationId, user.organizationId)))] : []),
      db.insert(auditEvents).values({ id: crypto.randomUUID(), organizationId: user.organizationId, actorEmail: user.email, action: `model.${action}d`, entityType: "model", entityId: modelId, detailJson: JSON.stringify({ previousStatus: model.status, status, comment: payload.comment?.trim().slice(0, 2000) ?? "" }) }),
    ]);
    return Response.json({ model: { ...model, status, ...approval } });
  } catch (error) { return platformErrorResponse(error); }
}
