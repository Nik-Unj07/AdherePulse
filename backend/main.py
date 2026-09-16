"""
AdherePulse FastAPI Application
Provides RESTful APIs, ML adherence inference, FHIR R4 interoperability, and static UI delivery.
"""

import os
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, Depends, HTTPException, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from models import SessionLocal, init_db, Patient, Prescription, DispenseEvent, VitalRecord, ClinicalNote, AdherencePrediction, InterventionLog
from ml_engine import engine as ml_engine
from fhir_service import FHIRService

app = FastAPI(
    title="AdherePulse Clinical Adherence Engine",
    description="Uncertainty-Aware Latent Adherence Inference Platform",
    version="1.0.0"
)

# Enable CORS for local development and testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Pydantic Schemas for Requests
class SimulationRequest(BaseModel):
    intervention: str  # SWITCH_90_DAY_SUPPLY, RESOLVE_SIDE_EFFECT, DEPLOY_IOT_SMART_CAP, NURSE_NAVIGATOR_CARE_CALL


class InterventionCreateRequest(BaseModel):
    action_type: str
    title: str
    description: str
    clinician_notes: Optional[str] = ""


# API Endpoints
@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "AdherePulse Adherence Engine",
        "engine": "XGBoost + GradientBoosting Latent Signal Fusion",
        "fhir_version": "HL7 FHIR R4"
    }


@app.get("/api/patients")
def list_patients(
    condition: Optional[str] = None,
    risk_tier: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Patient)
    if condition:
        query = query.filter(Patient.primary_condition.ilike(f"%{condition}%"))

    patients = query.all()
    results = []
    for p in patients:
        latest_pred = db.query(AdherencePrediction).filter(
            AdherencePrediction.patient_id == p.id
        ).order_by(AdherencePrediction.id.desc()).first()

        risk_val = latest_pred.risk_score if latest_pred else 0.25
        tier = "High Risk" if risk_val >= 0.65 else ("Moderate Risk" if risk_val >= 0.40 else "Low Risk")

        if risk_tier and risk_tier.lower() not in tier.lower():
            continue

        results.append({
            "id": p.id,
            "mrn": p.mrn,
            "full_name": p.full_name,
            "age": p.age,
            "gender": p.gender,
            "primary_condition": p.primary_condition,
            "cohort_group": p.cohort_group,
            "care_coordinator": p.care_coordinator,
            "iot_device_active": p.iot_device_active,
            "risk_score": latest_pred.risk_score if latest_pred else None,
            "confidence_lower": latest_pred.confidence_lower if latest_pred else None,
            "confidence_upper": latest_pred.confidence_upper if latest_pred else None,
            "pattern_type": latest_pred.pattern_type if latest_pred else "Analyzing...",
            "primary_driver": latest_pred.primary_driver if latest_pred else "",
            "pdc_score": latest_pred.pdc_score if latest_pred else 1.0,
            "mpr_score": latest_pred.mpr_score if latest_pred else 1.0,
            "risk_tier": tier,
        })
    return results


@app.get("/api/patients/{patient_id}")
def get_patient_dossier(patient_id: int, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    prescriptions = [r.to_dict() for r in patient.prescriptions]
    dispenses = [d.to_dict() for d in patient.dispenses]
    vitals = [v.to_dict() for v in patient.vitals]
    notes = [n.to_dict() for n in patient.clinical_notes]
    interventions = [i.to_dict() for i in patient.interventions]

    latest_pred = db.query(AdherencePrediction).filter(
        AdherencePrediction.patient_id == patient.id
    ).order_by(AdherencePrediction.id.desc()).first()

    return {
        "patient": patient.to_dict(),
        "prescriptions": prescriptions,
        "dispenses": sorted(dispenses, key=lambda x: x.get("dispense_date", "")),
        "vitals": sorted(vitals, key=lambda x: x.get("recorded_date", "")),
        "clinical_notes": sorted(notes, key=lambda x: x.get("note_date", ""), reverse=True),
        "prediction": latest_pred.to_dict() if latest_pred else None,
        "interventions": interventions
    }


@app.get("/api/patients/{patient_id}/analysis")
def run_live_adherence_analysis(patient_id: int, db: Session = Depends(get_db)):
    """Run real-time signal fusion, uncertainty estimation, and SHAP explainability."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    p_dispenses = [d.to_dict() for d in patient.dispenses]
    p_prescriptions = [r.to_dict() for r in patient.prescriptions]
    p_vitals = [v.to_dict() for v in patient.vitals]
    p_notes = [n.to_dict() for n in patient.clinical_notes]

    features, meta = ml_engine.extract_features(
        dispenses=p_dispenses,
        prescriptions=p_prescriptions,
        vitals=p_vitals,
        notes=p_notes,
        iot_active=(patient.iot_device_active is not None)
    )
    inference = ml_engine.infer_adherence(features, meta)

    return {
        "patient_id": patient.id,
        "features": features,
        "meta": meta,
        "inference": inference
    }


@app.post("/api/patients/{patient_id}/simulate")
def simulate_patient_intervention(
    patient_id: int,
    req: SimulationRequest,
    db: Session = Depends(get_db)
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    p_dispenses = [d.to_dict() for d in patient.dispenses]
    p_prescriptions = [r.to_dict() for r in patient.prescriptions]
    p_vitals = [v.to_dict() for v in patient.vitals]
    p_notes = [n.to_dict() for n in patient.clinical_notes]

    features, meta = ml_engine.extract_features(
        dispenses=p_dispenses,
        prescriptions=p_prescriptions,
        vitals=p_vitals,
        notes=p_notes,
        iot_active=(patient.iot_device_active is not None)
    )

    simulation_result = ml_engine.simulate_counterfactual(features, req.intervention)
    return simulation_result


@app.post("/api/patients/{patient_id}/interventions")
def log_clinical_intervention(
    patient_id: int,
    req: InterventionCreateRequest,
    db: Session = Depends(get_db)
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    entry = InterventionLog(
        patient_id=patient.id,
        action_type=req.action_type,
        title=req.title,
        description=req.description,
        status="Accepted",
        clinician_notes=req.clinician_notes or "Logged from AdherePulse Clinician Decision Dashboard."
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return {"status": "success", "intervention": entry.to_dict()}


@app.get("/api/patients/{patient_id}/fhir")
def export_patient_fhir(patient_id: int, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    bundle = FHIRService.export_patient_bundle(patient)
    return bundle


@app.post("/api/fhir/import")
def import_fhir_bundle(bundle: Dict[str, Any] = Body(...), db: Session = Depends(get_db)):
    result = FHIRService.ingest_fhir_bundle(bundle, db)
    return result


# Mount Static Files for Minimalist Web UI
static_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.get("/")
def serve_index():
    index_path = os.path.join(static_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "AdherePulse API is running. Static frontend not found."}
