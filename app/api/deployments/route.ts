import { and, desc, eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "../../../db";
import { auditEvents, deployments, models, recipes } from "../../../db/schema";
import { platformErrorResponse, requirePlatformUser } from "../../../lib/platform";

export async function GET(request: Request) {
  try {
    const user = await requirePlatformUser();
    const stationId = new URL(request.url).searchParams.get("stationId");
    const where = stationId
      ? and(eq(deployments.organizationId, user.organizationId), eq(deployments.stationId, stationId))
      : eq(deployments.organizationId, user.organizationId);
    const rows = await getDb().select().from(deployments).where(where).orderBy(desc(deployments.createdAt)).limit(200);
    return Response.json({ deployments: rows });
  } catch (error) { return platformErrorResponse(error); }
}

export async function POST(request: Request) {
  try {
    const user = await requirePlatformUser(["admin", "ml_engineer", "quality_engineer"]);
    const payload = await request.json() as { modelId?: string; stationId?: string; environment?: string };
    const modelId = payload.modelId?.trim() ?? "";
    const stationId = payload.stationId?.trim().slice(0, 128) ?? "";
    const environment = payload.environment ?? "shadow";
    if (!modelId || !stationId || !["shadow", "staging", "production"].includes(environment)) return Response.json({ error: "modelId, stationId, and a valid environment are required" }, { status: 400 });
    const db = getDb();
    const [model] = await db.select().from(models).where(and(eq(models.id, modelId), eq(models.organizationId, user.organizationId))).limit(1);
    if (!model) return Response.json({ error: "Model not found" }, { status: 404 });
    if (model.status !== "approved") return Response.json({ error: "Only an approved model can be deployed" }, { status: 409 });

    const runtime = env as unknown as { EDGE_DEPLOYMENT_API_URL?: string; EDGE_DEPLOYMENT_API_TOKEN?: string };
    if (!runtime.EDGE_DEPLOYMENT_API_URL) return Response.json({ error: "Edge deployment provider is not configured; no deployment was created" }, { status: 503 });
    const id = crypto.randomUUID();
    const providerResponse = await fetch(`${runtime.EDGE_DEPLOYMENT_API_URL.replace(/\/$/, "")}/deployments`, {
      method: "POST",
      headers: { "content-type": "application/json", ...(runtime.EDGE_DEPLOYMENT_API_TOKEN ? { authorization: `Bearer ${runtime.EDGE_DEPLOYMENT_API_TOKEN}` } : {}) },
      body: JSON.stringify({ clientDeploymentId: id, organizationId: user.organizationId, modelId, recipeId: model.recipeId, artifactObjectKey: model.artifactObjectKey, stationId, environment }),
    });
    if (!providerResponse.ok) return Response.json({ error: `Edge provider rejected deployment (${providerResponse.status})` }, { status: 502 });

    const row = { id, organizationId: user.organizationId, modelId, stationId, environment: environment as "shadow" | "staging" | "production", status: "deploying" as const, deployedBy: user.email };
    await db.batch([
      db.insert(deployments).values(row),
      db.update(models).set({ status: "deployed", updatedAt: new Date().toISOString() }).where(and(eq(models.id, modelId), eq(models.organizationId, user.organizationId))),
      db.update(recipes).set({ activeModelId: modelId, status: "deployed", updatedAt: new Date().toISOString() }).where(and(eq(recipes.id, model.recipeId), eq(recipes.organizationId, user.organizationId))),
      db.insert(auditEvents).values({ id: crypto.randomUUID(), organizationId: user.organizationId, actorEmail: user.email, action: "model.deployment_requested", entityType: "deployment", entityId: id, detailJson: JSON.stringify({ modelId, stationId, environment }) }),
    ]);
    return Response.json({ deployment: row, message: "Deployment accepted by the configured edge provider" }, { status: 201 });
  } catch (error) { return platformErrorResponse(error); }
}
