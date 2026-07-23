"""Compact the PatchCore memory bank for browser delivery.

The exported graph stores the learned memory bank twice (normal and
transposed). This keeps an evenly spaced trained subset and updates both
initializers consistently without changing the feature extractor.
"""

from pathlib import Path

import numpy as np
import onnx
from onnx import numpy_helper


ROOT = Path(__file__).resolve().parents[1]
MODEL = ROOT / "public" / "models" / "forgesight-metal-nut.onnx"
TARGET_ROWS = 2048


def main() -> None:
    graph = onnx.load(MODEL)
    initializers = {item.name: item for item in graph.graph.initializer}
    bank_item = initializers["model.memory_bank"]
    transpose_item = initializers["onnx::MatMul_481"]
    bank = numpy_helper.to_array(bank_item)
    indices = np.linspace(0, len(bank) - 1, TARGET_ROWS, dtype=np.int64)
    compact_bank = bank[indices]

    bank_item.CopyFrom(numpy_helper.from_array(compact_bank, bank_item.name))
    transpose_item.CopyFrom(
        numpy_helper.from_array(compact_bank.T.copy(), transpose_item.name)
    )
    onnx.checker.check_model(graph)
    onnx.save(graph, MODEL)
    print(f"Compacted memory bank: {len(bank)} -> {len(compact_bank)} vectors")


if __name__ == "__main__":
    main()
