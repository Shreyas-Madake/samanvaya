"""
WHAT:  FastAPI backend server for SAMANVAYA (clinical medication safety).
WHY:   Provides REST endpoints for the consultation pipeline: transcribe ->
       extract -> reconcile -> check interactions -> approve/save.
HOW:   Run with:  uvicorn main:app --reload --port 8000
       Then open http://localhost:8000/docs in your browser to test the API.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Import our in-memory store functions
from store import (
    create_patient,
    get_patient,
    create_consult,
    get_consult,
    update_consult,
)

# Import the normalization and interaction engines (Phase 2)
from normalize import normalize_list
from interactions import check

# Import the real extractor (Phase 3)
from extract import extract

# Import the FHIR bundle generator (Phase 4)
from fhir_bundle import generate_fhir_bundle


# ---------------------------------------------------------------------------
# FastAPI app setup
# ---------------------------------------------------------------------------
app = FastAPI(
    title="SAMANVAYA Backend",
    description="Medication safety system for Allopathy + AYUSH medicines",
    version="0.1.0",
)

# Enable CORS so any frontend can call this API (for development)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Pydantic models for request bodies
# ---------------------------------------------------------------------------

class CreatePatientRequest(BaseModel):
    name: str
    age: int
    sex: str  # e.g. "M", "F", "Other"


class CreateConsultRequest(BaseModel):
    patient_id: str
    consent: bool  # True means patient agreed to data processing


class TranscribeRequest(BaseModel):
    text: str  # The doctor's spoken/typed consultation text


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health")
def health_check():
    """Simple health check — returns ok if the server is running."""
    return {"status": "ok"}


@app.post("/patients")
def create_patient_route(req: CreatePatientRequest):
    """Create a new patient record. Returns the patient object with an id."""
    patient = create_patient(name=req.name, age=req.age, sex=req.sex)
    return patient


@app.post("/consult")
def create_consult_route(req: CreateConsultRequest):
    """Start a new consultation for a patient. Status = 'created'."""
    # Verify the patient exists first
    patient = get_patient(req.patient_id)
    if patient is None:
        raise HTTPException(status_code=404, detail="Patient not found")

    consult = create_consult(patient_id=req.patient_id, consent=req.consent)
    return consult


@app.post("/consult/{consult_id}/transcribe")
def transcribe_route(consult_id: str, req: TranscribeRequest):
    """Accept the doctor's consultation text and save it. Status -> 'transcribed'."""
    consult = get_consult(consult_id)
    if consult is None:
        raise HTTPException(status_code=404, detail="Consultation not found")

    # Save the transcript and move status forward
    updated = update_consult(
        consult_id,
        {"transcript": req.text, "status": "transcribed"}
    )
    return updated


@app.post("/consult/{consult_id}/extract")
def extract_route(consult_id: str):
    """
    Extract clinical entities from the transcript using the REAL rule-based extractor.
    Status -> 'extracted'.
    """
    consult = get_consult(consult_id)
    if consult is None:
        raise HTTPException(status_code=404, detail="Consultation not found")

    # Get the transcript from the previous step
    transcript = consult.get("transcript", "")
    if not transcript:
        raise HTTPException(status_code=400, detail="No transcript. Run /transcribe first.")

    # Use the REAL extractor
    entities = extract(transcript)

    updated = update_consult(
        consult_id,
        {"entities": entities, "status": "extracted"}
    )
    return updated


@app.post("/consult/{consult_id}/reconcile")
def reconcile_route(consult_id: str):
    """
    Normalize and reconcile the extracted medications into a unified profile.
    Now uses the REAL normalization engine from normalize.py. Status -> 'reconciled'.
    """
    consult = get_consult(consult_id)
    if consult is None:
        raise HTTPException(status_code=404, detail="Consultation not found")

    # Get the extracted medications from the previous step
    entities = consult.get("entities", {})
    medications = entities.get("medications", [])

    if not medications:
        raise HTTPException(status_code=400, detail="No medications to reconcile. Run /extract first.")

    # Use the real normalization engine
    normalized_meds = normalize_list(medications)

    # Separate by type for the response
    allopathy = [m for m in normalized_meds if m.get("type") == "drug"]
    ayush = [m for m in normalized_meds if m.get("type") == "herb"]
    unrecognized = [m for m in normalized_meds if m.get("flagged", False)]

    med_profile = {
        "allopathy": allopathy,
        "ayush": ayush,
        "unrecognized": unrecognized,
        "all": normalized_meds,  # Keep the full list for the interaction engine
    }

    updated = update_consult(
        consult_id,
        {"med_profile": med_profile, "status": "reconciled"}
    )
    return updated


@app.post("/consult/{consult_id}/check")
def check_interactions_route(consult_id: str):
    """
    Check for dangerous drug-drug and herb-drug interactions.
    Now uses the REAL interaction engine from interactions.py. Status -> 'checked'.

    The LLM will NEVER decide if two things interact — only the curated
    data file does that. The AI proposes; the knowledge graph disposes.
    """
    consult = get_consult(consult_id)
    if consult is None:
        raise HTTPException(status_code=404, detail="Consultation not found")

    # Get the normalized medication profile from the previous step
    med_profile = consult.get("med_profile", {})
    all_meds = med_profile.get("all", [])

    if not all_meds:
        raise HTTPException(status_code=400, detail="No medications to check. Run /reconcile first.")

    # Get patient conditions from the extracted entities
    entities = consult.get("entities", {})
    conditions = entities.get("conditions", [])

    # Use the real interaction engine
    alerts = check(all_meds, conditions)

    updated = update_consult(
        consult_id,
        {"alerts": alerts, "status": "checked"}
    )
    return updated


@app.post("/consult/{consult_id}/approve")
def approve_route(consult_id: str):
    """
    Clinician has reviewed the interactions and approved the record.

    WHAT: Generates a FHIR R4 Bundle containing the complete health record.
    WHY:  ABDM (Ayushman Bharat Digital Mission) requires health records in FHIR format
          for interoperability across the Indian healthcare system.
    HOW:  Takes the consultation data (patient, meds, alerts) and packages it into
          a standard FHIR Bundle that can be shared with other healthcare providers,
          stored in health repositories, or sent to the patient's PHR app.

    Status -> 'approved'.
    """
    consult = get_consult(consult_id)
    if consult is None:
        raise HTTPException(status_code=404, detail="Consultation not found")

    # Get the patient data (needed for the FHIR Patient resource)
    patient_id = consult.get("patient_id")
    patient = get_patient(patient_id)
    if patient is None:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Generate the FHIR R4 Bundle
    # This creates a standardized health record containing:
    #   - Patient demographics
    #   - Encounter (this consultation)
    #   - MedicationStatements (what medicines the patient is taking)
    #   - DetectedIssues (interaction alerts for patient safety)
    fhir_bundle = generate_fhir_bundle(consult, patient)

    # Save the FHIR bundle to the consultation record and mark as approved
    updated = update_consult(
        consult_id,
        {"fhir_bundle": fhir_bundle, "status": "approved"}
    )

    # Return the FHIR bundle as the API response
    # Frontend/ABDM can now use this standardized format
    return fhir_bundle


@app.get("/consult/{consult_id}")
def get_consult_route(consult_id: str):
    """Return the full consultation object (all fields, current status)."""
    consult = get_consult(consult_id)
    if consult is None:
        raise HTTPException(status_code=404, detail="Consultation not found")
    return consult


# ---------------------------------------------------------------------------
# Run the server (only if this file is executed directly)
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
