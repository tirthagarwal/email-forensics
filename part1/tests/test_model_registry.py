"""
Unit and Integration Tests for Forensic Model Registry.
======================================================
Tests:
  - Model registry table schema and persistence
  - Production model v3.0.0 seeding and verification
  - Model candidate registration and metadata logging
  - Model lifecycle state transitions (CANDIDATE -> VALIDATED -> DEPLOYED -> RETIRED)
  - Single-deployed invariant enforcement
  - Artifact SHA-256 integrity verification
"""

import pytest
from pathlib import Path
from model_registry import ModelRegistryService
from database import get_db_manager, DatabaseManager


@pytest.fixture
def test_db_service(tmp_path):
    db_file = tmp_path / "test_model_reg.db"
    db_url = f"sqlite:///{db_file.resolve()}"
    mgr = get_db_manager(db_url)
    mgr.init_db(drop_existing=True)
    srv = ModelRegistryService(db_url=db_url)
    srv.seed_production_model()
    return srv


class TestModelRegistryLifecycle:
    """Test registry lifecycle management, seeding, and transitions."""

    def test_seed_production_model_v3(self, test_db_service):
        deployed = test_db_service.get_deployed_model()
        assert deployed is not None
        assert deployed["model_version"] == "3.0.0"
        assert deployed["model_variant"] == "expanded_v3"
        assert deployed["status"] == "DEPLOYED"
        assert deployed["threshold"] == pytest.approx(-0.041466, abs=1e-4)
        assert deployed["training_record_count"] == 7629
        assert deployed["feature_schema_version"] == "1.0.0"

    def test_register_candidate_model(self, test_db_service):
        entry = test_db_service.register_new_model(
            model_version="3.2.0-candidate",
            threshold=-0.05,
            model_variant="experimental_v1",
            training_dataset_version="db_dataset_v1",
            training_record_count=100,
            validation_record_count=20,
            test_record_count=20,
            status="CANDIDATE",
        )
        assert entry.model_version == "3.2.0-candidate"
        assert entry.status == "CANDIDATE"

        models = test_db_service.list_all_models()
        versions = [m["model_version"] for m in models]
        assert "3.2.0-candidate" in versions
        assert "3.0.0" in versions

    def test_lifecycle_validation_and_promotion(self, test_db_service):
        # Register candidate
        test_db_service.register_new_model(
            model_version="4.0.0",
            threshold=-0.03,
            model_variant="next_gen",
            status="CANDIDATE",
        )

        # Validate
        val_res = test_db_service.validate_model("4.0.0", {"f1_score": 0.88})
        assert val_res is not None
        assert val_res["status"] == "VALIDATED"
        assert val_res["metrics"]["validation"]["f1_score"] == 0.88

        # Promote to DEPLOYED
        promoted = test_db_service.promote_to_deployed("4.0.0")
        assert promoted["status"] == "DEPLOYED"

        # Check that old production model was retired
        old_v3 = next(m for m in test_db_service.list_all_models() if m["model_version"] == "3.0.0")
        assert old_v3["status"] == "RETIRED"

        # Check active deployed model is 4.0.0
        active = test_db_service.get_deployed_model()
        assert active["model_version"] == "4.0.0"

    def test_retire_model(self, test_db_service):
        test_db_service.register_new_model(
            model_version="3.5.0-temp",
            threshold=-0.02,
            model_variant="temp_v1",
            status="CANDIDATE",
        )
        retired = test_db_service.retire_model("3.5.0-temp")
        assert retired["status"] == "RETIRED"


class TestArtifactIntegrityVerification:
    """Test cryptographic SHA-256 verification of registered model artifacts."""

    def test_production_model_artifact_integrity(self, test_db_service):
        test_db_service.seed_production_model()
        integrity = test_db_service.verify_artifact_integrity("3.0.0")
        assert integrity["status"] == "VERIFIED_OK"
        assert integrity["recorded_sha256"] == integrity["current_sha256"]

    def test_missing_artifact_reports_failure(self, test_db_service):
        test_db_service.register_new_model(
            model_version="9.9.9-ghost",
            threshold=-0.01,
            model_variant="ghost",
            artifact_path="/non/existent/path/model.joblib",
            artifact_sha256="fakehash123",
        )
        integrity = test_db_service.verify_artifact_integrity("9.9.9-ghost")
        assert integrity["status"] == "FAILED"
        assert "missing" in integrity["reason"].lower()
