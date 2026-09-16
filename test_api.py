"""
Automated Verification Suite for AdherePulse
Tests all backend API endpoints, ML inference calculations, and FHIR generation.
"""

import sys
import os

# Add backend to sys.path
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend"))

from fastapi.testclient import TestClient
from main import app
from seed_data import populate_seed_data

def run_tests():
    print("Populating database for tests...")
    populate_seed_data()
    client = TestClient(app)

    print("\n--- 1. Health Check ---")
    res = client.get("/api/health")
    assert res.status_code == 200, f"Health check failed: {res.status_code}"
    print("[PASS] Health Check Passed:", res.json())

    print("\n--- 2. List Patients ---")
    res = client.get("/api/patients")
    assert res.status_code == 200, f"List patients failed: {res.status_code}"
    patients = res.json()
    assert len(patients) >= 6, f"Expected at least 6 patients, got {len(patients)}"
    print(f"[PASS] Retrieved {len(patients)} patients:")
    for p in patients:
        print(f"  - {p['full_name']} ({p['mrn']}): Risk={int((p['risk_score'] or 0)*100)}%, Pattern='{p['pattern_type']}'")

    print("\n--- 3. Patient 1 Dossier (Eleanor Vance) ---")
    res = client.get("/api/patients/1")
    assert res.status_code == 200, f"Patient dossier failed: {res.status_code}"
    dossier = res.json()
    assert dossier["patient"]["full_name"] == "Eleanor Vance"
    assert len(dossier["dispenses"]) >= 3
    assert len(dossier["vitals"]) >= 4
    print("[PASS] Patient Dossier Retrieved with Dispenses, Vitals & Notes.")

    print("\n--- 4. Live ML Inference & SHAP Explainability ---")
    res = client.get("/api/patients/1/analysis")
    assert res.status_code == 200, f"Analysis failed: {res.status_code}"
    analysis = res.json()
    assert "inference" in analysis
    assert "explainability" in analysis["inference"]
    print(f"[PASS] Inferred Risk: {analysis['inference']['risk_score']} [CI: {analysis['inference']['confidence_lower']} - {analysis['inference']['confidence_upper']}]")
    print(f"[PASS] Pattern Typology: {analysis['inference']['pattern_type']}")
    print(f"[PASS] SHAP Features: {len(analysis['inference']['explainability'])} factors decomposed.")

    print("\n--- 5. Counterfactual Simulation (What-If 90-Day Supply) ---")
    sim_payload = {"intervention": "SWITCH_90_DAY_SUPPLY"}
    res = client.post("/api/patients/1/simulate", json=sim_payload)
    assert res.status_code == 200, f"Simulation failed: {res.status_code}"
    sim_data = res.json()
    print(f"[PASS] Simulation Projected Risk: {sim_data['projected_risk_score']} (PDC: {sim_data['projected_pdc']})")
    print(f"[PASS] Mechanism: {sim_data['narrative']}")

    print("\n--- 6. Log Clinical Intervention ---")
    int_payload = {
        "action_type": "SWITCH_90_DAY_SUPPLY",
        "title": "Switch to 90-Day Supply",
        "description": sim_data["narrative"],
        "clinician_notes": "Prescription converted to 90d mail order to reduce weekend gap friction."
    }
    res = client.post("/api/patients/1/interventions", json=int_payload)
    assert res.status_code == 200, f"Intervention log failed: {res.status_code}"
    print("[PASS] Intervention successfully logged to patient electronic record.")

    print("\n--- 7. FHIR R4 Bundle Export ---")
    res = client.get("/api/patients/1/fhir")
    assert res.status_code == 200, f"FHIR export failed: {res.status_code}"
    fhir_bundle = res.json()
    assert fhir_bundle["resourceType"] == "Bundle"
    assert len(fhir_bundle["entry"]) >= 5
    print(f"[PASS] Exported FHIR R4 Bundle with {len(fhir_bundle['entry'])} HL7 resources.")

    print("\n--- 8. Static Web UI Delivery ---")
    res = client.get("/")
    assert res.status_code == 200, f"Static index failed: {res.status_code}"
    assert "AdherePulse" in res.text
    print("[PASS] Static frontend container served successfully.")

    print("\n" + "=" * 50)
    print("  ALL AUTOMATED VERIFICATION TESTS PASSED! ")
    print("=" * 50)

if __name__ == "__main__":
    run_tests()
