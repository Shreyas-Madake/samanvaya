"""
WHAT:  Medication normalization engine for SAMANVAYA.
WHY:   Doctors use many different names for the same medicine (brand names,
       generic names, Hindi names, etc.). This module maps all those synonyms
       to a single canonical ID so the interaction engine can work reliably.
HOW:   Run this file directly to test: python normalize.py
       Or import it: from normalize import normalize, normalize_list
"""

import json
from pathlib import Path
from difflib import SequenceMatcher
from typing import List, Dict, Optional


# ---------------------------------------------------------------------------
# Load the knowledge base on module import
# ---------------------------------------------------------------------------

# Find the knowledge/ folder relative to this file
KNOWLEDGE_DIR = Path(__file__).parent / "knowledge"

# Load drugs.json and herbs.json
with open(KNOWLEDGE_DIR / "drugs.json", "r", encoding="utf-8") as f:
    DRUGS = json.load(f)

with open(KNOWLEDGE_DIR / "herbs.json", "r", encoding="utf-8") as f:
    HERBS = json.load(f)


# ---------------------------------------------------------------------------
# Build a flat lookup table: lowercase synonym -> canonical node
# ---------------------------------------------------------------------------

# This dict maps every synonym (lowercased) to the full node object.
# Example: "methi" -> {"id": "herb:fenugreek", "name": "Fenugreek", "type": "herb"}
SYNONYM_MAP: Dict[str, Dict] = {}

for drug in DRUGS:
    node = {"id": drug["id"], "name": drug["name"], "type": "drug"}
    for syn in drug["synonyms"]:
        SYNONYM_MAP[syn.lower()] = node

for herb in HERBS:
    node = {"id": herb["id"], "name": herb["name"], "type": "herb"}
    for syn in herb["synonyms"]:
        SYNONYM_MAP[syn.lower()] = node


# ---------------------------------------------------------------------------
# Normalization functions
# ---------------------------------------------------------------------------

def normalize(name: str, fuzzy_threshold: float = 0.85):
    """
    Normalize a medication name to a canonical node.

    Args:
        name: The medicine name as typed/spoken by the doctor.
        fuzzy_threshold: Minimum similarity score (0-1) for fuzzy match.

    Returns:
        dict with:
            - original: the input name
            - norm_id: canonical ID (e.g. "drug:metformin") or None if unrecognized
            - norm_name: canonical name (e.g. "Metformin") or None
            - type: "drug" or "herb" or None
            - confidence: "exact", "fuzzy", or "low"
            - flagged: True if we couldn't confidently identify it
    """
    name_lower = name.strip().lower()

    # Try exact match first
    if name_lower in SYNONYM_MAP:
        node = SYNONYM_MAP[name_lower]
        return {
            "original": name,
            "norm_id": node["id"],
            "norm_name": node["name"],
            "type": node["type"],
            "confidence": "exact",
            "flagged": False,
        }

    # Try fuzzy match using difflib.SequenceMatcher (stdlib only)
    # We check every synonym and pick the best match if it's above the threshold.
    best_match = None
    best_score = 0.0

    for syn, node in SYNONYM_MAP.items():
        score = SequenceMatcher(None, name_lower, syn).ratio()
        if score > best_score:
            best_score = score
            best_match = node

    if best_score >= fuzzy_threshold and best_match is not None:
        return {
            "original": name,
            "norm_id": best_match["id"],
            "norm_name": best_match["name"],
            "type": best_match["type"],
            "confidence": "fuzzy",
            "flagged": False,
        }

    # No confident match — flag for clinician review
    # NEVER guess. If we don't know, we admit it.
    return {
        "original": name,
        "norm_id": None,
        "norm_name": None,
        "type": None,
        "confidence": "low",
        "flagged": True,
    }


def normalize_list(meds: list[dict]) -> list[dict]:
    """
    Normalize a list of medication dicts.

    Args:
        meds: List of dicts with at least {"name": "...", ...}

    Returns:
        List of dicts with normalization results merged in.
    """
    results = []
    for med in meds:
        name = med.get("name", "")
        norm_result = normalize(name)
        # Merge the original med dict with the normalization result
        result = {**med, **norm_result}
        results.append(result)
    return results


# ---------------------------------------------------------------------------
# Test harness (run this file directly to test)
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("=" * 70)
    print("SAMANVAYA Normalization Engine Test")
    print("=" * 70)

    test_cases = [
        "Metformin",
        "methi",  # Hindi for fenugreek
        "Glycomet",  # brand name for Metformin
        "haldi",  # Hindi for turmeric
        "Crocin",  # brand name for Paracetamol
        "asprin",  # common misspelling of Aspirin
        "some random herb",  # should be flagged
    ]

    for test_name in test_cases:
        result = normalize(test_name)
        print(f"\nInput: '{test_name}'")
        print(f"  Normalized ID:   {result['norm_id']}")
        print(f"  Normalized Name: {result['norm_name']}")
        print(f"  Type:            {result['type']}")
        print(f"  Confidence:      {result['confidence']}")
        print(f"  Flagged:         {result['flagged']}")

    print("\n" + "=" * 70)
    print("Testing normalize_list() with a mock medication list")
    print("=" * 70)

    mock_meds = [
        {"name": "Metformin", "dosage": "500mg", "frequency": "twice daily"},
        {"name": "methi", "dosage": "1 tsp", "frequency": "daily"},
    ]

    normalized = normalize_list(mock_meds)
    print(json.dumps(normalized, indent=2))

    print("\n✓ Normalization engine test complete!")
