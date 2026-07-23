import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const modelRoot = dirname(fileURLToPath(import.meta.url));
const assetRoot = join(modelRoot, "assets");
const outputRoot = join(modelRoot, "..", "public", "models");
const models = ["bottle", "cable", "pill"];

await mkdir(outputRoot, { recursive: true });

for (const model of models) {
  const prefix = `forgesight-${model}.onnx.part`;
  const parts = (await readdir(assetRoot))
    .filter(file => file.startsWith(prefix))
    .sort();

  if (parts.length === 0) {
    throw new Error(`No source chunks found for ${model}`);
  }

  const buffers = await Promise.all(parts.map(part => readFile(join(assetRoot, part))));
  await writeFile(join(outputRoot, `forgesight-${model}.onnx`), Buffer.concat(buffers));
  console.log(`Assembled ${model} model from ${parts.length} source chunks.`);
}
