"""
AdherePulse Database Seed Script
Generates rich, realistic clinical cohorts representing key adherence archetypes:
1. Intermittent Cadence Friction (Weekend/Routine lapses)
2. Adverse Effect Hesitancy (Side-effect induced omission)
3. Supply & Copay Barrier (Refill gap due to cost/access)
4. Regimen Transition Lag (Titration causing false-alarm pharmacy gap)
5. Sustained High Adherence (IoT smart cap verified)
6. Chronic Regimen Fatigue (Gradual emotional/pill burden dropoff)
"""

from datetime import date, timedelta
from models import SessionLocal, init_db, Patient, Prescription, DispenseEvent, VitalRecord, ClinicalNote, AdherencePrediction, InterventionLog
from ml_engine import engine as ml_engine


def populate_seed_data():
    init_db()
    db = SessionLocal()

    # Clear existing data for fresh initialization
    db.query(InterventionLog).delete()
    db.query(AdherencePrediction).delete()
    db.query(ClinicalNote).delete()
    db.query(VitalRecord).delete()
    db.query(DispenseEvent).delete()
    db.query(Prescription).delete()
    db.query(Patient).delete()
    db.commit()

    today = date.today()

    # ---------------------------------------------------------
    # PATIENT 1: Eleanor Vance (Heart Failure & Hypertension)
    # Archetype: Intermittent Cadence Friction
    # ---------------------------------------------------------
    p1 = Patient(
        mrn="MRN-849201",
        full_name="Eleanor Vance",
        age=68,
        gender="Female",
        primary_condition="Heart Failure (HFrEF)",
        cohort_group="Cardiology Ambulatory",
        care_coordinator="Dr. Sarah Lin, RN",
        iot_device_active=None
    )
    db.add(p1)
    db.flush()

    rx1 = Prescription(
        patient_id=p1.id,
        medication_name="Sacubitril / Valsartan (Entresto)",
        rxnorm_code="1656337",
        dose="49/51 mg",
        frequency_per_day=2,
        days_supply=30,
        start_date=today - timedelta(days=170),
        instructions="Take 1 tablet orally twice daily with or without food."
    )
    rx2 = Prescription(
        patient_id=p1.id,
        medication_name="Carvedilol",
        rxnorm_code="20352",
        dose="12.5 mg",
        frequency_per_day=2,
        days_supply=30,
        start_date=today - timedelta(days=170),
        instructions="Take 1 tablet orally twice daily with meals."
    )
    db.add_all([rx1, rx2])

    # Irregular refill history (gaps: 8d, 12d, 14d)
    dispense_dates_p1 = [
        today - timedelta(days=170),
        today - timedelta(days=132),  # 8 day gap
        today - timedelta(days=90),   # 12 day gap
        today - timedelta(days=46),   # 14 day gap
    ]
    for d_date in dispense_dates_p1:
        db.add(DispenseEvent(
            patient_id=p1.id,
            prescription_id=rx1.id,
            medication_name=rx1.medication_name,
            dispense_date=d_date,
            days_supply=30,
            quantity=60,
            pharmacy_name="Walgreens #4120",
            copay_amount=15.0
        ))

    # Blood pressure vitals fluctuating with refill delays
    vitals_p1 = [
        (today - timedelta(days=165), "SBP", 124.0, "mmHg"),
        (today - timedelta(days=135), "SBP", 148.0, "mmHg"),  # during gap
        (today - timedelta(days=120), "SBP", 126.0, "mmHg"),
        (today - timedelta(days=92), "SBP", 154.0, "mmHg"),   # during gap
        (today - timedelta(days=70), "SBP", 128.0, "mmHg"),
        (today - timedelta(days=48), "SBP", 152.0, "mmHg"),   # during gap
        (today - timedelta(days=15), "SBP", 132.0, "mmHg"),
    ]
    for v_date, v_type, val, unit in vitals_p1:
        db.add(VitalRecord(patient_id=p1.id, recorded_date=v_date, vital_type=v_type, value=val, unit=unit))

    note1 = ClinicalNote(
        patient_id=p1.id,
        note_date=today - timedelta(days=45),
        encounter_type="Cardiology Outpatient Follow-up",
        clinician_name="Dr. Marcus Ross, MD",
        text_content="Patient reports feeling well during the week but mentions frequently forgetting weekend evening doses when visiting grandchildren in suburbs. Denies shortness of breath. Encouraged pill organizer.",
        side_effects_detected=[],
        barriers_detected=["weekend travel schedule"]
    )
    db.add(note1)

    # ---------------------------------------------------------
    # PATIENT 2: Marcus Holloway (Type 2 Diabetes & CKD)
    # Archetype: Adverse Effect Hesitancy
    # ---------------------------------------------------------
    p2 = Patient(
        mrn="MRN-773194",
        full_name="Marcus Holloway",
        age=59,
        gender="Male",
        primary_condition="Type 2 Diabetes",
        cohort_group="Endocrinology Comprehensive",
        care_coordinator="James Chen, NP",
        iot_device_active=None
    )
    db.add(p2)
    db.flush()

    rx3 = Prescription(
        patient_id=p2.id,
        medication_name="Metformin Hydrochloride ER",
        rxnorm_code="861007",
        dose="1000 mg",
        frequency_per_day=2,
        days_supply=30,
        start_date=today - timedelta(days=160),
        instructions="Take 2 tablets with evening dinner."
    )
    db.add(rx3)

    dispense_dates_p2 = [
        today - timedelta(days=160),
        today - timedelta(days=125),
        today - timedelta(days=70),  # 25 day lapse after side-effect complaint!
    ]
    for d_date in dispense_dates_p2:
        db.add(DispenseEvent(
            patient_id=p2.id,
            prescription_id=rx3.id,
            medication_name=rx3.medication_name,
            dispense_date=d_date,
            days_supply=30,
            quantity=60,
            pharmacy_name="CVS Pharmacy #882",
            copay_amount=8.0
        ))

    vitals_p2 = [
        (today - timedelta(days=150), "HbA1c", 7.1, "%"),
        (today - timedelta(days=95), "HbA1c", 7.4, "%"),
        (today - timedelta(days=30), "HbA1c", 8.6, "%"),  # spiked due to omission
        (today - timedelta(days=30), "Blood_Glucose", 188.0, "mg/dL"),
    ]
    for v_date, v_type, val, unit in vitals_p2:
        db.add(VitalRecord(patient_id=p2.id, recorded_date=v_date, vital_type=v_type, value=val, unit=unit))

    note2 = ClinicalNote(
        patient_id=p2.id,
        note_date=today - timedelta(days=90),
        encounter_type="Telehealth Review",
        clinician_name="James Chen, NP",
        text_content="Patient reports persistent abdominal cramps and loose stools following the recent dose titration to 1000mg. States he has been taking it 'only when he remembers' due to GI fear.",
        side_effects_detected=["gastrointestinal distress", "nausea", "loose stools"],
        barriers_detected=["fear of side effects"]
    )
    db.add(note2)

    # ---------------------------------------------------------
    # PATIENT 3: Beatrice Morales (Hypertension & Dyslipidemia)
    # Archetype: Supply & Copay Barrier
    # ---------------------------------------------------------
    p3 = Patient(
        mrn="MRN-552109",
        full_name="Beatrice Morales",
        age=63,
        gender="Female",
        primary_condition="Hypertension",
        cohort_group="Primary Care Network",
        care_coordinator="Elena Vance, MSW",
        iot_device_active=None
    )
    db.add(p3)
    db.flush()

    rx4 = Prescription(
        patient_id=p3.id,
        medication_name="Amlodipine Besylate",
        rxnorm_code="17767",
        dose="10 mg",
        frequency_per_day=1,
        days_supply=30,
        start_date=today - timedelta(days=150),
        instructions="Take 1 tablet daily in the morning."
    )
    db.add(rx4)

    dispense_dates_p3 = [
        today - timedelta(days=150),
        today - timedelta(days=120),
        today - timedelta(days=68),  # 22 day gap
    ]
    for d_date in dispense_dates_p3:
        db.add(DispenseEvent(
            patient_id=p3.id,
            prescription_id=rx4.id,
            medication_name=rx4.medication_name,
            dispense_date=d_date,
            days_supply=30,
            quantity=30,
            pharmacy_name="Neighborhood Pharmacy",
            copay_amount=25.0
        ))

    vitals_p3 = [
        (today - timedelta(days=140), "SBP", 130.0, "mmHg"),
        (today - timedelta(days=115), "SBP", 132.0, "mmHg"),
        (today - timedelta(days=75), "SBP", 158.0, "mmHg"),
        (today - timedelta(days=20), "SBP", 146.0, "mmHg"),
    ]
    for v_date, v_type, val, unit in vitals_p3:
        db.add(VitalRecord(patient_id=p3.id, recorded_date=v_date, vital_type=v_type, value=val, unit=unit))

    note3 = ClinicalNote(
        patient_id=p3.id,
        note_date=today - timedelta(days=65),
        encounter_type="Routine Annual Exam",
        clinician_name="Dr. Kenneth Wu",
        text_content="Patient noted difficulty securing transportation to the brick-and-mortar pharmacy and mentioned high copays with new Medicare Advantage deductible reset this quarter.",
        side_effects_detected=[],
        barriers_detected=["transportation difficulty", "copay deductible reset"]
    )
    db.add(note3)

    # ---------------------------------------------------------
    # PATIENT 4: David Chen (Heart Failure Titration)
    # Archetype: Regimen Transition Lag (False Alarm Protection)
    # ---------------------------------------------------------
    p4 = Patient(
        mrn="MRN-449120",
        full_name="David Chen",
        age=71,
        gender="Male",
        primary_condition="Heart Failure (HFpEF)",
        cohort_group="Cardiology Ambulatory",
        care_coordinator="Dr. Sarah Lin, RN",
        iot_device_active=None
    )
    db.add(p4)
    db.flush()

    rx5 = Prescription(
        patient_id=p4.id,
        medication_name="Furosemide",
        rxnorm_code="4603",
        dose="40 mg",
        frequency_per_day=1,
        days_supply=30,
        start_date=today - timedelta(days=15),  # titrated 15 days ago from 20mg
        instructions="Take 40 mg daily each morning."
    )
    db.add(rx5)

    dispense_dates_p4 = [
        today - timedelta(days=110),
        today - timedelta(days=80),
        today - timedelta(days=50),  # received 20mg 60-count previously
    ]
    for d_date in dispense_dates_p4:
        db.add(DispenseEvent(
            patient_id=p4.id,
            prescription_id=rx5.id,
            medication_name="Furosemide",
            dispense_date=d_date,
            days_supply=30,
            quantity=60,
            pharmacy_name="Central Health Pharmacy",
            copay_amount=5.0
        ))

    vitals_p4 = [
        (today - timedelta(days=100), "SBP", 122.0, "mmHg"),
        (today - timedelta(days=50), "SBP", 120.0, "mmHg"),
        (today - timedelta(days=10), "SBP", 124.0, "mmHg"),
    ]
    for v_date, v_type, val, unit in vitals_p4:
        db.add(VitalRecord(patient_id=p4.id, recorded_date=v_date, vital_type=v_type, value=val, unit=unit))

    note4 = ClinicalNote(
        patient_id=p4.id,
        note_date=today - timedelta(days=15),
        encounter_type="Cardiology Clinic Visit",
        clinician_name="Dr. Marcus Ross, MD",
        text_content="Dose titrated from 20mg to 40mg. Patient instructed to consume remaining half-split 20mg tablets (taking 2 tablets daily) before picking up new 40mg formulation next month.",
        side_effects_detected=[],
        barriers_detected=[]
    )
    db.add(note4)

    # ---------------------------------------------------------
    # PATIENT 5: Arthur Pendelton (Post-MI)
    # Archetype: Sustained High Adherence (IoT Smart Cap Verified)
    # ---------------------------------------------------------
    p5 = Patient(
        mrn="MRN-119283",
        full_name="Arthur Pendelton",
        age=66,
        gender="Male",
        primary_condition="Post-Myocardial Infarction",
        cohort_group="Cardiac Rehabilitation",
        care_coordinator="Nurse Jessica Blake",
        iot_device_active="Smart Cap V3 Telemetry"
    )
    db.add(p5)
    db.flush()

    rx6 = Prescription(
        patient_id=p5.id,
        medication_name="Ticagrelor (Brilinta)",
        rxnorm_code="1116632",
        dose="90 mg",
        frequency_per_day=2,
        days_supply=30,
        start_date=today - timedelta(days=150),
        instructions="Take 1 tablet twice daily with aspirin."
    )
    db.add(rx6)

    # Clockwork refills every 29-30 days
    dispense_dates_p5 = [
        today - timedelta(days=150),
        today - timedelta(days=121),
        today - timedelta(days=91),
        today - timedelta(days=61),
        today - timedelta(days=31),
        today - timedelta(days=1),
    ]
    for d_date in dispense_dates_p5:
        db.add(DispenseEvent(
            patient_id=p5.id,
            prescription_id=rx6.id,
            medication_name=rx6.medication_name,
            dispense_date=d_date,
            days_supply=30,
            quantity=60,
            pharmacy_name="Kaiser Permanente Pharmacy",
            copay_amount=20.0
        ))

    vitals_p5 = [
        (today - timedelta(days=140), "SBP", 118.0, "mmHg"),
        (today - timedelta(days=100), "SBP", 116.0, "mmHg"),
        (today - timedelta(days=60), "SBP", 119.0, "mmHg"),
        (today - timedelta(days=10), "SBP", 117.0, "mmHg"),
    ]
    for v_date, v_type, val, unit in vitals_p5:
        db.add(VitalRecord(patient_id=p5.id, recorded_date=v_date, vital_type=v_type, value=val, unit=unit))

    note5 = ClinicalNote(
        patient_id=p5.id,
        note_date=today - timedelta(days=30),
        encounter_type="Post-PCI Cardiac Rehab",
        clinician_name="Dr. Marcus Ross, MD",
        text_content="Patient enrolled in connected smart cap trial. Telemetry indicates 98.4% on-time cap open events. Excellent tolerance, no bleeding or bruising noted.",
        side_effects_detected=[],
        barriers_detected=[]
    )
    db.add(note5)

    # ---------------------------------------------------------
    # PATIENT 6: Sophia Patel (Hypertension & Mood Disorder)
    # Archetype: Chronic Regimen Fatigue
    # ---------------------------------------------------------
    p6 = Patient(
        mrn="MRN-662810",
        full_name="Sophia Patel",
        age=54,
        gender="Female",
        primary_condition="Hypertension & Depression",
        cohort_group="Integrated Behavioral Health",
        care_coordinator="Nurse Jessica Blake",
        iot_device_active=None
    )
    db.add(p6)
    db.flush()

    rx7 = Prescription(
        patient_id=p6.id,
        medication_name="Lisinopril",
        rxnorm_code="29046",
        dose="20 mg",
        frequency_per_day=1,
        days_supply=30,
        start_date=today - timedelta(days=180),
        instructions="Take 1 tablet daily."
    )
    db.add(rx7)

    # Gradually widening gaps: 5d, 15d, 28d
    dispense_dates_p6 = [
        today - timedelta(days=180),
        today - timedelta(days=145),  # 5 day gap
        today - timedelta(days=100),  # 15 day gap
        today - timedelta(days=42),   # 28 day gap
    ]
    for d_date in dispense_dates_p6:
        db.add(DispenseEvent(
            patient_id=p6.id,
            prescription_id=rx7.id,
            medication_name=rx7.medication_name,
            dispense_date=d_date,
            days_supply=30,
            quantity=30,
            pharmacy_name="Express Scripts Mail Order",
            copay_amount=10.0
        ))

    vitals_p6 = [
        (today - timedelta(days=170), "SBP", 126.0, "mmHg"),
        (today - timedelta(days=130), "SBP", 134.0, "mmHg"),
        (today - timedelta(days=80), "SBP", 144.0, "mmHg"),
        (today - timedelta(days=20), "SBP", 156.0, "mmHg"),
    ]
    for v_date, v_type, val, unit in vitals_p6:
        db.add(VitalRecord(patient_id=p6.id, recorded_date=v_date, vital_type=v_type, value=val, unit=unit))

    note6 = ClinicalNote(
        patient_id=p6.id,
        note_date=today - timedelta(days=25),
        encounter_type="Behavioral Health Tele-consult",
        clinician_name="Dr. Amanda Cross, PsyD",
        text_content="Patient reports feeling exhausted by daily pill burden and ongoing low mood. Expresses feeling that 'taking 5 pills every day reminds me that I'm sick.' Recommended care navigation outreach.",
        side_effects_detected=["pill fatigue", "low mood"],
        barriers_detected=["regimen exhaustion"]
    )
    db.add(note6)

    db.commit()

    # Calculate and store baseline predictions for all seeded patients
    for p in [p1, p2, p3, p4, p5, p6]:
        p_dispenses = [d.to_dict() for d in p.dispenses]
        p_prescriptions = [r.to_dict() for r in p.prescriptions]
        p_vitals = [v.to_dict() for v in p.vitals]
        p_notes = [n.to_dict() for n in p.clinical_notes]

        features, meta = ml_engine.extract_features(
            dispenses=p_dispenses,
            prescriptions=p_prescriptions,
            vitals=p_vitals,
            notes=p_notes,
            iot_active=(p.iot_device_active is not None)
        )
        inference = ml_engine.infer_adherence(features, meta)

        pred = AdherencePrediction(
            patient_id=p.id,
            risk_score=inference["risk_score"],
            confidence_lower=inference["confidence_lower"],
            confidence_upper=inference["confidence_upper"],
            pattern_type=inference["pattern_type"],
            primary_driver=inference["primary_driver"],
            pdc_score=inference["pdc_score"],
            mpr_score=inference["mpr_score"],
            explainability_json=inference["explainability"]
        )
        db.add(pred)

    db.commit()
    db.close()
    print("Successfully initialized AdherePulse database with 6 clinical cohorts and baseline inference.")


if __name__ == "__main__":
    populate_seed_data()
