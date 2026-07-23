"""Train and evaluate the ForgeSight metal-nut anomaly model.

The training split contains only acceptable parts. Test images include unseen
acceptable parts and four anomaly types with pixel-level masks.
"""

from __future__ import annotations

import json
from pathlib import Path

from anomalib.data import MVTecAD
from anomalib.engine import Engine
from anomalib.models import Patchcore


ROOT = Path(__file__).resolve().parents[1]
DATA_ROOT = ROOT / "work" / "model" / "data"
OUTPUT_ROOT = ROOT / "model" / "artifacts"


def main() -> None:
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    data = MVTecAD(
        root=DATA_ROOT,
        category="metal_nut",
        train_batch_size=8,
        eval_batch_size=8,
        num_workers=0,
    )
    model = Patchcore(
        backbone="resnet18",
        layers=["layer2", "layer3"],
        coreset_sampling_ratio=0.05,
        num_neighbors=6,
    )
    engine = Engine(
        accelerator="cpu",
        devices=1,
        max_epochs=1,
        default_root_dir=OUTPUT_ROOT,
        logger=False,
    )
    engine.fit(model=model, datamodule=data)
    results = engine.test(model=model, datamodule=data)
    checkpoint = engine.checkpoint_callback.best_model_path
    summary = {
        "model": "PatchCore",
        "backbone": "ResNet-18",
        "category": "metal_nut",
        "training_images": 220,
        "test_images": 115,
        "checkpoint": checkpoint,
        "metrics": results[0] if results else {},
    }
    (OUTPUT_ROOT / "evaluation.json").write_text(json.dumps(summary, indent=2, default=str))
    print(json.dumps(summary, indent=2, default=str))


if __name__ == "__main__":
    main()
