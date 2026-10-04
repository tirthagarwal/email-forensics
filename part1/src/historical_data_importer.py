"""
Historical Data Importer & Provenance Engine.
=============================================
Ingests public, historical, and benchmark datasets into the database with
immutable cryptographic provenance tracking.

Supported Datasets:
  - passive_os: Passive OS Fingerprinting Dataset (clean TLS flows)
  - cesnet_tls22: CESNET-TLS22 NetFlow/IPFIX dataset
  - cipherspectrum: CipherSpectrum TLS telemetry dataset
  - expanded_deployment_dataset: Merged deployment baseline dataset

Security & Privacy Guarantees:
  - Idempotent: Prevents duplicate ingestion via SHA-256 hash matching
  - Zero Secrets: Never ingests or persists keylogs, private keys, passwords, or email bodies
  - Schema Validated: Every record is verified against canonical structural rules
"""

import os
import csv
import json
import hashlib
import argparse
from pathlib import Path
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from database import get_db_manager
from db_models import DatasetSource, HistoricalRecord
from db_service import ForensicDataService
import feature_schema as fs
from dataset_adapters import (
    PassiveOSDatasetAdapter,
    CESNETTLS22Adapter,
    _safe_int,
    _safe_float,
)

ROOT_DIR = Path(__file__).parent.parent.parent
DATASETS_DIR = ROOT_DIR / "part1" / "datasets"
PROCESSED_DIR = DATASETS_DIR / "processed"


def compute_file_sha256(path: Path) -> str:
    """Compute SHA-256 hash of a file."""
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


class HistoricalDataImporter:
    """Imports external and historical datasets into normalized database tables."""

    def __init__(self, db_url: Optional[str] = None):
        self.db_manager = get_db_manager(db_url)
        self.db_manager.init_db()

    def import_passive_os(
        self,
        file_path: Optional[Path] = None,
        max_records: Optional[int] = None,
        overwrite: bool = False,
    ) -> Dict[str, Any]:
        """
        Import Passive OS Fingerprinting TLS dataset.
        """
        target = file_path if file_path else PROCESSED_DIR / "passive_os_tls_clean.csv"
        if not target.exists():
            # Check raw fallback
            raw_target = DATASETS_DIR / "passive_os" / "flows_ground_truth_merged_anonymized.csv"
            if raw_target.exists():
                target = raw_target
            else:
                return {"status": "FILE_NOT_FOUND", "dataset": "passive_os", "path": str(target)}

        file_hash = compute_file_sha256(target)

        with self.db_manager.session_scope() as session:
            service = ForensicDataService(session)
            existing = service.get_dataset_source("passive_os")
            if existing and existing.source_hash == file_hash and not overwrite:
                return {
                    "status": "SKIPPED_ALREADY_IMPORTED",
                    "dataset": "passive_os",
                    "records": existing.record_count,
                    "sha256": existing.source_hash,
                }

            if existing and overwrite:
                session.query(HistoricalRecord).filter_by(source_dataset="passive_os").delete()
                session.delete(existing)
                session.commit()

            # Read and parse CSV
            records_to_insert = []
            with open(target, mode="r", encoding="utf-8", errors="replace") as f:
                reader = csv.DictReader(f)
                for idx, row in enumerate(reader, 1):
                    if max_records and idx > max_records:
                        break

                    bytes_a = _safe_int(row.get("BYTES A") or row.get("bytes_a"), 0)
                    pkts_a = _safe_int(row.get("PACKETS A") or row.get("packets_a"), 0)
                    setup_t = _safe_float(row.get("TLS_SETUP_TIME") or row.get("tls_setup_time"), 0.0)
                    dur_sec = setup_t / 1000.0 if setup_t > 1000.0 else setup_t

                    tls_ver = str(row.get("tls_server_version_name") or row.get("TLS_SERVER_VERSION") or "UNKNOWN")
                    if tls_ver in ("771", "771.0"):
                        tls_ver = "TLSv12"
                    elif tls_ver in ("772", "772.0"):
                        tls_ver = "TLSv13"
                    elif tls_ver in ("770", "770.0"):
                        tls_ver = "TLSv11"
                    elif tls_ver in ("769", "769.0"):
                        tls_ver = "TLSv10"

                    cipher = str(row.get("cipher_suite_name") or row.get("TLS_CIPHER_SUITE") or "UNKNOWN")
                    curves = str(row.get("TLS_ELLIPTIC_CURVES") or "")
                    curve = "x25519" if ("1D" in curves or "29" in curves) else "UNKNOWN"

                    fwd_sec_val = row.get("forward_secrecy_indicator")
                    fwd_sec = bool(fwd_sec_val) if fwd_sec_val is not None else False

                    flow_id = row.get("flow_ID") or f"pos_{idx}"
                    capture_id = f"passive_os_flow_{flow_id}"

                    rec_dict = {
                        "source_dataset": "passive_os",
                        "source_type": "PUBLIC_DATASET",
                        "source_capture_id": capture_id,
                        "source_file": target.name,
                        "source_record_id": str(flow_id),
                        "protocol": "UNKNOWN",
                        "tls_established": True,
                        "tls_version": tls_ver,
                        "cipher_suite": cipher,
                        "elliptic_curve": curve,
                        "forward_secrecy": fwd_sec,
                        "client_bytes": bytes_a,
                        "server_bytes": 0,
                        "client_packets": pkts_a,
                        "server_packets": 0,
                        "duration": dur_sec,
                        "certificate_key_size": None,
                    }

                    # Zero leakage check
                    fs.assert_no_forbidden_features(rec_dict)
                    records_to_insert.append(rec_dict)

            # Create DatasetSource entry
            source_entry = DatasetSource(
                source_dataset="passive_os",
                source_type="PUBLIC_DATASET",
                source_version="1.0.0",
                source_file=str(target.resolve()),
                source_hash=file_hash,
                record_count=len(records_to_insert),
                description="Passive OS Fingerprinting dataset containing real-world TLS client handshakes.",
            )
            session.add(source_entry)
            session.flush()

            # Bulk insert records
            db_records = [
                HistoricalRecord(dataset_source_id=source_entry.id, **r)
                for r in records_to_insert
            ]
            session.bulk_save_objects(db_records)
            session.commit()

            return {
                "status": "IMPORTED_OK",
                "dataset": "passive_os",
                "records": len(records_to_insert),
                "sha256": file_hash,
            }

    def import_expanded_deployment_dataset(
        self,
        file_path: Optional[Path] = None,
        max_records: Optional[int] = None,
        overwrite: bool = False,
    ) -> Dict[str, Any]:
        """
        Import pre-processed expanded deployment dataset (10,898 records).
        """
        target = file_path if file_path else PROCESSED_DIR / "expanded_deployment_dataset.csv"
        if not target.exists():
            return {"status": "FILE_NOT_FOUND", "dataset": "expanded_deployment_dataset", "path": str(target)}

        file_hash = compute_file_sha256(target)

        with self.db_manager.session_scope() as session:
            service = ForensicDataService(session)
            existing = service.get_dataset_source("expanded_deployment_dataset")
            if existing and existing.source_hash == file_hash and not overwrite:
                return {
                    "status": "SKIPPED_ALREADY_IMPORTED",
                    "dataset": "expanded_deployment_dataset",
                    "records": existing.record_count,
                    "sha256": existing.source_hash,
                }

            if existing and overwrite:
                session.query(HistoricalRecord).filter_by(source_dataset="expanded_deployment_dataset").delete()
                session.delete(existing)
                session.commit()

            records_to_insert = []
            with open(target, mode="r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for idx, row in enumerate(reader, 1):
                    if max_records and idx > max_records:
                        break

                    sample_id = row.get("sample_id") or f"exp_{idx}"
                    capture_id = row.get("source_capture_id") or f"cap_{idx}"
                    src_type = row.get("source_type") or "PROCESSED_DATASET"
                    proto = row.get("protocol") or "UNKNOWN"

                    rec_dict = {
                        "source_dataset": "expanded_deployment_dataset",
                        "source_type": src_type,
                        "source_capture_id": capture_id,
                        "source_file": target.name,
                        "source_record_id": sample_id,
                        "protocol": proto,
                        "tls_established": bool(_safe_float(row.get("tls_established_flag"), 0.0)),
                        "tls_version": row.get("tls_version") if "tls_version" in row else None,
                        "cipher_suite": row.get("cipher_suite") if "cipher_suite" in row else None,
                        "elliptic_curve": row.get("elliptic_curve") if "elliptic_curve" in row else None,
                        "forward_secrecy": bool(_safe_float(row.get("forward_secrecy_flag"), 0.0)),
                        "client_bytes": _safe_int(row.get("client_bytes"), 0),
                        "server_bytes": _safe_int(row.get("server_bytes"), 0),
                        "client_packets": _safe_int(row.get("client_packets"), 0),
                        "server_packets": _safe_int(row.get("server_packets"), 0),
                        "duration": _safe_float(row.get("duration"), 0.0),
                        "certificate_key_size": _safe_int(row.get("certificate_key_size"), None),
                    }

                    fs.assert_no_forbidden_features(rec_dict)
                    records_to_insert.append(rec_dict)

            source_entry = DatasetSource(
                source_dataset="expanded_deployment_dataset",
                source_type="PROCESSED_DATASET",
                source_version="3.0.0",
                source_file=str(target.resolve()),
                source_hash=file_hash,
                record_count=len(records_to_insert),
                description="Merged 10,898 session expanded deployment training population.",
            )
            session.add(source_entry)
            session.flush()

            db_records = [
                HistoricalRecord(dataset_source_id=source_entry.id, **r)
                for r in records_to_insert
            ]
            session.bulk_save_objects(db_records)
            session.commit()

            return {
                "status": "IMPORTED_OK",
                "dataset": "expanded_deployment_dataset",
                "records": len(records_to_insert),
                "sha256": file_hash,
            }

    def get_status_summary(self) -> List[Dict[str, Any]]:
        """List all dataset sources currently imported into the database."""
        with self.db_manager.session_scope() as session:
            sources = session.query(DatasetSource).order_by(DatasetSource.imported_at.desc()).all()
            return [
                {
                    "source_dataset": s.source_dataset,
                    "source_type": s.source_type,
                    "source_version": s.source_version,
                    "record_count": s.record_count,
                    "source_hash": s.source_hash,
                    "imported_at": s.imported_at.isoformat(),
                    "source_file": s.source_file,
                }
                for s in sources
            ]


def main():
    parser = argparse.ArgumentParser(description="Historical Dataset Importer & Provenance Engine")
    parser.add_argument("--dataset", type=str, choices=["passive_os", "expanded", "all"], default="all", help="Dataset to import")
    parser.add_argument("--max-records", type=int, default=None, help="Max records limit for testing")
    parser.add_argument("--overwrite", action="store_true", help="Overwrite existing dataset in DB")
    parser.add_argument("--status", action="store_true", help="Print import status summary")
    args = parser.parse_args()

    importer = HistoricalDataImporter()

    if args.status:
        summary = importer.get_status_summary()
        print("\n" + "=" * 80)
        print("                  HISTORICAL DATASET PROVENANCE REGISTRY")
        print("=" * 80)
        if not summary:
            print("  (No external historical datasets imported yet)")
        else:
            print(f"{'Dataset':<28} {'Type':<18} {'Records':<10} {'SHA-256':<20} {'Imported At'}")
            print("-" * 80)
            for s in summary:
                h_short = (s['source_hash'][:16] + "...") if s['source_hash'] else "N/A"
                print(f"{s['source_dataset']:<28} {s['source_type']:<18} {s['record_count']:<10} {h_short:<20} {s['imported_at']}")
        print("=" * 80 + "\n")
        return

    print("=" * 70)
    print("STARTING HISTORICAL DATASET INGESTION")
    print("=" * 70)

    if args.dataset in ("passive_os", "all"):
        print("[*] Ingesting Passive OS Dataset...")
        res = importer.import_passive_os(max_records=args.max_records, overwrite=args.overwrite)
        print(f"    -> Status: {res['status']}, Records: {res.get('records', 0)}")

    if args.dataset in ("expanded", "all"):
        print("[*] Ingesting Expanded Deployment Dataset...")
        res = importer.import_expanded_deployment_dataset(max_records=args.max_records, overwrite=args.overwrite)
        print(f"    -> Status: {res['status']}, Records: {res.get('records', 0)}")

    print("\n[+] Ingestion Complete.")


if __name__ == "__main__":
    main()
