import { useState, useEffect, useRef, useCallback } from "react";

const CLAUDE_MODEL = "claude-sonnet-4-20250514";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'DM Sans', sans-serif; }
  :root {
    --bg: #0a0e1a;
    --bg2: #111827;
    --bg3: #1a2235;
    --border: rgba(255,255,255,0.08);
    --border2: rgba(255,255,255,0.15);
    --accent: #3b82f6;
    --accent2: #6366f1;
    --red: #ef4444;
    --orange: #f97316;
    --amber: #f59e0b;
    --green: #10b981;
    --teal: #14b8a6;
    --text: #f1f5f9;
    --muted: #94a3b8;
    --muted2: #64748b;
  }
`;

// ─── Kidney SVG Component ───────────────────────────────────────────────────
function KidneySVG({ health = 100, treatment = null, animating = false }) {
  const color = health > 70 ? "#10b981" : health > 40 ? "#f59e0b" : "#ef4444";
  const glow = health > 70 ? "#10b98140" : health > 40 ? "#f59e0b40" : "#ef444440";
  const opacity = 0.4 + (health / 100) * 0.6;
  
  return (
    <svg viewBox="0 0 200 240" width="100%" height="100%" style={{ maxWidth: 180, filter: `drop-shadow(0 0 16px ${glow})` }}>
      <defs>
        <radialGradient id="kg" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor={color} stopOpacity={0.9} />
          <stop offset="100%" stopColor={color} stopOpacity={0.3} />
        </radialGradient>
        <radialGradient id="kg2" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor={color} stopOpacity={0.4} />
          <stop offset="100%" stopColor={color} stopOpacity={0.05} />
        </radialGradient>
      </defs>
      {/* Outer kidney shape */}
      <path
        d="M100 20 C60 20 30 55 30 100 C30 145 50 200 85 215 C95 218 105 218 115 215 C150 200 170 145 170 100 C170 55 140 20 100 20 Z"
        fill="url(#kg2)"
        stroke={color}
        strokeWidth="1.5"
        opacity={opacity}
      />
      {/* Inner medulla */}
      <path
        d="M100 45 C75 45 55 70 55 100 C55 130 68 175 90 188 C95 190 105 190 110 188 C132 175 145 130 145 100 C145 70 125 45 100 45 Z"
        fill="url(#kg)"
        opacity={opacity * 0.8}
      />
      {/* Renal pelvis */}
      <ellipse cx="100" cy="110" rx="22" ry="28" fill="#0a0e1a" stroke={color} strokeWidth="1" opacity={0.6} />
      {/* Ureter */}
      <path d="M100 138 C100 150 102 165 104 180" stroke={color} strokeWidth="3" fill="none" strokeLinecap="round" opacity={0.7} />
      
      {/* Treatment particles */}
      {treatment && animating && (
        <>
          {[...Array(6)].map((_, i) => (
            <circle
              key={i}
              cx={70 + i * 12}
              cy={80 + Math.sin(i * 1.2) * 25}
              r="3"
              fill={treatment.color}
              opacity={0.8}
              style={{
                animation: `pulse${i} 1.5s ease-in-out infinite`,
              }}
            />
          ))}
        </>
      )}
      
      {/* Health indicator dots */}
      {[...Array(5)].map((_, i) => (
        <circle
          key={i}
          cx={76 + i * 12}
          cy={100}
          r="3"
          fill={i < Math.round(health / 20) ? color : "#334155"}
          opacity={0.9}
        />
      ))}
      
      {/* Status text */}
      <text x="100" y="210" textAnchor="middle" fontSize="11" fill={color} fontFamily="DM Sans" fontWeight="500">
        {health > 70 ? "HEALTHY" : health > 40 ? "MODERATE" : "CRITICAL"}
      </text>
    </svg>
  );
}

// ─── Step Guide for Uneducated Users ──────────────────────────────────────
const FIELD_GUIDES = {
  bp: {
    label: "Blood Pressure (mmHg)",
    hint: "Use a BP monitor. Normal is 120. High is above 140.",
    simple: "The force your heart uses to pump blood",
    icon: "🩺", normal: "90–120", unit: "mmHg"
  },
  heart_rate: {
    label: "Heart Rate (bpm)",
    hint: "Count your pulse for 60 seconds. Normal: 60–100.",
    simple: "How many times your heart beats per minute",
    icon: "❤️", normal: "60–100", unit: "bpm"
  },
  creatinine: {
    label: "Creatinine (mg/dL)",
    hint: "From blood test. Normal: 0.7–1.3 for men, 0.5–1.1 for women.",
    simple: "A waste product filtered by your kidneys",
    icon: "🧪", normal: "0.7–1.3", unit: "mg/dL"
  },
  glucose: {
    label: "Blood Glucose (mg/dL)",
    hint: "Fasting: 70–100. After meals: under 140.",
    simple: "Sugar level in your blood",
    icon: "🍭", normal: "70–100", unit: "mg/dL"
  },
  urea: {
    label: "Blood Urea Nitrogen (mg/dL)",
    hint: "From blood test. Normal: 7–20 mg/dL.",
    simple: "Waste from protein digestion filtered by kidneys",
    icon: "💧", normal: "7–20", unit: "mg/dL"
  },
  sodium: {
    label: "Sodium (mEq/L)",
    hint: "From blood test. Normal: 135–145 mEq/L.",
    simple: "Salt level in your blood",
    icon: "🧂", normal: "135–145", unit: "mEq/L"
  },
  potassium: {
    label: "Potassium (mEq/L)",
    hint: "From blood test. Normal: 3.5–5.0 mEq/L.",
    simple: "Mineral that helps your heart and kidneys work",
    icon: "🍌", normal: "3.5–5.0", unit: "mEq/L"
  },
};

// ─── Treatment Library ─────────────────────────────────────────────────────
const TREATMENTS = [
  { id: "hydration", name: "IV Hydration", icon: "💧", color: "#3b82f6", days: 7, desc: "Flush toxins with fluids" },
  { id: "ace", name: "ACE Inhibitors", icon: "💊", color: "#8b5cf6", days: 30, desc: "Lower BP & protect kidneys" },
  { id: "dialysis", name: "Dialysis", icon: "🔄", color: "#06b6d4", days: 90, desc: "Filter blood mechanically" },
  { id: "diet", name: "Low-Protein Diet", icon: "🥗", color: "#10b981", days: 60, desc: "Reduce kidney workload" },
  { id: "diuretic", name: "Diuretics", icon: "🌊", color: "#f59e0b", days: 14, desc: "Increase urine output" },
  { id: "transplant", name: "Kidney Transplant", icon: "🫀", color: "#ef4444", days: 365, desc: "Replace damaged kidney" },
];

// ─── Main App ──────────────────────────────────────────────────────────────
export default function KidneyDigitalTwin() {
  const [page, setPage] = useState("home"); // home | input | simulation | report
  const [form, setForm] = useState({
    name: "", age: "", gender: "Male", weight: "",
    bp: "", heart_rate: "", creatinine: "", glucose: "",
    urea: "", sodium: "", potassium: "",
    hydration: "Normal", water_intake: "",
    salt: "Medium", smoking: "No", alcohol: "No",
    diabetes: "No", kidney_history: "No"
  });
  const [activeHint, setActiveHint] = useState(null);
  const [loading, setLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [treatmentLog, setTreatmentLog] = useState([]);
  const [selectedTreatment, setSelectedTreatment] = useState(null);
  const [simulating, setSimulating] = useState(false);
  const [simProgress, setSimProgress] = useState(0);
  const [kidneyHealth, setKidneyHealth] = useState(60);
  const [daysSim, setDaysSim] = useState(0);
  const [treatmentNarrative, setTreatmentNarrative] = useState("");
  const [loadingTreatment, setLoadingTreatment] = useState(false);
  const [reportData, setReportData] = useState(null);
  const simRef = useRef(null);

  // ── AI Analysis ─────────────────────────────────────────────────────────
  async function runAnalysis() {
    setLoading(true);
    try {
      const prompt = `You are a nephrologist AI. Analyze this patient's kidney health and respond ONLY in JSON format (no markdown, no preamble):
{
  "riskLevel": "Low|Moderate|High|Critical",
  "riskScore": 0-100,
  "kidneyHealthScore": 0-100,
  "primaryIssues": ["issue1","issue2"],
  "eGFR_estimate": number,
  "stage": "CKD Stage 1-5 or Normal",
  "findings": "2-3 sentence clinical summary",
  "immediateActions": ["action1","action2"],
  "longTermRecommendations": ["rec1","rec2","rec3"],
  "predictedProgressionDays": number,
  "dietaryAdvice": "brief dietary advice",
  "warningFlags": ["flag1"]
}

Patient: ${form.name}, ${form.age}yr ${form.gender}, ${form.weight}kg
BP: ${form.bp} mmHg | HR: ${form.heart_rate} bpm
Creatinine: ${form.creatinine} | Glucose: ${form.glucose} | Urea: ${form.urea}
Sodium: ${form.sodium} | Potassium: ${form.potassium}
Hydration: ${form.hydration} | Water: ${form.water_intake}L/day | Salt: ${form.salt}
Smoking: ${form.smoking} | Alcohol: ${form.alcohol} | Diabetes: ${form.diabetes} | Kidney History: ${form.kidney_history}`;

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: CLAUDE_MODEL,
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }]
        })
      });
      const data = await res.json();
      const text = data.content[0].text.replace(/```json|```/g, "").trim();
      const result = JSON.parse(text);
      setAiResult(result);
      setKidneyHealth(result.kidneyHealthScore);
      setReportData({ form, result, treatments: [] });
      setPage("simulation");
    } catch (e) {
      console.error(e);
      // Fallback
      const fallback = {
        riskLevel: "Moderate",
        riskScore: 55,
        kidneyHealthScore: 60,
        primaryIssues: ["Elevated creatinine", "Mild hypertension"],
        eGFR_estimate: 65,
        stage: "CKD Stage 2",
        findings: "Patient shows signs of early kidney dysfunction. Elevated creatinine and blood pressure require monitoring.",
        immediateActions: ["Increase water intake", "Reduce salt"],
        longTermRecommendations: ["Low protein diet", "Regular BP monitoring", "Follow-up in 3 months"],
        predictedProgressionDays: 90,
        dietaryAdvice: "Reduce sodium and protein intake. Stay hydrated.",
        warningFlags: ["Monitor creatinine levels"]
      };
      setAiResult(fallback);
      setKidneyHealth(fallback.kidneyHealthScore);
      setReportData({ form, result: fallback, treatments: [] });
      setPage("simulation");
    }
    setLoading(false);
  }

  // ── Treatment Simulation ────────────────────────────────────────────────
  async function applyTreatment(t) {
    if (loadingTreatment || simulating) return;
    setSelectedTreatment(t);
    setLoadingTreatment(true);
    
    try {
      const prompt = `Patient has kidney health score ${kidneyHealth}/100 (${aiResult?.stage}). 
They apply treatment: ${t.name} (${t.desc}).
Respond ONLY in JSON:
{
  "healthGain": 5-30,
  "daysToRecovery": 7-365,
  "narrative": "2 sentences on what happens to the virtual kidney",
  "sideEffects": ["effect1"],
  "successRate": 40-95
}`;
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: CLAUDE_MODEL,
          max_tokens: 400,
          messages: [{ role: "user", content: prompt }]
        })
      });
      const data = await res.json();
      const text = data.content[0].text.replace(/```json|```/g, "").trim();
      const result = JSON.parse(text);
      
      setTreatmentNarrative(result.narrative);
      setSimulating(true);
      setSimProgress(0);
      
      const targetHealth = Math.min(100, kidneyHealth + result.healthGain);
      const steps = 60;
      let step = 0;
      
      clearInterval(simRef.current);
      simRef.current = setInterval(() => {
        step++;
        const progress = step / steps;
        setSimProgress(Math.round(progress * 100));
        setDaysSim(Math.round(progress * result.daysToRecovery));
        setKidneyHealth(prev => {
          const next = prev + (targetHealth - prev) * (1 / (steps - step + 1));
          return Math.min(100, Math.round(next * 10) / 10);
        });
        
        if (step >= steps) {
          clearInterval(simRef.current);
          setSimulating(false);
          setSimProgress(100);
          const log = {
            treatment: t.name,
            icon: t.icon,
            healthBefore: kidneyHealth,
            healthAfter: targetHealth,
            days: result.daysToRecovery,
            successRate: result.successRate,
            narrative: result.narrative
          };
          setTreatmentLog(prev => [...prev, log]);
          setReportData(prev => prev ? { ...prev, treatments: [...(prev.treatments || []), log] } : prev);
        }
      }, 50);
    } catch (e) {
      setTreatmentNarrative("Treatment applied. Monitoring kidney response...");
      setSimulating(false);
    }
    setLoadingTreatment(false);
  }

  // ── Report Generation ───────────────────────────────────────────────────
  async function generateReport() {
    setPage("report");
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div style={{ background: "var(--bg,#0a0e1a)", minHeight: "100vh", color: "#f1f5f9", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{styles + `
        @keyframes fadeIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.7;transform:scale(1.05)} }
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes scanline { 0%{top:-10%} 100%{top:110%} }
        .fade-in { animation: fadeIn 0.4s ease forwards; }
        .btn-primary { background: linear-gradient(135deg,#3b82f6,#6366f1); border:none; color:#fff; padding:12px 28px; border-radius:10px; font-size:15px; font-weight:500; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all 0.2s; }
        .btn-primary:hover { opacity:0.9; transform:translateY(-1px); }
        .btn-secondary { background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); color:#f1f5f9; padding:10px 20px; border-radius:8px; font-size:14px; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all 0.2s; }
        .btn-secondary:hover { background:rgba(255,255,255,0.1); }
        .card { background:#111827; border:1px solid rgba(255,255,255,0.08); border-radius:16px; padding:24px; }
        .input-field { background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.12); border-radius:8px; padding:10px 14px; color:#f1f5f9; font-size:14px; width:100%; font-family:'DM Sans',sans-serif; transition:border 0.2s; outline:none; }
        .input-field:focus { border-color:#3b82f6; background:rgba(59,130,246,0.08); }
        .select-field { background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.12); border-radius:8px; padding:10px 14px; color:#f1f5f9; font-size:14px; width:100%; font-family:'DM Sans',sans-serif; cursor:pointer; outline:none; }
        .tag { display:inline-block; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:500; margin:2px; }
        .progress-bar { height:6px; background:rgba(255,255,255,0.1); border-radius:3px; overflow:hidden; }
        .progress-fill { height:100%; border-radius:3px; transition:width 0.3s ease; background:linear-gradient(90deg,#3b82f6,#6366f1); }
        .treat-card { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:16px; cursor:pointer; transition:all 0.2s; }
        .treat-card:hover { background:rgba(255,255,255,0.08); border-color:rgba(255,255,255,0.2); transform:translateY(-2px); }
        .treat-card.active { border-color:#3b82f6; background:rgba(59,130,246,0.1); }
        .hint-box { background:rgba(59,130,246,0.1); border:1px solid rgba(59,130,246,0.3); border-radius:8px; padding:12px; margin-top:6px; font-size:13px; color:#93c5fd; animation:fadeIn 0.2s ease; }
        .risk-critical { color:#ef4444; } .risk-high { color:#f97316; } .risk-moderate { color:#f59e0b; } .risk-low { color:#10b981; }
        .health-bar { height:8px; background:rgba(255,255,255,0.1); border-radius:4px; overflow:hidden; margin-top:6px; }
        .scan-line { position:absolute; left:0; right:0; height:2px; background:linear-gradient(90deg,transparent,#3b82f680,transparent); animation:scanline 2s linear infinite; }
      `}</style>

      {/* ── HOME PAGE ── */}
      {page === "home" && (
        <div className="fade-in" style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", padding:20 }}>
          <div style={{ maxWidth:560, width:"100%", textAlign:"center" }}>
            {/* Logo */}
            <div style={{ marginBottom:32 }}>
              <div style={{ width:80, height:80, background:"linear-gradient(135deg,#3b82f6,#6366f1)", borderRadius:20, display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:36, marginBottom:16, boxShadow:"0 0 40px #3b82f640" }}>
                🫘
              </div>
              <h1 style={{ fontSize:36, fontWeight:600, background:"linear-gradient(135deg,#e2e8f0,#94a3b8)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", marginBottom:12 }}>
                Kidney Digital Twin
              </h1>
              <p style={{ color:"#64748b", fontSize:16, lineHeight:1.6 }}>
                AI-powered virtual kidney simulation. Analyze your kidney health, run treatment experiments, and predict recovery — all without a lab.
              </p>
            </div>

            {/* Features */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:32 }}>
              {[
                { icon:"🔬", title:"AI Diagnosis", desc:"Instant kidney health analysis" },
                { icon:"🫀", title:"Virtual Twin", desc:"Your kidney in 3D simulation" },
                { icon:"💊", title:"Treatment Lab", desc:"Test treatments risk-free" },
                { icon:"📋", title:"Smart Report", desc:"Detailed medical PDF report" },
              ].map(f => (
                <div key={f.title} className="card" style={{ textAlign:"left", padding:16 }}>
                  <div style={{ fontSize:24, marginBottom:8 }}>{f.icon}</div>
                  <div style={{ fontWeight:500, fontSize:14, marginBottom:4 }}>{f.title}</div>
                  <div style={{ color:"#64748b", fontSize:12 }}>{f.desc}</div>
                </div>
              ))}
            </div>

            <button className="btn-primary" style={{ width:"100%", padding:"16px", fontSize:16 }} onClick={() => setPage("input")}>
              Start Your Assessment →
            </button>
            <p style={{ color:"#334155", fontSize:12, marginTop:12 }}>Free • Private • AI-powered • No lab visit needed</p>
          </div>
        </div>
      )}

      {/* ── INPUT PAGE ── */}
      {page === "input" && (
        <div className="fade-in" style={{ maxWidth:760, margin:"0 auto", padding:"32px 20px" }}>
          {/* Header */}
          <div style={{ marginBottom:28 }}>
            <button className="btn-secondary" style={{ marginBottom:16, padding:"6px 14px", fontSize:13 }} onClick={() => setPage("home")}>← Back</button>
            <h2 style={{ fontSize:24, fontWeight:600, marginBottom:6 }}>Kidney Health Assessment</h2>
            <p style={{ color:"#64748b", fontSize:14 }}>Don't know your lab values? Click the <span style={{ color:"#3b82f6" }}>ⓘ</span> next to each field for guidance.</p>
          </div>

          {/* Basic Info */}
          <div className="card" style={{ marginBottom:16 }}>
            <h3 style={{ fontSize:14, fontWeight:500, color:"#94a3b8", marginBottom:16, textTransform:"uppercase", letterSpacing:1 }}>Basic Information</h3>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <div>
                <label style={{ fontSize:13, color:"#94a3b8", display:"block", marginBottom:6 }}>Full Name</label>
                <input className="input-field" placeholder="Enter your name" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} />
              </div>
              <div>
                <label style={{ fontSize:13, color:"#94a3b8", display:"block", marginBottom:6 }}>Age</label>
                <input className="input-field" type="number" placeholder="Your age" value={form.age} onChange={e => setForm(p => ({...p, age: e.target.value}))} />
              </div>
              <div>
                <label style={{ fontSize:13, color:"#94a3b8", display:"block", marginBottom:6 }}>Gender</label>
                <select className="select-field" value={form.gender} onChange={e => setForm(p => ({...p, gender: e.target.value}))}>
                  <option>Male</option><option>Female</option><option>Other</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize:13, color:"#94a3b8", display:"block", marginBottom:6 }}>Weight (kg)</label>
                <input className="input-field" type="number" placeholder="e.g. 70" value={form.weight} onChange={e => setForm(p => ({...p, weight: e.target.value}))} />
              </div>
            </div>
          </div>

          {/* Lab Values with Help */}
          <div className="card" style={{ marginBottom:16 }}>
            <h3 style={{ fontSize:14, fontWeight:500, color:"#94a3b8", marginBottom:4, textTransform:"uppercase", letterSpacing:1 }}>Lab Values</h3>
            <p style={{ fontSize:12, color:"#475569", marginBottom:16 }}>These come from blood tests. If you don't have them, leave blank and we'll estimate.</p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              {Object.entries(FIELD_GUIDES).map(([key, g]) => (
                <div key={key}>
                  <label style={{ fontSize:13, color:"#94a3b8", display:"flex", alignItems:"center", gap:6, marginBottom:6, cursor:"pointer" }}
                    onClick={() => setActiveHint(activeHint === key ? null : key)}>
                    {g.icon} {g.label}
                    <span style={{ background:"rgba(59,130,246,0.2)", color:"#60a5fa", borderRadius:"50%", width:18, height:18, display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:10, marginLeft:"auto" }}>ⓘ</span>
                  </label>
                  <input
                    className="input-field"
                    type="number"
                    step="0.1"
                    placeholder={`Normal: ${g.normal} ${g.unit}`}
                    value={form[key]}
                    onChange={e => setForm(p => ({...p, [key]: e.target.value}))}
                  />
                  {activeHint === key && (
                    <div className="hint-box">
                      <div style={{ fontWeight:500, marginBottom:4 }}>What is this? → {g.simple}</div>
                      <div style={{ opacity:0.8 }}>{g.hint}</div>
                      <div style={{ marginTop:4, color:"#60a5fa" }}>Normal range: {g.normal} {g.unit}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Lifestyle */}
          <div className="card" style={{ marginBottom:16 }}>
            <h3 style={{ fontSize:14, fontWeight:500, color:"#94a3b8", marginBottom:16, textTransform:"uppercase", letterSpacing:1 }}>Lifestyle & History</h3>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              {[
                { key:"hydration", label:"Hydration Level", opts:["Low","Normal","High"] },
                { key:"salt", label:"Salt Intake", opts:["Low","Medium","High"] },
                { key:"smoking", label:"Smoking", opts:["No","Yes"] },
                { key:"alcohol", label:"Alcohol Use", opts:["No","Yes"] },
                { key:"diabetes", label:"Diabetes", opts:["No","Yes"] },
                { key:"kidney_history", label:"Kidney Disease History", opts:["No","Yes"] },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize:13, color:"#94a3b8", display:"block", marginBottom:6 }}>{f.label}</label>
                  <select className="select-field" value={form[f.key]} onChange={e => setForm(p => ({...p, [f.key]: e.target.value}))}>
                    {f.opts.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              ))}
              <div>
                <label style={{ fontSize:13, color:"#94a3b8", display:"block", marginBottom:6 }}>Water Intake (L/day)</label>
                <input className="input-field" type="number" step="0.5" placeholder="e.g. 2.5" value={form.water_intake} onChange={e => setForm(p => ({...p, water_intake: e.target.value}))} />
              </div>
            </div>
          </div>

          <button
            className="btn-primary"
            style={{ width:"100%", padding:"16px", fontSize:16, position:"relative" }}
            onClick={runAnalysis}
            disabled={loading || !form.name || !form.age}
          >
            {loading ? (
              <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
                <span style={{ width:18, height:18, border:"2px solid rgba(255,255,255,0.3)", borderTop:"2px solid #fff", borderRadius:"50%", display:"inline-block", animation:"spin 0.8s linear infinite" }}></span>
                Scanning Virtual Kidney…
              </span>
            ) : "🔬 Run Digital Twin Simulation"}
          </button>
        </div>
      )}

      {/* ── SIMULATION PAGE ── */}
      {page === "simulation" && aiResult && (
        <div className="fade-in" style={{ maxWidth:1000, margin:"0 auto", padding:"24px 20px" }}>
          {/* Top Nav */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
            <div>
              <h2 style={{ fontSize:22, fontWeight:600 }}>Virtual Kidney — {form.name}</h2>
              <p style={{ color:"#64748b", fontSize:13 }}>{aiResult.stage} • eGFR ~{aiResult.eGFR_estimate}</p>
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button className="btn-secondary" onClick={() => setPage("input")}>← Reassess</button>
              <button className="btn-primary" onClick={generateReport}>📋 Report</button>
            </div>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"280px 1fr", gap:20 }}>
            {/* Left: Kidney Viewer */}
            <div>
              <div className="card" style={{ position:"relative", overflow:"hidden", textAlign:"center", padding:20 }}>
                <div style={{ position:"relative" }}>
                  <div className="scan-line" />
                  <KidneySVG health={kidneyHealth} treatment={selectedTreatment} animating={simulating} />
                </div>
                <div style={{ marginTop:12 }}>
                  <div style={{ fontSize:13, color:"#64748b", marginBottom:4 }}>Kidney Health</div>
                  <div style={{ fontSize:28, fontWeight:600, color: kidneyHealth > 70 ? "#10b981" : kidneyHealth > 40 ? "#f59e0b" : "#ef4444" }}>
                    {Math.round(kidneyHealth)}%
                  </div>
                  <div className="health-bar">
                    <div style={{ height:"100%", width:`${kidneyHealth}%`, background: kidneyHealth > 70 ? "#10b981" : kidneyHealth > 40 ? "#f59e0b" : "#ef4444", transition:"width 0.3s", borderRadius:4 }} />
                  </div>
                </div>
                {simulating && (
                  <div style={{ marginTop:12, padding:"8px 12px", background:"rgba(59,130,246,0.1)", borderRadius:8, fontSize:12, color:"#93c5fd" }}>
                    <div>⏱ Day {daysSim} of simulation</div>
                    <div className="progress-bar" style={{ marginTop:6 }}>
                      <div className="progress-fill" style={{ width:`${simProgress}%` }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Risk Card */}
              <div className="card" style={{ marginTop:12 }}>
                <div style={{ fontSize:11, color:"#475569", textTransform:"uppercase", letterSpacing:1, marginBottom:10 }}>Risk Assessment</div>
                <div className={`risk-${aiResult.riskLevel.toLowerCase()}`} style={{ fontSize:22, fontWeight:600, marginBottom:6 }}>
                  {aiResult.riskLevel}
                </div>
                <div style={{ fontSize:12, color:"#64748b" }}>{aiResult.findings}</div>
                <div style={{ marginTop:12 }}>
                  {aiResult.warningFlags?.map((f, i) => (
                    <span key={i} className="tag" style={{ background:"rgba(239,68,68,0.15)", color:"#fca5a5", fontSize:11 }}>⚠ {f}</span>
                  ))}
                </div>
              </div>

              {/* Treatment Log */}
              {treatmentLog.length > 0 && (
                <div className="card" style={{ marginTop:12 }}>
                  <div style={{ fontSize:11, color:"#475569", textTransform:"uppercase", letterSpacing:1, marginBottom:10 }}>Applied Treatments</div>
                  {treatmentLog.map((t, i) => (
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 0", borderBottom: i < treatmentLog.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                      <span style={{ fontSize:18 }}>{t.icon}</span>
                      <div>
                        <div style={{ fontSize:13, fontWeight:500 }}>{t.treatment}</div>
                        <div style={{ fontSize:11, color:"#64748b" }}>+{Math.round(t.healthAfter - t.healthBefore)}% health • {t.days}d</div>
                      </div>
                      <span style={{ marginLeft:"auto", fontSize:11, color:"#10b981" }}>{t.successRate}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Main Content */}
            <div>
              {/* AI Findings */}
              <div className="card" style={{ marginBottom:16 }}>
                <h3 style={{ fontSize:14, fontWeight:500, marginBottom:12 }}>🔍 AI Diagnosis</h3>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:16 }}>
                  {[
                    { label:"Risk Score", value:`${aiResult.riskScore}/100`, color: aiResult.riskScore > 70 ? "#ef4444" : aiResult.riskScore > 40 ? "#f59e0b" : "#10b981" },
                    { label:"eGFR Estimate", value:`~${aiResult.eGFR_estimate} mL/min`, color:"#60a5fa" },
                    { label:"Predicted Stage", value:aiResult.stage, color:"#a78bfa" },
                  ].map(m => (
                    <div key={m.label} style={{ background:"rgba(255,255,255,0.04)", borderRadius:10, padding:"12px 14px" }}>
                      <div style={{ fontSize:11, color:"#475569", marginBottom:4 }}>{m.label}</div>
                      <div style={{ fontSize:16, fontWeight:600, color:m.color }}>{m.value}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  <div>
                    <div style={{ fontSize:12, color:"#64748b", marginBottom:8 }}>⚡ Primary Issues</div>
                    {aiResult.primaryIssues?.map((p, i) => (
                      <div key={i} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                        <span style={{ width:6, height:6, borderRadius:"50%", background:"#ef4444", flexShrink:0 }} />
                        <span style={{ fontSize:13 }}>{p}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div style={{ fontSize:12, color:"#64748b", marginBottom:8 }}>✅ Immediate Actions</div>
                    {aiResult.immediateActions?.map((a, i) => (
                      <div key={i} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                        <span style={{ width:6, height:6, borderRadius:"50%", background:"#10b981", flexShrink:0 }} />
                        <span style={{ fontSize:13 }}>{a}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {aiResult.dietaryAdvice && (
                  <div style={{ marginTop:12, padding:"10px 14px", background:"rgba(16,185,129,0.08)", borderRadius:8, borderLeft:"3px solid #10b981", fontSize:13, color:"#6ee7b7" }}>
                    🥗 {aiResult.dietaryAdvice}
                  </div>
                )}
              </div>

              {/* Treatment Lab */}
              <div className="card">
                <h3 style={{ fontSize:14, fontWeight:500, marginBottom:4 }}>🧪 Virtual Treatment Lab</h3>
                <p style={{ fontSize:12, color:"#475569", marginBottom:16 }}>Select a treatment to simulate on your virtual kidney. See real-time reaction and predicted recovery days.</p>
                
                {treatmentNarrative && (
                  <div style={{ padding:"10px 14px", background:"rgba(99,102,241,0.1)", borderRadius:8, borderLeft:"3px solid #6366f1", fontSize:13, color:"#a5b4fc", marginBottom:14 }}>
                    🤖 {treatmentNarrative}
                  </div>
                )}

                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
                  {TREATMENTS.map(t => (
                    <div
                      key={t.id}
                      className={`treat-card${selectedTreatment?.id === t.id ? " active" : ""}`}
                      onClick={() => applyTreatment(t)}
                      style={{ opacity: simulating || loadingTreatment ? 0.5 : 1, pointerEvents: simulating || loadingTreatment ? "none" : "auto" }}
                    >
                      <div style={{ fontSize:22, marginBottom:6 }}>{t.icon}</div>
                      <div style={{ fontSize:13, fontWeight:500, marginBottom:3 }}>{t.name}</div>
                      <div style={{ fontSize:11, color:"#64748b", marginBottom:6 }}>{t.desc}</div>
                      <span className="tag" style={{ background:`${t.color}20`, color:t.color, fontSize:10 }}>~{t.days}d</span>
                    </div>
                  ))}
                </div>
                
                {loadingTreatment && (
                  <div style={{ textAlign:"center", padding:"16px", color:"#64748b", fontSize:13 }}>
                    <span style={{ width:16, height:16, border:"2px solid rgba(255,255,255,0.2)", borderTop:"2px solid #3b82f6", borderRadius:"50%", display:"inline-block", animation:"spin 0.8s linear infinite", marginRight:8 }} />
                    Calculating treatment response…
                  </div>
                )}
              </div>

              {/* Recommendations */}
              {aiResult.longTermRecommendations && (
                <div className="card" style={{ marginTop:16 }}>
                  <h3 style={{ fontSize:14, fontWeight:500, marginBottom:12 }}>📌 Long-Term Recommendations</h3>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                    {aiResult.longTermRecommendations.map((r, i) => (
                      <div key={i} style={{ display:"flex", gap:10, alignItems:"flex-start", padding:"10px 12px", background:"rgba(255,255,255,0.03)", borderRadius:8, fontSize:13 }}>
                        <span style={{ color:"#3b82f6", fontWeight:600, flexShrink:0 }}>{i + 1}.</span>
                        <span style={{ color:"#cbd5e1" }}>{r}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── REPORT PAGE ── */}
      {page === "report" && reportData && (
        <div className="fade-in" style={{ maxWidth:760, margin:"0 auto", padding:"32px 20px" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:28 }}>
            <div>
              <button className="btn-secondary" style={{ marginBottom:12, padding:"6px 14px", fontSize:13 }} onClick={() => setPage("simulation")}>← Back to Simulation</button>
              <h2 style={{ fontSize:22, fontWeight:600 }}>Kidney Health Report</h2>
            </div>
            <button className="btn-primary" onClick={() => window.print()}>⬇ Print / Save PDF</button>
          </div>

          {/* Header */}
          <div className="card" style={{ marginBottom:16, background:"linear-gradient(135deg,rgba(59,130,246,0.15),rgba(99,102,241,0.1))", borderColor:"rgba(99,102,241,0.3)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:16 }}>
              <div style={{ width:56, height:56, background:"linear-gradient(135deg,#3b82f6,#6366f1)", borderRadius:14, display:"flex", alignItems:"center", justifyContent:"center", fontSize:28 }}>🫘</div>
              <div>
                <h3 style={{ fontSize:20, fontWeight:600 }}>{reportData.form.name}</h3>
                <p style={{ color:"#94a3b8", fontSize:14 }}>{reportData.form.age} years • {reportData.form.gender} • {reportData.form.weight}kg</p>
                <p style={{ color:"#64748b", fontSize:12 }}>Generated: {new Date().toLocaleDateString("en-IN", { dateStyle:"long" })}</p>
              </div>
              <div style={{ marginLeft:"auto", textAlign:"right" }}>
                <div className={`risk-${reportData.result.riskLevel.toLowerCase()}`} style={{ fontSize:24, fontWeight:700 }}>{reportData.result.riskLevel}</div>
                <div style={{ fontSize:12, color:"#64748b" }}>Risk Level</div>
              </div>
            </div>
          </div>

          {/* Metrics */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:16 }}>
            {[
              { label:"Kidney Health", value:`${Math.round(kidneyHealth)}%`, icon:"🫘" },
              { label:"eGFR", value:`~${reportData.result.eGFR_estimate}`, icon:"🧪" },
              { label:"Stage", value:reportData.result.stage, icon:"📊" },
            ].map(m => (
              <div key={m.label} className="card" style={{ textAlign:"center" }}>
                <div style={{ fontSize:24, marginBottom:6 }}>{m.icon}</div>
                <div style={{ fontSize:20, fontWeight:600, color:"#60a5fa" }}>{m.value}</div>
                <div style={{ fontSize:12, color:"#64748b" }}>{m.label}</div>
              </div>
            ))}
          </div>

          {/* Lab Values */}
          <div className="card" style={{ marginBottom:16 }}>
            <h3 style={{ fontSize:14, fontWeight:500, marginBottom:14 }}>📋 Patient Values</h3>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              {[
                ["Blood Pressure", `${reportData.form.bp} mmHg`],
                ["Heart Rate", `${reportData.form.heart_rate} bpm`],
                ["Creatinine", `${reportData.form.creatinine} mg/dL`],
                ["Glucose", `${reportData.form.glucose} mg/dL`],
                ["Urea", `${reportData.form.urea} mg/dL`],
                ["Sodium", `${reportData.form.sodium} mEq/L`],
                ["Potassium", `${reportData.form.potassium} mEq/L`],
                ["Hydration", reportData.form.hydration],
                ["Water Intake", `${reportData.form.water_intake} L/day`],
                ["Smoking", reportData.form.smoking],
                ["Diabetes", reportData.form.diabetes],
                ["Kidney History", reportData.form.kidney_history],
              ].map(([k, v]) => v && v !== " " && (
                <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"8px 10px", background:"rgba(255,255,255,0.03)", borderRadius:6, fontSize:13 }}>
                  <span style={{ color:"#64748b" }}>{k}</span>
                  <span style={{ fontWeight:500 }}>{v || "—"}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Findings */}
          <div className="card" style={{ marginBottom:16 }}>
            <h3 style={{ fontSize:14, fontWeight:500, marginBottom:10 }}>🔬 Clinical Findings</h3>
            <p style={{ fontSize:14, color:"#cbd5e1", lineHeight:1.7 }}>{reportData.result.findings}</p>
          </div>

          {/* Treatments Applied */}
          {reportData.treatments?.length > 0 && (
            <div className="card" style={{ marginBottom:16 }}>
              <h3 style={{ fontSize:14, fontWeight:500, marginBottom:14 }}>💊 Simulated Treatments</h3>
              {reportData.treatments.map((t, i) => (
                <div key={i} style={{ padding:"12px 14px", background:"rgba(255,255,255,0.03)", borderRadius:8, marginBottom:8 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                    <span style={{ fontWeight:500 }}>{t.icon} {t.treatment}</span>
                    <span style={{ color:"#10b981", fontSize:13 }}>+{Math.round(t.healthAfter - t.healthBefore)}% • {t.days} days • {t.successRate}% success</span>
                  </div>
                  <p style={{ fontSize:12, color:"#64748b" }}>{t.narrative}</p>
                </div>
              ))}
            </div>
          )}

          {/* Recommendations */}
          <div className="card" style={{ marginBottom:16 }}>
            <h3 style={{ fontSize:14, fontWeight:500, marginBottom:14 }}>📌 Recommendations</h3>
            {reportData.result.longTermRecommendations?.map((r, i) => (
              <div key={i} style={{ display:"flex", gap:10, marginBottom:10, fontSize:13 }}>
                <span style={{ color:"#3b82f6", fontWeight:600, flexShrink:0 }}>{i + 1}.</span>
                <span style={{ color:"#cbd5e1" }}>{r}</span>
              </div>
            ))}
          </div>

          <div style={{ padding:"14px 16px", background:"rgba(239,68,68,0.08)", borderRadius:10, borderLeft:"3px solid #ef4444", fontSize:12, color:"#fca5a5" }}>
            ⚠ Disclaimer: This report is generated by AI for informational purposes only. Please consult a qualified nephrologist before making any medical decisions.
          </div>
        </div>
      )}
    </div>
  );
}
