import { useState } from "react";
import { LogoMark, STEP_ICONS, IconCheck, IconAlert, IconArrow } from "./icons.jsx";

const API = "http://localhost:8000";
const STEPS = ["Patient", "Consult", "Transcribe", "Extract", "Reconcile", "Check", "Approve", "Summary"];

function MergeVisual() {
  return (
    <div className="merge">
      <svg width="140" height="70" viewBox="0 0 140 70" fill="none">
        <path d="M0 10 C 60 10, 60 35, 130 35" stroke="#2B6CB0" strokeWidth="3" fill="none" />
        <path d="M0 60 C 60 60, 60 35, 130 35" stroke="#B45309" strokeWidth="3" fill="none" />
        <circle cx="130" cy="35" r="5" fill="#16302B" />
      </svg>
      <div className="merge-labels">
        <span><span className="dot allopathy" />Allopathy medicines</span>
        <span><span className="dot ayush" />AYUSH / herbal medicines</span>
      </div>
    </div>
  );
}

function renderValue(val) {
  if (val === null || val === undefined) return <span className="muted">—</span>;
  if (Array.isArray(val)) {
    if (val.length === 0) return <span className="muted">none</span>;
    if (typeof val[0] === "object") {
      return (
        <div className="mini-table">
          {val.map((item, i) => (
            <div className="mini-row" key={i}>
              {Object.entries(item).map(([k, v]) => (
                <span key={k} className="mini-cell"><b>{k}:</b> {typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
              ))}
            </div>
          ))}
        </div>
      );
    }
    return val.map((v, i) => <span key={i} className="chip">{String(v)}</span>);
  }
  if (typeof val === "object") return <pre className="json-pre">{JSON.stringify(val, null, 2)}</pre>;
  return String(val);
}

function ResultCard({ data }) {
  if (!data) return null;
  return (
    <div className="result-card">
      {Object.entries(data).map(([key, val]) => (
        <div className="result-row" key={key}>
          <div className="result-key">{key}</div>
          <div className="result-val">{renderValue(val)}</div>
        </div>
      ))}
    </div>
  );
}

function hasAlerts(data) {
  if (!data) return false;
  const arr = data.interactions || data.alerts || (Array.isArray(data) ? data : null);
  if (Array.isArray(arr)) return arr.length > 0;
  return Boolean(data.severity || data.alert);
}

function extractPatientName(patientForm, summary) {
  try {
    const entry = summary?.entry?.find((e) => e.resource?.resourceType === "Patient");
    const name = entry?.resource?.name?.[0]?.text;
    if (name) return name;
  } catch {}
  return patientForm.name || "Patient";
}

export default function App() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [patientForm, setPatientForm] = useState({ name: "", age: "", sex: "M" });
  const [patientId, setPatientId] = useState("");
  const [consultId, setConsultId] = useState("");
  const [transcript, setTranscript] = useState(
    "Patient complains of headache and fatigue. Currently taking Metformin 500mg twice daily and Fenugreek seeds."
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
    setStep(7);
  }
  async function getSummary() {
    const data = await call(`/consult/${consultId}`, "GET");
    setSummary(data);
  }

  const alertsPresent = hasAlerts(interactions);
  const displayName = extractPatientName(patientForm, summary);
  const initials = displayName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand-block">
          <LogoMark />
          <div className="brand-text">
            <div className="brand">samanvaya<span>.</span></div>
            <span className="brand-badge">MVP · SIH 2026</span>
          </div>
        </div>
        <div className="tagline">Clinical medication safety across Allopathy and AYUSH — doctor console</div>
      </header>

      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
      </div>

      <div className="layout">
        <nav className="stepper">
          {STEPS.map((label, i) => {
            const StepIcon = STEP_ICONS[i];
            const done = i < step;
            return (
              <div key={label} className={`step-item ${i === step ? "active" : ""} ${done ? "done" : ""}`}>
                <span className="step-icon">{done ? <IconCheck size={15} /> : <StepIcon size={15} />}</span>
                {label}
              </div>
            );
          })}
        </nav>

        <div className="panel">
          {step === 0 && (
            <div className="panel-split">
              <div>
                <div className="eyebrow">Step 1 of 8</div>
                <h2>Register the patient</h2>
                <p className="sub">Start a consultation by recording basic patient details.</p>
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
                  <button className="btn" disabled={loading || !patientForm.name} onClick={createPatient}>
                    {loading ? "Creating…" : "Create patient"} <IconArrow size={15} />
                  </button>
                </div>
              </div>
              <div className="hero-art"><LogoMark size={150} /></div>
            </div>
          )}

          {step === 1 && (
            <>
              <div className="eyebrow">Step 2 of 8</div>
              <h2>Start consultation</h2>
              <p className="sub">Patient registered. Begin the consultation with consent recorded.</p>
              <ResultCard data={{ patient_id: patientId }} />
              <div className="footer-actions">
                <button className="btn" disabled={loading} onClick={startConsult}>{loading ? "Starting…" : "Start consultation"} <IconArrow size={15} /></button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="eyebrow">Step 3 of 8</div>
              <h2>Transcribe consultation</h2>
              <p className="sub">Enter or paste the consultation notes.</p>
              <div className="field">
                <label>Consultation text</label>
                <textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} />
              </div>
              <div className="footer-actions">
                <button className="btn" disabled={loading} onClick={submitTranscript}>{loading ? "Saving…" : "Submit transcript"} <IconArrow size={15} /></button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="eyebrow">Step 4 of 8</div>
              <h2>Extract clinical entities</h2>
              <p className="sub">Pull symptoms, conditions and medications from the transcript.</p>
              <div className="footer-actions">
                <button className="btn" disabled={loading} onClick={extractEntities}>{loading ? "Extracting…" : "Extract entities"} <IconArrow size={15} /></button>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <div className="eyebrow">Step 5 of 8</div>
              <h2>Extracted entities</h2>
              <p className="sub">Symptoms, conditions and medications identified from the transcript.</p>
              <ResultCard data={extracted} />
              <div className="footer-actions">
                <button className="btn" disabled={loading} onClick={reconcileMeds}>{loading ? "Reconciling…" : "Reconcile medicines"} <IconArrow size={15} /></button>
              </div>
            </>
          )}

          {step === 5 && (
            <>
              <div className="eyebrow">Step 6 of 8</div>
              <h2>Reconciled medicine profile</h2>
              <p className="sub">Allopathy and AYUSH medicines unified into a single profile.</p>
              <MergeVisual />
              <ResultCard data={reconciled} />
              <div className="footer-actions">
                <button className="btn" disabled={loading} onClick={checkInteractions}>{loading ? "Checking…" : "Check interactions"} <IconArrow size={15} /></button>
              </div>
            </>
          )}

          {step === 6 && (
            <>
              <div className="eyebrow">Step 7 of 8</div>
              <h2>Interaction check</h2>
              <p className="sub">Cross-checking the unified medicine list against known interactions.</p>
              {alertsPresent ? (
                <div className="status-banner danger"><IconAlert size={18} /> Interaction alert detected — review before approving.</div>
              ) : (
                <div className="status-banner success"><IconCheck size={18} /> No known interactions found.</div>
              )}
              <ResultCard data={interactions} />
              <div className="footer-actions">
                <button className="btn" disabled={loading} onClick={approve}>{loading ? "Saving…" : "Approve and save"} <IconArrow size={15} /></button>
              </div>
            </>
          )}

          {step === 7 && (
            <>
              <div className="eyebrow">Step 8 of 8</div>
              <h2>Consultation approved</h2>
              <p className="sub">Saved to the record.</p>
              <div className="profile-card">
                <div className="avatar">{initials || "P"}</div>
                <div>
                  <div className="profile-name">{displayName}</div>
                  <div className="profile-meta">Consultation ID: {consultId}</div>
                </div>
              </div>
              <div className="footer-actions">
                <button className="btn secondary" disabled={loading} onClick={getSummary}>{loading ? "Loading…" : "View full consultation"}</button>
              </div>
              {summary && (
                <details className="raw-toggle" open>
                  <summary>Full FHIR record</summary>
                  <ResultCard data={summary} />
                </details>
              )}
            </>
          )}

          {error && <div className="error-text">{error}</div>}
        </div>
      </div>
    </div>
  );
}