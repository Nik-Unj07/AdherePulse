"""
AdherePulse Database Models
Compatible with SQLite and PostgreSQL via SQLAlchemy.
"""

from datetime import datetime, date
from sqlalchemy import create_engine, Column, Integer, String, Float, Date, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import declarative_base, relationship, sessionmaker
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///D:/AdherePulse/adhere_pulse.db")

engine = create_engine(
    DATABASE_URL, 
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    mrn = Column(String(32), unique=True, index=True)
    full_name = Column(String(128), nullable=False)
    age = Column(Integer, nullable=False)
    gender = Column(String(16), nullable=False)
    primary_condition = Column(String(64), nullable=False)  # e.g., 'Heart Failure', 'Type 2 Diabetes', 'Hypertension'
    cohort_group = Column(String(64), default="General Chronic")
    care_coordinator = Column(String(128), default="Dr. Sarah Lin, RN")
    iot_device_active = Column(String(64), default=None)  # e.g. "Smart Cap V3", "Connected Inhaler", or None

    prescriptions = relationship("Prescription", back_populates="patient", cascade="all, delete-orphan")
    dispenses = relationship("DispenseEvent", back_populates="patient", cascade="all, delete-orphan")
    vitals = relationship("VitalRecord", back_populates="patient", cascade="all, delete-orphan")
    clinical_notes = relationship("ClinicalNote", back_populates="patient", cascade="all, delete-orphan")
    predictions = relationship("AdherencePrediction", back_populates="patient", cascade="all, delete-orphan")
    interventions = relationship("InterventionLog", back_populates="patient", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "mrn": self.mrn,
            "full_name": self.full_name,
            "age": self.age,
            "gender": self.gender,
            "primary_condition": self.primary_condition,
            "cohort_group": self.cohort_group,
            "care_coordinator": self.care_coordinator,
            "iot_device_active": self.iot_device_active,
        }


class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    medication_name = Column(String(128), nullable=False)
    rxnorm_code = Column(String(32), default="N/A")
    dose = Column(String(64), nullable=False)
    frequency_per_day = Column(Integer, default=1)
    days_supply = Column(Integer, default=30)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)
    prescriber_name = Column(String(128), default="Attending Physician")
    instructions = Column(Text, default="")
    status = Column(String(32), default="active")

    patient = relationship("Patient", back_populates="prescriptions")

    def to_dict(self):
        return {
            "id": self.id,
            "patient_id": self.patient_id,
            "medication_name": self.medication_name,
            "rxnorm_code": self.rxnorm_code,
            "dose": self.dose,
            "frequency_per_day": self.frequency_per_day,
            "days_supply": self.days_supply,
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "end_date": self.end_date.isoformat() if self.end_date else None,
            "prescriber_name": self.prescriber_name,
            "instructions": self.instructions,
            "status": self.status,
        }


class DispenseEvent(Base):
    __tablename__ = "dispense_events"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    prescription_id = Column(Integer, ForeignKey("prescriptions.id"), nullable=True)
    medication_name = Column(String(128), nullable=False)
    dispense_date = Column(Date, nullable=False)
    days_supply = Column(Integer, default=30)
    quantity = Column(Float, default=30.0)
    pharmacy_name = Column(String(128), default="Central Health Pharmacy")
    copay_amount = Column(Float, default=10.0)

    patient = relationship("Patient", back_populates="dispenses")

    def to_dict(self):
        return {
            "id": self.id,
            "patient_id": self.patient_id,
            "prescription_id": self.prescription_id,
            "medication_name": self.medication_name,
            "dispense_date": self.dispense_date.isoformat() if self.dispense_date else None,
            "days_supply": self.days_supply,
            "quantity": self.quantity,
            "pharmacy_name": self.pharmacy_name,
            "copay_amount": self.copay_amount,
        }


class VitalRecord(Base):
    __tablename__ = "vital_records"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    recorded_date = Column(Date, nullable=False)
    vital_type = Column(String(32), nullable=False)  # SBP, DBP, HbA1c, Weight, Blood_Glucose
    value = Column(Float, nullable=False)
    unit = Column(String(16), nullable=False)
    source = Column(String(64), default="Clinic Encounter")

    patient = relationship("Patient", back_populates="vitals")

    def to_dict(self):
        return {
            "id": self.id,
            "patient_id": self.patient_id,
            "recorded_date": self.recorded_date.isoformat() if self.recorded_date else None,
            "vital_type": self.vital_type,
            "value": self.value,
            "unit": self.unit,
            "source": self.source,
        }


class ClinicalNote(Base):
    __tablename__ = "clinical_notes"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    note_date = Column(Date, nullable=False)
    encounter_type = Column(String(64), default="Outpatient Follow-up")
    clinician_name = Column(String(128), default="Dr. Sarah Lin")
    text_content = Column(Text, nullable=False)
    side_effects_detected = Column(JSON, default=list)  # e.g. ["dizziness", "fatigue"]
    barriers_detected = Column(JSON, default=list)      # e.g. ["copay cost", "transportation"]

    patient = relationship("Patient", back_populates="clinical_notes")

    def to_dict(self):
        return {
            "id": self.id,
            "patient_id": self.patient_id,
            "note_date": self.note_date.isoformat() if self.note_date else None,
            "encounter_type": self.encounter_type,
            "clinician_name": self.clinician_name,
            "text_content": self.text_content,
            "side_effects_detected": self.side_effects_detected or [],
            "barriers_detected": self.barriers_detected or [],
        }


class AdherencePrediction(Base):
    __tablename__ = "adherence_predictions"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    calculated_at = Column(DateTime, default=datetime.utcnow)
    risk_score = Column(Float, nullable=False)            # 0.0 to 1.0 (higher = higher non-adherence risk)
    confidence_lower = Column(Float, nullable=False)      # e.g. 0.62
    confidence_upper = Column(Float, nullable=False)      # e.g. 0.84
    pattern_type = Column(String(64), nullable=False)     # e.g. "Intermittent Weekend Friction", "Regimen Fatigue"
    primary_driver = Column(String(128), nullable=False)
    pdc_score = Column(Float, nullable=False)             # Proportion of Days Covered (0-1.0)
    mpr_score = Column(Float, nullable=False)             # Medication Possession Ratio (0-1.0+)
    explainability_json = Column(JSON, default=dict)      # Top feature contributions (SHAP-style)

    patient = relationship("Patient", back_populates="predictions")

    def to_dict(self):
        return {
            "id": self.id,
            "patient_id": self.patient_id,
            "calculated_at": self.calculated_at.isoformat() if self.calculated_at else None,
            "risk_score": round(self.risk_score, 3),
            "confidence_lower": round(self.confidence_lower, 3),
            "confidence_upper": round(self.confidence_upper, 3),
            "pattern_type": self.pattern_type,
            "primary_driver": self.primary_driver,
            "pdc_score": round(self.pdc_score, 3),
            "mpr_score": round(self.mpr_score, 3),
            "explainability": self.explainability_json or {},
        }


class InterventionLog(Base):
    __tablename__ = "intervention_logs"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    action_type = Column(String(64), nullable=False)      # e.g., "90_DAY_REFILL_SYNC", "DOSE_TIMING_ADJUSTMENT"
    title = Column(String(128), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(String(32), default="Proposed")       # Proposed, Accepted, In Progress, Completed
    clinician_notes = Column(Text, default="")

    patient = relationship("Patient", back_populates="interventions")

    def to_dict(self):
        return {
            "id": self.id,
            "patient_id": self.patient_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "action_type": self.action_type,
            "title": self.title,
            "description": self.description,
            "status": self.status,
            "clinician_notes": self.clinician_notes,
        }


def init_db():
    Base.metadata.create_all(bind=engine)
