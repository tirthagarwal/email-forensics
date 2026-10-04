"""
Unit and Integration Tests for Database-Backed Training & Dataset Versioning.
============================================================================
Tests:
  - Database training dataset extraction
  - Strict zero-leakage forbidden feature enforcement
  - Group-aware train/val/test splitting (zero group overlap)
  - Dataset registry versioning, manifest generation, and SHA-256 integrity
  - Unsupervised evaluation bounding and reporting
  - Ground-truth benchmark evaluation metrics
"""

import pytest
import numpy as np
from pathlib import Path

from db_training_dataset import DBTrainingDataset, extract_db_training_dataset
from create_training_split import split_by_groups
from training_dataset_registry import TrainingDatasetRegistry
import feature_schema as fs
from evaluate_db_model import evaluate_unsupervised_split, evaluate_ground_truth_benchmark
from sklearn.ensemble import IsolationForest


class TestDBTrainingDatasetExtraction:
    """Test extraction and formatting of datasets from SQLite database."""

    def test_extract_dataset_shape_and_schema(self):
        dataset = extract_db_training_dataset()
        assert "records" in dataset
        assert "X" in dataset
        assert "groups" in dataset
        assert dataset["schema_version"] == "1.0.0"
        assert dataset["sample_count"] >= 4
        assert dataset["X"].shape[1] == 32
        assert len(dataset["records"]) == dataset["sample_count"]
        assert len(dataset["groups"]) == dataset["sample_count"]

    def test_strict_zero_leakage_forbidden_features(self):
        dataset = extract_db_training_dataset()
        for rec in dataset["records"]:
            raw_f = rec["raw_features"]
            trans_f = rec["transformed_features"]

            # Must not contain any forbidden security rule or score field
            for forbidden_col in fs.FORBIDDEN_FEATURES:
                assert forbidden_col not in raw_f, f"Leaked forbidden feature '{forbidden_col}' in raw features!"
                assert forbidden_col not in trans_f, f"Leaked forbidden feature '{forbidden_col}' in transformed features!"

    def test_assert_no_forbidden_features_raises_on_leakage(self):
        leaked_dict = {
            "client_bytes": 100,
            "weak_cipher": True,
        }
        with pytest.raises(ValueError, match="Security rule / label leakage detected"):
            fs.assert_no_forbidden_features(leaked_dict)


class TestGroupAwareSplitting:
    """Test capture-group-aware partitioning across train/validation/test."""

    def test_zero_group_leakage(self):
        records = [{"id": i} for i in range(100)]
        # 10 capture groups, 10 records each
        groups = [f"capture_{(i // 10) + 1}.pcap" for i in range(100)]
        X = np.random.randn(100, 32)

        split = split_by_groups(records, groups, X, train_ratio=0.70, val_ratio=0.15, test_ratio=0.15, random_state=42)

        train_g = set(split["train"]["groups"])
        val_g = set(split["val"]["groups"])
        test_g = set(split["test"]["groups"])

        assert split["group_overlap_check"] is True
        assert len(train_g & val_g) == 0, "Train and Val groups overlap!"
        assert len(train_g & test_g) == 0, "Train and Test groups overlap!"
        assert len(val_g & test_g) == 0, "Val and Test groups overlap!"
        assert split["summary"]["total_samples"] == 100
        assert split["summary"]["total_groups"] == 10

    def test_small_group_splitting(self):
        records = [{"id": 1}, {"id": 2}, {"id": 3}, {"id": 4}]
        groups = ["pcap1.pcap", "pcap2.pcap", "pcap3.pcap", "pcap4.pcap"]
        split = split_by_groups(records, groups, random_state=42)

        assert split["summary"]["train_groups"] == 2
        assert split["summary"]["val_groups"] == 1
        assert split["summary"]["test_groups"] == 1
        assert len(set(split["train"]["groups"]) & set(split["val"]["groups"])) == 0


class TestTrainingDatasetRegistry:
    """Test saving, cataloging, and verifying versioned datasets."""

    def test_save_and_verify_dataset_integrity(self, tmp_path):
        reg = TrainingDatasetRegistry(base_dir=tmp_path)
        records = [{"raw_features": {"client_bytes": 100, "protocol": "SMTP"}}]
        groups = ["pcap1.pcap"]
        split = split_by_groups(records, groups, random_state=42)

        manifest = reg.save_dataset_version("v_test_1.0", split, description="Test dataset")
        assert manifest["dataset_version"] == "v_test_1.0"
        assert manifest["feature_schema_version"] == "1.0.0"

        # Verify integrity
        integrity = reg.verify_dataset_integrity("v_test_1.0")
        assert integrity["status"] == "VERIFIED_OK"
        assert "train_records.json" in integrity["files"]
        assert integrity["files"]["train_records.json"]["status"] == "VERIFIED_OK"

        # List versions
        versions = reg.list_dataset_versions()
        assert len(versions) == 1
        assert versions[0]["dataset_version"] == "v_test_1.0"

        # Load dataset
        loaded = reg.load_dataset_version("v_test_1.0")
        assert len(loaded["train"]) == 1


class TestUnsupervisedAndBenchmarkEvaluation:
    """Test evaluation logic and report formatting."""

    def test_unsupervised_evaluation_notice_and_bounds(self):
        model = IsolationForest(n_estimators=10, random_state=42)
        X = np.random.randn(20, 32)
        model.fit(X)

        res = evaluate_unsupervised_split(model, X, threshold=-0.05, split_name="validation")
        assert res["evaluation_type"] == "Unsupervised evaluation — no independent anomaly ground truth"
        assert res["sample_count"] == 20
        assert res["scores_bounded"] is True
        assert -1.0 <= res["score_distribution"]["min"] <= 1.0
        assert -1.0 <= res["score_distribution"]["max"] <= 1.0

    def test_ground_truth_benchmark_metrics(self):
        model = IsolationForest(n_estimators=50, random_state=42)
        X = np.random.randn(20, 32)
        model.fit(X)

        res = evaluate_ground_truth_benchmark(model, threshold=-0.05)
        assert res["status"] == "EVALUATED_OK"
        assert res["sample_count"] == 5
        assert 0.0 <= res["precision"] <= 1.0
        assert 0.0 <= res["recall"] <= 1.0
        assert 0.0 <= res["f1_score"] <= 1.0
        assert 0.0 <= res["fpr"] <= 1.0
        assert 0.0 <= res["fnr"] <= 1.0
