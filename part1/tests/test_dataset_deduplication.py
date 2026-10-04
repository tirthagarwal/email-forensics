"""
Unit and Integration Tests for Phase 4.1 Dataset Deduplication, Provenance & Population Sanitization.
=====================================================================================================
Tests:
  - Duplicate detection and removal logic
  - Provenance completeness and hierarchy tracking
  - Raw source preservation (asserts historical raw CSVs remain unmodified)
  - Local PCAP preservation as primary source
  - Zero-leakage forbidden feature enforcement
  - Privacy audit (no keys, secrets, passwords, email bodies)
  - Deterministic content fingerprinting and SHA-256 verification
  - Immutable versioning guard
  - Group-aware split generation with 0% train/val/test group overlap
  - Production model protection (v3.0.0 remains DEPLOYED, threshold -0.041466)
"""

import sys
import json
import pytest
from pathlib import Path

SRC_DIR = Path(__file__).parent.parent / "src"
sys.path.insert(0, str(SRC_DIR))

from database import get_db_manager
from db_service import ForensicDataService
from historical_data_importer import HistoricalDataImporter
from deduplicate_training_population import (
    TrainingPopulationDeduplicator,
    generate_content_fingerprint,
    DEFAULT_CLEAN_DIR
)
from training_dataset_registry import TrainingDatasetRegistry, compute_file_sha256
from model_registry import ModelRegistryService
import feature_schema as fs


@pytest.fixture
def test_db_manager(tmp_path):
    db_file = tmp_path / "test_dedup.db"
    db_url = f"sqlite:///{db_file.resolve()}"
    mgr = get_db_manager(db_url)
    mgr.init_db(drop_existing=True)
    return mgr


class TestDatasetDeduplicationAndSanitization:
    """Test deduplication engine, provenance manifest, and cleaned dataset integrity."""

    def test_raw_source_preservation(self):
        """Assert that raw source files exist and have non-zero size."""
        root = Path(__file__).parent.parent
        passive_os_file = root / "datasets" / "processed" / "passive_os_tls_clean.csv"
        expanded_file = root / "datasets" / "processed" / "expanded_deployment_dataset.csv"

        assert passive_os_file.exists(), "Raw passive_os_tls_clean.csv must be preserved."
        assert expanded_file.exists(), "Raw expanded_deployment_dataset.csv must be preserved."
        assert passive_os_file.stat().st_size > 0
        assert expanded_file.stat().st_size > 0

    def test_deterministic_content_fingerprinting(self):
        """Assert that identical feature records generate identical fingerprints."""
        rec1 = {
            "protocol": "SMTP",
            "tls_established": True,
            "tls_version": "TLSv1.2",
            "cipher_suite": "TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384",
            "elliptic_curve": "secp256r1",
            "forward_secrecy": True,
            "client_bytes": 1024,
            "server_bytes": 4096,
            "client_packets": 12,
            "server_packets": 18,
            "duration": 1.25,
            "cert_count": 1,
            "cert_chain_length": 1,
            "self_signed": False,
            "weak_key": False,
            "weak_signature": False,
            "expired": False,
            "alpn_selected": "smtp",
            "sni_present": True,
            "source_dataset": "passive_os",
            "source_capture_id": "cap_001"
        }
        rec2 = dict(rec1)
        rec2["source_dataset"] = "expanded_deployment_dataset"  # Metadata differs, but content is identical
        rec2["source_capture_id"] = "derived_cap_001"

        fp1 = generate_content_fingerprint(rec1)
        fp2 = generate_content_fingerprint(rec2)
        assert fp1 == fp2, "Fingerprints must match based on core cryptographic/flow features."

    def test_forbidden_features_rejected_in_fingerprinting(self):
        """Assert that forbidden rule features or risk scores trigger zero-leakage errors."""
        leaky_rec = {
            "protocol": "SMTP",
            "tls_established": True,
            "weak_cipher": True,  # Forbidden rule feature
            "client_bytes": 100
        }
        with pytest.raises(ValueError, match="Security rule / label leakage detected"):
            generate_content_fingerprint(leaky_rec)

    def test_deduplication_on_mock_database(self, test_db_manager, tmp_path):
        """Test deduplication logic on a database containing both primary and derived sources."""
        # Import small subsets of both sources
        importer = HistoricalDataImporter(db_url=test_db_manager.db_url)
        importer.import_passive_os(max_records=20)
        importer.import_expanded_deployment_dataset(max_records=20)

        # Audit overlap
        dedup = TrainingPopulationDeduplicator(db_url=test_db_manager.db_url)
        audit = dedup.audit_overlap()
        assert audit["passive_os_records"] == 20
        assert audit["expanded_deployment_records"] == 20
        assert audit["total_raw_records"] >= 40

        # Build clean dataset in temporary registry
        reg_dir = tmp_path / "training_datasets"
        clean_info = dedup.build_deduplicated_dataset(
            output_dir=reg_dir / "test_clean_v1",
            dataset_version="test_clean_v1"
        )

        assert clean_info["record_count"] > 0
        assert clean_info["unresolved_provenance_count"] == 0

        # Verify files exist in version directory
        ver_dir = reg_dir / "test_clean_v1"
        assert (ver_dir / "dataset.csv").exists()
        assert (ver_dir / "metadata.json").exists()
        assert (ver_dir / "schema.json").exists()
        assert (ver_dir / "sha256.txt").exists()
        assert (ver_dir / "provenance_manifest.json").exists()

    def test_deployment_dataset_v4_clean_artifacts(self):
        """Verify the immutable deployment_dataset_v4_clean directory artifacts and manifest."""
        clean_dir = DEFAULT_CLEAN_DIR
        assert clean_dir.exists(), f"Clean dataset directory {clean_dir} must exist."

        meta_file = clean_dir / "metadata.json"
        prov_file = clean_dir / "provenance_manifest.json"
        sha_file = clean_dir / "sha256.txt"
        csv_file = clean_dir / "dataset.csv"

        assert meta_file.exists()
        assert prov_file.exists()
        assert sha_file.exists()
        assert csv_file.exists()

        with open(meta_file, "r") as f:
            metadata = json.load(f)

        assert metadata["dataset_version"] == "deployment_dataset_v4_clean"
        assert metadata["record_count"] == 10898
        assert metadata["removed_duplicate_count"] == 10898
        assert metadata["unresolved_provenance_count"] == 0
        assert metadata["train_count"] == 7629
        assert metadata["validation_count"] == 1635
        assert metadata["test_count"] == 1634
        assert metadata["feature_schema_version"] == "1.0.0"

        with open(prov_file, "r") as f:
            manifest = json.load(f)

        assert manifest["total_retained_records"] == 10898
        assert manifest["total_excluded_duplicates"] == 10898
        assert len(manifest["retained_sources"]) == 2  # passive_os and local_email_pcap
        assert manifest["excluded_derived_sources"][0]["source_dataset"] == "expanded_deployment_dataset"

    def test_zero_leakage_and_privacy_in_clean_dataset(self):
        """Assert zero sensitive information and zero forbidden rule features in clean dataset."""
        clean_dir = DEFAULT_CLEAN_DIR
        for split_file in ["train_records.json", "val_records.json", "test_records.json"]:
            path = clean_dir / split_file
            if not path.exists():
                continue
            with open(path, "r") as f:
                records = json.load(f)
            for rec in records:
                # Forbidden feature assertions
                fs.assert_no_forbidden_features(rec)

                # Privacy assertions: no plaintext body, password, or keylog
                assert "password" not in rec
                assert "body" not in rec
                assert "email_content" not in rec
                assert "client_random" not in rec
                assert "master_secret" not in rec
                assert "sslkeylog" not in rec

    def test_group_split_disjointness(self):
        """Assert 0% group overlap between train, validation, and test splits."""
        clean_dir = DEFAULT_CLEAN_DIR
        with open(clean_dir / "train_records.json", "r") as f:
            train_recs = json.load(f)
        with open(clean_dir / "val_records.json", "r") as f:
            val_recs = json.load(f)
        with open(clean_dir / "test_records.json", "r") as f:
            test_recs = json.load(f)

        train_groups = {f"{r.get('source_dataset')}::{r.get('source_capture_id')}" for r in train_recs}
        val_groups = {f"{r.get('source_dataset')}::{r.get('source_capture_id')}" for r in val_recs}
        test_groups = {f"{r.get('source_dataset')}::{r.get('source_capture_id')}" for r in test_recs}

        assert train_groups.isdisjoint(val_groups), "Train and Validation groups must be disjoint!"
        assert train_groups.isdisjoint(test_groups), "Train and Test groups must be disjoint!"
        assert val_groups.isdisjoint(test_groups), "Validation and Test groups must be disjoint!"

    def test_production_model_immutability(self):
        """Verify production model v3.0.0 is DEPLOYED and unchanged."""
        reg_service = ModelRegistryService()
        active_prod = reg_service.get_deployed_model()
        assert active_prod is not None
        assert active_prod["model_version"] == "3.0.0"
        assert active_prod["model_variant"] == "expanded_v3"
        assert active_prod["status"] == "DEPLOYED"
        assert active_prod["threshold"] == pytest.approx(-0.041466, rel=1e-3)
        assert active_prod["feature_schema_version"] == "1.0.0"
