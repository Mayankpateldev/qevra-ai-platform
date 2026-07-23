import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../../../../db";
import { auditEvents, datasetAssets, datasets } from "../../../../db/schema";
import { platformErrorResponse, qualityDataBucket, requirePlatformUser, stableId } from "../../../../lib/platform";

const MAX_FILE_BYTES = 50 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/tiff"]);

export async function POST(request: Request) {
  try {
    const user = await requirePlatformUser(["admin", "ml_engineer", "quality_engineer"]);
    const form = await request.formData();
    const datasetId = String(form.get("datasetId") ?? "");
    const files = form.getAll("files").filter((value): value is File => value instanceof File);
    if (!datasetId || files.length === 0) return Response.json({ error: "datasetId and at least one file are required" }, { status: 400 });
    if (files.length > 250) return Response.json({ error: "Upload batches are limited to 250 files; use resumable batches for larger datasets" }, { status: 413 });
    const db = getDb();
    const [dataset] = await db.select().from(datasets).where(and(eq(datasets.id, datasetId), eq(datasets.organizationId, user.organizationId))).limit(1);
    if (!dataset) return Response.json({ error: "Dataset not found" }, { status: 404 });
    const bucket = qualityDataBucket();
    const uploaded: Array<{ id: string; filename: string; checksum: string; duplicate: boolean }> = [];
    for (const file of files) {
      if (!ALLOWED_TYPES.has(file.type) || file.size <= 0 || file.size > MAX_FILE_BYTES) {
        return Response.json({ error: `Unsupported or oversized file: ${file.name}` }, { status: 415 });
      }
      const bytes = await file.arrayBuffer();
      const checksum = await stableId(Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))).map(byte => byte.toString(16).padStart(2, "0")).join(""));
      const [existing] = await db.select({ id: datasetAssets.id }).from(datasetAssets).where(and(eq(datasetAssets.datasetId, datasetId), eq(datasetAssets.checksum, checksum))).limit(1);
      if (existing) { uploaded.push({ id: existing.id, filename: file.name, checksum, duplicate: true }); continue; }
      const id = crypto.randomUUID();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-160);
      const objectKey = `organizations/${user.organizationId}/datasets/${datasetId}/original/${checksum}-${safeName}`;
      await bucket.put(objectKey, bytes, { httpMetadata: { contentType: file.type }, customMetadata: { datasetId, organizationId: user.organizationId, checksum } });
      await db.insert(datasetAssets).values({ id, organizationId: user.organizationId, datasetId, objectKey, filename: file.name.slice(0, 255), contentType: file.type, byteSize: file.size, checksum, metadataJson: JSON.stringify({ uploadedBy: user.email }) });
      await db.update(datasets).set({ imageCount: sql`${datasets.imageCount} + 1`, byteCount: sql`${datasets.byteCount} + ${file.size}`, updatedAt: sql`CURRENT_TIMESTAMP` }).where(eq(datasets.id, datasetId));
      uploaded.push({ id, filename: file.name, checksum, duplicate: false });
    }
    await db.insert(auditEvents).values({ id: crypto.randomUUID(), organizationId: user.organizationId, actorEmail: user.email, action: "dataset.assets_uploaded", entityType: "dataset", entityId: datasetId, detailJson: JSON.stringify({ requested: files.length, created: uploaded.filter(item => !item.duplicate).length }) });
    return Response.json({ assets: uploaded }, { status: 201 });
  } catch (error) { return platformErrorResponse(error); }
}
