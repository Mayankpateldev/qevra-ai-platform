import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { auditEvents, datasetAssets, datasetSnapshots, datasets } from "../../../../db/schema";
import { platformErrorResponse, qualityDataBucket, requirePlatformUser } from "../../../../lib/platform";

export async function GET(request: Request) {
  try {
    const user = await requirePlatformUser();
    const datasetId = new URL(request.url).searchParams.get("datasetId");
    const where = datasetId
      ? and(eq(datasetSnapshots.organizationId, user.organizationId), eq(datasetSnapshots.datasetId, datasetId))
      : eq(datasetSnapshots.organizationId, user.organizationId);
    const rows = await getDb().select().from(datasetSnapshots).where(where).orderBy(desc(datasetSnapshots.createdAt)).limit(200);
    return Response.json({ snapshots: rows });
  } catch (error) { return platformErrorResponse(error); }
}

export async function POST(request: Request) {
  try {
    const user = await requirePlatformUser(["admin", "ml_engineer", "quality_engineer"]);
    const payload = await request.json() as { datasetId?: string; name?: string; minimumImages?: number };
    const datasetId = payload.datasetId?.trim() ?? "";
    const name = payload.name?.trim().slice(0, 120) ?? "";
    const minimumImages = Math.min(Math.max(Math.floor(payload.minimumImages ?? 100), 50), 10000);
    if (!datasetId || !name) return Response.json({ error: "datasetId and snapshot name are required" }, { status: 400 });

    const db = getDb();
    const [dataset] = await db.select().from(datasets).where(and(eq(datasets.id, datasetId), eq(datasets.organizationId, user.organizationId))).limit(1);
    if (!dataset) return Response.json({ error: "Dataset not found" }, { status: 404 });
    if (dataset.status === "archived") return Response.json({ error: "Archived datasets cannot be snapshotted" }, { status: 409 });

    const assets = await db.select({
      id: datasetAssets.id, objectKey: datasetAssets.objectKey, filename: datasetAssets.filename,
      checksum: datasetAssets.checksum, contentType: datasetAssets.contentType, byteSize: datasetAssets.byteSize,
      label: datasetAssets.label, split: datasetAssets.split, metadataJson: datasetAssets.metadataJson,
    }).from(datasetAssets).where(and(eq(datasetAssets.datasetId, datasetId), eq(datasetAssets.organizationId, user.organizationId))).orderBy(datasetAssets.createdAt);

    if (assets.length < minimumImages) return Response.json({ error: `At least ${minimumImages} images are required; dataset currently has ${assets.length}` }, { status: 422 });
    const unassigned = assets.filter(asset => asset.split === "unassigned" || !asset.label);
    if (unassigned.length) return Response.json({ error: `${unassigned.length} images still require both a label and train/dev/test split` }, { status: 422 });
    const trainDefects = assets.filter(asset => asset.split === "train" && !["normal", "good", "acceptable"].includes((asset.label ?? "").toLowerCase()));
    if (trainDefects.length) return Response.json({ error: `${trainDefects.length} anomalous images are assigned to train; anomaly recipes train only on accepted images` }, { status: 422 });
    if (!assets.some(asset => asset.split === "train") || !assets.some(asset => asset.split === "test")) {
      return Response.json({ error: "A snapshot requires non-empty train and test splits" }, { status: 422 });
    }

    const [latest] = await db.select({ version: datasetSnapshots.version }).from(datasetSnapshots).where(eq(datasetSnapshots.datasetId, datasetId)).orderBy(desc(datasetSnapshots.version)).limit(1);
    const version = (latest?.version ?? 0) + 1;
    const id = crypto.randomUUID();
    const labelSummary = assets.reduce<Record<string, number>>((summary, asset) => { const key = asset.label ?? "unlabeled"; summary[key] = (summary[key] ?? 0) + 1; return summary; }, {});
    const splitSummary = assets.reduce<Record<string, number>>((summary, asset) => { summary[asset.split] = (summary[asset.split] ?? 0) + 1; return summary; }, {});
    const manifestObjectKey = `organizations/${user.organizationId}/datasets/${datasetId}/snapshots/v${version}/manifest.json`;
    const manifest = { schemaVersion: 1, snapshotId: id, datasetId, version, createdAt: new Date().toISOString(), createdBy: user.email, imageCount: assets.length, labels: labelSummary, splits: splitSummary, assets };
    await qualityDataBucket().put(manifestObjectKey, JSON.stringify(manifest), { httpMetadata: { contentType: "application/json" }, customMetadata: { organizationId: user.organizationId, datasetId, snapshotId: id } });

    const row = { id, organizationId: user.organizationId, datasetId, version, name, manifestObjectKey, imageCount: assets.length, labelSummaryJson: JSON.stringify(labelSummary), splitSummaryJson: JSON.stringify(splitSummary), createdBy: user.email };
    await db.batch([
      db.insert(datasetSnapshots).values(row),
      db.update(datasets).set({ status: "frozen", updatedAt: new Date().toISOString() }).where(and(eq(datasets.id, datasetId), eq(datasets.organizationId, user.organizationId))),
      db.insert(auditEvents).values({ id: crypto.randomUUID(), organizationId: user.organizationId, actorEmail: user.email, action: "dataset.snapshot_created", entityType: "dataset_snapshot", entityId: id, detailJson: JSON.stringify({ datasetId, version, imageCount: assets.length, labels: labelSummary, splits: splitSummary }) }),
    ]);
    return Response.json({ snapshot: row, qualityGate: { passed: true, minimumImages, labelSummary, splitSummary } }, { status: 201 });
  } catch (error) { return platformErrorResponse(error); }
}
