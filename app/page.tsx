"use client";

import { useEffect, useRef, useState } from "react";

const Arrow = () => <span aria-hidden="true">↗</span>;

const inspections = [
  { id: "AX-10482", time: "14:32:18", status: "Pass", confidence: "99.8%", issue: "—" },
  { id: "AX-10481", time: "14:32:17", status: "Pass", confidence: "99.4%", issue: "—" },
  { id: "AX-10480", time: "14:32:16", status: "Review", confidence: "84.2%", issue: "Edge burr" },
  { id: "AX-10479", time: "14:32:15", status: "Reject", confidence: "98.7%", issue: "Surface crack" },
];

function Mark({ dark = false }: { dark?: boolean }) {
  return <span className={`mark ${dark ? "mark-dark" : ""}`} aria-hidden="true"><i /><i /><i /></span>;
}

export default function Home() {
  const [demo, setDemo] = useState(false);
  const [live, setLive] = useState(true);
  const [reviewed, setReviewed] = useState(false);
  const [sample, setSample] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<{ confidence: number; finding: string; x: number; y: number } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const inspectSample = (file?: File) => {
    if (!file || !file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setSample(url); setAnalysis(null); setAnalyzing(true); setDemo(true);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      const size = 160; canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(image, 0, 0, size, size);
      const pixels = ctx.getImageData(0, 0, size, size).data;
      let best = { score: 0, x: 50, y: 50 };
      for (let by = 1; by < 7; by++) for (let bx = 1; bx < 7; bx++) {
        let total = 0, total2 = 0, count = 0;
        for (let y = by * 20; y < by * 20 + 20; y += 2) for (let x = bx * 20; x < bx * 20 + 20; x += 2) {
          const i = (y * size + x) * 4; const value = pixels[i] * .3 + pixels[i + 1] * .59 + pixels[i + 2] * .11;
          total += value; total2 += value * value; count++;
        }
        const variance = total2 / count - Math.pow(total / count, 2);
        if (variance > best.score) best = { score: variance, x: bx * 12.5, y: by * 12.5 };
      }
      const confidence = Math.min(98.9, 72 + Math.sqrt(best.score) * .55);
      window.setTimeout(() => { setAnalysis({ confidence, finding: confidence > 88 ? "Surface anomaly" : "Review recommended", x: best.x, y: best.y }); setAnalyzing(false); }, 900);
    };
    image.src = url;
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
          <article className="feature feature-orange"><div className="feature-num">03</div><div className="review-card"><small>NEEDS REVIEW</small><div><b>Edge burr</b><span>84.2%</span></div><button>Confirm finding</button></div><h3>Keep experts in control</h3><p>Route uncertain results to the right person and continuously improve with every decision.</p><a href="#workflow">Human-in-the-loop <Arrow /></a></article>
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
          {["Automotive components", "Electronics assembly", "Pharmaceutical packaging", "Consumer products"].map((x, i) => <a href="#top" key={x}><b>0{i + 1}</b><span>{x}</span><Arrow /></a>)}
        </div>
      </section>

      <section className="cta">
        <div className="shell cta-inner"><Mark dark /><div><p>YOUR NEXT RUN STARTS HERE</p><h2>Make quality<br />a learning system.</h2></div><button onClick={() => setDemo(true)}>Launch working POC <Arrow /></button></div>
      </section>
      <footer className="shell"><a className="brand" href="#top"><Mark /> <b>FORGESIGHT</b><small>AI</small></a><p>Quality intelligence for modern factories.</p><span>POC · 2026</span></footer>

      {demo && <div className="demo" role="dialog" aria-modal="true" aria-label="ForgeSight live inspection demo">
        <div className="demo-top"><div className="brand"><Mark dark /><b>FORGESIGHT</b><small>AI</small></div><div><span className={live ? "online" : "offline"}>{live ? "● LINE ONLINE" : "● LINE PAUSED"}</span><button onClick={() => setDemo(false)} aria-label="Close demo">×</button></div></div>
        <div className="demo-body">
          <aside><small>WORKSPACE</small><b className="active">▦ Command center</b><b>◉ Live inspection</b><b>◇ Review queue <i>3</i></b><b>⌁ Defect intelligence</b><b>▤ Traceability</b><small>OPERATIONS</small><b>□ Lines & stations</b><b>△ Model registry</b><b>⚙ Settings</b><div className="plant"><span>AP</span><p><b>Apex Components</b><small>Detroit Plant 02</small></p></div></aside>
          <section className="dash">
            <div className="dash-head"><div><small>DETROIT · LINE A</small><h2>Command center</h2></div><div className="dash-actions"><input ref={fileInput} type="file" accept="image/*" hidden onChange={e => inspectSample(e.target.files?.[0])} /><button className="inspect-button" onClick={() => fileInput.current?.click()}>+ Inspect your image</button><button onClick={() => setLive(!live)}>{live ? "Pause line" : "Resume line"}</button></div></div>
            <div className="dash-metrics"><article><small>INSPECTED TODAY</small><b>48,291</b><span>↑ 8.4% vs avg</span></article><article><small>FIRST-PASS YIELD</small><b>99.18%</b><span>↑ 0.31% this week</span></article><article><small>DEFECTS FOUND</small><b>396</b><span className="warn">23 need review</span></article><article><small>SCRAP AVOIDED</small><b>$18.4k</b><span>Today</span></article></div>
            <div className="dash-grid">
              <article className="live-panel"><div className="panel-title"><div><span className={live ? "pulse" : "paused"} /> <b>{sample ? "POC · Uploaded sample" : "Station 04 · Housing inspection"}</b></div><small>{analyzing ? "ANALYZING…" : live ? "LIVE · 62 PPM" : "PAUSED"}</small></div><div className={`feed ${sample ? "sample-feed" : ""}`}>{sample ? <img src={sample} alt="Uploaded manufacturing sample" /> : <div className="feed-part"><i /><i /><i /></div>}{analysis && <span className="detect-box uploaded-box" style={{ left: `${analysis.x}%`, top: `${analysis.y}%` }}><b>{analysis.finding.toUpperCase()}</b>{analysis.confidence.toFixed(1)}%</span>}{!sample && <span className="detect-box"><b>SURFACE CRACK</b>98.7%</span>}{analyzing && <div className="analysis-scan" />}<small>{sample ? "LOCAL CONTRAST ANALYSIS · POC" : "CAM 2 · TOP SURFACE"}</small></div><div className="feed-result"><div><small>LAST DECISION</small><b className="reject">{analysis ? (analysis.confidence > 88 ? "REVIEW" : "PASS") : "REJECT"}</b></div><div><small>FINDING</small><b>{analysis?.finding ?? "Surface crack"}</b></div><div><small>CONFIDENCE</small><b>{analysis ? `${analysis.confidence.toFixed(1)}%` : "98.7%"}</b></div></div></article>
              <article className="trend"><div className="panel-title"><b>Quality trend</b><select aria-label="Time range"><option>Last 8 hours</option></select></div><div className="chart"><span className="goal">TARGET 99.0%</span><svg viewBox="0 0 500 180" preserveAspectRatio="none" aria-label="First-pass yield trend"><polyline points="0,125 60,110 120,118 180,70 240,84 300,45 360,62 420,32 500,42" fill="none" stroke="#ff5b24" strokeWidth="4"/><polyline points="0,150 500,150" fill="none" stroke="#d2d0c9" strokeDasharray="5 5"/></svg><div><span>06:00</span><span>10:00</span><span>14:00</span></div></div><div className="trend-foot"><small>CURRENT FPY</small><b>99.18%</b><span>Healthy</span></div></article>
            </div>
            <article className="recent"><div className="panel-title"><b>Recent inspections</b><button onClick={() => setReviewed(!reviewed)}>{reviewed ? "Review saved ✓" : "Review flagged part"}</button></div><div className="table"><div className="tr th"><span>PART ID</span><span>TIME</span><span>DECISION</span><span>CONFIDENCE</span><span>FINDING</span></div>{inspections.map(row => <div className="tr" key={row.id}><b>{row.id}</b><span>{row.time}</span><span className={`status ${row.status.toLowerCase()}`}>{row.status}</span><span>{row.confidence}</span><span>{row.issue}</span></div>)}</div></article>
          </section>
        </div>
      </div>}
    </main>
  );
}
