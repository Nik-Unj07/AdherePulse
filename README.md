# AdherePulse (ChronosRx) — Latent Medication Adherence Intelligence

> **Manipal Hackathon 2026**  
> **Problem Statement**: Identifying intermittent medication non-adherence patterns from indirect, routinely available healthcare signals without relying on manual patient reporting or accusatory assumptions.  
> **Paradigm**: *"Signal, Not Verdict"* with Clinician-in-the-Loop Decision Support.

---

## 🌟 Unique Solution: Triangulated Latent Adherence Signature (TLAS)

Instead of relying on biased self-reports or intrusive pill trackers, **AdherePulse** fuses 4 routinely available healthcare data streams:
1. **Refill Gap Dynamics**: Moving beyond static PDC (Proportion of Days Covered) to evaluate *cadence variance, burstiness*, and recurring cycle delays (e.g. weekend omissions vs. 30-day boundary friction).
2. **Biomarker Volatility vs. Regimen Coupling**: Correlates blood pressure (SBP) surges, HbA1c spikes, or weight changes temporally against pharmacy dispensation lapses.
3. **Clinical Notes NLP Signals**: Extracts documented drug side-effects (e.g., GI distress, dizziness) and logistical barriers (e.g., deductible reset, transportation) to distinguish *hesitancy* from intentional abandonment.
4. **IoT / Connected Sensor Layer (Optional)**: Ingests timestamp events from smart pillboxes or connected inhalers when available, narrowing the confidence intervals.

### Uncertainty-Aware Confidence Envelopes
Every adherence output is delivered as an **Envelope with 95% Confidence Bounds** (e.g. `68% [CI: 58% - 78%]`), paired with a clinically meaningful **Typology**:
- **Intermittent Cadence Friction** (e.g., Eleanor Vance: weekend routine disruptions)
- **Adverse Effect Hesitancy** (e.g., Marcus Holloway: GI distress following Metformin titration)
- **Supply & Copay Barrier** (e.g., Beatrice Morales: transportation/deductible reset)
- **Regimen Transition Lag** (e.g., David Chen: false-alarm suppression when doctor doubles dose using remaining tablets!)
- **Sustained High Adherence** (e.g., Arthur Pendelton: IoT verified clockwork adherence)
- **Chronic Regimen Fatigue** (e.g., Sophia Patel: progressive multi-month pill burden dropoff)

---

## 🛠️ Architecture & Tech Stack

| Component | Technology | Role |
| :--- | :--- | :--- |
| **Frontend** | React 18, Tailwind CSS, Lucide Icons | Clean, minimalist medical-grade UI without AI slop |
| **Backend** | Python 3.13, FastAPI, Uvicorn | High-performance asynchronous REST & FHIR server |
| **ML Engine** | Scikit-learn, XGBoost, SHAP Attribution | Latent signal fusion, uncertainty estimation & feature attribution |
| **Interoperability** | HL7 FHIR Release 4 | Native bundle import/export (`Patient`, `MedicationRequest`, `MedicationDispense`, `Observation`) |
| **Database** | SQLAlchemy, SQLite / PostgreSQL | Relational storage of clinical trajectories and intervention logs |

---

## 🚀 Quickstart & Running the Application

### 1. Requirements
Ensure Python 3.10+ is installed. Dependencies have already been prepared in `requirements.txt`.

### 2. Start the Application
Run the root launcher:
```bash
python D:\AdherePulse\run.py
```

This will automatically:
1. Initialize the SQLite database schema (`D:\AdherePulse\adhere_pulse.db`).
2. Populate the database with 6 realistic chronic clinical cohorts and baseline inference.
3. Start the FastAPI web server on `http://127.0.0.1:8000`.

### 3. Access the Web Dashboard
Open your browser and navigate to:
```
http://localhost:8000
```

---

## 🔍 Key Dashboard Features

1. **Cohort Population Overview**:
   - Filter patients by condition (*Heart Failure, Type 2 Diabetes, Hypertension*) and risk tier.
   - Real-time aggregation of active patients, high-risk flags, and false-alarms suppressed.
2. **Patient Dossier & Longitudinal Timeline**:
   - **Adherence Risk Banner**: Calibrated score with 95% confidence interval and narrative rationale.
   - **4 Triangulation Cards**: Quantitative breakdowns for claims, vitals, NLP notes, and sensor telemetry.
   - **SHAP-Style Feature Attribution Waterfall**: Visual breakdown of exact risk-driving and protective factors.
   - **Interactive 180-Day Timeline**: Visual SVG overlay of prescriptions, refills, biomarker spikes, and encounter notes.
3. **What-If Counterfactual Sandbox**:
   - Simulate intervention strategies (e.g., *Switch to 90-Day Mail Order*, *Titrate/Manage Adverse Effects*, *Deploy Connected Smart Cap*, *Nurse Navigator Outreach*).
   - View projected risk score reduction and PDC improvement.
   - Accept and deploy interventions directly into the Electronic Health Record care plan with clinician notes.
4. **HL7 FHIR R4 Interoperability Gateway**:
   - View and download full HL7 FHIR R4 JSON Bundles for any patient.
   - Ingest external FHIR R4 bundles directly via the live parser.
