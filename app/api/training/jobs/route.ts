import { and, desc, eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "../../../../db";
import { auditEvents, datasetSnapshots, recipes, trainingJobs } from "../../../../db/schema";
import { platformErrorResponse, requirePlatformUser } from "../../../../lib/platform";

export async function GET() {
  try {
    const user = await requirePlatformUser();
    const rows = await getDb().select().from(trainingJobs).where(eq(trainingJobs.organizationId, user.organizationId)).orderBy(desc(trainingJobs.createdAt)).limit(100);
    return Response.json({ jobs: rows });
  } catch (error) { return platformErrorResponse(error); }
}

export async function POST(request: Request) {
  try {
    const user = await requirePlatformUser(["admin", "ml_engineer"]);
    const payload = await request.json() as { recipeId?: string; snapshotId?: string; config?: Record<string, unknown> };
    const recipeId = payload.recipeId?.trim() ?? "";
    const snapshotId = payload.snapshotId?.trim() ?? "";
    if (!recipeId || !snapshotId) return Response.json({ error: "recipeId and immutable snapshotId are required" }, { status: 400 });
    const db = getDb();
    const [recipe] = await db.select({ id: recipes.id }).from(recipes).where(and(eq(recipes.id, recipeId), eq(recipes.organizationId, user.organizationId))).limit(1);
    const [snapshot] = await db.select({ id: datasetSnapshots.id }).from(datasetSnapshots).where(and(eq(datasetSnapshots.id, snapshotId), eq(datasetSnapshots.organizationId, user.organizationId))).limit(1);
    if (!recipe || !snapshot) return Response.json({ error: "Recipe or immutable dataset snapshot not found" }, { status: 404 });
    const runtime = env as unknown as { TRAINING_API_URL?: string; TRAINING_API_TOKEN?: string };
    const id = crypto.randomUUID();
    let status: "provider_required" | "queued" = "provider_required";
    let providerJobId: string | null = null;
    if (runtime.TRAINING_API_URL) {
      const response = await fetch(`${runtime.TRAINING_API_URL.replace(/\/$/, "")}/jobs`, { method: "POST", headers: { "content-type": "application/json", ...(runtime.TRAINING_API_TOKEN ? { authorization: `Bearer ${runtime.TRAINING_API_TOKEN}` } : {}) }, body: JSON.stringify({ clientJobId: id, organizationId: user.organizationId, recipeId, snapshotId, config: payload.config ?? {} }) });
      if (!response.ok) return Response.json({ error: `Training provider rejected the job (${response.status})` }, { status: 502 });
      const provider = await response.json() as { id?: string };
      if (!provider.id) return Response.json({ error: "Training provider returned no job id" }, { status: 502 });
      providerJobId = provider.id;
      status = "queued";
    }
    const row = { id, organizationId: user.organizationId, recipeId, snapshotId, requestedBy: user.email, providerJobId, status, configJson: JSON.stringify(payload.config ?? {}) };
    await db.batch([
      db.insert(trainingJobs).values(row),
      db.insert(auditEvents).values({ id: crypto.randomUUID(), organizationId: user.organizationId, actorEmail: user.email, action: "training.requested", entityType: "training_job", entityId: id, detailJson: JSON.stringify({ recipeId, snapshotId, providerConfigured: Boolean(runtime.TRAINING_API_URL) }) }),
    ]);
    return Response.json({ job: row, message: status === "provider_required" ? "Job recorded, but GPU training provider configuration is required before execution" : "Training job queued" }, { status: 201 });
  } catch (error) { return platformErrorResponse(error); }
}
