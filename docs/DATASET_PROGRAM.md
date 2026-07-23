# QEVRA AI 10,000+ image data and model program

## Why this is not one mixed model

Industrial anomaly detection learns the acceptable appearance of a defined
product, SKU, camera, fixture and lighting profile. Mixing unrelated pills,
cables, PCBs and nuts into one PatchCore memory bank would blur the recipe
boundary and create unsafe decisions. QEVRA therefore uses two levels:

1. A broad, licensed research corpus for backbone/pretraining experiments and
   regression benchmarking.
2. Separate production recipes trained and validated on customer-owned line data.

## Phase A — licensed 10,000+ research benchmark

The first reproducible corpus is Amazon's VisA dataset: 10,821 images across 12
industrial object classes, including PCBs, capsules and cashew. It contains
9,621 normal and 1,200 anomalous images with image- and pixel-level annotations
and is published under CC BY 4.0.

- Registry: https://registry.opendata.aws/visa/
- Official code/documentation: https://github.com/amazon-research/spot-diff
- Expected archive object: `s3://amazon-visual-anomaly/VisA_20220922.tar`

Additional evaluation-only corpora are catalogued separately because their
licenses and task boundaries differ:

- MVTec AD 2: 8,004 images, advanced lighting and bulk-object scenarios,
  CC BY-NC-SA 4.0; not a commercial production corpus.
- Real-IAD: approximately 150,000 multi-view images across 30 objects; use only
  after the dataset license is approved for the intended environment.
- Real-IAD D3: RGB, pseudo-3D and micrometer-level point clouds for the future
  3D workstream; never route these samples through a 2D recipe.

## Phase B — pilot production corpus

Target at least 10,000 customer-owned images across the initial pilot recipes,
while enforcing per-recipe minimums and coverage:

| Recipe | Accepted training target | Held-out normal | Defect evidence |
| --- | ---: | ---: | ---: |
| IoT/PCB assembly | 2,500 | 400 | 300+ reviewed anomalies |
| Cable assembly | 2,000 | 350 | 250+ reviewed anomalies |
| Pharma pill SKU family | 2,000 | 350 | 250+ per validated variant family |
| Packaging/bottle | 1,500 | 300 | 200+ reviewed anomalies |
| Cashew/almond food inspection | 2,000 | 350 | 250+ reviewed anomalies |

Counts alone are not a release gate. Images must cover shifts, lots, suppliers,
cameras, lighting states, positions, line speeds and normal process variation.

## Mandatory data gates

- SHA-256 duplicate detection before acceptance.
- Product/variant/recipe, physical unit, lot, shift, supplier, station, camera,
  fixture and lighting metadata.
- Train/dev/test grouping by physical unit and capture session to prevent leakage.
- Only quality-approved normal samples in anomaly-model training.
- Defects and ambiguous samples excluded from training and retained for held-out evaluation.
- Immutable manifest and checksums for every training snapshot.
- Pixel masks where localization metrics are claimed.
- Dataset and annotation revision retained with every model artifact.

## Model evaluation

- Compare PatchCore against at least one modern embedding/anomaly baseline.
- Report image AUROC/F1, pixel AUROC/F1 where masks exist, false reject rate,
  false accept rate, latency and memory at the target station hardware.
- Calibrate thresholds from the validation split; never tune on the final test split.
- Evaluate unseen lots, lighting changes, camera replacement and product drift.
- Record failures by defect type and severity, not only a single aggregate score.

## Current blocker to claiming 10,000-image training

The repository has small public benchmark exports and training scripts, but the
10,000+ corpus has not been downloaded, verified or trained in this workspace.
The machine currently lacks the required PyTorch/anomalib environment and does
not have enough free disk for the larger corpora. QEVRA must execute this stage
through the external GPU training provider and R2 snapshot workflow; until a
completed job and evaluation artifact exist, the UI must say `provider required`
or `training`, never `completed`.
