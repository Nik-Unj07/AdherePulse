"""
AdherePulse HL7 FHIR R4 Interoperability Service
Supports:
- Generating valid FHIR R4 Bundles (Patient, MedicationRequest, MedicationDispense, Observation)
- Ingesting external FHIR R4 JSON Bundles into relational models
"""

import uuid
from datetime import datetime, date
from typing import Dict, Any, List
from models import Patient, Prescription, DispenseEvent, VitalRecord


class FHIRService:
    @staticmethod
    def export_patient_bundle(patient: Patient) -> Dict[str, Any]:
        """Export patient records as an HL7 FHIR R4 JSON Bundle."""
        bundle_id = str(uuid.uuid4())
        entries = []

        # 1. FHIR Patient
        patient_resource = {
            "resourceType": "Patient",
            "id": f"pat-{patient.id}",
            "identifier": [
                {
                    "system": "http://hospital.example.org/mrn",
                    "value": patient.mrn
                }
            ],
            "active": True,
            "name": [
                {
                    "use": "official",
                    "text": patient.full_name
                }
            ],
            "gender": patient.gender.lower() if patient.gender else "unknown",
        }
        entries.append({
            "fullUrl": f"urn:uuid:{uuid.uuid4()}",
            "resource": patient_resource
        })

        # 2. FHIR MedicationRequest (Prescriptions)
        for rx in patient.prescriptions:
            med_req = {
                "resourceType": "MedicationRequest",
                "id": f"medreq-{rx.id}",
                "status": rx.status or "active",
                "intent": "order",
                "medicationCodeableConcept": {
                    "coding": [
                        {
                            "system": "http://www.nlm.nih.gov/research/umls/rxnorm",
                            "code": rx.rxnorm_code or "N/A",
                            "display": rx.medication_name
                        }
                    ],
                    "text": rx.medication_name
                },
                "subject": {
                    "reference": f"Patient/pat-{patient.id}",
                    "display": patient.full_name
                },
                "authoredOn": rx.start_date.isoformat() if rx.start_date else None,
                "dosageInstruction": [
                    {
                        "text": f"{rx.dose} - {rx.frequency_per_day}x daily: {rx.instructions}"
                    }
                ],
                "dispenseRequest": {
                    "expectedSupplyDuration": {
                        "value": rx.days_supply,
                        "unit": "days",
                        "system": "http://unitsofmeasure.org",
                        "code": "d"
                    }
                }
            }
            entries.append({
                "fullUrl": f"urn:uuid:{uuid.uuid4()}",
                "resource": med_req
            })

        # 3. FHIR MedicationDispense
        for d in patient.dispenses:
            dispense_res = {
                "resourceType": "MedicationDispense",
                "id": f"disp-{d.id}",
                "status": "completed",
                "medicationCodeableConcept": {
                    "text": d.medication_name
                },
                "subject": {
                    "reference": f"Patient/pat-{patient.id}",
                    "display": patient.full_name
                },
                "whenHandedOver": d.dispense_date.isoformat() if d.dispense_date else None,
                "daysSupply": {
                    "value": d.days_supply,
                    "unit": "days",
                    "system": "http://unitsofmeasure.org",
                    "code": "d"
                },
                "quantity": {
                    "value": d.quantity,
                    "unit": "tablets"
                },
                "performer": [
                    {
                        "actor": {
                            "display": d.pharmacy_name
                        }
                    }
                ]
            }
            entries.append({
                "fullUrl": f"urn:uuid:{uuid.uuid4()}",
                "resource": dispense_res
            })

        # 4. FHIR Observations (Vitals / Biomarkers)
        for v in patient.vitals:
            obs_res = {
                "resourceType": "Observation",
                "id": f"obs-{v.id}",
                "status": "final",
                "category": [
                    {
                        "coding": [
                            {
                                "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                                "code": "vital-signs",
                                "display": "Vital Signs"
                            }
                        ]
                    }
                ],
                "code": {
                    "coding": [
                        {
                            "system": "http://loinc.org",
                            "code": "8480-6" if "SBP" in v.vital_type else "4548-4",
                            "display": v.vital_type
                        }
                    ],
                    "text": v.vital_type
                },
                "subject": {
                    "reference": f"Patient/pat-{patient.id}"
                },
                "effectiveDateTime": v.recorded_date.isoformat() if v.recorded_date else None,
                "valueQuantity": {
                    "value": v.value,
                    "unit": v.unit,
                    "system": "http://unitsofmeasure.org"
                }
            }
            entries.append({
                "fullUrl": f"urn:uuid:{uuid.uuid4()}",
                "resource": obs_res
            })

        return {
            "resourceType": "Bundle",
            "id": bundle_id,
            "type": "collection",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "total": len(entries),
            "entry": entries
        }

    @staticmethod
    def ingest_fhir_bundle(bundle_json: Dict[str, Any], db_session) -> Dict[str, Any]:
        """Ingest standard FHIR R4 Bundle into internal database."""
        entries = bundle_json.get("entry", [])
        counts = {"patients": 0, "prescriptions": 0, "dispenses": 0, "observations": 0}

        patient_obj = None

        for item in entries:
            res = item.get("resource", {})
            rtype = res.get("resourceType")

            if rtype == "Patient":
                mrn = "MRN-" + str(uuid.uuid4())[:8].upper()
                identifiers = res.get("identifier", [])
                if identifiers and "value" in identifiers[0]:
                    mrn = str(identifiers[0]["value"])
                
                name_list = res.get("name", [{}])
                name = name_list[0].get("text", "FHIR Ingested Patient") if name_list else "FHIR Ingested Patient"
                gender = res.get("gender", "unknown").capitalize()

                # Check if patient exists
                existing = db_session.query(Patient).filter(Patient.mrn == mrn).first()
                if not existing:
                    patient_obj = Patient(
                        mrn=mrn,
                        full_name=name,
                        age=62,
                        gender=gender,
                        primary_condition="Chronic Management",
                        cohort_group="FHIR Ingested",
                        care_coordinator="Care Coordinator Assigned"
                    )
                    db_session.add(patient_obj)
                    db_session.flush()
                else:
                    patient_obj = existing
                counts["patients"] += 1

        if not patient_obj:
            # Create a fallback patient if no Patient resource in bundle
            patient_obj = Patient(
                mrn="FHIR-GEN-" + str(uuid.uuid4())[:6],
                full_name="Imported Patient",
                age=60,
                gender="Other",
                primary_condition="Chronic Condition",
                cohort_group="FHIR Ingested"
            )
            db_session.add(patient_obj)
            db_session.flush()

        for item in entries:
            res = item.get("resource", {})
            rtype = res.get("resourceType")

            if rtype == "MedicationRequest":
                med_code = res.get("medicationCodeableConcept", {})
                med_name = med_code.get("text") or "Prescribed Medication"
                days_supply = 30
                if "dispenseRequest" in res and "expectedSupplyDuration" in res["dispenseRequest"]:
                    days_supply = int(res["dispenseRequest"]["expectedSupplyDuration"].get("value", 30))

                rx = Prescription(
                    patient_id=patient_obj.id,
                    medication_name=med_name,
                    dose="Standard Dose",
                    frequency_per_day=1,
                    days_supply=days_supply,
                    start_date=date.today(),
                    status=res.get("status", "active"),
                    instructions="Take as directed"
                )
                db_session.add(rx)
                counts["prescriptions"] += 1

            elif rtype == "MedicationDispense":
                med_code = res.get("medicationCodeableConcept", {})
                med_name = med_code.get("text") or "Dispensed Medication"
                days_supply = 30
                if "daysSupply" in res:
                    days_supply = int(res["daysSupply"].get("value", 30))
                
                disp = DispenseEvent(
                    patient_id=patient_obj.id,
                    medication_name=med_name,
                    dispense_date=date.today(),
                    days_supply=days_supply,
                    quantity=float(res.get("quantity", {}).get("value", 30)),
                    pharmacy_name="Inbound FHIR Pharmacy"
                )
                db_session.add(disp)
                counts["dispenses"] += 1

            elif rtype == "Observation":
                code_obj = res.get("code", {})
                v_type = code_obj.get("text") or "Vital"
                v_val = 120.0
                v_unit = "mmHg"
                if "valueQuantity" in res:
                    v_val = float(res["valueQuantity"].get("value", 120.0))
                    v_unit = res["valueQuantity"].get("unit", "unit")

                vit = VitalRecord(
                    patient_id=patient_obj.id,
                    recorded_date=date.today(),
                    vital_type=v_type,
                    value=v_val,
                    unit=v_unit
                )
                db_session.add(vit)
                counts["observations"] += 1

        db_session.commit()
        return {
            "status": "success",
            "patient_id": patient_obj.id,
            "patient_mrn": patient_obj.mrn,
            "ingested_counts": counts
        }
