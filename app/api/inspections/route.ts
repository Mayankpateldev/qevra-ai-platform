import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { auditEvents, inspections } from "../../../db/schema";
import { platformErrorResponse, requirePlatformUser } from "../../../lib/platform";

export async function GET(request: Request) {
  try {
    const user = await requirePlatformUser();
    const url = new URL(request.url);
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 50), 1), 200);
    const recipeId = url.searchParams.get("recipeId");
    const where = recipeId
      ? and(eq(inspections.organizationId, user.organizationId), eq(inspections.recipeId, recipeId))
      : eq(inspections.organizationId, user.organizationId);
    const rows = await getDb().select().from(inspections).where(where).orderBy(desc(inspections.inspectedAt)).limit(limit);
    return Response.json({ inspections: rows });
  } catch (error) { return platformErrorResponse(error); }
}

export async function POST(request: Request) {
  try {
    const user = await requirePlatformUser(["admin", "ml_engineer", "quality_engineer", "operator"]);
    const payload = await request.json() as Record<string, unknown>;
    const recipeId = typeof payload.recipeId === "string" ? payload.recipeId : "";
    const source = payload.source;
    const modelDecision = payload.modelDecision;
    if (!recipeId || !["upload", "camera", "api", "benchmark"].includes(String(source)) || !["normal", "anomaly", "unknown_product", "error"].includes(String(modelDecision))) {
      return Response.json({ error: "recipeId, valid source, and valid modelDecision are required" }, { status: 400 });
    }
    const id = crypto.randomUUID();
    const row = {
      id,
      organizationId: user.organizationId,
      recipeId,
      modelId: typeof payload.modelId === "string" ? payload.modelId : null,
      stationId: typeof payload.stationId === "string" ? payload.stationId : "browser-station",
      serialNumber: typeof payload.serialNumber === "string" ? payload.serialNumber.slice(0, 128) : null,
      batchNumber: typeof payload.batchNumber === "string" ? payload.batchNumber.slice(0, 128) : null,
      source: source as "upload" | "camera" | "api" | "benchmark",
      modelDecision: modelDecision as "normal" | "anomaly" | "unknown_product" | "error",
      finalDisposition: modelDecision === "normal" ? "accepted" as const : "pending" as const,
      anomalyScore: typeof payload.anomalyScore === "number" && Number.isFinite(payload.anomalyScore) ? payload.anomalyScore : null,
      latencyMs: typeof payload.latencyMs === "number" && Number.isFinite(payload.latencyMs) ? payload.latencyMs : null,
      metadataJson: JSON.stringify(typeof payload.metadata === "object" && payload.metadata ? payload.metadata : {}),
    };
    const db = getDb();
    await db.batch([
      db.insert(inspections).values(row),
      db.insert(auditEvents).values({ id: crypto.randomUUID(), organizationId: user.organizationId, actorEmail: user.email, action: "inspection.created", entityType: "inspection", entityId: id, detailJson: JSON.stringify({ recipeId, source }) }),
    ]);
    return Response.json({ inspection: row }, { status: 201 });
  } catch (error) { return platformErrorResponse(error); }
}
