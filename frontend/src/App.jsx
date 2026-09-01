import { useEffect, useMemo, useState } from "react";

const API = "http://localhost:8000";

const STEPS = [
  { id: "patient", label: "Patient" },
  { id: "consult", label: "Consult" },
  { id: "transcribe", label: "Notes" },
  { id: "extract", label: "Extract" },
  { id: "reconcile", label: "Reconcile" },
  { id: "check", label: "Safety" },
  { id: "approve", label: "Approve" },
  { id: "summary", label: "Record" },
];

const DEMO_PATIENT = { name: "Rajesh Kumar", age: "55", sex: "M" };

const SCENARIOS = [
  {
    id: "diabetes",
    title: "Diabetes + methi",
    tag: "High risk demo",
    patient: DEMO_PATIENT,
    text: "Patient is diabetic and complains of fatigue. Currently taking Metformin 500mg twice daily and methi 1 tsp daily.",
  },
  {
    id: "warfarin",
    title: "Warfarin + turmeric",
    tag: "Bleeding risk",
    patient: { name: "Anita Desai", age: "62", sex: "F" },
    text: "Patient is on Warfarin 5mg once daily for atrial fibrillation. She also takes turmeric 1 tsp daily in milk.",
  },
  {
    id: "thyroid",
    title: "Thyroid + ashwagandha",
    tag: "Moderate risk",
    patient: { name: "Suresh Iyer", age: "48", sex: "M" },
    text: "Patient has hypothyroidism and takes Levothyroxine 50mcg in the morning. Mentions ashwagandha capsules daily.",
  },
];

const KNOWLEDGE_SPOTLIGHT = [
  {
    a: "Metformin",
    b: "Fenugreek (methi)",
    risk: "high",
    effect: "Additive hypoglycemia",
    why: "Both lower blood glucose. Combined use can push sugar too low.",
  },
  {
    a: "Warfarin",
    b: "Turmeric",
    risk: "high",
    effect: "Increased bleeding risk",
    why: "Curcumin has antiplatelet effects on top of anticoagulation.",
  },
  {
    a: "Levothyroxine",
    b: "Ashwagandha",
    risk: "moderate",
    effect: "Excess thyroid stimulation",
    why: "Ashwagandha may raise thyroid hormone on top of replacement therapy.",
  },
];

const Ic = {
  Dashboard: (p) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" {...p}>
      <rect x="3" y="3" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="2" />
      <rect x="13" y="3" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="2" />
      <rect x="3" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="2" />
      <rect x="13" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  Plus: (p) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  Users: (p) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" {...p}>
      <circle cx="9" cy="8" r="3.2" stroke="currentColor" strokeWidth="2" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="17" cy="9" r="2.6" stroke="currentColor" strokeWidth="2" />
      <path d="M15.5 14a5.2 5.2 0 0 1 5.5 5.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  Bell: (p) => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M10 21a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  Pill: (p) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" {...p}>
      <rect x="3" y="9" width="18" height="6" rx="3" stroke="currentColor" strokeWidth="2" />
      <path d="M12 9v6" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  Alert: (p) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M10.3 3.9 2 18a2 2 0 0 0 1.7 3h16.6A2 2 0 0 0 22 18L13.7 3.9a2 2 0 0 0-3.4 0Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M12 9v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="16.5" r="1" fill="currentColor" />
    </svg>
  ),
  Check: (p) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  File: (p) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M6 2h9l5 5v15H6V2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M15 2v5h5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  ),
  Shield: (p) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M12 3l8 3.2v6.3c0 4.7-3.2 7.8-8 9.5-4.8-1.7-8-4.8-8-9.5V6.2L12 3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  ),
  Leaf: (p) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M5 19c8-1 14-8 14-16-8 0-15 6-16 14 3-2 6-3 9-3" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  ),
  Spark: (p) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.2 6.2l2.8 2.8M15 15l2.8 2.8M17.8 6.2 15 9M9 15l-2.8 2.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
};

function riskClass(risk) {
  const r = String(risk || "").toLowerCase();
  if (r === "high") return "high";
  if (r === "moderate") return "moderate";
  if (r === "low") return "low";
  return "unknown";
}

function Chip({ kind, children }) {
  return <span className={`chip chip-${kind}`}>{children}</span>;
}

function JsonToggle({ data, label = "Technical payload" }) {
  const [open, setOpen] = useState(false);
  if (!data) return null;
  return (
    <div className="json-toggle">
      <button className="btn ghost" type="button" onClick={() => setOpen((v) => !v)}>
        {open ? "Hide" : "Show"} {label}
      </button>
      {open && <pre className="json-block">{JSON.stringify(data, null, 2)}</pre>}
    </div>
  );
}

function MergeVisual() {
  return (
    <div className="merge">
      <svg width="160" height="72" viewBox="0 0 160 72" fill="none">
        <path className="merge-path allopathy" d="M8 14 C 70 14, 70 36, 148 36" />
        <path className="merge-path ayush" d="M8 58 C 70 58, 70 36, 148 36" />
        <circle cx="148" cy="36" r="7" fill="#0F2A24" />
        <circle cx="148" cy="36" r="3" fill="#f8f3e8" />
      </svg>
      <div className="merge-labels">
        <span><span className="dot allopathy" /> Allopathy stream</span>
        <span><span className="dot ayush" /> AYUSH / herbal stream</span>
        <span className="merge-note">Unified profile before safety check</span>
      </div>
    </div>
  );
}

function EntityBoard({ entities }) {
  if (!entities) return null;
  const meds = entities.medications || [];
  return (
    <div className="entity-grid">
      <div className="entity-col">
        <h3>Symptoms</h3>
        <div className="chip-row">
          {(entities.symptoms || []).length === 0 && <span className="muted">None extracted</span>}
          {(entities.symptoms || []).map((s) => <Chip key={s} kind="symptom">{s}</Chip>)}
        </div>
      </div>
      <div className="entity-col">
        <h3>Conditions</h3>
        <div className="chip-row">
          {(entities.conditions || []).length === 0 && <span className="muted">None extracted</span>}
          {(entities.conditions || []).map((s) => <Chip key={s} kind="condition">{s}</Chip>)}
        </div>
      </div>
      <div className="entity-col span-2">
        <h3>Medications mentioned</h3>
        <div className="med-mini-grid">
          {meds.length === 0 && <span className="muted">None extracted</span>}
          {meds.map((m, i) => (
            <div className={`med-mini ${m.system || "unknown"}`} key={`${m.name}-${i}`}>
              <div className="med-name">{m.name}</div>
              <div className="med-meta">
                {m.dosage || "Dose not stated"} · {m.frequency || "frequency not stated"}
              </div>
              <Chip kind={m.system === "ayush" ? "ayush" : m.system === "allopathy" ? "allopathy" : "unknown"}>
                {m.system || "unclassified"}
              </Chip>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MedColumn({ title, kind, meds }) {
  return (
    <div className={`med-column ${kind}`}>
      <div className="med-column-head">
        <span className={`dot ${kind}`} />
        <h3>{title}</h3>
        <span className="count">{meds.length}</span>
      </div>
      {meds.length === 0 && <div className="empty-soft">None in this stream</div>}
      {meds.map((m, i) => (
        <div className="med-card" key={m.norm_id || m.original || i}>
          <div className="med-card-top">
            <strong>{m.norm_name || m.original || m.name}</strong>
            {m.confidence && <Chip kind={m.flagged ? "unknown" : "success"}>{m.confidence}</Chip>}
          </div>
          {m.original && m.norm_name && m.original !== m.norm_name && (
            <div className="med-meta">Spoken / written as “{m.original}”</div>
          )}
          <div className="med-meta">{[m.dosage, m.frequency].filter(Boolean).join(" · ") || "No dose captured"}</div>
        </div>
      ))}
    </div>
  );
}

function AlertCard({ alert }) {
  const [open, setOpen] = useState(true);
  const risk = riskClass(alert.risk);
  const aName = alert.drug_a?.name || alert.drug_a?.original;
  const bName = alert.drug_b?.name || alert.drug_b?.original;
  const evidence = alert.evidence || [];

  return (
    <article className={`alert-card risk-${risk}`}>
      <button className="alert-head" type="button" onClick={() => setOpen((v) => !v)}>
        <div>
          <div className="alert-kicker">
            <span className={`badge ${risk === "high" ? "danger" : risk === "moderate" ? "warn" : risk === "low" ? "info" : "pending"}`}>
              {String(alert.risk || "unknown").toUpperCase()} RISK
            </span>
            {alert.condition_match && <Chip kind="condition">Matches patient condition</Chip>}
            {alert.interaction_id === "unknown-medication-flag" && <Chip kind="unknown">Needs identification</Chip>}
          </div>
          <h3>
            {aName && bName ? `${aName}  ×  ${bName}` : alert.effect || "Safety flag"}
          </h3>
          <p>{alert.effect}</p>
        </div>
        <span className="chevron">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="alert-body">
          {alert.mechanism && (
            <section>
              <h4>Mechanism</h4>
              <p>{alert.mechanism}</p>
            </section>
          )}
          {alert.recommendation && (
            <section className="reco">
              <h4>Clinician action</h4>
              <p>{alert.recommendation}</p>
            </section>
          )}
          {alert.matched_conditions?.length > 0 && (
            <div className="chip-row">
              {alert.matched_conditions.map((c) => <Chip key={c} kind="condition">{c}</Chip>)}
            </div>
          )}
          {evidence.length > 0 && (
            <section>
              <h4>Evidence (knowledge graph, not the model)</h4>
              <ul className="evidence-list">
                {evidence.map((e, i) => (
                  <li key={i}>
                    <strong>{e.source || "Source"}</strong>
                    <span>{e.ref || e.reference}</span>
                    {e.note && <em>{e.note}</em>}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </article>
  );
}

function FhirView({ bundle }) {
  if (!bundle) return null;
  const entries = bundle.entry || [];
  const counts = entries.reduce((acc, item) => {
    const type = item.resource?.resourceType || "Unknown";
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="fhir-wrap">
      <div className="fhir-banner">
        <Ic.File />
        <div>
          <strong>ABDM-ready FHIR R4 bundle</strong>
          <div className="muted">{bundle.resourceType} · {bundle.type} · {entries.length} resources</div>
        </div>
      </div>
      <div className="fhir-counts">
        {Object.entries(counts).map(([k, v]) => (
          <div className="fhir-pill" key={k}><b>{v}</b> {k}</div>
        ))}
      </div>
      <div className="fhir-list">
        {entries.map((item, i) => {
          const r = item.resource || {};
          return (
            <div className="fhir-card" key={i}>
              <div className="fhir-type">{r.resourceType}</div>
              <div className="fhir-id">{r.id || r.fullUrl || "—"}</div>
              {r.resourceType === "Patient" && (
                <p>{r.name?.[0]?.text || "Patient"} · {r.gender}</p>
              )}
              {r.resourceType === "Encounter" && <p>{r.status} · {r.class?.display || "visit"}</p>}
              {r.resourceType === "MedicationStatement" && (
                <p>{r.medicationCodeableConcept?.text} · {r.dosage?.[0]?.text || ""}</p>
              )}
              {r.resourceType === "DetectedIssue" && (
                <p>{r.severity} · {r.detail || r.code?.text || "Interaction"}</p>
              )}
            </div>
          );
        })}
      </div>
      <JsonToggle data={bundle} label="raw FHIR JSON" />
    </div>
  );
}

function Sidebar({ view, setView, backendOk }) {
  const items = [
    { id: "dashboard", label: "Dashboard", icon: Ic.Dashboard },
    { id: "consultation", label: "New Consultation", icon: Ic.Plus },
    { id: "patients", label: "Patients", icon: Ic.Users },
    { id: "knowledge", label: "Safety graph", icon: Ic.Shield },
  ];
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="logo-mark">स</div>
        <div>
          <div className="name">Samanvaya</div>
          <div className="sub">Allopathy × AYUSH safety</div>
        </div>
      </div>

      <div className="nav-section-label">Workspace</div>
      {items.map((it) => (
        <button key={it.id} className={`nav-item ${view === it.id ? "active" : ""}`} onClick={() => setView(it.id)}>
          <it.icon /> {it.label}
        </button>
      ))}

      <div className="sidebar-footer">
        <div className={`health-dot ${backendOk ? "ok" : "down"}`}>
          <span /> {backendOk ? "Engine online · :8000" : "Backend offline"}
        </div>
        <div className="doctor-chip">
          <div className="doctor-avatar">DR</div>
          <div>
            <div className="who">Dr. Attending</div>
            <div className="role">SIH 2026 demo console</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function Topbar({ title, sub, alertCount }) {
  return (
    <div className="topbar">
      <div>
        <div className="page-title">{title}</div>
        <div className="page-sub">{sub}</div>
      </div>
      <div className="topbar-right">
        <div className="live-pill"><span className="pulse" /> Live session</div>
        <div className="icon-btn" title="Interaction alerts">
          <Ic.Bell />
          {alertCount > 0 && <span className="dot-badge">{alertCount}</span>}
        </div>
        <div className="doctor-avatar">DR</div>
      </div>
    </div>
  );
}

function Dashboard({ consultations, setView, startScenario }) {
  const approved = consultations.filter((c) => c.status === "approved").length;
  const alerts = consultations.filter((c) => c.hasAlert).length;

  return (
    <div className="content">
      <section className="hero">
        <div>
          <div className="hero-kicker">Smart India Hackathon 2026 · Clinical MVP</div>
          <h1>Catch dangerous Allopathy + AYUSH combinations before they reach the patient.</h1>
          <p>
            Doctors often hear brand names, Hindi names, and home remedies in the same consult.
            Samanvaya extracts them, reconciles both systems, and checks a curated knowledge graph —
            the model proposes, the graph decides.
          </p>
          <div className="hero-actions">
            <button className="btn" onClick={() => startScenario(SCENARIOS[0])}><Ic.Spark /> Run flagship demo</button>
            <button className="btn secondary" onClick={() => setView("consultation")}>Start blank consult</button>
          </div>
        </div>
        <div className="hero-card">
          <div className="hero-pair">
            <div className="pair-box allopathy"><Ic.Pill /> Metformin</div>
            <div className="pair-x">×</div>
            <div className="pair-box ayush"><Ic.Leaf /> Methi</div>
          </div>
          <div className="badge danger">HIGH RISK · hypoglycemia</div>
          <p className="hero-card-note">Golden case for today: diabetes patient taking methi with metformin.</p>
        </div>
      </section>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="icon-wrap" style={{ background: "var(--allopathy-bg)", color: "var(--allopathy)" }}><Ic.Users /></div>
          <div className="val">{consultations.length}</div>
          <div className="label">Consultations this session</div>
        </div>
        <div className="stat-card">
          <div className="icon-wrap" style={{ background: "var(--success-bg)", color: "var(--success)" }}><Ic.Check /></div>
          <div className="val">{approved}</div>
          <div className="label">FHIR records approved</div>
        </div>
        <div className="stat-card">
          <div className="icon-wrap" style={{ background: "var(--danger-bg)", color: "var(--danger)" }}><Ic.Alert /></div>
          <div className="val">{alerts}</div>
          <div className="label">Interaction alerts</div>
        </div>
        <div className="stat-card">
          <div className="icon-wrap" style={{ background: "var(--ayush-bg)", color: "var(--ayush)" }}><Ic.Shield /></div>
          <div className="val">Graph</div>
          <div className="label">Verdicts from knowledge, not LLM</div>
        </div>
      </div>

      <div className="two-col">
        <div className="panel">
          <div className="panel-head">
            <div>
              <h2>Recent consultations</h2>
              <div className="sub">Session records created in this browser</div>
            </div>
            <button className="btn" onClick={() => setView("consultation")}><Ic.Plus /> New</button>
          </div>
          {consultations.length === 0 ? (
            <div className="empty-state">No consultations yet. Run the flagship demo to populate this table in under a minute.</div>
          ) : (
            <table className="table">
              <thead>
                <tr><th>Patient</th><th>Age / Sex</th><th>Status</th><th>Safety</th></tr>
              </thead>
              <tbody>
                {consultations.map((c) => (
                  <tr key={c.consultId}>
                    <td className="strong">{c.name}</td>
                    <td>{c.age} / {c.sex}</td>
                    <td><span className={`badge ${c.status === "approved" ? "success" : "pending"}`}>{c.status}</span></td>
                    <td><span className={`badge ${c.hasAlert ? "danger" : "success"}`}>{c.hasAlert ? "Alert found" : "Clear"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="panel">
          <div className="panel-head">
            <div>
              <h2>One-click demo scripts</h2>
              <div className="sub">Pre-filled patients and consult notes</div>
            </div>
          </div>
          <div className="scenario-list">
            {SCENARIOS.map((s) => (
              <button key={s.id} className="scenario" type="button" onClick={() => startScenario(s)}>
                <div>
                  <strong>{s.title}</strong>
                  <span>{s.patient.name}, {s.patient.age}</span>
                </div>
                <Chip kind={s.id === "thyroid" ? "warn" : "danger"}>{s.tag}</Chip>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PatientsView({ consultations }) {
  const unique = useMemo(() => {
    const map = new Map();
    consultations.forEach((c) => {
      if (!map.has(c.patientId)) map.set(c.patientId, c);
    });
    return [...map.values()];
  }, [consultations]);

  return (
    <div className="content">
      <div className="panel">
        <div className="panel-head">
          <div>
            <h2>Patients</h2>
            <div className="sub">Registered in this live session (in-memory store)</div>
          </div>
        </div>
        {unique.length === 0 ? (
          <div className="empty-state">No patients registered yet.</div>
        ) : (
          <table className="table">
            <thead><tr><th>Name</th><th>Age</th><th>Sex</th><th>Patient ID</th></tr></thead>
            <tbody>
              {unique.map((c) => (
                <tr key={c.patientId}>
                  <td className="strong">{c.name}</td>
                  <td>{c.age}</td>
                  <td>{c.sex}</td>
                  <td className="mono">{c.patientId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function KnowledgeView() {
  return (
    <div className="content">
      <div className="panel">
        <div className="panel-head">
          <div>
            <h2>Safety knowledge graph</h2>
            <div className="sub">Curated herb–drug pairs. The LLM never votes on these verdicts.</div>
          </div>
        </div>
        <div className="kg-grid">
          {KNOWLEDGE_SPOTLIGHT.map((k) => (
            <article className={`kg-card risk-${k.risk}`} key={k.a}>
              <div className="kg-pair">
                <span className="pair-box allopathy">{k.a}</span>
                <span className="pair-x">×</span>
                <span className="pair-box ayush">{k.b}</span>
              </div>
              <span className={`badge ${k.risk === "high" ? "danger" : "warn"}`}>{k.risk} risk</span>
              <h3>{k.effect}</h3>
              <p>{k.why}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

function ConsultationFlow({ preset, onComplete }) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [consent, setConsent] = useState(true);

  const [patientForm, setPatientForm] = useState(preset?.patient || { name: "", age: "", sex: "M" });
  const [patientId, setPatientId] = useState("");
  const [consultId, setConsultId] = useState("");
  const [transcript, setTranscript] = useState(preset?.text || SCENARIOS[0].text);
  const [consult, setConsult] = useState(null);
  const [fhir, setFhir] = useState(null);
  const [reviewed, setReviewed] = useState(false);

  useEffect(() => {
    if (!preset) return;
    setPatientForm(preset.patient);
    setTranscript(preset.text);
    setStep(0);
    setPatientId("");
    setConsultId("");
    setConsult(null);
    setFhir(null);
    setReviewed(false);
    setError("");
  }, [preset]);

  async function call(path, method = "POST", body) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}${path}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || `Request failed (${res.status})`);
      return data;
    } catch (e) {
      setError(e.message || "Cannot reach the engine. Start the backend on port 8000.");
      throw e;
    } finally {
      setLoading(false);
    }
  }

  const entities = consult?.entities;
  const profile = consult?.med_profile;
  const alerts = consult?.alerts || [];
  const realAlerts = alerts.filter((a) => a.interaction_id !== "unknown-medication-flag");
  const hasAlert = realAlerts.length > 0;

  async function createPatient() {
    const data = await call("/patients", "POST", {
      name: patientForm.name,
      age: Number(patientForm.age),
      sex: patientForm.sex,
    });
    setPatientId(data.id);
    setStep(1);
  }

  async function startConsult() {
    const data = await call("/consult", "POST", { patient_id: patientId, consent });
    setConsultId(data.id);
    setConsult(data);
    setStep(2);
  }

  async function submitTranscript() {
    const data = await call(`/consult/${consultId}/transcribe`, "POST", { text: transcript });
    setConsult(data);
    setStep(3);
  }

  async function extractEntities() {
    const data = await call(`/consult/${consultId}/extract`, "POST");
    setConsult(data);
    setStep(4);
  }

  async function reconcileMeds() {
    const data = await call(`/consult/${consultId}/reconcile`, "POST");
    setConsult(data);
    setStep(5);
  }

  async function checkInteractions() {
    const data = await call(`/consult/${consultId}/check`, "POST");
    setConsult(data);
    setStep(6);
  }

  async function approve() {
    const data = await call(`/consult/${consultId}/approve`, "POST");
    setFhir(data);
    onComplete({
      consultId,
      patientId,
      name: patientForm.name,
      age: patientForm.age,
      sex: patientForm.sex,
      status: "approved",
      hasAlert,
    });
    setStep(7);
  }

  async function getSummary() {
    const data = await call(`/consult/${consultId}`, "GET");
    setConsult(data);
    if (data.fhir_bundle) setFhir(data.fhir_bundle);
  }

  return (
    <div className="content consult-layout">
      <div className="panel flow-panel">
        <div className="h-stepper">
          {STEPS.map((s, i) => (
            <div key={s.id} className="h-step-wrap">
              <button
                type="button"
                className={`h-step ${i === step ? "active" : ""} ${i < step ? "done" : ""}`}
                onClick={() => { if (i < step) setStep(i); }}
              >
                <div className="circle">{i < step ? "✓" : i + 1}</div>
                <div className="label">{s.label}</div>
              </button>
              {i < STEPS.length - 1 && <div className={`h-line ${i < step ? "done" : ""}`} />}
            </div>
          ))}
        </div>

        {step === 0 && (
          <>
            <h2>Register patient</h2>
            <p className="sub">Use a demo script or type a live case. Consent is recorded before extraction.</p>
            <div className="scenario-row">
              {SCENARIOS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`mini-script ${patientForm.name === s.patient.name ? "on" : ""}`}
                  onClick={() => { setPatientForm(s.patient); setTranscript(s.text); }}
                >
                  {s.title}
                </button>
              ))}
            </div>
            <div className="field">
              <label>Full name</label>
              <input value={patientForm.name} onChange={(e) => setPatientForm({ ...patientForm, name: e.target.value })} placeholder="Rajesh Kumar" />
            </div>
            <div className="row">
              <div className="field">
                <label>Age</label>
                <input type="number" value={patientForm.age} onChange={(e) => setPatientForm({ ...patientForm, age: e.target.value })} placeholder="55" />
              </div>
              <div className="field">
                <label>Sex</label>
                <select value={patientForm.sex} onChange={(e) => setPatientForm({ ...patientForm, sex: e.target.value })}>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="O">Other</option>
                </select>
              </div>
            </div>
            <div className="footer-actions">
              <button className="btn" disabled={loading || !patientForm.name || !patientForm.age} onClick={createPatient}>
                {loading ? "Creating…" : "Create patient"}
              </button>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h2>Open consultation</h2>
            <p className="sub">Patient is in the in-memory store. Record consent, then start.</p>
            <div className="id-card">
              <div><span>Patient</span><strong>{patientForm.name}</strong></div>
              <div><span>ID</span><strong className="mono">{patientId}</strong></div>
              <div><span>Age / sex</span><strong>{patientForm.age} / {patientForm.sex}</strong></div>
            </div>
            <label className="consent">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              Patient consents to processing of consult notes for medication safety.
            </label>
            <div className="footer-actions">
              <button className="btn" disabled={loading || !consent} onClick={startConsult}>
                {loading ? "Starting…" : "Start consultation"}
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2>Consultation notes</h2>
            <p className="sub">Paste Hindi, English, brand names, or home remedies. The extractor is offline and rule-based.</p>
            <div className="field">
              <label>Transcript</label>
              <textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} />
            </div>
            <div className="footer-actions">
              <button className="btn" disabled={loading || !transcript.trim()} onClick={submitTranscript}>
                {loading ? "Saving…" : "Submit notes"}
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2>Extract clinical entities</h2>
            <p className="sub">Pull symptoms, conditions, and medicines from the transcript. This step proposes — it does not judge interactions.</p>
            <blockquote className="quote">{transcript}</blockquote>
            <div className="footer-actions">
              <button className="btn" disabled={loading} onClick={extractEntities}>
                {loading ? "Extracting…" : "Extract entities"}
              </button>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h2>What the notes contain</h2>
            <p className="sub">Structured entities instead of raw JSON.</p>
            <EntityBoard entities={entities} />
            <JsonToggle data={entities} />
            <div className="footer-actions">
              <button className="btn" disabled={loading} onClick={reconcileMeds}>
                {loading ? "Reconciling…" : "Reconcile both systems"}
              </button>
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <h2>Unified medicine profile</h2>
            <p className="sub">Brand / local names mapped to canonical IDs so the safety engine can compare pairs.</p>
            <MergeVisual />
            <div className="med-columns">
              <MedColumn title="Allopathy" kind="allopathy" meds={profile?.allopathy || []} />
              <MedColumn title="AYUSH / herbal" kind="ayush" meds={profile?.ayush || []} />
            </div>
            {(profile?.unrecognized || []).length > 0 && (
              <div className="alert-banner warn">
                <Ic.Alert /> Unrecognized names flagged for the clinician: {(profile.unrecognized || []).map((m) => m.original).join(", ")}
              </div>
            )}
            <JsonToggle data={profile} />
            <div className="footer-actions">
              <button className="btn" disabled={loading} onClick={checkInteractions}>
                {loading ? "Checking graph…" : "Check interactions"}
              </button>
            </div>
          </>
        )}

        {step === 6 && (
          <>
            <h2>Safety check</h2>
            <p className="sub">Pairwise lookup against the curated interaction file. No generative verdicts.</p>
            {hasAlert ? (
              <div className="alert-banner"><Ic.Alert /> {realAlerts.length} interaction{realAlerts.length > 1 ? "s" : ""} found — review before approving.</div>
            ) : (
              <div className="alert-banner ok"><Ic.Check /> No known pair in the knowledge graph for this profile.</div>
            )}
            <div className="alert-stack">
              {alerts.map((a, i) => <AlertCard key={a.interaction_id || i} alert={a} />)}
            </div>
            <label className="consent">
              <input type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} />
              I have reviewed alerts and will counsel the patient as needed.
            </label>
            <JsonToggle data={alerts} label="alert objects" />
            <div className="footer-actions">
              <button className="btn" disabled={loading || !reviewed} onClick={approve}>
                {loading ? "Writing FHIR…" : "Approve and save FHIR record"}
              </button>
            </div>
          </>
        )}

        {step === 7 && (
          <>
            <h2>Consultation approved</h2>
            <p className="sub">Saved as an ABDM-oriented FHIR collection for the patient’s digital record.</p>
            <div className="success-hero">
              <Ic.Check /> Record locked · {patientForm.name}
            </div>
            <FhirView bundle={fhir} />
            <div className="footer-actions">
              <button className="btn secondary" disabled={loading} onClick={getSummary}>
                <Ic.File /> {loading ? "Loading…" : "Refresh full consult"}
              </button>
            </div>
          </>
        )}

        {error && <div className="error-text">{error}</div>}
        {loading && <div className="loading-bar" />}
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState("dashboard");
  const [consultations, setConsultations] = useState([]);
  const [backendOk, setBackendOk] = useState(false);
  const [preset, setPreset] = useState(null);

  useEffect(() => {
    let alive = true;
    async function ping() {
      try {
        const res = await fetch(`${API}/health`);
        const data = await res.json();
        if (alive) setBackendOk(data.status === "ok");
      } catch {
        if (alive) setBackendOk(false);
      }
    }
    ping();
    const t = setInterval(ping, 8000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const titles = {
    dashboard: ["Dashboard", "Allopathy × AYUSH medication safety"],
    consultation: ["New Consultation", "Extract · reconcile · check · FHIR"],
    patients: ["Patients", "Registered in this session"],
    knowledge: ["Safety graph", "Curated herb–drug pairs for the demo"],
  };

  function startScenario(s) {
    setPreset({ ...s, nonce: Date.now() });
    setView("consultation");
  }

  return (
    <div className="shell">
      <Sidebar view={view} setView={setView} backendOk={backendOk} />
      <div className="main">
        <Topbar
          title={titles[view][0]}
          sub={titles[view][1]}
          alertCount={consultations.filter((c) => c.hasAlert).length}
        />
        {view === "dashboard" && (
          <Dashboard consultations={consultations} setView={setView} startScenario={startScenario} />
        )}
        {view === "consultation" && (
          <ConsultationFlow
            preset={preset}
            onComplete={(c) => setConsultations((prev) => [c, ...prev.filter((x) => x.consultId !== c.consultId)])}
          />
        )}
        {view === "patients" && <PatientsView consultations={consultations} />}
        {view === "knowledge" && <KnowledgeView />}
      </div>
    </div>
  );
}
