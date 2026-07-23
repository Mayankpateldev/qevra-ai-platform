import { and, desc, eq, lt, sql } from "drizzle-orm";
import { getDb } from "../../../../db";
import { auditEvents, datasetAssets, datasets } from "../../../../db/schema";
import { platformErrorResponse, qualityDataBucket, requirePlatformUser, stableId } from "../../../../lib/platform";

const MAX_FILE_BYTES = 50 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/tiff"]);

export async function GET(request: Request) {
  try {
    const user = await requirePlatformUser();
    const url = new URL(request.url);
    const datasetId = url.searchParams.get("datasetId")?.trim() ?? "";
    const before = url.searchParams.get("before")?.trim();
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 100), 1), 250);
    if (!datasetId) return Response.json({ error: "datasetId is required" }, { status: 400 });
    const db = getDb();
    const [dataset] = await db.select({ id: datasets.id }).from(datasets).where(and(eq(datasets.id, datasetId), eq(datasets.organizationId, user.organizationId))).limit(1);
    if (!dataset) return Response.json({ error: "Dataset not found" }, { status: 404 });
    const where = before
      ? and(eq(datasetAssets.datasetId, datasetId), eq(datasetAssets.organizationId, user.organizationId), lt(datasetAssets.createdAt, before))
      : and(eq(datasetAssets.datasetId, datasetId), eq(datasetAssets.organizationId, user.organizationId));
    const rows = await db.select().from(datasetAssets).where(where).orderBy(desc(datasetAssets.createdAt)).limit(limit + 1);
    const hasMore = rows.length > limit;
    const assets = rows.slice(0, limit);
    return Response.json({ assets, nextCursor: hasMore ? assets.at(-1)?.createdAt ?? null : null });
  } catch (error) { return platformErrorResponse(error); }
}

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

export async function PATCH(request: Request) {
  try {
    const user = await requirePlatformUser(["admin", "ml_engineer", "quality_engineer"]);
    const payload = await request.json() as { assetId?: string; label?: string; split?: string; metadata?: Record<string, unknown> };
    const assetId = payload.assetId?.trim() ?? "";
    const label = payload.label?.trim().slice(0, 120) ?? "";
    const split = payload.split;
    if (!assetId || !label || !["unassigned", "train", "dev", "test"].includes(String(split))) {
      return Response.json({ error: "assetId, label, and a valid split are required" }, { status: 400 });
    }
    const db = getDb();
    const [asset] = await db.select().from(datasetAssets).where(and(eq(datasetAssets.id, assetId), eq(datasetAssets.organizationId, user.organizationId))).limit(1);
    if (!asset) return Response.json({ error: "Dataset asset not found" }, { status: 404 });
    const [dataset] = await db.select({ status: datasets.status }).from(datasets).where(and(eq(datasets.id, asset.datasetId), eq(datasets.organizationId, user.organizationId))).limit(1);
    if (!dataset || dataset.status === "frozen" || dataset.status === "archived") return Response.json({ error: "Frozen or archived datasets cannot be modified" }, { status: 409 });
    const metadataJson = JSON.stringify({ ...JSON.parse(asset.metadataJson || "{}"), ...(payload.metadata ?? {}), labeledBy: user.email });
    await db.batch([
      db.update(datasetAssets).set({ label, split: split as "unassigned" | "train" | "dev" | "test", metadataJson }).where(and(eq(datasetAssets.id, assetId), eq(datasetAssets.organizationId, user.organizationId))),
      db.update(datasets).set({ status: "labeling", updatedAt: new Date().toISOString() }).where(and(eq(datasets.id, asset.datasetId), eq(datasets.organizationId, user.organizationId))),
      db.insert(auditEvents).values({ id: crypto.randomUUID(), organizationId: user.organizationId, actorEmail: user.email, action: "dataset.asset_labeled", entityType: "dataset_asset", entityId: assetId, detailJson: JSON.stringify({ datasetId: asset.datasetId, label, split }) }),
    ]);
    return Response.json({ asset: { ...asset, label, split, metadataJson } });
  } catch (error) { return platformErrorResponse(error); }
}
