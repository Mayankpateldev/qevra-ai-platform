# QEVRA AI production backlog

This file is the delivery source of truth. A capability is **done** only when it
is connected to durable storage, authorization, audit history, automated tests,
and the deployed application. A visible card or local browser state is not done.

## P0 — trustworthy demonstration release

| Capability | Status | Acceptance gate |
| --- | --- | --- |
| QEVRA public identity and responsive landing page | Done | QEVRA branding at desktop/mobile widths |
| New `qevra-ai` Sites address | Done | Public URL resolves and loads |
| Authenticated workspace | In progress | SIWC and configured admin promotion work; user administration remains |
| Connected workspace navigation | Done | Dataset, training, model, station and settings pages preserve view context |
| Real benchmark inference | Partial | Four real ONNX benchmark recipes run; not production-trained |
| Persistent inspections | In progress | Upload/camera results are written to D1 with audit events |
| Persistent reviews | In progress | Accept/reject/retraining decisions survive refresh and preserve the original prediction |
| Traceability history | In progress | Authenticated users can query real inspection records |
| Dataset ingestion | In progress | Browser batch upload, R2 storage and checksums exist; resumable upload remains |
| Dataset labeling and immutable snapshots | In progress | Labeled train/dev/test data passes gates and produces an immutable R2 manifest |
| Training jobs | Partial | Jobs are durable; a GPU provider is still required for execution |
| Pharma product catalog | In progress | Up to 100 medicine types can be enrolled; each still requires recipe-specific data and validation |
| Dimensional measurement | Pending | Requires calibrated camera/depth input, feature extraction and tolerance evidence |
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

## Competitive product gap priorities

Current industrial platforms make upload/label/train/deploy a single guided flow,
freeze dataset snapshots, maintain defect/label definitions, compare model versions,
support cloud and edge delivery, and preserve unit-level traceability. QEVRA's next
parity work is therefore:

1. Guided project onboarding and a quality-plan/defect-book editor.
2. Bulk and assisted labeling with reviewer agreement and leakage detection.
3. Model comparison, threshold calibration, deployment/rollback and drift dashboards.
4. Unit-level correlation of images, measurements, serials, batches and process signals.
5. Calibrated 2D/3D measurement tools with tolerances and measurement-system analysis.

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
