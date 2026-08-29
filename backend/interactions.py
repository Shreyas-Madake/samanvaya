"""
WHAT:  Interaction detection engine for SAMANVAYA.
WHY:   This is the crown jewel. It checks every pair of medications against
       a curated knowledge base of drug-drug and herb-drug interactions, and
       flags dangerous combinations with evidence citations.
       GOLDEN RULE: The LLM never decides if two things interact. Only this
       curated data file does. The AI proposes; the knowledge graph disposes.
HOW:   Run this file directly to test: python interactions.py
       Or import it: from interactions import check
"""

import json
from pathlib import Path
from itertools import combinations


# ---------------------------------------------------------------------------
# Load the interactions knowledge base on module import
# ---------------------------------------------------------------------------

KNOWLEDGE_DIR = Path(__file__).parent / "knowledge"

with open(KNOWLEDGE_DIR / "interactions.json", "r", encoding="utf-8") as f:
    INTERACTIONS = json.load(f)


# ---------------------------------------------------------------------------
# Build a fast lookup table: frozenset({id_a, id_b}) -> interaction
# ---------------------------------------------------------------------------

# We use frozenset because order doesn't matter: {A, B} == {B, A}
# This gives us O(1) lookup for any pair of medication IDs.
INTERACTION_MAP = {}

for interaction in INTERACTIONS:
    id_a = interaction["a"]["id"]
    id_b = interaction["b"]["id"]
    key = frozenset({id_a, id_b})
    INTERACTION_MAP[key] = interaction


# ---------------------------------------------------------------------------
# Interaction checking function
# ---------------------------------------------------------------------------

def check(meds: list[dict], conditions: list[str] = None) -> list[dict]:
    """
    Check a list of normalized medications for dangerous interactions.

    Args:
        meds: List of medication dicts with at least {"norm_id": "...", ...}
        conditions: List of patient conditions (e.g. ["diabetes", "hypertension"])

    Returns:
        List of alert dicts, sorted by risk level (high first).
    """
    if conditions is None:
        conditions = []

    # Lowercase all conditions for case-insensitive matching
    conditions_lower = [c.lower() for c in conditions]

    alerts = []

    # Check every pair of medications
    for med_a, med_b in combinations(meds, 2):
        id_a = med_a.get("norm_id")
        id_b = med_b.get("norm_id")

        # Skip if either medication wasn't successfully normalized
        if id_a is None or id_b is None:
            continue

        # Look up this pair in the interaction map
        key = frozenset({id_a, id_b})
        interaction = INTERACTION_MAP.get(key)

        if interaction:
            # We found an interaction! Build an alert.
            # Check if the patient's conditions make this relevant.
            condition_match = False
            matched_conditions = []

            for cond in interaction.get("conditions", []):
                if cond.lower() in conditions_lower:
                    condition_match = True
                    matched_conditions.append(cond)

            alert = {
                "interaction_id": interaction["id"],
                "drug_a": {
                    "id": med_a["norm_id"],
                    "name": med_a["norm_name"],
                    "original": med_a["original"],
                },
                "drug_b": {
                    "id": med_b["norm_id"],
                    "name": med_b["norm_name"],
                    "original": med_b["original"],
                },
                "risk": interaction["risk"],
                "effect": interaction["effect"],
                "mechanism": interaction["mechanism"],
                "recommendation": interaction["recommendation"],
                "evidence": interaction["evidence"],
                "condition_match": condition_match,
                "matched_conditions": matched_conditions,
            }
            alerts.append(alert)

    # Add a special alert for any medications we couldn't identify
    # (flagged: True). The clinician MUST review these.
    flagged_meds = [m for m in meds if m.get("flagged", False)]
    if flagged_meds:
        alerts.append({
            "interaction_id": "unknown-medication-flag",
            "drug_a": None,
            "drug_b": None,
            "risk": "unknown",
            "effect": "Unknown medication(s) detected",
            "mechanism": "The following medications could not be identified: "
                         + ", ".join([f"'{m['original']}'" for m in flagged_meds])
                         + ". Cannot check for interactions until identified.",
            "recommendation": "Clinician must verify these medications before approving the record.",
            "evidence": [],
            "condition_match": False,
            "matched_conditions": [],
            "flagged_meds": [m["original"] for m in flagged_meds],
        })

    # Sort alerts by risk level: high -> moderate -> low -> unknown
    risk_order = {"high": 0, "moderate": 1, "low": 2, "unknown": 3}
    alerts.sort(key=lambda a: risk_order.get(a["risk"], 99))

    return alerts


# ---------------------------------------------------------------------------
# Test harness (run this file directly to test)
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("=" * 70)
    print("SAMANVAYA Interaction Engine Test")
    print("=" * 70)

    # Mock normalized medications: Metformin + Methi (fenugreek in Hindi)
    # This should trigger the high-risk interaction we defined.
    mock_meds = [
        {
            "original": "Metformin",
            "norm_id": "drug:metformin",
            "norm_name": "Metformin",
            "type": "drug",
            "confidence": "exact",
            "flagged": False,
            "dosage": "500mg",
            "frequency": "twice daily",
        },
        {
            "original": "Methi",
            "norm_id": "herb:fenugreek",
            "norm_name": "Fenugreek",
            "type": "herb",
            "confidence": "exact",
            "flagged": False,
            "dosage": "1 tsp",
            "frequency": "daily",
        },
    ]

    mock_conditions = ["type 2 diabetes"]

    alerts = check(mock_meds, mock_conditions)

    print(f"\nFound {len(alerts)} alert(s):\n")

    for i, alert in enumerate(alerts, 1):
        print(f"Alert #{i}")
        print(f"  Risk Level:    {alert['risk']}")
        print(f"  Effect:        {alert['effect']}")
        if alert['drug_a'] and alert['drug_b']:
            print(f"  Drug A:        {alert['drug_a']['name']} (entered as '{alert['drug_a']['original']}')")
            print(f"  Drug B:        {alert['drug_b']['name']} (entered as '{alert['drug_b']['original']}')")
        print(f"  Mechanism:     {alert['mechanism']}")
        print(f"  Recommendation: {alert['recommendation']}")
        print(f"  Condition Match: {alert['condition_match']}")
        if alert['matched_conditions']:
            print(f"  Matched Conditions: {', '.join(alert['matched_conditions'])}")
        if alert['evidence']:
            print(f"  Evidence:")
            for ev in alert['evidence']:
                print(f"    - {ev['source']} ({ev['ref']})")
        print()

    print("=" * 70)
    print("Testing with an unknown medication")
    print("=" * 70)

    mock_meds_with_unknown = [
        {
            "original": "Metformin",
            "norm_id": "drug:metformin",
            "norm_name": "Metformin",
            "type": "drug",
            "confidence": "exact",
            "flagged": False,
        },
        {
            "original": "some weird herb",
            "norm_id": None,
            "norm_name": None,
            "type": None,
            "confidence": "low",
            "flagged": True,
        },
    ]

    alerts = check(mock_meds_with_unknown, [])

    print(f"\nFound {len(alerts)} alert(s):\n")
    for alert in alerts:
        print(f"  Risk: {alert['risk']}")
        print(f"  Effect: {alert['effect']}")
        print(f"  Mechanism: {alert['mechanism']}")
        print()

    print("✓ Interaction engine test complete!")
