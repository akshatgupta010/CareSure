from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from collections import defaultdict

app = FastAPI(title="CareSure Backend Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RecordItem(BaseModel):
    claim_id: str
    patient_id: str
    encounter_id: str
    service_date: str
    record_type: str
    description: str
    billed_amount: Optional[float] = 0.0

class Discrepancy(BaseModel):
    rule_id: str
    risk_level: str
    reason: str
    evidence: List[str]

class ClaimAuditResult(BaseModel):
    claim_id: str
    patient_id: str
    encounter_id: str
    risk_level: str
    discrepancies: List[Discrepancy]
    status: str

@app.post("/api/audit/batch", response_model=List[ClaimAuditResult])
def audit_claims(records: List[RecordItem]):
    grouped = defaultdict(list)
    for rec in records:
        grouped[(rec.patient_id, rec.encounter_id)].append(rec)
    
    results = []
    for (patient_id, encounter_id), encounter_records in grouped.items():
        billing_records = [r for r in encounter_records if r.record_type.lower() == "billing"]
        clinical_records = [r for r in encounter_records if r.record_type.lower() in ["clinical", "procedure"]]
        diagnostic_records = [r for r in encounter_records if r.record_type.lower() == "diagnostic"]

        claim_id = billing_records[0].claim_id if billing_records else encounter_records[0].claim_id
        discrepancies = [] 

        # Rule 1: Missing Documentation (e.g. Billed item without clinical/diagnostic note)
        documented_services = {
            r.description.strip().lower() for r in (clinical_records + diagnostic_records)
        }
        
        for bill in billing_records:
            desc_clean = bill.description.strip().lower()
            if desc_clean not in documented_services:
                discrepancies.append(Discrepancy(
                    rule_id="RULE_MISSING_DOCUMENTATION",
                    risk_level="High",
                    reason=f"Billed service '{bill.description}' lacks corresponding clinical or diagnostic records.",
                    evidence=[
                        f"Billing record charges for {bill.description}",
                        "No corresponding clinical or diagnostic document found"
                    ]
                ))
    
        # Rule 2: Duplicate Billing Check
        seen_charges = defaultdict(int)
        for bill in billing_records:
            key = (bill.description.strip().lower(), bill.billed_amount)
            seen_charges[key] += 1
            if seen_charges[key] == 2:
                discrepancies.append(Discrepancy(
                    rule_id="RULE_DUPLICATE_BILLING",
                    risk_level="High",
                    reason=f"Duplicate line item detected: '{bill.description}' billed multiple times.",
                    evidence=[f"Identical charge of ${bill.billed_amount} repeated within encounter {encounter_id}"]
                ))

        has_high_risk = any(d.risk_level == "High" for d in discrepancies)
        overall_risk = "High" if has_high_risk else ("Medium" if discrepancies else "Low")
        status = "FLAGGED_FOR_HUMAN_REVIEW" if discrepancies else "VERIFIED_CLEAN"

        results.append(ClaimAuditResult(
            claim_id=claim_id,
            patient_id=patient_id,
            encounter_id=encounter_id,
            risk_level=overall_risk,
            discrepancies=discrepancies,
            status=status
        ))

    return results