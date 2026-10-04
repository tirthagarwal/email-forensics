"""
Training Population Quality & Provenance Auditor.
=================================================
Performs deep structural audits of dataset populations in the database.
Reports:
  - Source dataset breakdown and provenance
  - Record counts and unique group counts
  - TLS vs Non-TLS session proportions
  - Missing feature percentages across all 32 dimensions
  - Unique protocols, TLS versions, cipher suites, curves
  - Duplicate rates and class/source imbalances
"""

import sys
import json
import argparse
from typing import Any, Dict, List, Optional
from collections import Counter

from database import get_db_manager
from db_service import ForensicDataService
import feature_schema as fs
import deployment_ml_features as dmf


class TrainingPopulationAuditor:
    """Audits feature distributions, provenance, and data quality across training records."""

    def __init__(self, db_url: Optional[str] = None):
        self.db_manager = get_db_manager(db_url)
        self.db_manager.init_db()

    def audit_population(self, include_historical: bool = True) -> Dict[str, Any]:
        """Run full audit across all sessions in the database."""
        with self.db_manager.session_scope() as session:
            service = ForensicDataService(session)
            records = service.get_all_training_records(include_historical=include_historical)
            sources = service.list_dataset_sources()

        total_records = len(records)
        if total_records == 0:
            return {
                "total_records": 0,
                "dataset_sources": [],
                "source_distribution": {},
                "unique_groups": 0,
                "tls_proportion": {"tls": 0, "non_tls": 0, "tls_percentage": 0.0},
                "missingness": {},
                "categorical_vocabularies": {},
                "duplicate_rate": 0.0,
            }

        # 1. Source Breakdown
        source_counts = Counter(r.get("source_dataset", "unknown") for r in records)
        source_types = Counter(r.get("source_type", "unknown") for r in records)

        # 2. Group distribution
        groups = [f"{r.get('source_dataset', 'unk')}::{r.get('source_capture_id', 'unk')}" for r in records]
        unique_groups = len(set(groups))

        # 3. TLS vs Non-TLS
        tls_count = sum(1 for r in records if r.get("tls_established"))
        non_tls_count = total_records - tls_count
        tls_pct = round(tls_count / total_records * 100.0, 2)

        # 4. Missingness Matrix
        missingness = {}
        checkable_fields = [
            "client_bytes", "server_bytes", "client_packets", "server_packets",
            "duration", "certificate_key_size", "tls_version", "cipher_suite",
            "elliptic_curve", "forward_secrecy"
        ]
        for field in checkable_fields:
            missing_count = sum(1 for r in records if r.get(field) is None or r.get(field) == "UNKNOWN")
            missingness[field] = {
                "missing_count": missing_count,
                "missing_percent": round(missing_count / total_records * 100.0, 2),
                "observed_count": total_records - missing_count,
            }

        # 5. Categorical Vocabularies
        proto_counts = Counter(r.get("protocol", "UNKNOWN") for r in records)
        tls_ver_counts = Counter(str(r.get("tls_version") or "NONE") for r in records)
        cipher_counts = Counter(str(r.get("cipher_suite") or "NONE") for r in records)
        curve_counts = Counter(str(r.get("elliptic_curve") or "NONE") for r in records)

        # 6. Duplicate Feature Vectors
        vectors = []
        for r in records:
            fs.assert_no_forbidden_features(r)
            transformed = dmf.transform_deployment_features(r)
            vec = tuple(round(v, 6) for v in dmf.feature_dict_to_vector(transformed))
            vectors.append(vec)

        unique_vectors = len(set(vectors))
        duplicate_count = total_records - unique_vectors
        duplicate_rate = round(duplicate_count / total_records * 100.0, 2)

        return {
            "total_records": total_records,
            "unique_groups": unique_groups,
            "source_distribution": dict(source_counts),
            "source_types": dict(source_types),
            "tls_proportion": {
                "tls_records": tls_count,
                "non_tls_records": non_tls_count,
                "tls_percentage": tls_pct,
            },
            "missingness": missingness,
            "unique_protocols": dict(proto_counts),
            "unique_tls_versions": dict(tls_ver_counts.most_common(10)),
            "unique_cipher_suites_count": len(cipher_counts),
            "top_cipher_suites": dict(cipher_counts.most_common(5)),
            "unique_curves": dict(curve_counts),
            "duplicate_metrics": {
                "unique_feature_vectors": unique_vectors,
                "duplicate_count": duplicate_count,
                "duplicate_rate_percent": duplicate_rate,
            },
            "registered_sources": [
                {"dataset": s.source_dataset, "type": s.source_type, "count": s.record_count, "hash": s.source_hash}
                for s in sources
            ],
        }


def print_audit_report(audit: Dict[str, Any]) -> None:
    """Print human-readable terminal report."""
    print("\n" + "=" * 80)
    print("               TRAINING POPULATION QUALITY & PROVENANCE AUDIT")
    print("=" * 80)

    total = audit["total_records"]
    print(f"\n[1. CORPUS SUMMARY]")
    print(f"  Total Session Records:    {total:,}")
    print(f"  Unique Capture Groups:    {audit['unique_groups']:,}")
    print(f"  TLS Sessions:             {audit['tls_proportion']['tls_records']:,} ({audit['tls_proportion']['tls_percentage']}%)")
    print(f"  Non-TLS Sessions:         {audit['tls_proportion']['non_tls_records']:,}")
    print(f"  Duplicate Feature Vectors:{audit['duplicate_metrics']['duplicate_count']:,} ({audit['duplicate_metrics']['duplicate_rate_percent']}%)")

    print(f"\n[2. PROVENANCE & SOURCE DISTRIBUTION]")
    for src, cnt in audit["source_distribution"].items():
        pct = round(cnt / total * 100.0, 2) if total > 0 else 0
        print(f"  - {src:<28} : {cnt:>8,} records ({pct:>5.1f}%)")

    print(f"\n[3. MISSINGNESS MATRIX (Field Quality)]")
    print(f"  {'Field':<26} {'Missing Count':<16} {'Missing %':<12} {'Status'}")
    print("  " + "-" * 70)
    for field, m in audit["missingness"].items():
        status = "COMPLETED" if m["missing_percent"] == 0 else ("PARTIAL" if m["missing_percent"] < 50 else "SPARSE")
        print(f"  {field:<26} {m['missing_count']:<16,} {m['missing_percent']:<12.1f}% [{status}]")

    print(f"\n[4. PROTOCOL & TLS SPECTRUM]")
    print(f"  Protocols:    {dict(audit['unique_protocols'])}")
    print(f"  TLS Versions: {dict(audit['unique_tls_versions'])}")
    print(f"  Curves:       {dict(audit['unique_curves'])}")
    print(f"  Total Unique Ciphers Observed: {audit['unique_cipher_suites_count']}")

    print("=" * 80 + "\n")


def main():
    parser = argparse.ArgumentParser(description="Audit Database Training Population")
    parser.add_argument("--db-url", type=str, default=None, help="Database URL")
    parser.add_argument("--local-only", action="store_true", help="Audit local PCAPs only")
    parser.add_argument("--json", action="store_true", help="Output JSON format")
    args = parser.parse_args()

    auditor = TrainingPopulationAuditor(db_url=args.db_url)
    res = auditor.audit_population(include_historical=not args.local_only)

    if args.json:
        print(json.dumps(res, indent=2))
    else:
        print_audit_report(res)


if __name__ == "__main__":
    main()
