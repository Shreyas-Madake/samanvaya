import { useState } from "react";

const API = "http://localhost:8000";

/* ---------- Icons ---------- */
const Ic = {
  Dashboard: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" {...p}><rect x="3" y="3" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="2"/><rect x="13" y="3" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="2"/><rect x="3" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="2"/><rect x="13" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="2"/></svg>,
  Plus: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" {...p}><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  Users: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" {...p}><circle cx="9" cy="8" r="3.2" stroke="currentColor" strokeWidth="2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="17" cy="9" r="2.6" stroke="currentColor" strokeWidth="2"/><path d="M15.5 14a5.2 5.2 0 0 1 5.5 5.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  Bell: (p) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" {...p}><path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><path d="M10 21a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="2"/></svg>,
  Pill: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" {...p}><rect x="3" y="9" width="18" height="6" rx="3" stroke="currentColor" strokeWidth="2"/><path d="M12 9v6" stroke="currentColor" strokeWidth="2"/></svg>,
  Alert: (p) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" {...p}><path d="M10.3 3.9 2 18a2 2 0 0 0 1.7 3h16.6A2 2 0 0 0 22 18L13.7 3.9a2 2 0 0 0-3.4 0Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><path d="M12 9v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="16.5" r="1" fill="currentColor"/></svg>,
  Check: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" {...p}><path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  File: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" {...p}><path d="M6 2h9l5 5v15H6V2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><path d="M15 2v5h5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>,
};

const STEPS = ["Patient", "Consult", "Transcribe", "Extract", "Reconcile", "Check", "Approve", "Summary"];

/* ---------- Small components ---------- */
function StatCard({ icon, iconBg, iconColor, value, label }) {
  return (
    <div className="stat-card">
      <div className="icon-wrap" style={{ background: iconBg, color: iconColor }}>{icon}</div>
      <div className="val">{value}</div>
      <div className="label">{label}</div>
    </div>
  );
}

function MergeVisual() {
  return (
    <div className="merge">
      <svg width="130" height="64" viewBox="0 0 130 64" fill="none">
        <path d="M0 8 C 55 8, 55 32, 120 32" stroke="#2563EB" strokeWidth="3" fill="none" />
        <path d="M0 56 C 55 56, 55 32, 120 32" stroke="#C2740C" strokeWidth="3" fill="none" />
        <circle cx="120" cy="32" r="5" fill="#0F2A24" />
      </svg>
      <div className="merge-labels">
        <span><span className="dot allopathy" />Allopathy medicines</span>
        <span><span className="dot ayush" />AYUSH / herbal medicines</span>
      </div>
    </div>
  );
}

function ResultCard({ data }) {
  if (!data) return null;
  return (
    <div className="result-card">
      {Object.entries(data).map(([key, val]) => (
        <div className="result-row" key={key}>
          <div className="result-key">{key}</div>
          <div className="result-val">{typeof val === "object" ? JSON.stringify(val, null, 2) : String(val)}</div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Sidebar ---------- */
function Sidebar({ view, setView }) {
  const items = [
    { id: "dashboard", label: "Dashboard", icon: Ic.Dashboard },
    { id: "consultation", label: "New Consultation", icon: Ic.Plus },
    { id: "patients", label: "Patients", icon: Ic.Users },
  ];
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="logo-mark">S</div>
        <div>
          <div className="name">Samanvaya</div>
          <div className="sub">Clinical Safety System</div>
        </div>
      </div>

      <div className="nav-section-label">Workspace</div>
      {items.map((it) => (
        <div key={it.id} className={`nav-item ${view === it.id ? "active" : ""}`} onClick={() => setView(it.id)}>
          <it.icon /> {it.label}
        </div>
      ))}

      <div className="sidebar-footer">
        <div className="doctor-chip">
          <div className="doctor-avatar">DR</div>
          <div>
            <div className="who">Dr. Attending</div>
            <div className="role">General Physician</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

/* ---------- Topbar ---------- */
function Topbar({ title, sub, alertCount }) {
  return (
    <div className="topbar">
      <div>
        <div className="page-title">{title}</div>
        <div className="page-sub">{sub}</div>
      </div>
      <div className="topbar-right">
        <div className="icon-btn">
          <Ic.Bell />
          {alertCount > 0 && <span className="dot-badge" />}
        </div>
        <div className="doctor-avatar">DR</div>
      </div>
    </div>
  );
}

/* ---------- Dashboard view ---------- */
function Dashboard({ consultations, setView }) {
  const approved = consultations.filter((c) => c.status === "approved").length;
  const alerts = consultations.filter((c) => c.hasAlert).length;

  return (
    <div className="content">
      <div className="stat-grid">
        <StatCard icon={<Ic.Users />} iconBg="var(--allopathy-bg)" iconColor="var(--allopathy)" value={consultations.length} label="Consultations today" />
        <StatCard icon={<Ic.Pill />} iconBg="var(--ayush-bg)" iconColor="var(--ayush)" value={approved} label="Records approved" />
        <StatCard icon={<Ic.Alert />} iconBg="var(--danger-bg)" iconColor="var(--danger)" value={alerts} label="Interaction alerts" />
        <StatCard icon={<Ic.Check />} iconBg="var(--success-bg)" iconColor="var(--success)" value="8000" label="Backend port active" />
      </div>

      <div className="panel">
        <div className="panel-head">
          <div>
            <h2>Recent consultations</h2>
            <div className="sub">Session records created in this browser</div>
          </div>
          <button className="btn" onClick={() => setView("consultation")}><Ic.Plus /> New consultation</button>
        </div>

        {consultations.length === 0 ? (
          <div className="empty-state">No consultations yet. Start a new one to see it appear here.</div>
        ) : (
          <table className="table">
            <thead>
              <tr><th>Patient</th><th>Age / Sex</th><th>Status</th><th>Interaction check</th></tr>
            </thead>
            <tbody>
              {consultations.map((c) => (
                <tr key={c.consultId}>
                  <td>{c.name}</td>
                  <td>{c.age} / {c.sex}</td>
                  <td><span className={`badge ${c.status === "approved" ? "success" : "pending"}`}>{c.status}</span></td>
                  <td><span className={`badge ${c.hasAlert ? "danger" : "success"}`}>{c.hasAlert ? "Alert found" : "Clear"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ---------- Patients view ---------- */
function PatientsView({ consultations }) {
  return (
    <div className="content">
      <div className="panel">
        <div className="panel-head">
          <div>
            <h2>Patients</h2>
            <div className="sub">Registered in this session</div>
          </div>
        </div>
        {consultations.length === 0 ? (
          <div className="empty-state">No patients registered yet.</div>
        ) : (
          <table className="table">
            <thead><tr><th>Name</th><th>Age</th><th>Sex</th><th>Patient ID</th></tr></thead>
            <tbody>
              {consultations.map((c) => (
                <tr key={c.patientId}>
                  <td>{c.name}</td><td>{c.age}</td><td>{c.sex}</td>
                  <td style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 12 }}>{c.patientId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ---------- Consultation flow view ---------- */
function ConsultationFlow({ onComplete }) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [patientForm, setPatientForm] = useState({ name: "", age: "", sex: "M" });
  const [patientId, setPatientId] = useState("");
  const [consultId, setConsultId] = useState("");
  const [transcript, setTranscript] = useState(
    "Patient is diabetic and complains of fatigue. Currently taking Metformin 500mg twice daily and methi 1 tsp daily."
  );
  const [extracted, setExtracted] = useState(null);
  const [reconciled, setReconciled] = useState(null);
  const [interactions, setInteractions] = useState(null);
  const [approved, setApproved] = useState(null);
  const [summary, setSummary] = useState(null);

  async function call(path, method = "POST", body) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}${path}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      return await res.json();
    } catch (e) {
      setError(e.message || "Something went wrong. Is the backend running on port 8000?");
      throw e;
    } finally {
      setLoading(false);
    }
  }

  const alerts = interactions?.alerts || [];
  const hasAlert = alerts.length > 0;

  async function createPatient() {
    const data = await call("/patients", "POST", { name: patientForm.name, age: Number(patientForm.age), sex: patientForm.sex });
    setPatientId(data.id);
    setStep(1);
  }
  async function startConsult() {
    const data = await call("/consult", "POST", { patient_id: patientId, consent: true });
    setConsultId(data.id);
    setStep(2);
  }
  async function submitTranscript() {
    await call(`/consult/${consultId}/transcribe`, "POST", { text: transcript });
    setStep(3);
  }
  async function extractEntities() {
    const data = await call(`/consult/${consultId}/extract`, "POST");
    setExtracted(data);
    setStep(4);
  }
  async function reconcileMeds() {
    const data = await call(`/consult/${consultId}/reconcile`, "POST");
    setReconciled(data);
    setStep(5);
  }
  async function checkInteractions() {
    const data = await call(`/consult/${consultId}/check`, "POST");
    setInteractions(data);
    setStep(6);
  }
  async function approve() {
    const data = await call(`/consult/${consultId}/approve`, "POST");
    setApproved(data);
    onComplete({
      consultId, patientId,
      name: patientForm.name, age: patientForm.age, sex: patientForm.sex,
      status: "approved", hasAlert,
    });
    setStep(7);
  }
  async function getSummary() {
    const data = await call(`/consult/${consultId}`, "GET");
    setSummary(data);
  }

  return (
    <div className="content">
      <div className="panel">
        <div className="h-stepper">
          {STEPS.map((label, i) => (
            <div key={label} style={{ display: "flex", alignItems: "center" }}>
              <div className={`h-step ${i === step ? "active" : ""} ${i < step ? "done" : ""}`}>
                <div className="circle">{i < step ? "✓" : i + 1}</div>
                <div className="label">{label}</div>
              </div>
              {i < STEPS.length - 1 && <div className="h-line" />}
            </div>
          ))}
        </div>

        {step === 0 && (
          <>
            <h2>New patient</h2>
            <p className="sub">Register the patient to begin a consultation.</p>
            <div className="section-gap" />
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
                  <option value="M">Male</option><option value="F">Female</option><option value="O">Other</option>
                </select>
              </div>
            </div>
            <div className="footer-actions">
              <button className="btn" disabled={loading || !patientForm.name} onClick={createPatient}>{loading ? "Creating…" : "Create patient"}</button>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h2>Start consultation</h2>
            <p className="sub">Patient registered. Begin with consent recorded.</p>
            <ResultCard data={{ patient_id: patientId }} />
            <div className="footer-actions"><button className="btn" disabled={loading} onClick={startConsult}>{loading ? "Starting…" : "Start consultation"}</button></div>
          </>
        )}

        {step === 2 && (
          <>
            <h2>Transcribe consultation</h2>
            <p className="sub">Enter or paste the consultation notes.</p>
            <div className="field"><label>Consultation text</label><textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} /></div>
            <div className="footer-actions"><button className="btn" disabled={loading} onClick={submitTranscript}>{loading ? "Saving…" : "Submit transcript"}</button></div>
          </>
        )}

        {step === 3 && (
          <>
            <h2>Extract clinical entities</h2>
            <p className="sub">Pull symptoms, conditions and medications from the transcript.</p>
            <div className="footer-actions"><button className="btn" disabled={loading} onClick={extractEntities}>{loading ? "Extracting…" : "Extract entities"}</button></div>
          </>
        )}

        {step === 4 && (
          <>
            <h2>Extracted entities</h2>
            <p className="sub">Symptoms, conditions and medications identified.</p>
            <ResultCard data={extracted} />
            <div className="footer-actions"><button className="btn" disabled={loading} onClick={reconcileMeds}>{loading ? "Reconciling…" : "Reconcile medicines"}</button></div>
          </>
        )}

        {step === 5 && (
          <>
            <h2>Reconciled medicine profile</h2>
            <p className="sub">Allopathy and AYUSH medicines unified into one profile.</p>
            <MergeVisual />
            <ResultCard data={reconciled} />
            <div className="footer-actions"><button className="btn" disabled={loading} onClick={checkInteractions}>{loading ? "Checking…" : "Check interactions"}</button></div>
          </>
        )}

        {step === 6 && (
          <>
            <h2>Interaction check</h2>
            <p className="sub">Cross-checked against the interaction knowledge base.</p>
            {hasAlert && <div className="alert-banner"><Ic.Alert /> Interaction alert detected — review before approving.</div>}
            <ResultCard data={interactions} />
            <div className="footer-actions"><button className="btn" disabled={loading} onClick={approve}>{loading ? "Saving…" : "Approve and save"}</button></div>
          </>
        )}

        {step === 7 && (
          <>
            <h2>Consultation approved</h2>
            <p className="sub">Saved to the record.</p>
            <ResultCard data={approved} />
            <div className="footer-actions"><button className="btn secondary" disabled={loading} onClick={getSummary}><Ic.File /> {loading ? "Loading…" : "View full FHIR record"}</button></div>
            {summary && <><h2 className="section-gap">Full record</h2><ResultCard data={summary} /></>}
          </>
        )}

        {error && <div className="error-text">{error}</div>}
      </div>
    </div>
  );
}

/* ---------- App shell ---------- */
export default function App() {
  const [view, setView] = useState("dashboard");
  const [consultations, setConsultations] = useState([]);

  const titles = {
    dashboard: ["Dashboard", "Overview of today's consultations"],
    consultation: ["New Consultation", "Allopathy × AYUSH medication reconciliation"],
    patients: ["Patients", "Registered patients this session"],
  };

  return (
    <div className="shell">
      <Sidebar view={view} setView={setView} />
      <div className="main">
        <Topbar title={titles[view][0]} sub={titles[view][1]} alertCount={consultations.filter((c) => c.hasAlert).length} />
        {view === "dashboard" && <Dashboard consultations={consultations} setView={setView} />}
        {view === "consultation" && (
          <ConsultationFlow onComplete={(c) => { setConsultations((prev) => [c, ...prev]); }} />
        )}
        {view === "patients" && <PatientsView consultations={consultations} />}
      </div>
    </div>
  );
}