"use client";

import { useEffect, useRef, useState } from "react";

declare global { interface Window { ort: any } }
let inferenceSession: any = null;
let inferenceModelPath = "";

const Arrow = () => <span aria-hidden="true">↗</span>;

const benchmarkGroups = [
  { id: "GOOD", time: "22 images", status: "Pass", confidence: "Normal", issue: "Acceptable parts" },
  { id: "BENT", time: "25 images", status: "Reject", confidence: "Anomaly", issue: "Geometry" },
  { id: "COLOR", time: "22 images", status: "Reject", confidence: "Anomaly", issue: "Discoloration" },
  { id: "FLIP", time: "23 images", status: "Reject", confidence: "Anomaly", issue: "Orientation" },
  { id: "SCRATCH", time: "23 images", status: "Reject", confidence: "Anomaly", issue: "Surface damage" },
];

const scenarios = {
  metal_nut: {
    name: "Metal nut", area: "Automotive components", input: "metal-nut", modelPath: "/models/forgesight-metal-nut.onnx", modelParts: [], modelSize: "17 MB", threshold: .7668, pixelThreshold: .5677, usePredLabel: false,
    training: 220, testing: 115, imageAuRoc: 94.38, imageF1: 94.62, pixelAuRoc: 98.13, pixelF1: 82.17, download: "/samples/forgesight-test-data.zip",
    checks: ["Bent or deformed geometry", "Surface scratches and discoloration", "Incorrect orientation or flipped parts"],
    samples: [{ id: "good", label: "Normal", truth: "Acceptable part" }, { id: "bent", label: "Bent", truth: "Bent geometry" }, { id: "color", label: "Color", truth: "Discoloration" }, { id: "flip", label: "Flipped", truth: "Flipped orientation" }, { id: "scratch", label: "Scratch", truth: "Surface scratch" }],
    groups: benchmarkGroups,
  },
  bottle: {
    name: "Bottle", area: "Packaging", input: "bottle", modelPath: "/models/forgesight-bottle.onnx", modelParts: [], modelSize: "23 MB", threshold: .5, pixelThreshold: .5, usePredLabel: true,
    training: 209, testing: 83, imageAuRoc: 100, imageF1: 99.20, pixelAuRoc: 97.83, pixelF1: 66.92, download: "/samples/bottle-test-data.zip",
    checks: ["Large or small breaks around the rim", "Foreign material or contamination", "Bottle silhouette and surface consistency"],
    samples: [{ id: "good", label: "Normal", truth: "Acceptable bottle" }, { id: "broken-large", label: "Large break", truth: "Large rim break" }, { id: "broken-small", label: "Small break", truth: "Small rim break" }, { id: "contamination", label: "Contamination", truth: "Contamination" }],
    groups: [{ id: "GOOD", time: "20 images", status: "Pass", confidence: "Normal", issue: "Acceptable bottles" }, { id: "BROKEN LARGE", time: "20 images", status: "Reject", confidence: "Anomaly", issue: "Large rim break" }, { id: "BROKEN SMALL", time: "22 images", status: "Reject", confidence: "Anomaly", issue: "Small rim break" }, { id: "CONTAMINATION", time: "21 images", status: "Reject", confidence: "Anomaly", issue: "Foreign material" }],
  },
  cable: {
    name: "Cable assembly", area: "Electronics", input: "cable assembly", modelPath: "/models/forgesight-cable.onnx", modelParts: [], modelSize: "24 MB", threshold: .5, pixelThreshold: .5, usePredLabel: true,
    training: 224, testing: 150, imageAuRoc: 98.28, imageF1: 94.97, pixelAuRoc: 98.20, pixelF1: 63.26, download: "/samples/cable-test-data.zip",
    checks: ["Bent, cut, or punctured wires", "Missing, swapped, or misplaced cable sections", "Combined assembly and insulation defects"],
    samples: [{ id: "good", label: "Normal", truth: "Acceptable cable assembly" }, { id: "bent-wire", label: "Bent wire", truth: "Bent wire" }, { id: "combined", label: "Combined", truth: "Multiple defects" }, { id: "missing-cable", label: "Missing cable", truth: "Missing cable" }],
    groups: [{ id: "GOOD", time: "58 images", status: "Pass", confidence: "Normal", issue: "Acceptable assemblies" }, { id: "BENT WIRE", time: "13 images", status: "Reject", confidence: "Anomaly", issue: "Wire geometry" }, { id: "CABLE SWAP", time: "12 images", status: "Reject", confidence: "Anomaly", issue: "Wrong position" }, { id: "COMBINED", time: "11 images", status: "Reject", confidence: "Anomaly", issue: "Multiple defects" }, { id: "INSULATION", time: "34 images", status: "Reject", confidence: "Anomaly", issue: "Cut or puncture" }, { id: "MISSING", time: "22 images", status: "Reject", confidence: "Anomaly", issue: "Missing wire/cable" }],
  },
  pill: {
    name: "Pill", area: "Pharma", input: "pill", modelPath: "forgesight-pill-chunked-v1", modelParts: ["/models/forgesight-pill.onnx.part00", "/models/forgesight-pill.onnx.part01", "/models/forgesight-pill.onnx.part02", "/models/forgesight-pill.onnx.part03", "/models/forgesight-pill.onnx.part04", "/models/forgesight-pill.onnx.part05", "/models/forgesight-pill.onnx.part06"], modelSize: "27 MB · streamed", threshold: .5, pixelThreshold: .5, usePredLabel: true,
    training: 267, testing: 167, imageAuRoc: 93.18, imageF1: 95.14, pixelAuRoc: 98.04, pixelF1: 71.63, download: "/samples/pill-test-data.zip",
    checks: ["Cracks and visible surface damage", "Color deviation or contamination", "Faulty imprint, shape, and pill type consistency"],
    samples: [{ id: "good", label: "Normal", truth: "Acceptable pill" }, { id: "color", label: "Color", truth: "Color deviation" }, { id: "contamination", label: "Contamination", truth: "Contamination" }, { id: "crack", label: "Crack", truth: "Crack" }, { id: "faulty-imprint", label: "Imprint", truth: "Faulty imprint" }],
    groups: [{ id: "GOOD", time: "26 images", status: "Pass", confidence: "Normal", issue: "Acceptable pills" }, { id: "COLOR", time: "25 images", status: "Reject", confidence: "Anomaly", issue: "Color deviation" }, { id: "CONTAMINATION", time: "21 images", status: "Reject", confidence: "Anomaly", issue: "Foreign material" }, { id: "CRACK", time: "26 images", status: "Reject", confidence: "Anomaly", issue: "Surface crack" }, { id: "IMPRINT", time: "19 images", status: "Reject", confidence: "Anomaly", issue: "Faulty imprint" }, { id: "OTHER", time: "50 images", status: "Reject", confidence: "Anomaly", issue: "Combined/type/scratch" }],
  },
} as const;

type ScenarioId = keyof typeof scenarios;

const pillVariants = {
  benchmark: { name: "Benchmark pill family", status: "active", detail: "Current trained MVTec pill recipe" },
  tablet_round: { name: "Round tablet · custom SKU", status: "enrollment", detail: "Needs representative production images" },
  capsule: { name: "Capsule · custom SKU", status: "enrollment", detail: "Needs representative production images" },
  blister: { name: "Blister pack · custom SKU", status: "enrollment", detail: "Needs pack layout and camera samples" },
} as const;
type PillVariantId = keyof typeof pillVariants;

function Mark({ dark = false }: { dark?: boolean }) {
  return <span className={`mark ${dark ? "mark-dark" : ""}`} aria-hidden="true"><i /><i /><i /></span>;
}

export default function Home({ initialDemo = false, workspaceUser = null }: { initialDemo?: boolean; workspaceUser?: { displayName: string; email: string } | null }) {
  const [demo, setDemo] = useState(initialDemo);
  const [live, setLive] = useState(true);
  const [reviewed, setReviewed] = useState(false);
  const [operatorDecision, setOperatorDecision] = useState<"acceptable" | "anomaly" | null>(null);
  const [queuedForTraining, setQueuedForTraining] = useState(false);
  const [scenarioId, setScenarioId] = useState<ScenarioId>("metal_nut");
  const [pillVariantId, setPillVariantId] = useState<PillVariantId>("benchmark");
  const [sample, setSample] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<{ confidence: number; finding: string; x: number; y: number; heatmap: string; affected: number; latencyMs: number } | null>(null);
  const [knownTruth, setKnownTruth] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [autoInspect, setAutoInspect] = useState(false);
  const [cameraMessage, setCameraMessage] = useState("Camera is off · video permission is requested only when started");
  const [modelStatus, setModelStatus] = useState("Model ready · PatchCore ResNet-18");
  const [view, setView] = useState("command");
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraVideo = useRef<HTMLVideoElement>(null);
  const cameraStream = useRef<MediaStream | null>(null);
  const analyzingRef = useRef(false);
  const activeScenario = scenarios[scenarioId];
  const registeredRecipes = Object.entries(scenarios) as [ScenarioId, (typeof scenarios)[ScenarioId]][];
  const activePillVariant = pillVariants[pillVariantId];
  const inspectionReady = scenarioId !== "pill" || activePillVariant.status === "active";

  const openProduct = (viewName = "command") => {
    setView(viewName);
    if (workspaceUser) setDemo(true);
    else window.location.href = "/workspace";
  };

  const inspectSample = (file?: File, groundTruth?: string) => {
    if (!file || !file.type.startsWith("image/")) return;
    if (!inspectionReady) {
      setModelStatus(`${activePillVariant.name} is not enrolled · create a recipe before inspection`);
      setView("registry");
      return;
    }
    setKnownTruth(groundTruth ?? null);
    setReviewed(false);
    setOperatorDecision(null);
    setQueuedForTraining(false);
    const url = URL.createObjectURL(file);
    setSample(url); setAnalysis(null); setAnalyzing(true); analyzingRef.current = true; setDemo(true);
    const image = new Image();
    image.onload = async () => {
      const inspectionStarted = performance.now();
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
        setModelStatus(inferenceSession && inferenceModelPath === activeScenario.modelPath ? "Running real inference…" : `Loading trained model · ${activeScenario.modelSize}…`);
        if (!inferenceSession || inferenceModelPath !== activeScenario.modelPath) {
          if (activeScenario.modelParts.length > 0) {
            const chunks = await Promise.all(activeScenario.modelParts.map(async part => {
              const response = await fetch(part);
              if (!response.ok) throw new Error(`Model chunk unavailable: ${part}`);
              return new Uint8Array(await response.arrayBuffer());
            }));
            const modelBytes = new Uint8Array(chunks.reduce((total, chunk) => total + chunk.byteLength, 0));
            let offset = 0;
            for (const chunk of chunks) { modelBytes.set(chunk, offset); offset += chunk.byteLength; }
            inferenceSession = await ort.InferenceSession.create(modelBytes, { executionProviders: ["wasm"] });
          } else {
            inferenceSession = await ort.InferenceSession.create(activeScenario.modelPath, { executionProviders: ["wasm"] });
          }
          inferenceModelPath = activeScenario.modelPath;
        }
        setModelStatus("Running real inference…");
        const result = await inferenceSession.run({ input: new ort.Tensor("float32", input, [1, 3, size, size]) });
        const score = Number(result.pred_score.data[0]);
        const label = activeScenario.usePredLabel ? Boolean(result.pred_label.data[0]) : score >= activeScenario.threshold;
        const map = result.anomaly_map.data as Float32Array;
        let max = -Infinity, maxIndex = 0, min = Infinity;
        for (let i = 0; i < map.length; i++) { if (map[i] > max) { max = map[i]; maxIndex = i; } if (map[i] < min) min = map[i]; }
        const heat = document.createElement("canvas"); heat.width = size; heat.height = size;
        const heatCtx = heat.getContext("2d");
        if (!heatCtx) throw new Error("Heatmap rendering unavailable");
        const heatPixels = heatCtx.createImageData(size, size); const spread = Math.max(.0001, max - min);
        let affectedPixels = 0;
        for (let i = 0; i < map.length; i++) { const a = Math.max(0, Math.min(210, ((map[i] - min) / spread - .35) * 320)); heatPixels.data[i * 4] = 255; heatPixels.data[i * 4 + 1] = 76; heatPixels.data[i * 4 + 2] = 18; heatPixels.data[i * 4 + 3] = a; if (map[i] >= activeScenario.pixelThreshold) affectedPixels++; }
        heatCtx.putImageData(heatPixels, 0, 0);
        setAnalysis({ confidence: score * 100, finding: label ? "Anomaly detected" : "No anomaly detected", x: (maxIndex % size) / size * 100, y: Math.floor(maxIndex / size) / size * 100, heatmap: heat.toDataURL(), affected: affectedPixels / map.length * 100, latencyMs: performance.now() - inspectionStarted });
        setModelStatus("Real model complete · local inference");
      } catch (error) {
        console.error(error); setModelStatus("Model failed to load · retry upload");
      } finally { setAnalyzing(false); analyzingRef.current = false; }
    };
    image.src = url;
  };

  const inspectBundledSample = async (kind: string, truth: string) => {
    setView("live");
    setModelStatus("Preparing verified benchmark sample…");
    try {
      const samplePrefix = scenarioId === "metal_nut" ? "metal-nut" : scenarioId;
      const response = await fetch(`/samples/${samplePrefix}-${kind}.png?v=scenarios1`);
      if (!response.ok) throw new Error("Benchmark sample unavailable");
      const blob = await response.blob();
      inspectSample(new File([blob], `${samplePrefix}-${kind}.png`, { type: "image/png" }), truth);
    } catch (error) {
      console.error(error);
      setModelStatus("Sample failed to load · try your own image");
    }
  };

  const changeScenario = (next: ScenarioId) => {
    cameraStream.current?.getTracks().forEach(track => track.stop());
    cameraStream.current = null;
    if (cameraVideo.current) cameraVideo.current.srcObject = null;
    setCameraActive(false);
    setAutoInspect(false);
    setCameraMessage("Camera stopped · restart after confirming the new inspection recipe");
    setScenarioId(next);
    setSample(null);
    setAnalysis(null);
    setKnownTruth(null);
    setReviewed(false);
    setOperatorDecision(null);
    setQueuedForTraining(false);
    setView("live");
    setModelStatus(`Model ready · ${scenarios[next].name} PatchCore`);
  };

  const stopCamera = () => {
    cameraStream.current?.getTracks().forEach(track => track.stop());
    cameraStream.current = null;
    if (cameraVideo.current) cameraVideo.current.srcObject = null;
    setCameraActive(false);
    setAutoInspect(false);
    setCameraMessage("Camera stopped · no video is being captured");
  };

  const startCamera = async () => {
    setView("live");
    if (!inspectionReady) {
      setCameraMessage(`${activePillVariant.name} is not enrolled. Select the benchmark recipe or enroll this SKU.`);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraMessage("This browser does not expose camera capture");
      return;
    }
    try {
      setCameraMessage("Waiting for video-only camera permission…");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      cameraStream.current = stream;
      if (cameraVideo.current) { cameraVideo.current.srcObject = stream; await cameraVideo.current.play(); }
      setCameraActive(true);
      setAutoInspect(true);
      setCameraMessage("Camera connected · continuous inspection is running locally");
      captureCameraFrame();
    } catch {
      setCameraMessage("Camera permission was denied or no camera is available");
      setCameraActive(false);
    }
  };

  const captureCameraFrame = () => {
    const video = cameraVideo.current;
    if (!video || video.readyState < 2 || analyzingRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => {
      if (blob) inspectSample(new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" }));
    }, "image/jpeg", .9);
  };

  useEffect(() => {
    document.body.style.overflow = demo ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [demo]);

  useEffect(() => {
    if (!cameraActive || !autoInspect) return;
    const timer = window.setInterval(captureCameraFrame, 750);
    return () => window.clearInterval(timer);
  }, [cameraActive, autoInspect, scenarioId]);

  useEffect(() => () => cameraStream.current?.getTracks().forEach(track => track.stop()), []);

  return (
    <main>
      <header className="nav shell">
        <a href="#top" className="brand" aria-label="QEVRA AI home"><Mark /> <b>QEVRA</b><small>AI</small></a>
        <nav aria-label="Primary navigation">
          <a href="#platform">Platform</a><a href="#workflow">How it works</a><a href="#industries">Industries</a>
        </nav>
        <div className="nav-access"><a className="nav-login" href="/workspace">Sign in with ChatGPT</a><button className="nav-cta" onClick={() => openProduct()}>Open quality workspace <Arrow /></button></div>
      </header>

      <section className="hero shell" id="top">
        <div className="hero-copy">
          <p className="eyebrow"><span /> Quality intelligence for modern factories</p>
          <h1>Quality intelligence<br /><em>for every product.</em></h1>
          <p className="lede">QEVRA AI routes every product family, SKU, and variant to the correct inspection recipe—then detects visual anomalies, explains the result, and preserves the operator decision.</p>
          <div className="hero-actions">
            <button className="primary" onClick={() => openProduct("live")}>Open inspection workspace <Arrow /></button>
            <a className="text-link" href="#workflow">See how it works <span>↓</span></a>
          </div>
          <div className="trust-row"><span>RECIPE ROUTING</span><span>EDGE INFERENCE</span><span>HUMAN REVIEW</span></div>
        </div>

        <div className="machine-visual" aria-label="Illustration of an AI inspection station">
          <div className="visual-label"><span>STATION CONCEPT</span><b>ILLUSTRATION</b></div>
          <div className="camera"><div className="lens" /></div>
          <div className="scan-line" />
          <div className="part"><i /><i /><i /><span className="target">EXAMPLE<br /><b>REGION</b></span></div>
          <div className="belt"><i /><i /><i /><i /></div>
          <div className="readout"><small>CONCEPT OVERLAY</small><strong>Surface integrity</strong><p><span>Not live data</span><b>DEMO</b></p><div><i /></div></div>
          <div className="coordinate">X 127.4&nbsp;&nbsp; Y 048.2</div>
        </div>
      </section>

      <section className="proof">
        <div className="shell proof-grid">
          <div><strong>94.38<sup>%</sup></strong><span>Measured image AUROC</span></div>
          <div><strong>94.62<sup>%</sup></strong><span>Measured image F1</span></div>
          <div><strong>98.13<sup>%</sup></strong><span>Measured pixel AUROC</span></div>
          <div><strong>82.17<sup>%</sup></strong><span>Measured pixel F1</span></div>
        </div>
      </section>

      <section className="platform shell" id="platform">
        <div className="section-heading"><p className="eyebrow"><span /> One governed platform</p><h2>Right product.<br />Right model. Every time.</h2><p>QEVRA AI separates product identity from defect detection. Known SKUs use validated recipes; unknown products are held for enrollment instead of being mislabeled as defects.</p></div>
        <div className="feature-grid">
          <article className="feature feature-dark"><div className="feature-num">01</div><div className="mini-inspection"><div className="mini-part" /><span className="mini-box">SKU ROUTED</span></div><h3>Route the product</h3><p>Map line, product family, SKU, camera, and inspection recipe before inference. Unknown products stop safely for enrollment.</p><a href="#workflow">Recipe governance <Arrow /></a></article>
          <article className="feature"><div className="feature-num">02</div><div className="cause-map"><span /><span /><span /><span /><b>SHIFT B</b><i>LINE 07</i></div><h3>Inspect at the edge</h3><p>Run real local inference from an upload or continuous camera feed, with heatmaps, scores, latency, and quality-plan context.</p><a href="#workflow">Live inspection <Arrow /></a></article>
          <article className="feature feature-orange"><div className="feature-num">03</div><div className="review-card"><small>NEEDS REVIEW</small><div><b>Visual deviation</b><span>84.2%</span></div><button onClick={() => openProduct("review")}>Open review queue</button></div><h3>Close the quality loop</h3><p>Separate operator disposition from retraining. Every accepted variant, confirmed anomaly, and model version remains traceable.</p><a href="#workflow">Human review <Arrow /></a></article>
        </div>
      </section>

      <section className="workflow" id="workflow">
        <div className="shell">
          <p className="eyebrow light"><span /> Designed for the plant floor</p>
          <div className="workflow-title"><h2>Train today.<br />Inspect tomorrow.</h2><p>A guided workflow takes your team from good samples to a production-ready inspection—without a data science project.</p></div>
          <div className="steps">
            <article><b>01</b><div className="step-icon">◎</div><h3>Capture</h3><p>Collect representative parts from your existing line and define what good looks like.</p></article>
            <article><b>02</b><div className="step-icon">⌁</div><h3>Teach</h3><p>Register each product and variant. QEVRA AI builds and validates a recipe using representative production images.</p></article>
            <article><b>03</b><div className="step-icon">◫</div><h3>Deploy</h3><p>Publish to your edge station, connect the PLC, and start inspecting in production.</p></article>
            <article><b>04</b><div className="step-icon">↗</div><h3>Improve</h3><p>Find recurring patterns, validate countermeasures, and prevent the next defect.</p></article>
          </div>
        </div>
      </section>

      <section className="industries shell" id="industries">
        <div><p className="eyebrow"><span /> Built for precision</p><h2>One quality layer.<br />Every process.</h2></div>
        <div className="industry-list">
          {["IoT devices & enclosures", "Electronics & cable assemblies", "Pharma, pills & packaging", "Machined components"].map((x, i) => <button onClick={() => openProduct("live")} key={x}><b>0{i + 1}</b><span>{x}</span><Arrow /></button>)}
        </div>
      </section>

      <section className="cta">
        <div className="shell cta-inner"><Mark dark /><div><p>YOUR QUALITY WORKSPACE</p><h2>Govern every recipe.<br />Learn from every result.</h2></div><button onClick={() => openProduct()}>Open quality workspace <Arrow /></button></div>
      </section>
      <footer className="shell"><a className="brand" href="#top"><Mark /> <b>QEVRA</b><small>AI</small></a><p>Every product, proven.</p><span>QUALITY INTELLIGENCE PLATFORM · 2026</span></footer>

      {demo && <div className="demo" role="dialog" aria-modal="true" aria-label="QEVRA AI live inspection workspace">
        <div className="demo-top"><div className="brand"><Mark dark /><b>QEVRA</b><small>AI</small></div><div>{workspaceUser && <span className="account-chip"><b>{workspaceUser.displayName}</b><small>{workspaceUser.email}</small></span>}<span className={live ? "online" : "offline"}>{live ? "● LINE ONLINE" : "● LINE PAUSED"}</span>{workspaceUser && <a className="signout" href="/signout-with-chatgpt?return_to=/">Sign out</a>}<button onClick={() => setDemo(false)} aria-label="Close workspace">×</button></div></div>
        <div className="demo-body">
          <aside><small>QUALITY WORKSPACE</small><button className={view === "command" ? "active" : ""} onClick={() => setView("command")}>▦ Command center</button><button className={view === "live" ? "active" : ""} onClick={() => setView("live")}>◉ Live inspection</button><button className={view === "review" ? "active" : ""} onClick={() => setView("review")}>◇ Review queue <i>{analysis && !reviewed ? 1 : 0}</i></button><button className={view === "intelligence" ? "active" : ""} onClick={() => setView("intelligence")}>⌁ Model results</button><button className={view === "trace" ? "active" : ""} onClick={() => setView("trace")}>▤ Traceability</button><small>OPERATIONS</small><button className={view === "lines" ? "active" : ""} onClick={() => setView("lines")}>□ Lines &amp; stations</button><button className={view === "registry" ? "active" : ""} onClick={() => setView("registry")}>△ Recipe registry</button><button className={view === "settings" ? "active" : ""} onClick={() => setView("settings")}>⚙ Settings</button><div className="plant"><span>QE</span><p><b>{activeScenario.name}</b><small>{activeScenario.area} · {inspectionReady ? "recipe active" : "enrollment required"}</small></p></div></aside>
          <section className="dash">
            <div className="dash-head"><div><small>VALIDATED MODEL WORKSPACE · {activeScenario.area.toUpperCase()}</small><h2 data-testid="workspace-title">{view === "command" ? "Command center" : view === "live" ? "Live inspection" : view === "review" ? "Review queue" : view === "intelligence" ? "Measured model results" : view === "trace" ? "Traceability" : view === "lines" ? "Lines & stations" : view === "settings" ? "Settings" : "Recipe registry"}</h2></div><div className="dash-actions"><label className="scenario-selector"><span>Inspection recipe</span><select data-testid="scenario-select" value={scenarioId} onChange={e => changeScenario(e.target.value as ScenarioId)}><option value="metal_nut">Metal nut · automotive</option><option value="bottle">Bottle · packaging</option><option value="cable">Cable assembly · electronics</option><option value="pill">Pill family · pharma</option></select></label>{scenarioId === "pill" && <label className="scenario-selector variant-selector"><span>Pill SKU / variant</span><select value={pillVariantId} onChange={e => { const next = e.target.value as PillVariantId; stopCamera(); setPillVariantId(next); setSample(null); setAnalysis(null); setReviewed(false); setOperatorDecision(null); setQueuedForTraining(false); setModelStatus(pillVariants[next].status === "active" ? "Model ready · benchmark pill recipe" : `${pillVariants[next].name} · enrollment required`); }}><option value="benchmark">Benchmark pill family · active</option><option value="tablet_round">Round tablet · enroll</option><option value="capsule">Capsule · enroll</option><option value="blister">Blister pack · enroll</option></select></label>}<input ref={fileInput} type="file" accept="image/*" hidden onChange={e => inspectSample(e.target.files?.[0])} />{view === "live" && inspectionReady && <>{activeScenario.samples.map(item => <button key={item.id} data-testid={`try-${item.id}`} onClick={() => inspectBundledSample(item.id, item.truth)}>{item.label}</button>)}<a className="sample-download" href={activeScenario.download} download>{activeScenario.name} test data</a><button data-testid="camera-toggle" onClick={cameraActive ? stopCamera : startCamera}>{cameraActive ? "Stop camera" : "Start camera"}</button></>}<button className="inspect-button" disabled={!inspectionReady} onClick={() => { setView("live"); fileInput.current?.click(); }}>+ Inspect an image</button>{(view === "command" || view === "live" || view === "lines") && <button onClick={() => setLive(!live)}>{live ? "Pause" : "Resume"}</button>}</div></div>
            <div className={`model-note ${inspectionReady ? "" : "scope-alert"}`}><b data-testid="model-status">{modelStatus}</b><span>{inspectionReady ? `Recipe scope: ${activeScenario.name}${scenarioId === "pill" ? ` / ${activePillVariant.name}` : ""} · ${activeScenario.training} acceptable benchmark samples · ${activeScenario.testing} held-out images` : `${activePillVariant.detail}. This product will not be sent through the wrong model.`}</span></div>
            <div className="recipe-scope"><b>Model routing guard</b><span>This workspace validates only the selected registered recipe. A different product, pill shape, imprint, color, package layout, camera angle, or lighting setup requires its own validated variant. Unknown inputs are enrollment candidates—not confirmed defects.</span></div>
            {(view === "command" || view === "intelligence") && <div className="dash-metrics"><article><small>TRAINING IMAGES</small><b>{activeScenario.training}</b><span>Acceptable samples only</span></article><article><small>TEST IMAGES</small><b>{activeScenario.testing}</b><span>Held-out benchmark split</span></article><article><small>IMAGE F1</small><b>{activeScenario.imageF1.toFixed(2)}%</b><span>Measured</span></article><article><small>IMAGE AUROC</small><b>{activeScenario.imageAuRoc.toFixed(2)}%</b><span>Measured</span></article></div>}
            {(view === "command" || view === "live") && <div className="dash-grid">
              <article className="live-panel"><div className="panel-title"><div><span className={live ? "pulse" : "paused"} /> <b>{sample ? "Captured sample · real inference" : `Upload or capture a ${activeScenario.input} image`}</b></div><small>{analyzing ? "ANALYZING…" : "PATCHCORE · ONNX"}</small></div><div className={`camera-console ${cameraActive ? "active" : ""}`}><video ref={cameraVideo} autoPlay muted playsInline aria-label="Live inspection camera preview" /><div><b>{cameraActive ? "LIVE CAMERA · AUTO INSPECTION" : "CAMERA READY"}</b><span>{cameraMessage}</span><p>{cameraActive ? <><button onClick={captureCameraFrame}>Inspect now</button><button className={autoInspect ? "auto-active" : ""} onClick={() => setAutoInspect(!autoInspect)}>{autoInspect ? "Pause auto" : "Resume auto"}</button></> : <button className="start-camera-primary" data-testid="camera-panel-start" onClick={startCamera}>Start camera &amp; inspect continuously</button>}</p></div></div><div className={`feed ${sample ? "sample-feed" : ""}`}>{sample ? <img src={sample} alt="Uploaded manufacturing sample" /> : <button className="upload-empty" onClick={() => fileInput.current?.click()}>Choose an image or start the camera</button>}{analysis && <img className="heatmap" src={analysis.heatmap} alt="Model anomaly heatmap" />}{analysis && <span className="detect-box uploaded-box" style={{ left: `${analysis.x}%`, top: `${analysis.y}%` }}><b>{analysis.finding.toUpperCase()}</b>{analysis.confidence.toFixed(1)}</span>}{analyzing && <div className="analysis-scan" />}<small>{sample ? "REAL PATCHCORE ANOMALY MAP" : "NO SAMPLE SELECTED"}</small></div><div className="feed-result"><div><small>FINAL DISPOSITION</small><b data-testid="model-decision" className={operatorDecision === "acceptable" ? "accepted" : "reject"}>{operatorDecision === "acceptable" ? "ACCEPTED · OVERRIDE" : operatorDecision === "anomaly" ? "REJECT · CONFIRMED" : analysis ? (analysis.finding.startsWith("Anomaly") ? "ANOMALY · REVIEW" : "NORMAL") : "—"}</b></div><div><small>MODEL PREDICTION</small><b>{analysis ? (analysis.finding.startsWith("Anomaly") ? "ANOMALY" : "NORMAL") : "—"}</b></div><div><small>ANOMALY SCORE</small><b data-testid="anomaly-score">{analysis ? analysis.confidence.toFixed(2) : "—"}</b></div><div><small>PROCESSING TIME</small><b>{analysis ? `${analysis.latencyMs.toFixed(0)} ms` : "—"}</b></div></div></article>
              <article className="trend"><div className="panel-title"><b>Held-out benchmark</b><small>MEASURED</small></div><div className="metric-bars"><p><span>Image AUROC</span><b>{activeScenario.imageAuRoc.toFixed(2)}%</b><i style={{width:`${activeScenario.imageAuRoc}%`}} /></p><p><span>Image F1</span><b>{activeScenario.imageF1.toFixed(2)}%</b><i style={{width:`${activeScenario.imageF1}%`}} /></p><p><span>Pixel AUROC</span><b>{activeScenario.pixelAuRoc.toFixed(2)}%</b><i style={{width:`${activeScenario.pixelAuRoc}%`}} /></p><p><span>Pixel F1</span><b>{activeScenario.pixelF1.toFixed(2)}%</b><i style={{width:`${activeScenario.pixelF1}%`}} /></p></div><div className="trend-foot"><small>STATUS</small><b>Validated</b><span>{activeScenario.testing} images</span></div></article>
            </div>}
            {view === "live" && analysis && <article className="explanation-card" data-testid="result-explanation"><div><small>WHAT WAS CHECKED</small><h3>{activeScenario.name} visual consistency</h3><ul>{activeScenario.checks.map(check => <li key={check}>{check}</li>)}</ul></div><div><small>WHAT THE MODEL FOUND</small><dl><dt>Decision</dt><dd>{analysis.finding.startsWith("Anomaly") ? "Anomaly — review required" : "Normal — within learned range"}</dd><dt>Model anomaly score</dt><dd>{analysis.confidence.toFixed(2)}</dd><dt>Peak location</dt><dd>X {analysis.x.toFixed(1)}% · Y {analysis.y.toFixed(1)}%</dd><dt>Highlighted area</dt><dd>{analysis.affected.toFixed(2)}% of image</dd></dl></div><div><small>INTERPRETATION</small><p>{knownTruth ? <><b>Known benchmark label:</b> {knownTruth}. This label comes from the test dataset, not from the model.</> : "The model detected and localized visual deviation. An operator must confirm the exact defect type and root cause."}</p><p className="guidance"><b>Recommended action:</b> {analysis.finding.startsWith("Anomaly") ? "Hold the item and send it to Review queue." : "Accept for this validated recipe, subject to the production quality plan."}</p></div></article>}
            {(view === "command" || view === "trace") && <article className="recent"><div className="panel-title"><b>Benchmark test composition</b><small>{activeScenario.testing} TRACEABLE RECORDS</small></div><div className="table"><div className="tr th"><span>GROUND TRUTH</span><span>SAMPLES</span><span>EXPECTED</span><span>CLASS</span><span>DEFECT TYPE</span></div>{activeScenario.groups.map(row => <div className="tr" key={row.id}><b>{row.id}</b><span>{row.time}</span><span className={`status ${row.status.toLowerCase()}`}>{row.status}</span><span>{row.confidence}</span><span>{row.issue}</span></div>)}</div></article>}
            {view === "review" && <div className="workspace-view"><article className="review-work"><div><small>CURRENT REVIEW</small><h3>{operatorDecision === "acceptable" ? "Accepted by operator" : operatorDecision === "anomaly" ? "Anomaly confirmed" : analysis ? analysis.finding : "No inspection awaiting review"}</h3><p>{analysis ? operatorDecision === "acceptable" ? `The operator accepted this item despite the model score of ${analysis.confidence.toFixed(2)}. The original model prediction remains in the audit record.` : operatorDecision === "anomaly" ? `The operator confirmed the model anomaly at score ${analysis.confidence.toFixed(2)}.` : `Model anomaly score: ${analysis.confidence.toFixed(2)}. Confirm whether the highlighted region should be accepted as a true anomaly.` : "Run an image through Live inspection to create a review item."}</p>{sample && <img src={sample} alt="Part awaiting review" />}</div><div className="review-actions"><button disabled={!analysis} onClick={() => { setReviewed(true); setOperatorDecision("anomaly"); }}>Confirm anomaly</button><button disabled={!analysis} onClick={() => { setReviewed(true); setOperatorDecision("acceptable"); }}>Mark acceptable</button><button disabled={!analysis || operatorDecision !== "acceptable" || queuedForTraining} onClick={() => setQueuedForTraining(true)}>Add variant to retraining set</button><span>{queuedForTraining ? "Accepted variant queued for the next model version. The current model has not been retrained." : reviewed ? "Operator disposition applied to this inspection." : "Human decision pending."}</span></div></article></div>}
            {view === "intelligence" && <div className="workspace-view"><article className="result-card"><h3>{activeScenario.name} held-out evaluation</h3><div className="metric-bars"><p><span>Image AUROC</span><b>{activeScenario.imageAuRoc.toFixed(2)}%</b><i style={{width:`${activeScenario.imageAuRoc}%`}} /></p><p><span>Image F1</span><b>{activeScenario.imageF1.toFixed(2)}%</b><i style={{width:`${activeScenario.imageF1}%`}} /></p><p><span>Pixel AUROC</span><b>{activeScenario.pixelAuRoc.toFixed(2)}%</b><i style={{width:`${activeScenario.pixelAuRoc}%`}} /></p><p><span>Pixel F1</span><b>{activeScenario.pixelF1.toFixed(2)}%</b><i style={{width:`${activeScenario.pixelF1}%`}} /></p></div><p className="disclaimer">Measured on the MVTec AD {activeScenario.name.toLowerCase()} test split. These results are benchmark evidence, not customer production performance.</p></article></div>}
            {view === "lines" && <div className="workspace-view"><article className="station-card"><div><span className={live ? "pulse" : "paused"} /><b>Browser inspection station</b><small>{live ? "Online" : "Paused"}</small></div><dl><dt>Runtime</dt><dd>ONNX Runtime Web / WASM</dd><dt>Model</dt><dd>PatchCore ResNet-18</dd><dt>Input</dt><dd>256 × 256 RGB</dd><dt>Processing</dt><dd>Local in this browser</dd></dl></article></div>}
            {view === "registry" && <div className="workspace-view"><div className="registry-summary"><b>4 real benchmark models</b><span>Metal component · bottle · cable assembly · pill</span></div>{registeredRecipes.map(([id, recipe]) => <article className={`registry-card ${id === scenarioId ? "selected-recipe" : ""}`} key={id}><div className="registry-title"><span>{id === scenarioId ? "SELECTED BENCHMARK MODEL" : "BENCHMARK MODEL"}</span><h3>{recipe.name} Anomaly v1.0</h3><p>PatchCore · ResNet-18 · {recipe.modelSize} ONNX</p></div><dl><dt>Recipe scope</dt><dd>{recipe.area} / {recipe.name}</dd><dt>Training set</dt><dd>{recipe.training} acceptable benchmark images</dd><dt>Validation set</dt><dd>{recipe.testing} held-out images</dd><dt>Image F1</dt><dd>{recipe.imageF1.toFixed(2)}%</dd><dt>Pixel F1</dt><dd>{recipe.pixelF1.toFixed(2)}%</dd><dt>Production status</dt><dd>Not production-trained</dd></dl></article>)}<article className="registry-card data-gate"><div className="registry-title"><span>PRODUCTION DATA GATE</span><h3>No customer production dataset connected</h3><p>A production recipe must represent the real line, product, camera, and operating variation.</p></div><dl><dt>Recommended baseline</dt><dd>500+ accepted images per SKU/variant</dd><dt>Coverage</dt><dd>Multiple shifts, lots, cameras, lighting states, positions, and suppliers</dd><dt>Defect evidence</dt><dd>Quality-approved defect examples and labels</dd><dt>Release gate</dt><dd>Held-out validation against the customer quality plan</dd></dl></article><article className="registry-card roadmap-card"><div className="registry-title"><span>MULTI-VARIANT DESIGN</span><h3>Pill product family</h3><p>Separate recipes prevent a round tablet, capsule, blister, color, or imprint change from being judged by the wrong model.</p></div><dl><dt>Active benchmark recipe</dt><dd>Benchmark pill family</dd><dt>Enrollment-ready</dt><dd>Round tablet, capsule, blister pack, and customer-defined SKU</dd><dt>Routing key</dt><dd>Manufacturer + product code + dosage + shape + color + imprint + pack layout</dd><dt>Unknown product action</dt><dd>Hold and create enrollment request</dd></dl></article><article className="registry-card roadmap-card"><div className="registry-title"><span>PLANNED · NOT TRAINED</span><h3>Almond quality inspection</h3><p>Planned real-food scenario using the HyperNut almond anomaly dataset.</p></div><dl><dt>Planned checks</dt><dd>Scratch, broken, rotten, insect, foreign material, mixed nut</dd><dt>Status</dt><dd>Unavailable for inference</dd><dt>Data source</dt><dd>HyperNut benchmark</dd></dl></article><article className="registry-card roadmap-card"><div className="registry-title"><span>PLANNED · INPUT REQUIRED</span><h3>3D / depth inspection</h3><p>A real 3D model requires the target sensor format and representative good/defective scans.</p></div><dl><dt>Supported design targets</dt><dd>Depth map, PLY/PCD point cloud, or RGB-D frame pair</dd><dt>Status</dt><dd>2D models must not be used as 3D validators</dd><dt>Next decision</dt><dd>Choose camera/sensor and inspection tolerance</dd></dl></article></div>}
            {view === "settings" && <div className="workspace-view"><article className="settings-card"><h3>Inspection settings</h3><label><span>Decision source</span><select defaultValue="model"><option value="model">Trained model threshold</option></select></label><label><span>Inference device</span><select defaultValue="browser"><option value="browser">Local browser (WASM)</option></select></label><label><span>Heatmap overlay</span><input type="checkbox" defaultChecked /></label><p>Settings are device-local for this proof of concept. Production settings require authenticated, persistent storage.</p></article></div>}
          </section>
        </div>
      </div>}
    </main>
  );
}
