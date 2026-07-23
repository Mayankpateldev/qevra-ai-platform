import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { auditEvents, inspections, reviews } from "../../../db/schema";
import { platformErrorResponse, requirePlatformUser } from "../../../lib/platform";

export async function GET(request: Request) {
  try {
    const user = await requirePlatformUser();
    const url = new URL(request.url);
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 50), 1), 200);
    const rows = await getDb().select().from(reviews).where(eq(reviews.organizationId, user.organizationId)).orderBy(desc(reviews.createdAt)).limit(limit);
    return Response.json({ reviews: rows });
  } catch (error) { return platformErrorResponse(error); }
}

export async function POST(request: Request) {
  try {
    const user = await requirePlatformUser(["admin", "quality_engineer", "operator", "reviewer"]);
    const payload = await request.json() as { inspectionId?: string; disposition?: string; comment?: string };
    const inspectionId = payload.inspectionId?.trim() ?? "";
    const disposition = payload.disposition;
    if (!inspectionId || !["accepted", "rejected", "retraining_candidate"].includes(String(disposition))) {
      return Response.json({ error: "inspectionId and a valid disposition are required" }, { status: 400 });
    }

    const db = getDb();
    const [inspection] = await db.select().from(inspections).where(and(eq(inspections.id, inspectionId), eq(inspections.organizationId, user.organizationId))).limit(1);
    if (!inspection) return Response.json({ error: "Inspection not found" }, { status: 404 });

    const id = crypto.randomUUID();
    const row = {
      id,
      organizationId: user.organizationId,
      inspectionId,
      reviewerEmail: user.email,
      disposition: disposition as "accepted" | "rejected" | "retraining_candidate",
      comment: payload.comment?.trim().slice(0, 2000) ?? "",
    };
    const finalDisposition = disposition === "accepted" ? "accepted" as const : disposition === "rejected" ? "rejected" as const : inspection.finalDisposition;
    await db.batch([
      db.insert(reviews).values(row),
      db.update(inspections).set({ finalDisposition }).where(and(eq(inspections.id, inspectionId), eq(inspections.organizationId, user.organizationId))),
      db.insert(auditEvents).values({
        id: crypto.randomUUID(), organizationId: user.organizationId, actorEmail: user.email,
        action: "inspection.reviewed", entityType: "inspection", entityId: inspectionId,
        detailJson: JSON.stringify({ reviewId: id, disposition, originalModelDecision: inspection.modelDecision }),
      }),
    ]);
    return Response.json({ review: row, finalDisposition }, { status: 201 });
  } catch (error) { return platformErrorResponse(error); }
}
