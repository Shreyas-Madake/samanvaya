"""
WHAT:  In-memory data store for patients and consultations.
WHY:   We need somewhere to keep data while the server is running.
       A real database comes later — for now, plain Python dicts are
       enough to test the pipeline shape.
HOW:   Don't run this file directly. It's imported by main.py.
       Example:  from store import create_patient, get_patient
"""

import uuid
from datetime import datetime, timezone


# ---------------------------------------------------------------------------
# The two "tables".  They're just dicts keyed by id.
# Everything lives in RAM — restarting the server wipes all data.
# ---------------------------------------------------------------------------
patients: dict[str, dict] = {}
consults: dict[str, dict] = {}


# ---- Valid status progression for a consultation ----
# Each step in the pipeline moves the status forward exactly one step.
VALID_STATUSES = [
    "created",
    "transcribed",
    "extracted",
    "reconciled",
    "checked",
    "approved",
]


# ---------------------------------------------------------------------------
# Patient helpers
# ---------------------------------------------------------------------------

def create_patient(name: str, age: int, sex: str) -> dict:
    """Create a new patient record and return it (with a generated id)."""
    patient_id = str(uuid.uuid4())
    patient = {
        "id": patient_id,
        "name": name,
        "age": age,
        "sex": sex,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    patients[patient_id] = patient
    return patient


def get_patient(patient_id: str) -> dict | None:
    """Return a patient by id, or None if not found."""
    return patients.get(patient_id)


# ---------------------------------------------------------------------------
# Consultation helpers
# ---------------------------------------------------------------------------

def create_consult(patient_id: str, consent: bool) -> dict:
    """Start a new consultation for a patient. consent=True means the
    patient has agreed to data processing."""
    consult_id = str(uuid.uuid4())
    consult = {
        "id": consult_id,
        "patient_id": patient_id,
        "consent": consent,
        "status": "created",
        "transcript": None,
        "entities": None,
        "medicines": None,
        "interactions": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    consults[consult_id] = consult
    return consult


def get_consult(consult_id: str) -> dict | None:
    """Return a consultation by id, or None if not found."""
    return consults.get(consult_id)


def update_consult(consult_id: str, updates: dict) -> dict | None:
    """Merge `updates` into an existing consultation and return it.
    Returns None if the consult doesn't exist."""
    consult = consults.get(consult_id)
    if consult is None:
        return None
    consult.update(updates)
    return consult
