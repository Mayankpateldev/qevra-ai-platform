"""Export the evaluated ForgeSight PatchCore model to portable ONNX."""

from pathlib import Path

from anomalib.deploy import ExportType
from anomalib.engine import Engine
from anomalib.models import Patchcore


ROOT = Path(__file__).resolve().parents[1]
CHECKPOINT = ROOT / "model" / "artifacts" / "Patchcore" / "MVTecAD" / "metal_nut" / "v0" / "weights" / "lightning" / "model.ckpt"
EXPORT_ROOT = ROOT / "model" / "export"


def main() -> None:
    model = Patchcore(
        backbone="resnet18",
        layers=["layer2", "layer3"],
        coreset_sampling_ratio=0.05,
        num_neighbors=6,
    )
    output = Engine(accelerator="cpu", devices=1, logger=False).export(
        model=model,
        ckpt_path=CHECKPOINT,
        export_type=ExportType.ONNX,
        export_root=EXPORT_ROOT,
        input_size=(256, 256),
    )
    print(output)


if __name__ == "__main__":
    main()
