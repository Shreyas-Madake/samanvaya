"""
WHAT:  Rule-based clinical entity extractor for SAMANVAYA.
WHY:   The extractor PROPOSES what medicines/conditions/symptoms are in the transcript.
       It does NOT decide whether medicines interact — only interactions.py does that.
       This keeps the extractor simple, offline, and auditable (no LLM, no internet).
HOW:   Run this file directly to test: python extract.py
       Or import it: from extract import extract
"""

import re
from typing import Dict, List, Set
from normalize import SYNONYM_MAP


# ---------------------------------------------------------------------------
# WHAT: Condition keyword map
# WHY:  Doctors use many ways to say the same condition (diabetes, diabetic,
#       high sugar, sugar patient). We map these to canonical condition names.
# HOW:  Case-insensitive substring search. Deduplicate results.
# ---------------------------------------------------------------------------

CONDITION_KEYWORDS = {
    "Type 2 Diabetes": [
        "diabetes", "diabetic", "high sugar", "blood sugar", "sugar patient",
        "dm", "niddm", "type 2", "t2dm"
    ],
    "Hypertension": [
        "hypertension", "high bp", "high blood pressure", "bp high", "hbp"
    ],
    "Hypothyroidism": [
        "thyroid", "hypothyroid", "underactive thyroid", "low thyroid"
    ],
    "High Cholesterol": [
        "cholesterol", "high cholesterol", "hyperlipidemia", "lipid"
    ],
    "Arthritis": [
        "arthritis", "joint pain", "rheumatoid", "osteoarthritis"
    ],
    "Asthma": [
        "asthma", "breathlessness", "wheezing"
    ],
    "Gastritis": [
        "gastritis", "acidity", "acid reflux", "gerd", "heartburn"
    ],
    "Anemia": [
        "anemia", "anaemia", "low hemoglobin", "low hb", "iron deficiency"
    ],
}


# ---------------------------------------------------------------------------
# WHAT: Symptom keyword list
# WHY:  Common symptoms patients report. We extract these for completeness.
# HOW:  Case-insensitive substring search. Deduplicate results.
# ---------------------------------------------------------------------------

SYMPTOM_KEYWORDS = [
    "fatigue", "tiredness", "tired", "weakness", "weak",
    "headache", "head pain",
    "nausea", "vomiting", "vomit",
    "dizziness", "dizzy",
    "fever", "temperature",
    "cough", "coughing",
    "pain", "ache", "aching",
    "breathlessness", "shortness of breath",
]


# ---------------------------------------------------------------------------
# WHAT: Dosage pattern regex
# WHY:  Captures dose tokens like "500mg", "1 tsp", "2 tablets", "10 units"
# HOW:  Looks for number + optional space + unit. Supports common English/Indian units.
# ---------------------------------------------------------------------------

DOSAGE_PATTERN = re.compile(
    r'\b(\d+(?:\.\d+)?)\s?(mg|ml|g|mcg|µg|tab|tablet|tablets|tsp|tbsp|teaspoon|tablespoon|drop|drops|unit|units|iu|capsule|capsules)\b',
    re.IGNORECASE
)


# ---------------------------------------------------------------------------
# WHAT: Frequency pattern map
# WHY:  Doctors say frequency in many ways (od, once daily, 1-0-0, do baar).
#       We normalize to clean labels so downstream systems understand.
# HOW:  Case-insensitive regex patterns. First match wins.
# ---------------------------------------------------------------------------

FREQUENCY_PATTERNS = [
    # Pattern -> canonical label
    (re.compile(r'\b(od|once daily|once a day|1-0-0|ek baar|एक बार)\b', re.IGNORECASE), "once daily"),
    (re.compile(r'\b(bd|twice daily|two times|twice a day|2 times|do baar|दो बार|1-1-0|1-0-1|0-1-1)\b', re.IGNORECASE), "twice daily"),
    (re.compile(r'\b(tds|thrice daily|three times|thrice a day|3 times|teen baar|तीन बार|1-1-1)\b', re.IGNORECASE), "three times daily"),
    (re.compile(r'\b(qid|four times|qds|char baar|चार बार)\b', re.IGNORECASE), "four times daily"),
    (re.compile(r'\b(hs|at night|before bed|bedtime|raat ko|रात को|sote samay|सोते समय|0-0-1)\b', re.IGNORECASE), "at night"),
    (re.compile(r'\b(morning|subah|सुबह|1-0-0)\b', re.IGNORECASE), "in the morning"),
    (re.compile(r'\b(sos|as needed|prn|when needed|zarurat par|ज़रूरत पर)\b', re.IGNORECASE), "as needed"),
    (re.compile(r'\b(weekly|har hafte|हर हफ्ते|once a week)\b', re.IGNORECASE), "weekly"),
]


# ---------------------------------------------------------------------------
# WHAT: Extract medications from transcript
# WHY:  Find all medicines mentioned by matching against SYNONYM_MAP (our source of truth).
#       Also catch unknown medicines that look like medicines (word + dose).
# HOW:  1. Tokenize the transcript into words
#       2. For each word, check if it's a known medicine (SYNONYM_MAP lookup)
#       3. Also check if any word is followed by a dose pattern (unknown medicine safety net)
#       4. For each found medicine, extract dosage and frequency from nearby text
# ---------------------------------------------------------------------------

def extract_medications(transcript: str) -> List[Dict]:
    """
    Extract medications from the transcript.

    Returns:
        List of dicts: [{"name": str, "dosage": str, "frequency": str, "system": str}, ...]
    """
    medications = []
    seen_names = set()  # Deduplicate

    transcript_lower = transcript.lower()
    words = re.findall(r'\b\w+\b', transcript_lower)

    # Strategy 1: Known medicines from SYNONYM_MAP
    for word in words:
        if word in SYNONYM_MAP:
            node = SYNONYM_MAP[word]

            # Skip if we've already found this medicine (by canonical name)
            if node["name"] in seen_names:
                continue
            seen_names.add(node["name"])

            # Find the position of this word in the transcript
            # We'll look around it for dosage and frequency
            match = re.search(r'\b' + re.escape(word) + r'\b', transcript_lower)
            if match:
                start_pos = match.start()
                # Get a window of text around this medicine (50 chars before, 100 after)
                window_start = max(0, start_pos - 50)
                window_end = min(len(transcript), start_pos + 100)
                window = transcript[window_start:window_end]

                dosage = extract_dosage(window)
                frequency = extract_frequency(window)
                system = "allopathy" if node["type"] == "drug" else "ayush"

                medications.append({
                    "name": node["name"],  # Use canonical name
                    "dosage": dosage,
                    "frequency": frequency,
                    "system": system,
                })

    # Strategy 2: Unknown medicines (SAFETY NET)
    # Catch any word immediately followed by a dose pattern, even if not in SYNONYM_MAP.
    # This prevents unknown medicines from vanishing — they'll be flagged in /reconcile.
    unknown_med_pattern = re.compile(
        r'\b([A-Z][a-z]+(?:[A-Z][a-z]+)*)\s+(\d+(?:\.\d+)?)\s?(mg|ml|g|mcg|µg|tab|tablet|tsp|tbsp|drop|unit|iu|capsule)\b',
        re.IGNORECASE
    )

    for match in unknown_med_pattern.finditer(transcript):
        med_name = match.group(1)
        med_name_lower = med_name.lower()

        # Skip if this is a known medicine (already handled above)
        if med_name_lower in SYNONYM_MAP:
            continue

        # Skip if we've already added it
        if med_name in seen_names:
            continue
        seen_names.add(med_name)

        # Extract dosage and frequency from the surrounding text
        window_start = max(0, match.start() - 50)
        window_end = min(len(transcript), match.end() + 100)
        window = transcript[window_start:window_end]

        dosage = extract_dosage(window)
        frequency = extract_frequency(window)

        medications.append({
            "name": med_name,  # Keep the raw match (normalize.py will flag it)
            "dosage": dosage,
            "frequency": frequency,
            "system": "",  # Unknown system — normalize.py will handle
        })

    return medications


def extract_dosage(text: str) -> str:
    """
    Extract the first dosage token from text (e.g. "500mg", "1 tsp").

    Returns:
        Dosage string, or "" if none found.
    """
    match = DOSAGE_PATTERN.search(text)
    if match:
        # Reconstruct the dosage with normalized spacing
        amount = match.group(1)
        unit = match.group(2)
        return f"{amount}{unit}"
    return ""


def extract_frequency(text: str) -> str:
    """
    Extract frequency from text (e.g. "twice daily", "at night").

    Returns:
        Canonical frequency label, or "" if none found.
    """
    for pattern, label in FREQUENCY_PATTERNS:
        if pattern.search(text):
            return label
    return ""


# ---------------------------------------------------------------------------
# WHAT: Extract conditions from transcript
# WHY:  We need to know patient conditions to match interactions (e.g.
#       "hypoglycemia risk is worse in diabetic patients").
# HOW:  Search for condition keywords. Deduplicate results.
# ---------------------------------------------------------------------------

def extract_conditions(transcript: str) -> List[str]:
    """
    Extract medical conditions from the transcript.

    Returns:
        List of canonical condition names (deduplicated).
    """
    conditions = set()
    transcript_lower = transcript.lower()

    for condition_name, keywords in CONDITION_KEYWORDS.items():
        for keyword in keywords:
            if keyword in transcript_lower:
                conditions.add(condition_name)
                break  # Don't double-count the same condition

    return sorted(list(conditions))  # Sort for deterministic output


# ---------------------------------------------------------------------------
# WHAT: Extract symptoms from transcript
# WHY:  Symptoms help the clinician understand the patient's presentation.
# HOW:  Search for symptom keywords. Deduplicate results.
# ---------------------------------------------------------------------------

def extract_symptoms(transcript: str) -> List[str]:
    """
    Extract symptoms from the transcript.

    Returns:
        List of symptom strings (deduplicated).
    """
    symptoms = set()
    transcript_lower = transcript.lower()

    for symptom in SYMPTOM_KEYWORDS:
        if symptom in transcript_lower:
            symptoms.add(symptom)

    return sorted(list(symptoms))  # Sort for deterministic output


# ---------------------------------------------------------------------------
# WHAT: Main extraction function
# WHY:  Single entry point that returns the exact shape /reconcile expects.
# HOW:  Calls the three sub-extractors and assembles the result dict.
# ---------------------------------------------------------------------------

def extract(transcript: str) -> Dict:
    """
    Extract clinical entities from a consultation transcript.

    Args:
        transcript: The doctor's spoken/typed consultation text.

    Returns:
        Dict with keys: symptoms, conditions, medications, allergies, advice.
        This matches the shape that /reconcile and /check expect.
    """
    return {
        "symptoms": extract_symptoms(transcript),
        "conditions": extract_conditions(transcript),
        "medications": extract_medications(transcript),
        "allergies": [],  # Not implemented yet (Phase 4)
        "advice": "",     # Not implemented yet (Phase 4)
    }


# ---------------------------------------------------------------------------
# Test harness (run this file directly to test)
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("=" * 70)
    print("SAMANVAYA Clinical Entity Extractor Test")
    print("=" * 70)

    # Test case 1: Golden transcript (MUST work — this is the demo scenario)
    test_1 = "Patient is diabetic, complains of fatigue. Currently taking Metformin 500mg twice daily and methi seeds 1 tsp daily."

    print("\n[Test 1: Golden transcript]")
    print(f"Input: {test_1}")
    result_1 = extract(test_1)
    print("\nExtracted entities:")
    print(f"  Symptoms:    {result_1['symptoms']}")
    print(f"  Conditions:  {result_1['conditions']}")
    print(f"  Medications: {result_1['medications']}")

    # Validate golden case
    assert "Type 2 Diabetes" in result_1["conditions"], "❌ Failed to extract 'Type 2 Diabetes'"
    assert "fatigue" in result_1["symptoms"], "❌ Failed to extract 'fatigue'"

    med_names = [m["name"] for m in result_1["medications"]]
    assert "Metformin" in med_names, "❌ Failed to extract 'Metformin'"
    assert "Fenugreek" in med_names, "❌ Failed to extract 'Fenugreek' (from 'methi')"

    metformin = next(m for m in result_1["medications"] if m["name"] == "Metformin")
    assert metformin["dosage"] == "500mg", f"❌ Wrong dosage for Metformin: {metformin['dosage']}"
    assert metformin["frequency"] == "twice daily", f"❌ Wrong frequency for Metformin: {metformin['frequency']}"
    assert metformin["system"] == "allopathy", f"❌ Wrong system for Metformin: {metformin['system']}"

    fenugreek = next(m for m in result_1["medications"] if m["name"] == "Fenugreek")
    assert fenugreek["dosage"] == "1tsp", f"❌ Wrong dosage for Fenugreek: {fenugreek['dosage']}"
    assert fenugreek["system"] == "ayush", f"❌ Wrong system for Fenugreek: {fenugreek['system']}"

    print("\n✓ Golden transcript test passed!")

    # Test case 2: Different medicines (should NOT trigger false interactions)
    test_2 = "Patient has headache and fever. Taking Paracetamol 500mg three times daily and Vitamin C 1000mg once daily."

    print("\n" + "=" * 70)
    print("[Test 2: Different medicines (no interaction)]")
    print(f"Input: {test_2}")
    result_2 = extract(test_2)
    print("\nExtracted entities:")
    print(f"  Symptoms:    {result_2['symptoms']}")
    print(f"  Conditions:  {result_2['conditions']}")
    print(f"  Medications: {result_2['medications']}")

    med_names_2 = [m["name"] for m in result_2["medications"]]
    assert "Paracetamol" in med_names_2, "❌ Failed to extract 'Paracetamol'"

    print("\n✓ Different medicines test passed!")

    # Test case 3: Hinglish frequency patterns
    test_3 = "Patient ko high BP hai. Aspirin 75mg raat ko le rahe hain aur haldi 1 tsp do baar daily."

    print("\n" + "=" * 70)
    print("[Test 3: Hinglish frequency patterns]")
    print(f"Input: {test_3}")
    result_3 = extract(test_3)
    print("\nExtracted entities:")
    print(f"  Symptoms:    {result_3['symptoms']}")
    print(f"  Conditions:  {result_3['conditions']}")
    print(f"  Medications: {result_3['medications']}")

    assert "Hypertension" in result_3["conditions"], "❌ Failed to extract 'Hypertension' from 'high BP'"

    med_names_3 = [m["name"] for m in result_3["medications"]]
    assert "Aspirin" in med_names_3, "❌ Failed to extract 'Aspirin'"
    assert "Turmeric" in med_names_3, "❌ Failed to extract 'Turmeric' (from 'haldi')"

    aspirin = next(m for m in result_3["medications"] if m["name"] == "Aspirin")
    assert aspirin["frequency"] == "at night", f"❌ Failed to parse 'raat ko': {aspirin['frequency']}"

    turmeric = next(m for m in result_3["medications"] if m["name"] == "Turmeric")
    assert turmeric["frequency"] == "twice daily", f"❌ Failed to parse 'do baar': {turmeric['frequency']}"

    print("\n✓ Hinglish test passed!")

    # Test case 4: Unknown medicine safety net
    test_4 = "Patient taking Zltxn 250mg twice daily for infection."

    print("\n" + "=" * 70)
    print("[Test 4: Unknown medicine (should be caught and flagged)]")
    print(f"Input: {test_4}")
    result_4 = extract(test_4)
    print("\nExtracted entities:")
    print(f"  Symptoms:    {result_4['symptoms']}")
    print(f"  Conditions:  {result_4['conditions']}")
    print(f"  Medications: {result_4['medications']}")

    med_names_4 = [m["name"] for m in result_4["medications"]]
    assert "Zltxn" in med_names_4, "❌ Failed to catch unknown medicine 'Zltxn'"

    zltxn = next(m for m in result_4["medications"] if m["name"] == "Zltxn")
    assert zltxn["dosage"] == "250mg", f"❌ Wrong dosage for Zltxn: {zltxn['dosage']}"
    assert zltxn["system"] == "", f"❌ Unknown medicine should have empty system: {zltxn['system']}"

    print("\n✓ Unknown medicine safety net test passed!")

    print("\n" + "=" * 70)
    print("✓ All extractor tests passed!")
    print("=" * 70)
