import { copyFile, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const modelRoot = dirname(fileURLToPath(import.meta.url));
const assetRoot = join(modelRoot, "assets");
const outputRoot = join(modelRoot, "..", "public", "models");
const models = ["bottle", "cable"];

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

const pillParts = (await readdir(assetRoot))
  .filter(file => file.startsWith("forgesight-pill.onnx.part"))
  .sort();

if (pillParts.length === 0) throw new Error("No source chunks found for pill");
await rm(join(outputRoot, "forgesight-pill.onnx"), { force: true });
await Promise.all(pillParts.map(part => copyFile(join(assetRoot, part), join(outputRoot, part))));
console.log(`Prepared pill model as ${pillParts.length} streamable chunks.`);
