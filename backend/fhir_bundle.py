"""
WHAT:  FHIR R4 Bundle generator for SAMANVAYA.
WHY:   ABDM (Ayushman Bharat Digital Mission) requires health records in FHIR format.
       FHIR (Fast Healthcare Interoperability Resources) is an international standard
       for exchanging healthcare information electronically.
HOW:   Takes consultation data (patient, meds, alerts) and packages it into a
       FHIR R4 Bundle using standard Python dicts (no external FHIR libraries).
"""

from datetime import datetime
from typing import Dict, List


# ---------------------------------------------------------------------------
# WHAT: Generate a complete FHIR R4 Bundle
# WHY:  ABDM-compliant health records must be in FHIR Bundle format.
# HOW:  A Bundle is a container that holds multiple FHIR resources (Patient,
#       Encounter, MedicationStatement, DetectedIssue) in a single JSON object.
# ---------------------------------------------------------------------------

def generate_fhir_bundle(consult: dict, patient: dict) -> dict:
    """
    Generate a FHIR R4 Bundle from consultation and patient data.

    Args:
        consult: The consultation object with entities, med_profile, and alerts.
        patient: The patient object with id, name, age, sex.

    Returns:
        dict: A FHIR R4 Bundle containing Patient, Encounter, MedicationStatements,
              and DetectedIssues.
    """
    # FHIR Bundle structure:
    # - resourceType: "Bundle" (top-level container)
    # - type: "collection" (a set of related resources)
    # - timestamp: when this bundle was created (ISO 8601 format)
    # - entry: array of FHIR resources (Patient, Encounter, MedicationStatement, etc.)

    bundle = {
        "resourceType": "Bundle",
        "type": "collection",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "entry": []
    }

    # Entry 1: Patient resource
    # WHAT: Represents the patient's demographic information
    # WHY:  Every FHIR record must identify WHO the data is about
    bundle["entry"].append(create_patient_resource(patient))

    # Entry 2: Encounter resource
    # WHAT: Represents this specific consultation/visit
    # WHY:  Links all clinical findings (meds, alerts) to this consultation event
    bundle["entry"].append(create_encounter_resource(consult))

    # Entry 3+: MedicationStatement resources (one per medicine)
    # WHAT: Documents what medicines the patient is taking
    # WHY:  ABDM needs to track medication history for continuity of care
    med_profile = consult.get("med_profile", {})
    all_meds = med_profile.get("all", [])

    for med in all_meds:
        bundle["entry"].append(create_medication_statement(med, consult["id"], patient["id"]))

    # Entry N+: DetectedIssue resources (one per interaction alert)
    # WHAT: Documents drug-drug or herb-drug interaction warnings
    # WHY:  Critical for patient safety — alerts must be preserved in the health record
    alerts = consult.get("alerts", [])

    for alert in alerts:
        # Skip the "unknown medication" flag — it is not a real interaction,
        # so it must NOT become a DetectedIssue.
        if alert.get("interaction_id") == "unknown-medication-flag":
            continue

        bundle["entry"].append(create_detected_issue(alert, consult["id"]))

    return bundle


# ---------------------------------------------------------------------------
# WHAT: Create a FHIR Patient resource
# WHY:  Identifies the patient this health record belongs to
# HOW:  Maps our patient dict to FHIR Patient structure
# ---------------------------------------------------------------------------

def create_patient_resource(patient: dict) -> dict:
    """
    Create a FHIR Patient resource.

    FHIR Patient represents basic demographics:
    - id: unique identifier
    - name: patient's full name
    - gender: male/female/other/unknown
    - birthDate: used to calculate age (we have age directly, so we approximate)

    Args:
        patient: dict with id, name, age, sex

    Returns:
        dict: A FHIR Bundle entry containing a Patient resource
    """
    # Map our sex codes to FHIR gender codes
    # FHIR uses: "male", "female", "other", "unknown"
    gender_map = {
        "M": "male",
        "F": "female",
        "O": "other",
        "Other": "other",
    }
    gender = gender_map.get(patient.get("sex", ""), "unknown")

    # Approximate birth year from age (FHIR prefers birthDate over age)
    current_year = datetime.utcnow().year
    birth_year = current_year - patient.get("age", 0)

    return {
        "resource": {
            "resourceType": "Patient",
            "id": patient.get("id", "unknown"),
            "name": [
                {
                    "text": patient.get("name", "Unknown Patient"),
                    "use": "official"
                }
            ],
            "gender": gender,
            "birthDate": f"{birth_year}-01-01"  # Approximate (we only know age, not exact DOB)
        }
    }


# ---------------------------------------------------------------------------
# WHAT: Create a FHIR Encounter resource
# WHY:  Documents this consultation visit
# HOW:  Maps our consult dict to FHIR Encounter structure
# ---------------------------------------------------------------------------

def create_encounter_resource(consult: dict) -> dict:
    """
    Create a FHIR Encounter resource.

    FHIR Encounter represents an interaction between a patient and healthcare provider:
    - id: consultation ID
    - status: "finished" (consultation is complete)
    - class: "AMB" = ambulatory (outpatient visit, not admitted to hospital)
    - period: when the consultation happened

    Args:
        consult: The consultation object with id, created_at

    Returns:
        dict: A FHIR Bundle entry containing an Encounter resource
    """
    return {
        "resource": {
            "resourceType": "Encounter",
            "id": consult.get("id", "unknown"),
            "status": "finished",  # Consultation is complete (we're at the /approve stage)
            "class": {
                "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
                "code": "AMB",  # Ambulatory = outpatient visit
                "display": "ambulatory"
            },
            "period": {
                "start": consult.get("created_at", datetime.utcnow().isoformat() + "Z"),
                "end": datetime.utcnow().isoformat() + "Z"
            },
            "subject": {
                "reference": f"Patient/{consult.get('patient_id', 'unknown')}"
            }
        }
    }


# ---------------------------------------------------------------------------
# WHAT: Create a FHIR MedicationStatement resource
# WHY:  Documents what medication the patient is currently taking
# HOW:  Maps our normalized medication dict to FHIR MedicationStatement
# ---------------------------------------------------------------------------

def create_medication_statement(med: dict, encounter_id: str, patient_id: str) -> dict:
    """
    Create a FHIR MedicationStatement resource.

    FHIR MedicationStatement documents a patient's medication usage:
    - status: "active" (patient is currently taking this)
    - medicationCodeableConcept: what medicine (name + optional coding)
    - dosage: how much and how often
    - context: links to the Encounter (consultation) where this was documented

    Args:
        med: Normalized medication dict with name, dosage, frequency, system
        encounter_id: The consultation ID this medication was documented in
        patient_id: The patient ID this medication belongs to

    Returns:
        dict: A FHIR Bundle entry containing a MedicationStatement resource
    """
    # Use the canonical name if available, otherwise fall back to original name
    med_name = med.get("norm_name") or med.get("name", "Unknown Medication")

    # Build dosage instruction text (combines dosage + frequency)
    dosage_parts = []
    if med.get("dosage"):
        dosage_parts.append(med["dosage"])
    if med.get("frequency"):
        dosage_parts.append(med["frequency"])

    dosage_text = " ".join(dosage_parts) if dosage_parts else "As directed"

    # Add system (allopathy/ayush) to the dosage instruction for clarity
    if med.get("system"):
        dosage_text += f" ({med['system']})"

    return {
        "resource": {
            "resourceType": "MedicationStatement",
            "id": f"med-{med.get('norm_id', med.get('original', 'unknown')).replace(':', '-').replace(' ', '-')}",
            "status": "active",  # Patient is currently taking this medication
            "medicationCodeableConcept": {
                "text": med_name,
            },
            "subject": {
                "reference": f"Patient/{patient_id}"
            },
            "context": {
                "reference": f"Encounter/{encounter_id}"
            },
            "dosage": [
                {
                    "text": dosage_text
                }
            ],
            # Add extension to capture whether this is flagged as unrecognized
            "extension": [
                {
                    "url": "http://samanvaya.gov.in/fhir/StructureDefinition/medication-flagged",
                    "valueBoolean": med.get("flagged", False)
                },
                {
                    "url": "http://samanvaya.gov.in/fhir/StructureDefinition/medication-confidence",
                    "valueString": med.get("confidence", "unknown")
                }
            ] if med.get("flagged") or med.get("confidence") else []
        }
    }


# ---------------------------------------------------------------------------
# WHAT: Create a FHIR DetectedIssue resource
# WHY:  Documents drug-drug or herb-drug interaction warnings
# HOW:  Maps our interaction alert dict to FHIR DetectedIssue
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Test harness (run this file directly to test)
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("=" * 70)
    print("SAMANVAYA FHIR R4 Bundle Generator Test")
    print("=" * 70)

    # Mock patient data
    test_patient = {
        "id": "patient_test123",
        "name": "Rajesh Kumar",
        "age": 45,
        "sex": "M"
    }

    # Mock consultation data (after /check step)
    test_consult = {
        "id": "consult_test456",
        "patient_id": "patient_test123",
        "timestamp": "2026-08-30T07:30:00Z",
        "status": "checked",
        "entities": {
            "symptoms": ["fatigue"],
            "conditions": ["Type 2 Diabetes"],
            "medications": [
                {"name": "Metformin", "dosage": "500mg", "frequency": "twice daily", "system": "allopathy"},
                {"name": "Fenugreek", "dosage": "1tsp", "frequency": "daily", "system": "ayush"}
            ]
        },
        "med_profile": {
            "all": [
                {
                    "name": "Metformin",
                    "original": "Metformin",
                    "norm_id": "drug:metformin",
                    "norm_name": "Metformin",
                    "type": "drug",
                    "confidence": "exact",
                    "flagged": False,
                    "dosage": "500mg",
                    "frequency": "twice daily",
                    "system": "allopathy"
                },
                {
                    "name": "methi",
                    "original": "methi",
                    "norm_id": "herb:fenugreek",
                    "norm_name": "Fenugreek",
                    "type": "herb",
                    "confidence": "exact",
                    "flagged": False,
                    "dosage": "1tsp",
                    "frequency": "daily",
                    "system": "ayush"
                }
            ]
        },
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
    }

    # Generate the FHIR bundle
    bundle = generate_fhir_bundle(test_consult, test_patient)

    print("\nGenerated FHIR R4 Bundle:")
    print(f"  Resource Type: {bundle['resourceType']}")
    print(f"  Type: {bundle['type']}")
    print(f"  Timestamp: {bundle['timestamp']}")
    print(f"  Number of entries: {len(bundle['entry'])}")

    print("\nBundle entries:")
    for i, entry in enumerate(bundle["entry"], 1):
        resource_type = entry["resource"]["resourceType"]
        resource_id = entry["resource"].get("id", "N/A")
        print(f"  {i}. {resource_type} (id: {resource_id})")

    # Validate structure
    assert bundle["resourceType"] == "Bundle", "❌ Invalid Bundle resourceType"
    assert bundle["type"] == "collection", "❌ Invalid Bundle type"
    assert len(bundle["entry"]) >= 4, f"❌ Bundle should have at least 4 entries (Patient, Encounter, 2 Meds, 1 Alert), got {len(bundle['entry'])}"

    # Check for Patient
    patient_resources = [e for e in bundle["entry"] if e["resource"]["resourceType"] == "Patient"]
    assert len(patient_resources) == 1, "❌ Bundle should have exactly 1 Patient"

    # Check for Encounter
    encounter_resources = [e for e in bundle["entry"] if e["resource"]["resourceType"] == "Encounter"]
    assert len(encounter_resources) == 1, "❌ Bundle should have exactly 1 Encounter"

    # Check for MedicationStatements
    med_resources = [e for e in bundle["entry"] if e["resource"]["resourceType"] == "MedicationStatement"]
    assert len(med_resources) == 2, f"❌ Bundle should have 2 MedicationStatements, got {len(med_resources)}"

    # Check for DetectedIssues
    issue_resources = [e for e in bundle["entry"] if e["resource"]["resourceType"] == "DetectedIssue"]
    assert len(issue_resources) == 1, f"❌ Bundle should have 1 DetectedIssue, got {len(issue_resources)}"

    issue = next(e["resource"] for e in bundle["entry"]
                 if e["resource"]["resourceType"] == "DetectedIssue")
    assert issue["severity"] == "high", f"severity should be high, got {issue['severity']}"
    names = [imp["display"] for imp in issue["implicated"]]
    assert "Metformin" in names and "Fenugreek" in names, f"wrong meds: {names}"
    print("DetectedIssue severity + implicated meds are correct")

    print("\n✓ All FHIR bundle structure tests passed!")
    print("=" * 70)
