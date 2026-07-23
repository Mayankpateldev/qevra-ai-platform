# QEVRA AI production backlog

This file is the delivery source of truth. A capability is **done** only when it
is connected to durable storage, authorization, audit history, automated tests,
and the deployed application. A visible card or local browser state is not done.

## P0 — trustworthy demonstration release

| Capability | Status | Acceptance gate |
| --- | --- | --- |
| QEVRA public identity and responsive landing page | Done | QEVRA branding at desktop/mobile widths |
| New `qevra-ai` Sites address | In progress | Public URL resolves and loads |
| Authenticated workspace | Partial | SIWC works; user and role administration remain |
| Real benchmark inference | Partial | Four real ONNX benchmark recipes run; not production-trained |
| Persistent inspections | In progress | Upload/camera results are written to D1 with audit events |
| Persistent reviews | In progress | Accept/reject/retraining decisions survive refresh and preserve the original prediction |
| Traceability history | In progress | Authenticated users can query real inspection records |
| Dataset ingestion | Partial | R2 uploads and checksums exist; browser dataset manager and resumable upload UX remain |
| Dataset labeling and immutable snapshots | In progress | Labeled train/dev/test data passes gates and produces an immutable R2 manifest |
| Training jobs | Partial | Jobs are durable; a GPU provider is still required for execution |
| Demonstration seed data | Pending | Reproducible organization, users, products, recipes, inspections and reviews |
| E2E tests | Pending | Login, upload, inference, review, history and training-request journeys |

## P1 — governed model lifecycle

- Dataset explorer, bulk metadata editing, duplicate/leakage checks and quality reports.
- Resumable 10,000+ image upload sessions with retry and checksum reconciliation.
- GPU training provider, job polling/webhooks, logs, cancellation and failure recovery.
- Evaluation comparison, threshold calibration and quality-plan sign-off.
- Candidate approval, deployment, rollback and immutable artifact checksums.
- User administration and server-enforced admin, ML engineer, quality engineer,
  operator and reviewer roles.
- Product, variant, recipe, plant, line, station, camera and lighting profiles.

## P2 — industrial deployment

- Edge runtime with bounded offline queue, idempotent replay and health monitoring.
- Continuous camera inspection with frame throttling, backpressure and line-speed metrics.
- PLC/MES/OPC UA/MQTT integration adapters and serial/batch traceability.
- Drift monitoring, golden-sample checks and scheduled revalidation.
- IoT enclosures, PCB/electronics, cable assemblies, pharma variants, packaging,
  cashew/almond and vegetable inspection recipes.
- 3D/RGB-D/point-cloud ingestion and a separately validated 3D model family.

## P3 — governed intelligence

- SOP, specification, defect-book, CAPA/8D and maintenance-document ingestion.
- Tenant- and role-filtered hybrid retrieval with source revision citations.
- Quality Copilot for investigation drafts, similar-defect retrieval and dataset-readiness plans.
- Human approval and audit events for every agent-proposed mutation or production action.

## Production release gates

- No cross-tenant access and no client-controlled authorization.
- No inference through a recipe for the wrong product or variant.
- No mutable training snapshot and no train/dev/test physical-unit leakage.
- No model promotion without evaluation evidence and human approval.
- No benchmark metric represented as customer production performance.
- No RAG production guidance without traceable sources.
- Load, recovery, security, privacy, retention and rollback tests pass.
