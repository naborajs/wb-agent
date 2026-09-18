"""
Realistic International & Domestic B2B Lead Generator.
Generates sample lead profiles for staging, testing, and campaign outreach.
"""

import csv
import sys
import os
from pathlib import Path

# Configure UTF-8 for cross-platform terminals
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

SAMPLE_LEADS = [
    # Domestic India
    {"name": "Ananya Sharma", "phone": "+919830111222", "company": "Chai Point Express", "type": "cafe", "city": "Kolkata", "state": "West Bengal", "score": 85},
    {"name": "Rajesh Agarwal", "phone": "+919811223344", "company": "Agarwal Sweets & Chai", "type": "restaurant", "city": "Delhi", "state": "Delhi", "score": 90},
    {"name": "Preeti Nair", "phone": "+919845667788", "company": "Southern Spice Hotels", "type": "hotel", "city": "Bengaluru", "state": "Karnataka", "score": 80},
    {"name": "Amit Patel", "phone": "+919879001122", "company": "Gujarat Tea Distributors", "type": "wholesaler", "city": "Ahmedabad", "state": "Gujarat", "score": 95},
    # International Trade
    {"name": "Tariq Al-Mansoor", "phone": "+971501234567", "company": "Emirates Specialty Beverages", "type": "distributor", "city": "Dubai", "state": "Dubai", "score": 92},
    {"name": "Hao Chen", "phone": "+6591234567", "company": "Lion City Tea Traders", "type": "wholesaler", "city": "Singapore", "state": "Central", "score": 88},
    {"name": "Oliver Smith", "phone": "+447911123456", "company": "Mayfair Boutique Hospitality", "type": "hotel", "city": "London", "state": "England", "score": 86},
    {"name": "Elena Rostova", "phone": "+12125550199", "company": "Manhattan Organic Provisions", "type": "retail_chain", "city": "New York", "state": "New York", "score": 89},
]


def generate_leads_csv(output_path: Path):
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=["name", "phone", "company_name", "company_type", "city", "state", "qualification_score"],
        )
        writer.writeheader()
        for lead in SAMPLE_LEADS:
            writer.writerow({
                "name": lead["name"],
                "phone": lead["phone"],
                "company_name": lead["company"],
                "company_type": lead["type"],
                "city": lead["city"],
                "state": lead["state"],
                "qualification_score": lead["score"],
            })
    print(f"[PASS] Generated {len(SAMPLE_LEADS)} sample leads into {output_path}")


def main():
    print("=" * 60)
    print("  WB-Agent Sample B2B Lead Generator")
    print("=" * 60)
    target_csv = Path(__file__).resolve().parents[1] / "storage" / "sample_leads.csv"
    generate_leads_csv(target_csv)
    print("=" * 60)


if __name__ == "__main__":
    main()
