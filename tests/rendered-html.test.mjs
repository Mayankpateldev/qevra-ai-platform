import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the ForgeSight application", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>ForgeSight AI — Quality Intelligence for Modern Factories<\/title>/i);
  assert.match(html, /Launch working POC/);
  assert.match(html, /Measured image AUROC/);
  assert.match(html, /Industries/);
  assert.doesNotMatch(html, /Codex is working|Your site is taking shape/);
});

test("ships every real inference asset used by the scenario selector", async () => {
  await Promise.all([
    "forgesight-metal-nut.onnx",
    "forgesight-bottle.onnx",
    "forgesight-cable.onnx",
  ].map(file => access(new URL(`public/models/${file}`, projectRoot))));

  await Promise.all(Array.from({ length: 7 }, (_, index) =>
    access(new URL(`public/models/forgesight-pill.onnx.part0${index}`, projectRoot))));

  await Promise.all([
    "forgesight-test-data.zip",
    "bottle-test-data.zip",
    "cable-test-data.zip",
    "pill-test-data.zip",
  ].map(file => access(new URL(`public/samples/${file}`, projectRoot))));
});
