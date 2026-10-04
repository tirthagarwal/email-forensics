"""
Model Registry Service & Lifecycle Manager.
===========================================
Manages machine learning model artifacts, versions, training metadata,
validation checkpoints, and deployment status in the SQLite database.

Model Lifecycle States:
  - CANDIDATE : Newly trained model awaiting formal validation
  - VALIDATED : Passed offline benchmark and group-aware validation tests
  - DEPLOYED  : Active production model serving inference in the forensic pipeline
  - RETIRED   : Archived prior model preserved for reproducibility
"""

import json
import hashlib
from pathlib import Path
from typing import Any, Dict, List, Optional

from database import get_db_manager
from db_service import ForensicDataService
from db_models import ModelRegistry


DEFAULT_MODELS_DIR = Path(__file__).parent.parent / "models" / "deployment_ml"


def compute_file_sha256(path: Path) -> str:
    """Compute SHA-256 hash of a file on disk."""
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


class ModelRegistryService:
    """Service layer for model tracking, validation, and promotion."""

    def __init__(self, db_url: Optional[str] = None, models_dir: Optional[Path] = None):
        self.db_manager = get_db_manager(db_url)
        self.db_manager.init_db()
        self.models_dir = Path(models_dir) if models_dir else DEFAULT_MODELS_DIR

    def seed_production_model(self) -> ModelRegistry:
        """
        Ensure that the production Deployment ML v3.0.0 (expanded_v3) model
        is registered with status DEPLOYED in the database.
        """
        meta_file = self.models_dir / "deployment_training_metadata.json"
        joblib_file = self.models_dir / "deployment_isolation_forest.joblib"

        artifact_sha256 = compute_file_sha256(joblib_file) if joblib_file.exists() else None

        with self.db_manager.session_scope() as session:
            service = ForensicDataService(session)
            existing = service.get_model_by_version("3.0.0")
            if existing:
                if existing.status != "DEPLOYED":
                    existing.status = "DEPLOYED"
                    session.commit()
                return existing

            # If metadata file exists, extract parameters
            meta = {}
            if meta_file.exists():
                try:
                    with open(meta_file, "r", encoding="utf-8") as f:
                        meta = json.load(f)
                except Exception:
                    pass

            entry = service.register_model(
                model_name="deployment_isolation_forest",
                model_version="3.0.0",
                model_variant="expanded_v3",
                algorithm="IsolationForest",
                feature_schema_version="1.0.0",
                training_dataset_version="expanded_v3_10898",
                threshold=meta.get("threshold", -0.041466321224221024),
                n_estimators=meta.get("n_estimators", 200),
                random_state=meta.get("random_seed", 42),
                training_record_count=meta.get("training_rows", 7629),
                validation_record_count=meta.get("validation_rows", 1635),
                test_record_count=meta.get("test_rows", 1634),
                artifact_path=str(joblib_file.resolve()) if joblib_file.exists() else None,
                artifact_sha256=artifact_sha256,
                status="DEPLOYED",
                metrics_json=json.dumps(meta.get("validation_scores", {})),
            )
            return entry

    def register_new_model(
        self,
        model_version: str,
        threshold: float,
        model_variant: str,
        training_dataset_version: Optional[str] = None,
        artifact_path: Optional[str] = None,
        artifact_sha256: Optional[str] = None,
        training_record_count: int = 0,
        validation_record_count: int = 0,
        test_record_count: int = 0,
        n_estimators: int = 200,
        random_state: int = 42,
        status: str = "CANDIDATE",
        metrics: Optional[Dict[str, Any]] = None,
    ) -> ModelRegistry:
        """Register a new candidate model in the registry."""
        with self.db_manager.session_scope() as session:
            service = ForensicDataService(session)
            return service.register_model(
                model_name="deployment_isolation_forest",
                model_version=model_version,
                model_variant=model_variant,
                algorithm="IsolationForest",
                feature_schema_version="1.0.0",
                training_dataset_version=training_dataset_version,
                threshold=threshold,
                n_estimators=n_estimators,
                random_state=random_state,
                training_record_count=training_record_count,
                validation_record_count=validation_record_count,
                test_record_count=test_record_count,
                artifact_path=artifact_path,
                artifact_sha256=artifact_sha256,
                status=status,
                metrics_json=json.dumps(metrics) if metrics else None,
            )

    def get_deployed_model(self) -> Optional[Dict[str, Any]]:
        """Retrieve details of the active DEPLOYED model."""
        with self.db_manager.session_scope() as session:
            service = ForensicDataService(session)
            m = service.get_deployed_model()
            if not m:
                # If not seeded yet, seed it and return
                return self._to_dict(self.seed_production_model())
            return self._to_dict(m)

    def list_all_models(self, status: Optional[str] = None) -> List[Dict[str, Any]]:
        """List all models registered in the database."""
        with self.db_manager.session_scope() as session:
            service = ForensicDataService(session)
            models = service.list_registered_models(status=status)
            return [self._to_dict(m) for m in models]

    def validate_model(self, model_version: str, validation_metrics: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        """Mark a model as VALIDATED after successful evaluation."""
        with self.db_manager.session_scope() as session:
            service = ForensicDataService(session)
            model = service.get_model_by_version(model_version)
            if not model:
                return None
            model.status = "VALIDATED"
            if validation_metrics:
                existing_meta = json.loads(model.metrics_json) if model.metrics_json else {}
                existing_meta["validation"] = validation_metrics
                model.metrics_json = json.dumps(existing_meta)
            session.commit()
            return self._to_dict(model)

    def promote_to_deployed(self, model_version: str) -> Optional[Dict[str, Any]]:
        """Promote a validated model to DEPLOYED status."""
        with self.db_manager.session_scope() as session:
            service = ForensicDataService(session)
            model = service.set_model_status(model_version, "DEPLOYED")
            return self._to_dict(model) if model else None

    def retire_model(self, model_version: str) -> Optional[Dict[str, Any]]:
        """Retire an active or validated model."""
        with self.db_manager.session_scope() as session:
            service = ForensicDataService(session)
            model = service.set_model_status(model_version, "RETIRED")
            return self._to_dict(model) if model else None

    def verify_artifact_integrity(self, model_version: str) -> Dict[str, Any]:
        """Verify the SHA-256 hash of a registered model artifact."""
        with self.db_manager.session_scope() as session:
            service = ForensicDataService(session)
            m = service.get_model_by_version(model_version)
            if not m:
                return {"status": "FAILED", "reason": f"Model '{model_version}' not found"}

            if not m.artifact_path or not Path(m.artifact_path).exists():
                return {"status": "FAILED", "reason": "Artifact file missing on disk", "path": m.artifact_path}

            current_hash = compute_file_sha256(Path(m.artifact_path))
            matches = (current_hash == m.artifact_sha256)
            return {
                "model_version": m.model_version,
                "status": "VERIFIED_OK" if matches else "INTEGRITY_MISMATCH",
                "recorded_sha256": m.artifact_sha256,
                "current_sha256": current_hash,
                "artifact_path": m.artifact_path,
            }

    @staticmethod
    def _to_dict(m: ModelRegistry) -> Dict[str, Any]:
        return {
            "id": m.id,
            "model_name": m.model_name,
            "model_version": m.model_version,
            "model_variant": m.model_variant,
            "algorithm": m.algorithm,
            "feature_schema_version": m.feature_schema_version,
            "training_dataset_version": m.training_dataset_version,
            "threshold": m.threshold,
            "n_estimators": m.n_estimators,
            "random_state": m.random_state,
            "training_record_count": m.training_record_count,
            "validation_record_count": m.validation_record_count,
            "test_record_count": m.test_record_count,
            "artifact_path": m.artifact_path,
            "artifact_sha256": m.artifact_sha256,
            "status": m.status,
            "metrics": json.loads(m.metrics_json) if m.metrics_json else {},
            "created_at": m.created_at.isoformat() if m.created_at else None,
            "updated_at": m.updated_at.isoformat() if m.updated_at else None,
        }
