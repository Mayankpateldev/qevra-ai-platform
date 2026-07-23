"""Train, evaluate, and export one real MVTec industrial scenario."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from anomalib.data import MVTecAD
from anomalib.deploy import ExportType
from anomalib.engine import Engine
from anomalib.models import Patchcore


WORK_ROOT = Path("/private/tmp/forgesight-model-work")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("category", choices=["bottle", "cable", "pill", "hazelnut"])
    args = parser.parse_args()

    output = WORK_ROOT / "scenarios" / args.category
    data = MVTecAD(
        root=WORK_ROOT / "data",
        category=args.category,
        train_batch_size=8,
        eval_batch_size=8,
        num_workers=0,
    )
    model = Patchcore(
        backbone="resnet18",
        layers=["layer2", "layer3"],
        coreset_sampling_ratio=0.02,
        num_neighbors=6,
    )
    engine = Engine(
        accelerator="cpu",
        devices=1,
        max_epochs=1,
        default_root_dir=output,
        logger=False,
    )
    engine.fit(model=model, datamodule=data)
    results = engine.test(model=model, datamodule=data)
    checkpoint = engine.checkpoint_callback.best_model_path
    exported = engine.export(
        model=model,
        ckpt_path=checkpoint,
        export_type=ExportType.ONNX,
        export_root=output / "export",
        input_size=(256, 256),
    )
    summary = {
        "category": args.category,
        "checkpoint": checkpoint,
        "onnx": str(exported),
        "metrics": results[0] if results else {},
    }
    (output / "evaluation.json").write_text(
        json.dumps(summary, indent=2, default=str)
    )
    print(json.dumps(summary, indent=2, default=str))


if __name__ == "__main__":
    main()
