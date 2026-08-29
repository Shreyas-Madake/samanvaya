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
    Extract clinical entities from the transcript.
    For now, returns MOCK data. Status -> 'extracted'.

    In Phase 3, we will replace this with a real rule-based extractor.
    """
    consult = get_consult(consult_id)
    if consult is None:
        raise HTTPException(status_code=404, detail="Consultation not found")

    # MOCK entities — this is just a placeholder to show the shape
    mock_entities = {
        "symptoms": ["fever", "headache", "fatigue"],
        "conditions": ["Type 2 Diabetes"],
        "medications": [
            {"name": "Metformin", "dosage": "500mg", "frequency": "twice daily", "system": "allopathy"},
            {"name": "Fenugreek seeds", "dosage": "1 tsp", "frequency": "daily", "system": "ayush"},
        ],
        "allergies": [],
        "advice": "Continue current medications, monitor blood sugar",
    }

    updated = update_consult(
        consult_id,
        {"entities": mock_entities, "status": "extracted"}
    )
    return updated


@app.post("/consult/{consult_id}/reconcile")
def reconcile_route(consult_id: str):
    """
    Normalize and reconcile the extracted medications into a unified profile.
    For now, returns MOCK data. Status -> 'reconciled'.

    In Phase 2, we will map medicine names to standard IDs from our knowledge base.
    """
    consult = get_consult(consult_id)
    if consult is None:
        raise HTTPException(status_code=404, detail="Consultation not found")

    # MOCK unified medicine profile — just a placeholder
    mock_medicines = {
        "allopathy": [
            {"id": "RxNorm:6809", "name": "Metformin", "dosage": "500mg", "frequency": "twice daily"}
        ],
        "ayush": [
            {"id": "AYUSH:FEN001", "name": "Fenugreek (Trigonella foenum-graecum)", "dosage": "1 tsp", "frequency": "daily"}
        ],
        "unrecognized": [],  # Any medicines we couldn't identify go here
    }

    updated = update_consult(
        consult_id,
        {"medicines": mock_medicines, "status": "reconciled"}
    )
    return updated


@app.post("/consult/{consult_id}/check")
def check_interactions_route(consult_id: str):
    """
    Check for dangerous drug-drug and herb-drug interactions.
    For now, returns MOCK data with ONE interaction alert. Status -> 'checked'.

    In Phase 2, we will replace this with a real interaction engine that reads
    from a curated interactions.json file. The LLM will NEVER decide if two
    things interact — only the data file does that.
    """
    consult = get_consult(consult_id)
    if consult is None:
        raise HTTPException(status_code=404, detail="Consultation not found")

    # MOCK interaction alert — just a placeholder
    mock_interactions = [
        {
            "drug_a": {"name": "Metformin", "id": "RxNorm:6809"},
            "drug_b": {"name": "Fenugreek", "id": "AYUSH:FEN001"},
            "risk_level": "high",
            "description": "Fenugreek may enhance the hypoglycemic effect of Metformin, increasing risk of low blood sugar.",
            "evidence": {
                "source": "Mock Database",
                "citation": "Placeholder citation — real data in Phase 2",
            },
            "recommendation": "Monitor blood glucose closely. Consider dose adjustment.",
        }
    ]

    updated = update_consult(
        consult_id,
        {"interactions": mock_interactions, "status": "checked"}
    )
    return updated


@app.post("/consult/{consult_id}/approve")
def approve_route(consult_id: str):
    """
    Clinician has reviewed the interactions and approved the record.
    For now, returns a mock 'saved' confirmation. Status -> 'approved'.

    In Phase 4, we will generate a FHIR R4 resource bundle here and save it.
    """
    consult = get_consult(consult_id)
    if consult is None:
        raise HTTPException(status_code=404, detail="Consultation not found")

    # In the real system, we would generate a FHIR bundle and save it to a database.
    # For now, just mark it as approved.
    updated = update_consult(consult_id, {"status": "approved"})

    return {"saved": True, "consult": updated}


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
