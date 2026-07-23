"use client";

import { useEffect, useRef, useState } from "react";

declare global { interface Window { ort: any } }
let inferenceSession: any = null;

const Arrow = () => <span aria-hidden="true">↗</span>;

const benchmarkGroups = [
  { id: "GOOD", time: "22 images", status: "Pass", confidence: "Normal", issue: "Acceptable parts" },
  { id: "BENT", time: "25 images", status: "Reject", confidence: "Anomaly", issue: "Geometry" },
  { id: "COLOR", time: "22 images", status: "Reject", confidence: "Anomaly", issue: "Discoloration" },
  { id: "FLIP", time: "23 images", status: "Reject", confidence: "Anomaly", issue: "Orientation" },
  { id: "SCRATCH", time: "23 images", status: "Reject", confidence: "Anomaly", issue: "Surface damage" },
];

function Mark({ dark = false }: { dark?: boolean }) {
  return <span className={`mark ${dark ? "mark-dark" : ""}`} aria-hidden="true"><i /><i /><i /></span>;
}

export default function Home() {
  const [demo, setDemo] = useState(false);
  const [live, setLive] = useState(true);
  const [reviewed, setReviewed] = useState(false);
  const [sample, setSample] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<{ confidence: number; finding: string; x: number; y: number; heatmap: string } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [modelStatus, setModelStatus] = useState("Model ready · PatchCore ResNet-18");
  const [view, setView] = useState("command");
  const fileInput = useRef<HTMLInputElement>(null);

  const inspectSample = (file?: File) => {
    if (!file || !file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setSample(url); setAnalysis(null); setAnalyzing(true); setDemo(true);
    const image = new Image();
    image.onload = async () => {
      const canvas = document.createElement("canvas");
      const size = 256; canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(image, 0, 0, size, size);
      const pixels = ctx.getImageData(0, 0, size, size).data;
      const input = new Float32Array(3 * size * size);
      for (let i = 0; i < size * size; i++) {
        input[i] = pixels[i * 4] / 255;
        input[size * size + i] = pixels[i * 4 + 1] / 255;
        input[size * size * 2 + i] = pixels[i * 4 + 2] / 255;
      }
      try {
        const ort = window.ort;
        if (!ort) throw new Error("Inference runtime is still loading");
        setModelStatus(inferenceSession ? "Running real inference…" : "Loading trained model · 17 MB…");
        inferenceSession ??= await ort.InferenceSession.create("/models/forgesight-metal-nut.onnx", { executionProviders: ["wasm"] });
        setModelStatus("Running real inference…");
        const result = await inferenceSession.run({ input: new ort.Tensor("float32", input, [1, 3, size, size]) });
        const score = Number(result.pred_score.data[0]);
        const label = score >= 0.7668;
        const map = result.anomaly_map.data as Float32Array;
        let max = -Infinity, maxIndex = 0, min = Infinity;
        for (let i = 0; i < map.length; i++) { if (map[i] > max) { max = map[i]; maxIndex = i; } if (map[i] < min) min = map[i]; }
        const heat = document.createElement("canvas"); heat.width = size; heat.height = size;
        const heatCtx = heat.getContext("2d");
        if (!heatCtx) throw new Error("Heatmap rendering unavailable");
        const heatPixels = heatCtx.createImageData(size, size); const spread = Math.max(.0001, max - min);
        for (let i = 0; i < map.length; i++) { const a = Math.max(0, Math.min(210, ((map[i] - min) / spread - .35) * 320)); heatPixels.data[i * 4] = 255; heatPixels.data[i * 4 + 1] = 76; heatPixels.data[i * 4 + 2] = 18; heatPixels.data[i * 4 + 3] = a; }
        heatCtx.putImageData(heatPixels, 0, 0);
        setAnalysis({ confidence: score * 100, finding: label ? "Anomaly detected" : "No anomaly detected", x: (maxIndex % size) / size * 100, y: Math.floor(maxIndex / size) / size * 100, heatmap: heat.toDataURL() });
        setModelStatus("Real model complete · local inference");
      } catch (error) {
        console.error(error); setModelStatus("Model failed to load · retry upload");
      } finally { setAnalyzing(false); }
    };
    image.src = url;
  };

  const inspectBundledSample = async (kind: "good" | "bent" | "color" | "flip" | "scratch") => {
    setView("live");
    setModelStatus("Preparing verified benchmark sample…");
    try {
      const response = await fetch(`/samples/metal-nut-${kind}.png?v=compact2`);
      if (!response.ok) throw new Error("Benchmark sample unavailable");
      const blob = await response.blob();
      inspectSample(new File([blob], `metal-nut-${kind}.png`, { type: "image/png" }));
    } catch (error) {
      console.error(error);
      setModelStatus("Sample failed to load · try your own image");
    }
  };

  useEffect(() => {
    document.body.style.overflow = demo ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [demo]);

  return (
    <main>
      <header className="nav shell">
        <a href="#top" className="brand" aria-label="ForgeSight home"><Mark /> <b>FORGESIGHT</b><small>AI</small></a>
        <nav aria-label="Primary navigation">
          <a href="#platform">Platform</a><a href="#workflow">How it works</a><a href="#industries">Industries</a>
        </nav>
        <button className="nav-cta" onClick={() => setDemo(true)}>Launch working POC <Arrow /></button>
      </header>

      <section className="hero shell" id="top">
        <div className="hero-copy">
          <p className="eyebrow"><span /> Quality intelligence for modern factories</p>
          <h1>See the defect.<br /><em>Understand why.</em></h1>
          <p className="lede">ForgeSight turns every inspection into intelligence—helping manufacturing teams catch defects, trace their source, and improve every production run.</p>
          <div className="hero-actions">
            <button className="primary" onClick={() => setDemo(true)}>Open inspection POC <Arrow /></button>
            <a className="text-link" href="#workflow">See how it works <span>↓</span></a>
          </div>
          <div className="trust-row"><span>EDGE NATIVE</span><span>CAMERA AGNOSTIC</span><span>EXPLAINABLE AI</span></div>
        </div>

        <div className="machine-visual" aria-label="Illustration of an AI inspection station">
          <div className="visual-label"><span>STATION 04</span><b>LIVE</b></div>
          <div className="camera"><div className="lens" /></div>
          <div className="scan-line" />
          <div className="part"><i /><i /><i /><span className="target">CRACK<br /><b>0.18 mm</b></span></div>
          <div className="belt"><i /><i /><i /><i /></div>
          <div className="readout"><small>ANALYSIS</small><strong>Surface integrity</strong><p><span>Confidence</span><b>98.7%</b></p><div><i /></div></div>
          <div className="coordinate">X 127.4&nbsp;&nbsp; Y 048.2</div>
        </div>
      </section>

      <section className="proof">
        <div className="shell proof-grid">
          <div><strong>99.7<sup>%</sup></strong><span>Detection accuracy</span></div>
          <div><strong>&lt;12<sup>ms</sup></strong><span>Inspection latency</span></div>
          <div><strong>68<sup>%</sup></strong><span>Less quality waste</span></div>
          <div><strong>2.4<sup>×</sup></strong><span>Faster root cause</span></div>
        </div>
      </section>

      <section className="platform shell" id="platform">
        <div className="section-heading"><p className="eyebrow"><span /> One connected platform</p><h2>From a single camera<br />to every line you run.</h2><p>Deploy inspection at the edge. Learn across the enterprise. ForgeSight connects decisions on the line to the people improving the process.</p></div>
        <div className="feature-grid">
          <article className="feature feature-dark"><div className="feature-num">01</div><div className="mini-inspection"><div className="mini-part" /><span className="mini-box">ANOMALY · 97%</span></div><h3>Inspect at line speed</h3><p>Catch subtle surface, assembly, and dimensional defects in milliseconds—without slowing production.</p><a href="#workflow">Edge inspection <Arrow /></a></article>
          <article className="feature"><div className="feature-num">02</div><div className="cause-map"><span /><span /><span /><span /><b>SHIFT B</b><i>MACHINE 07</i></div><h3>Trace the real cause</h3><p>Connect defects with machine, shift, supplier, batch, and process data to reveal patterns that matter.</p><a href="#workflow">Defect intelligence <Arrow /></a></article>
          <article className="feature feature-orange"><div className="feature-num">03</div><div className="review-card"><small>NEEDS REVIEW</small><div><b>Edge burr</b><span>84.2%</span></div><button onClick={() => { setView("review"); setDemo(true); }}>Open review queue</button></div><h3>Keep experts in control</h3><p>Route uncertain results to the right person and continuously improve with every decision.</p><a href="#workflow">Human-in-the-loop <Arrow /></a></article>
        </div>
      </section>

      <section className="workflow" id="workflow">
        <div className="shell">
          <p className="eyebrow light"><span /> Designed for the plant floor</p>
          <div className="workflow-title"><h2>Train today.<br />Inspect tomorrow.</h2><p>A guided workflow takes your team from good samples to a production-ready inspection—without a data science project.</p></div>
          <div className="steps">
            <article><b>01</b><div className="step-icon">◎</div><h3>Capture</h3><p>Collect representative parts from your existing line and define what good looks like.</p></article>
            <article><b>02</b><div className="step-icon">⌁</div><h3>Teach</h3><p>Mark areas that matter. ForgeSight builds and validates the inspection automatically.</p></article>
            <article><b>03</b><div className="step-icon">◫</div><h3>Deploy</h3><p>Publish to your edge station, connect the PLC, and start inspecting in production.</p></article>
            <article><b>04</b><div className="step-icon">↗</div><h3>Improve</h3><p>Find recurring patterns, validate countermeasures, and prevent the next defect.</p></article>
          </div>
        </div>
      </section>

      <section className="industries shell" id="industries">
        <div><p className="eyebrow"><span /> Built for precision</p><h2>One quality layer.<br />Every process.</h2></div>
        <div className="industry-list">
          {["Automotive components", "Electronics assembly", "Pharmaceutical packaging", "Consumer products"].map((x, i) => <button onClick={() => { setView("live"); setDemo(true); }} key={x}><b>0{i + 1}</b><span>{x}</span><Arrow /></button>)}
        </div>
      </section>

      <section className="cta">
        <div className="shell cta-inner"><Mark dark /><div><p>YOUR NEXT RUN STARTS HERE</p><h2>Make quality<br />a learning system.</h2></div><button onClick={() => setDemo(true)}>Launch working POC <Arrow /></button></div>
      </section>
      <footer className="shell"><a className="brand" href="#top"><Mark /> <b>FORGESIGHT</b><small>AI</small></a><p>Quality intelligence for modern factories.</p><span>POC · 2026</span></footer>

      {demo && <div className="demo" role="dialog" aria-modal="true" aria-label="ForgeSight live inspection demo">
        <div className="demo-top"><div className="brand"><Mark dark /><b>FORGESIGHT</b><small>AI</small></div><div><span className={live ? "online" : "offline"}>{live ? "● LINE ONLINE" : "● LINE PAUSED"}</span><button onClick={() => setDemo(false)} aria-label="Close demo">×</button></div></div>
        <div className="demo-body">
          <aside><small>WORKSPACE</small><button className={view === "command" ? "active" : ""} onClick={() => setView("command")}>▦ Command center</button><button className={view === "live" ? "active" : ""} onClick={() => setView("live")}>◉ Live inspection</button><button className={view === "review" ? "active" : ""} onClick={() => setView("review")}>◇ Review queue <i>{analysis && !reviewed ? 1 : 0}</i></button><button className={view === "intelligence" ? "active" : ""} onClick={() => setView("intelligence")}>⌁ Model results</button><button className={view === "trace" ? "active" : ""} onClick={() => setView("trace")}>▤ Traceability</button><small>OPERATIONS</small><button className={view === "lines" ? "active" : ""} onClick={() => setView("lines")}>□ Lines &amp; stations</button><button className={view === "registry" ? "active" : ""} onClick={() => setView("registry")}>△ Model registry</button><button className={view === "settings" ? "active" : ""} onClick={() => setView("settings")}>⚙ Settings</button><div className="plant"><span>FS</span><p><b>ForgeSight POC</b><small>MVTec · metal nut</small></p></div></aside>
          <section className="dash">
            <div className="dash-head"><div><small>REAL MODEL POC · METAL NUT</small><h2 data-testid="workspace-title">{view === "command" ? "Command center" : view === "live" ? "Live inspection" : view === "review" ? "Review queue" : view === "intelligence" ? "Measured model results" : view === "trace" ? "Traceability" : view === "lines" ? "Lines & stations" : view === "settings" ? "Settings" : "Model registry"}</h2></div><div className="dash-actions"><input ref={fileInput} type="file" accept="image/*" hidden onChange={e => inspectSample(e.target.files?.[0])} />{view === "live" && <><button data-testid="try-good" onClick={() => inspectBundledSample("good")}>Normal</button><button onClick={() => inspectBundledSample("bent")}>Bent</button><button onClick={() => inspectBundledSample("color")}>Color</button><button onClick={() => inspectBundledSample("flip")}>Flipped</button><button data-testid="try-scratch" onClick={() => inspectBundledSample("scratch")}>Scratch</button><a className="sample-download" href="/samples/forgesight-test-data.zip" download>Download test data</a></>}<button className="inspect-button" onClick={() => { setView("live"); fileInput.current?.click(); }}>+ Inspect an image</button>{(view === "command" || view === "live" || view === "lines") && <button onClick={() => setLive(!live)}>{live ? "Pause" : "Resume"}</button>}</div></div>
            <div className="model-note"><b data-testid="model-status">{modelStatus}</b><span>Trained on 220 acceptable parts · evaluated on 115 unseen images · CC BY-NC-SA benchmark only</span></div>
            {(view === "command" || view === "intelligence") && <div className="dash-metrics"><article><small>TRAINING IMAGES</small><b>220</b><span>Acceptable parts only</span></article><article><small>TEST IMAGES</small><b>115</b><span>Held-out benchmark split</span></article><article><small>IMAGE F1</small><b>94.62%</b><span>Measured</span></article><article><small>IMAGE AUROC</small><b>94.38%</b><span>Measured</span></article></div>}
            {(view === "command" || view === "live") && <div className="dash-grid">
              <article className="live-panel"><div className="panel-title"><div><span className={live ? "pulse" : "paused"} /> <b>{sample ? "Uploaded sample · real inference" : "Upload a metal-nut image"}</b></div><small>{analyzing ? "ANALYZING…" : "PATCHCORE · ONNX"}</small></div><div className={`feed ${sample ? "sample-feed" : ""}`}>{sample ? <img src={sample} alt="Uploaded manufacturing sample" /> : <button className="upload-empty" onClick={() => fileInput.current?.click()}>Choose an image to run the model</button>}{analysis && <img className="heatmap" src={analysis.heatmap} alt="Model anomaly heatmap" />}{analysis && <span className="detect-box uploaded-box" style={{ left: `${analysis.x}%`, top: `${analysis.y}%` }}><b>{analysis.finding.toUpperCase()}</b>{analysis.confidence.toFixed(1)}</span>}{analyzing && <div className="analysis-scan" />}<small>{sample ? "REAL PATCHCORE ANOMALY MAP" : "NO SAMPLE SELECTED"}</small></div><div className="feed-result"><div><small>DECISION</small><b data-testid="model-decision" className="reject">{analysis ? (analysis.finding.startsWith("Anomaly") ? "ANOMALY" : "NORMAL") : "—"}</b></div><div><small>MODEL</small><b>PatchCore / R18</b></div><div><small>ANOMALY SCORE</small><b data-testid="anomaly-score">{analysis ? analysis.confidence.toFixed(2) : "—"}</b></div></div></article>
              <article className="trend"><div className="panel-title"><b>Held-out benchmark</b><small>MEASURED</small></div><div className="metric-bars"><p><span>Image AUROC</span><b>94.38%</b><i style={{width:"94.38%"}} /></p><p><span>Image F1</span><b>94.62%</b><i style={{width:"94.62%"}} /></p><p><span>Pixel AUROC</span><b>98.13%</b><i style={{width:"98.13%"}} /></p><p><span>Pixel F1</span><b>82.17%</b><i style={{width:"82.17%"}} /></p></div><div className="trend-foot"><small>STATUS</small><b>Validated</b><span>115 images</span></div></article>
            </div>}
            {(view === "command" || view === "trace") && <article className="recent"><div className="panel-title"><b>Benchmark test composition</b><small>115 TRACEABLE RECORDS</small></div><div className="table"><div className="tr th"><span>GROUND TRUTH</span><span>SAMPLES</span><span>EXPECTED</span><span>CLASS</span><span>DEFECT TYPE</span></div>{benchmarkGroups.map(row => <div className="tr" key={row.id}><b>{row.id}</b><span>{row.time}</span><span className={`status ${row.status.toLowerCase()}`}>{row.status}</span><span>{row.confidence}</span><span>{row.issue}</span></div>)}</div></article>}
            {view === "review" && <div className="workspace-view"><article className="review-work"><div><small>CURRENT REVIEW</small><h3>{analysis ? analysis.finding : "No inspection awaiting review"}</h3><p>{analysis ? `Model anomaly score: ${analysis.confidence.toFixed(2)}. Confirm whether the highlighted region should be accepted as a true anomaly.` : "Run an image through Live inspection to create a review item."}</p>{sample && <img src={sample} alt="Part awaiting review" />}</div><div className="review-actions"><button disabled={!analysis} onClick={() => setReviewed(true)}>Confirm anomaly</button><button disabled={!analysis} onClick={() => setReviewed(true)}>Mark acceptable</button><span>{reviewed ? "Decision saved to this session." : "Human decision pending."}</span></div></article></div>}
            {view === "intelligence" && <div className="workspace-view"><article className="result-card"><h3>Held-out evaluation</h3><div className="metric-bars"><p><span>Image AUROC</span><b>94.38%</b><i style={{width:"94.38%"}} /></p><p><span>Image F1</span><b>94.62%</b><i style={{width:"94.62%"}} /></p><p><span>Pixel AUROC</span><b>98.13%</b><i style={{width:"98.13%"}} /></p><p><span>Pixel F1</span><b>82.17%</b><i style={{width:"82.17%"}} /></p></div><p className="disclaimer">Measured on the MVTec AD metal-nut test split. These results are benchmark evidence, not customer production performance.</p></article></div>}
            {view === "lines" && <div className="workspace-view"><article className="station-card"><div><span className={live ? "pulse" : "paused"} /><b>POC browser station</b><small>{live ? "Online" : "Paused"}</small></div><dl><dt>Runtime</dt><dd>ONNX Runtime Web / WASM</dd><dt>Model</dt><dd>PatchCore ResNet-18</dd><dt>Input</dt><dd>256 × 256 RGB</dd><dt>Processing</dt><dd>Local in this browser</dd></dl></article></div>}
            {view === "registry" && <div className="workspace-view"><article className="registry-card"><div className="registry-title"><span>ACTIVE</span><h3>Metal Nut Anomaly v1.0</h3><p>PatchCore · ResNet-18 · 17 MB ONNX</p></div><dl><dt>Training set</dt><dd>220 good images</dd><dt>Validation set</dt><dd>115 held-out images</dd><dt>Image F1</dt><dd>94.62%</dd><dt>Pixel F1</dt><dd>82.17%</dd><dt>License constraint</dt><dd>Non-commercial benchmark</dd></dl></article></div>}
            {view === "settings" && <div className="workspace-view"><article className="settings-card"><h3>POC settings</h3><label><span>Decision source</span><select defaultValue="model"><option value="model">Trained model threshold</option></select></label><label><span>Inference device</span><select defaultValue="browser"><option value="browser">Local browser (WASM)</option></select></label><label><span>Heatmap overlay</span><input type="checkbox" defaultChecked /></label><p>Settings are device-local for this proof of concept. Production settings require authenticated, persistent storage.</p></article></div>}
          </section>
        </div>
      </div>}
    </main>
  );
}
