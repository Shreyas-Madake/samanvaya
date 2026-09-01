# SAMANVAYA — Fix prompt (startup + 2 real integration bugs)

> Paste everything below the line into your coding agent (running inside the
> `SAMANVAYA` folder). It is self-contained. Do the tasks in order.

---

You are working in the **SAMANVAYA** project. It is a clinical medication-safety
web app: a FastAPI backend (`backend/`) reconciles a patient's Allopathy + AYUSH
medicines and checks them against a curated interaction knowledge base; a React +
Vite frontend (`frontend/`) drives an 8-step consultation flow (Patient → Consult
→ Transcribe → Extract → Reconcile → Check → Approve → Summary).

**Golden safety rule (do not break):** interaction verdicts come ONLY from
`backend/interactions.py` + the JSON knowledge base. The alert object that
`interactions.py` `check()` produces is the **single source of truth for the alert
shape**. When you find a mismatch between that shape and any consumer, fix the
CONSUMER to match `interactions.py` — never change `interactions.py` to match a
consumer.

The exact alert shape `check()` emits (read it in `backend/interactions.py`) is:

```python
{
  "interaction_id": "<id>",                       # or "unknown-medication-flag"
  "drug_a": {"id": "...", "name": "...", "original": "..."},   # dict, or None
  "drug_b": {"id": "...", "name": "...", "original": "..."},   # dict, or None
  "risk": "high" | "moderate" | "low" | "unknown",             # LOWERCASE
  "effect": "...",
  "mechanism": "...",
  "recommendation": "...",
  "evidence": [ ... ],
  "condition_match": true/false,
  "matched_conditions": [ ... ]
  # the unknown-medication-flag alert also has "flagged_meds": [ ... ]
}
```

Keep all code simple and well-commented in the existing WHAT / WHY style. Do NOT
add authentication, a database, or a `verification_status` field in this pass —
those are separate future tasks. Only do what is listed below.

---

## TASK 0 — Make it actually run (this explains the two errors I hit)

**Error A — backend:** `uvicorn main:app` failed with
`Error loading ASGI app. Could not import module "main".`
Cause: it was run from the `SAMANVAYA` root, but `main.py` lives in `backend/`.
The backend MUST be started from inside `backend/`. Verify this works:

```bash
cd backend
# (activate the venv in backend/.venv first)
uvicorn main:app --reload --port 8000
```

It should reach `Uvicorn running on http://127.0.0.1:8000`. Leave it running.

**Error B — frontend:** it was never installed (`frontend/node_modules` does not
exist), so `npm run dev` had nothing to launch. In a SECOND terminal:

```bash
cd frontend
npm install        # one-time; downloads React, Vite, etc.
npm run dev        # serves the UI on http://localhost:5173
```

Confirm both servers run at the same time (backend on 8000, frontend on 5173)
and the dashboard loads in the browser. Then continue to the code fixes.

Optional but nice: add a short "How to run" section to `README.md` with these two
command blocks, and note that BOTH servers must run together (the frontend calls
`http://localhost:8000`).

---

## TASK 1 — Fix the FHIR DetectedIssue (CRITICAL, silent bug)

File: `backend/fhir_bundle.py`.

**Symptom:** in the final FHIR record, every interaction comes out as
`"Unknown + Unknown"` and severity is always `"moderate"`, and a flagged unknown
medicine wrongly becomes a DetectedIssue.

**Cause:** `fhir_bundle.py` reads the WRONG keys. It reads `alert["med1"]` /
`alert["med2"]` (real keys are `drug_a` / `drug_b`, which are dicts), it maps
severity with UPPERCASE keys `{"HIGH","MODERATE","LOW"}` (real risk is lowercase,
so it always misses and defaults to `"moderate"`), and it skips the unknown alert
by `alert.get("type") == "flag_unknown_meds"` (there is no `type` key — the real
marker is `interaction_id == "unknown-medication-flag"`).

**Fix 1a — the skip check.** In `generate_fhir_bundle`, change the alert loop so
the skip uses the real key:

```python
    alerts = consult.get("alerts", [])
    for alert in alerts:
        # Skip the "unknown medication" flag — it is not a real interaction,
        # so it must NOT become a DetectedIssue.
        if alert.get("interaction_id") == "unknown-medication-flag":
            continue
        bundle["entry"].append(create_detected_issue(alert, consult["id"]))
```

**Fix 1b — read the real alert shape.** Replace the whole `create_detected_issue`
function with this version:

```python
def create_detected_issue(alert: dict, encounter_id: str) -> dict:
    """
    Create a FHIR DetectedIssue resource from an interaction alert.

    WHAT: turns one interaction alert into a FHIR clinical-safety record.
    WHY:  the alert shape is defined by interactions.py (the source of truth),
          so we read EXACTLY the keys it produces: drug_a/drug_b (nested dicts)
          and a LOWERCASE risk ("high"/"moderate"/"low").
    """
    # Map our lowercase risk to a FHIR severity code (high/moderate/low).
    severity_map = {"high": "high", "moderate": "moderate", "low": "low"}
    risk = alert.get("risk", "moderate")
    severity = severity_map.get(risk, "moderate")

    # Pull the two medicine names out of the nested drug dicts (guard None).
    drug_a = alert.get("drug_a") or {}
    drug_b = alert.get("drug_b") or {}
    med1 = drug_a.get("name", "Unknown")
    med2 = drug_b.get("name", "Unknown")

    # Decide drug-drug vs herb-drug from the id prefix ("drug:" / "herb:").
    ids = [str(drug_a.get("id", "")), str(drug_b.get("id", ""))]
    is_herb_drug = any(i.startswith("herb:") for i in ids)
    issue_text = "Herb-Drug Interaction" if is_herb_drug else "Drug-Drug Interaction"

    effect = alert.get("effect", "Unknown effect")
    mechanism = alert.get("mechanism", "")

    detail_text = f"[{risk.upper()}] {med1} + {med2}: {effect}"
    if mechanism:
        detail_text += f" (Mechanism: {mechanism})"

    recommendation = alert.get("recommendation", "Consult prescribing information.")
    mitigation_text = f"Recommendation: {recommendation}"

    safe_a = med1.replace(" ", "-")
    safe_b = med2.replace(" ", "-")

    return {
        "resource": {
            "resourceType": "DetectedIssue",
            "id": f"issue-{safe_a}-{safe_b}",
            "status": "final",
            "severity": severity,
            "code": {
                "coding": [
                    {
                        "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
                        "code": "DRG",
                        "display": "Drug Interaction Alert"
                    }
                ],
                "text": issue_text
            },
            "detail": detail_text,
            "identified": datetime.utcnow().isoformat() + "Z",
            "implicated": [
                {"display": med1},
                {"display": med2}
            ],
            "mitigation": [
                {"action": {"text": mitigation_text}}
            ],
            "extension": [
                {
                    "url": "http://samanvaya.gov.in/fhir/StructureDefinition/detected-in-encounter",
                    "valueReference": {"reference": f"Encounter/{encounter_id}"}
                }
            ]
        }
    }
```

---

## TASK 2 — Fix the MedicationStatement patient reference

File: `backend/fhir_bundle.py`.

**Symptom:** every MedicationStatement points to `"Patient/unknown"`.

**Cause:** `create_medication_statement` reads `med.get("patient_id")`, but the
normalized medicine dict has no `patient_id`. The patient id IS available in
`generate_fhir_bundle` (as `patient["id"]`) — thread it through.

**Fix:** change the function signature and the subject reference:

```python
def create_medication_statement(med: dict, encounter_id: str, patient_id: str) -> dict:
    ...
            "subject": {
                "reference": f"Patient/{patient_id}"
            },
```

And update the call inside `generate_fhir_bundle`:

```python
    for med in all_meds:
        bundle["entry"].append(
            create_medication_statement(med, consult["id"], patient["id"])
        )
```

---

## TASK 3 — Fix the frontend "always shows Alert found" bug

File: `frontend/src/App.jsx`.

**Symptom:** even a clean patient (no interactions) shows a red "Alert found"
badge on the dashboard and an alert banner on the Check step.

**Cause:** line ~231 computes presence of alerts with a substring search:

```js
const hasAlert = interactions && JSON.stringify(interactions).toLowerCase().includes("interaction");
```

The `/check` response always contains the word "interaction" (in the `alerts`
array's `interaction_id`, and elsewhere), so this is ALWAYS true.

**Fix:** derive it from the real `alerts` array that `/check` returns:

```js
const alerts = interactions?.alerts || [];
const hasAlert = alerts.length > 0;
```

(The `/check` route returns the full consult, which includes an `alerts` array.
Zero alerts → "Clear"; one or more → "Alert found". This single fix also corrects
the dashboard badge, because `onComplete({... hasAlert})` reuses this value.)

---

## TASK 4 — Remove misleading seeded keys in the store

File: `backend/store.py`, function `create_consult`.

**Cause / cleanup:** it seeds `"medicines": None` and `"interactions": None`, but
`main.py` actually writes `med_profile` and `alerts`. The dead `"interactions"`
key is part of what made Task 3's substring bug always fire. Replace those two
lines with the keys the pipeline really uses, so the object is self-documenting:

```python
        "entities": None,
        "med_profile": None,
        "alerts": None,
        "fhir_bundle": None,
```

---

## TASK 5 — Make the tests honest, and polish the demo transcript

**5a. Fix `fhir_bundle.py`'s own test harness (important).** Its `__main__` block
currently feeds a FAKE alert in the old `med1`/`med2`/`"HIGH"`/`type` shape, which
is why the bug slipped through — the test passed on data the real app never
produces. Replace the mock `"alerts"` list in the test with the REAL shape, and
add assertions that catch the bug:

```python
        "alerts": [
            {
                "interaction_id": "int-metformin-fenugreek",
                "drug_a": {"id": "drug:metformin", "name": "Metformin", "original": "Metformin"},
                "drug_b": {"id": "herb:fenugreek", "name": "Fenugreek", "original": "methi"},
                "risk": "high",
                "effect": "Additive hypoglycemic effect",
                "mechanism": "Both lower blood glucose; combined effect increases hypoglycemia risk",
                "recommendation": "Monitor blood glucose closely. Consider dose adjustment.",
                "evidence": [],
                "condition_match": True,
                "matched_conditions": ["Type 2 Diabetes"]
            }
        ]
```

Then, after the bundle is built, assert the DetectedIssue is correct:

```python
    issue = next(e["resource"] for e in bundle["entry"]
                 if e["resource"]["resourceType"] == "DetectedIssue")
    assert issue["severity"] == "high", f"severity should be high, got {issue['severity']}"
    names = [imp["display"] for imp in issue["implicated"]]
    assert "Metformin" in names and "Fenugreek" in names, f"wrong meds: {names}"
    print("DetectedIssue severity + implicated meds are correct")
```

**5b. Improve the default transcript** so the golden demo lights up fully. In
`frontend/src/App.jsx`, change the default transcript to include the word
"diabetic" (so the condition matches) and give the herb a dose:

```js
  const [transcript, setTranscript] = useState(
    "Patient is diabetic and complains of fatigue. Currently taking Metformin 500mg twice daily and methi 1 tsp daily."
  );
```

**5c. (Optional) Encounter start time.** In `fhir_bundle.py`
`create_encounter_resource`, the code reads `consult.get("timestamp")` but the
store field is `created_at`. Change it to `consult.get("created_at", ...)` so the
encounter start reflects the real consult time.

---

## VERIFICATION — do all of these before declaring done

1. `cd backend && python fhir_bundle.py` → all asserts pass, and the new
   DetectedIssue assertion prints success (severity high, Metformin + Fenugreek).
2. `cd backend && python extract.py` and `python interactions.py` → still pass.
3. Start backend (from `backend/`) and frontend (`npm run dev`), then run BOTH
   golden scenarios through the UI:
   - **Metformin + Fenugreek, patient "diabetic"** → exactly **1 HIGH** alert;
     Check step shows the alert banner; dashboard shows "Alert found"; the
     approved FHIR record's DetectedIssue reads "Metformin + Fenugreek" with
     `severity: "high"` (NOT "Unknown", NOT "moderate").
   - **Paracetamol 500mg + Vitamin C 1000mg** (edit the transcript) → **0**
     alerts; Check step shows NO banner; dashboard shows "Clear"; the FHIR record
     has NO DetectedIssue.
4. Confirm no MedicationStatement in the bundle references `Patient/unknown`.

Report what you changed per file and paste the test output.
