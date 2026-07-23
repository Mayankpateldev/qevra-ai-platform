import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
};

export const organizations = sqliteTable("organizations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  ...timestamps,
}, table => [uniqueIndex("organizations_slug_uq").on(table.slug)]);

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organizations.id),
  email: text("email").notNull(),
  displayName: text("display_name").notNull(),
  role: text("role", { enum: ["admin", "ml_engineer", "quality_engineer", "operator", "reviewer"] }).notNull().default("reviewer"),
  ...timestamps,
}, table => [uniqueIndex("users_org_email_uq").on(table.organizationId, table.email)]);

export const products = sqliteTable("products", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organizations.id),
  family: text("family").notNull(),
  sku: text("sku").notNull(),
  variant: text("variant").notNull(),
  status: text("status", { enum: ["draft", "enrolling", "validated", "retired"] }).notNull().default("draft"),
  attributesJson: text("attributes_json").notNull().default("{}"),
  ...timestamps,
}, table => [uniqueIndex("products_org_sku_variant_uq").on(table.organizationId, table.sku, table.variant)]);

export const recipes = sqliteTable("recipes", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organizations.id),
  productId: text("product_id").notNull().references(() => products.id),
  name: text("name").notNull(),
  taskType: text("task_type", { enum: ["anomaly", "classification", "detection", "segmentation", "ocr", "hybrid"] }).notNull(),
  cameraProfile: text("camera_profile").notNull().default("unassigned"),
  status: text("status", { enum: ["draft", "training", "validation", "approved", "deployed", "retired"] }).notNull().default("draft"),
  activeModelId: text("active_model_id"),
  ...timestamps,
}, table => [index("recipes_product_idx").on(table.productId)]);

export const datasets = sqliteTable("datasets", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organizations.id),
  recipeId: text("recipe_id").notNull().references(() => recipes.id),
  name: text("name").notNull(),
  status: text("status", { enum: ["collecting", "labeling", "ready", "frozen", "archived"] }).notNull().default("collecting"),
  imageCount: integer("image_count").notNull().default(0),
  byteCount: integer("byte_count").notNull().default(0),
  ...timestamps,
}, table => [index("datasets_recipe_idx").on(table.recipeId)]);

export const datasetAssets = sqliteTable("dataset_assets", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organizations.id),
  datasetId: text("dataset_id").notNull().references(() => datasets.id),
  objectKey: text("object_key").notNull(),
  filename: text("filename").notNull(),
  contentType: text("content_type").notNull(),
  byteSize: integer("byte_size").notNull(),
  checksum: text("checksum").notNull(),
  label: text("label"),
  split: text("split", { enum: ["unassigned", "train", "dev", "test"] }).notNull().default("unassigned"),
  metadataJson: text("metadata_json").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, table => [uniqueIndex("dataset_assets_dataset_checksum_uq").on(table.datasetId, table.checksum), index("dataset_assets_dataset_idx").on(table.datasetId)]);

export const datasetSnapshots = sqliteTable("dataset_snapshots", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organizations.id),
  datasetId: text("dataset_id").notNull().references(() => datasets.id),
  version: integer("version").notNull(),
  name: text("name").notNull(),
  manifestObjectKey: text("manifest_object_key").notNull(),
  imageCount: integer("image_count").notNull(),
  labelSummaryJson: text("label_summary_json").notNull().default("{}"),
  splitSummaryJson: text("split_summary_json").notNull().default("{}"),
  createdBy: text("created_by").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, table => [uniqueIndex("dataset_snapshots_version_uq").on(table.datasetId, table.version)]);

export const trainingJobs = sqliteTable("training_jobs", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organizations.id),
  recipeId: text("recipe_id").notNull().references(() => recipes.id),
  snapshotId: text("snapshot_id").notNull().references(() => datasetSnapshots.id),
  requestedBy: text("requested_by").notNull(),
  providerJobId: text("provider_job_id"),
  status: text("status", { enum: ["provider_required", "queued", "running", "evaluating", "completed", "failed", "cancelled"] }).notNull().default("provider_required"),
  configJson: text("config_json").notNull().default("{}"),
  metricsJson: text("metrics_json").notNull().default("{}"),
  failureMessage: text("failure_message"),
  startedAt: text("started_at"),
  completedAt: text("completed_at"),
  ...timestamps,
}, table => [index("training_jobs_recipe_idx").on(table.recipeId), index("training_jobs_status_idx").on(table.status)]);

export const models = sqliteTable("models", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organizations.id),
  recipeId: text("recipe_id").notNull().references(() => recipes.id),
  trainingJobId: text("training_job_id").notNull().references(() => trainingJobs.id),
  version: integer("version").notNull(),
  status: text("status", { enum: ["candidate", "approved", "deployed", "rejected", "retired"] }).notNull().default("candidate"),
  artifactObjectKey: text("artifact_object_key").notNull(),
  metricsJson: text("metrics_json").notNull().default("{}"),
  approvedBy: text("approved_by"),
  approvedAt: text("approved_at"),
  ...timestamps,
}, table => [uniqueIndex("models_recipe_version_uq").on(table.recipeId, table.version)]);

export const deployments = sqliteTable("deployments", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organizations.id),
  modelId: text("model_id").notNull().references(() => models.id),
  stationId: text("station_id").notNull(),
  environment: text("environment", { enum: ["shadow", "staging", "production"] }).notNull().default("shadow"),
  status: text("status", { enum: ["pending", "deploying", "healthy", "degraded", "failed", "rolled_back"] }).notNull().default("pending"),
  deployedBy: text("deployed_by").notNull(),
  deployedAt: text("deployed_at"),
  ...timestamps,
}, table => [index("deployments_station_idx").on(table.stationId)]);

export const inspections = sqliteTable("inspections", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organizations.id),
  recipeId: text("recipe_id").notNull(),
  modelId: text("model_id"),
  stationId: text("station_id").notNull().default("browser-station"),
  serialNumber: text("serial_number"),
  batchNumber: text("batch_number"),
  source: text("source", { enum: ["upload", "camera", "api", "benchmark"] }).notNull(),
  modelDecision: text("model_decision", { enum: ["normal", "anomaly", "unknown_product", "error"] }).notNull(),
  finalDisposition: text("final_disposition", { enum: ["pending", "accepted", "rejected", "held"] }).notNull().default("pending"),
  anomalyScore: real("anomaly_score"),
  latencyMs: real("latency_ms"),
  imageObjectKey: text("image_object_key"),
  heatmapObjectKey: text("heatmap_object_key"),
  metadataJson: text("metadata_json").notNull().default("{}"),
  inspectedAt: text("inspected_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, table => [index("inspections_org_time_idx").on(table.organizationId, table.inspectedAt), index("inspections_recipe_idx").on(table.recipeId)]);

export const reviews = sqliteTable("reviews", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organizations.id),
  inspectionId: text("inspection_id").notNull().references(() => inspections.id),
  reviewerEmail: text("reviewer_email").notNull(),
  disposition: text("disposition", { enum: ["accepted", "rejected", "retraining_candidate"] }).notNull(),
  comment: text("comment").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, table => [index("reviews_inspection_idx").on(table.inspectionId)]);

export const auditEvents = sqliteTable("audit_events", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organizations.id),
  actorEmail: text("actor_email").notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  detailJson: text("detail_json").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, table => [index("audit_org_time_idx").on(table.organizationId, table.createdAt)]);
