"""
Group-Aware Training Dataset Splitter.
======================================
Splits forensic session datasets into Train, Validation, and Test subsets
by capture group to prevent cross-capture data leakage.

Guarantees:
- Zero group overlap across Train, Validation, and Test partitions.
- Exact reproducibility with fixed random seed.
"""

from typing import Any, Dict, List, Optional, Tuple, Set
import numpy as np
import random


def split_by_groups(
    records: List[Dict[str, Any]],
    groups: List[str],
    X: Optional[np.ndarray] = None,
    train_ratio: float = 0.70,
    val_ratio: float = 0.15,
    test_ratio: float = 0.15,
    random_state: int = 42,
    holdout_sources: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Perform a group-aware partition across train, validation, and test subsets.

    Parameters
    ----------
    records : List[Dict[str, Any]]
        List of sample records.
    groups : List[str]
        Group identifier corresponding to each sample in records.
    X : np.ndarray, optional
        Matrix of feature vectors aligned with records.
    train_ratio : float
        Proportion of groups for training (default 0.70).
    val_ratio : float
        Proportion of groups for validation (default 0.15).
    test_ratio : float
        Proportion of groups for testing (default 0.15).
    random_state : int
        Seed for deterministic group shuffling.
    holdout_sources : List[str], optional
        List of source_dataset names to hold out entirely in test partition.

    Returns
    -------
    dict containing:
        - 'train': dict(records, indices, groups, X)
        - 'val': dict(records, indices, groups, X)
        - 'test': dict(records, indices, groups, X)
        - 'group_overlap_check': bool (True if zero overlap)
        - 'summary': dict of partition counts, group distributions, and sources
    """
    if len(records) != len(groups):
        raise ValueError(f"Length mismatch: {len(records)} records vs {len(groups)} groups")

    unique_groups = sorted(list(set(groups)))
    n_groups = len(unique_groups)

    if n_groups == 0:
        empty_split = {"records": [], "indices": [], "groups": [], "X": np.empty((0, 32)) if X is not None else None}
        return {
            "train": empty_split,
            "val": empty_split,
            "test": empty_split,
            "group_overlap_check": True,
            "summary": {
                "total_samples": 0, "total_groups": 0, "train_samples": 0, "val_samples": 0, "test_samples": 0,
                "train_sources": [], "val_sources": [], "test_sources": []
            },
        }

    # Handle explicit source-level holdout
    holdout_groups: Set[str] = set()
    eligible_groups: List[str] = []
    
    if holdout_sources:
        holdout_set = set(holdout_sources)
        for idx, g in enumerate(groups):
            rec_src = records[idx].get("source_dataset", "")
            if rec_src in holdout_set:
                holdout_groups.add(g)
        eligible_groups = [g for g in unique_groups if g not in holdout_groups]
    else:
        eligible_groups = list(unique_groups)

    # Deterministic shuffle of eligible groups
    rng = random.Random(random_state)
    shuffled_groups = list(eligible_groups)
    rng.shuffle(shuffled_groups)
    n_eligible = len(shuffled_groups)

    # Calculate group allocations
    if n_eligible == 0:
        train_groups: Set[str] = set()
        val_groups: Set[str] = set()
        test_groups = set(holdout_groups)
    elif n_eligible == 1:
        train_groups = set(shuffled_groups)
        val_groups: Set[str] = set()
        test_groups = set(holdout_groups)
    elif n_eligible == 2:
        train_groups = {shuffled_groups[0]}
        val_groups = {shuffled_groups[1]}
        test_groups = set(holdout_groups)
    elif n_eligible == 3:
        train_groups = {shuffled_groups[0]}
        val_groups = {shuffled_groups[1]}
        test_groups = {shuffled_groups[2]} | holdout_groups
    elif n_eligible == 4:
        train_groups = {shuffled_groups[0], shuffled_groups[1]}
        val_groups = {shuffled_groups[2]}
        test_groups = {shuffled_groups[3]} | holdout_groups
    else:
        n_train = max(1, int(round(n_eligible * train_ratio)))
        n_val = max(1, int(round(n_eligible * val_ratio)))
        if n_train + n_val >= n_eligible:
            n_train = max(1, n_eligible - 2)
            n_val = 1

        train_groups = set(shuffled_groups[:n_train])
        val_groups = set(shuffled_groups[n_train : n_train + n_val])
        test_groups = set(shuffled_groups[n_train + n_val:]) | holdout_groups

    # Partition indices
    train_idx, val_idx, test_idx = [], [], []
    for idx, g in enumerate(groups):
        if g in train_groups:
            train_idx.append(idx)
        elif g in val_groups:
            val_idx.append(idx)
        elif g in test_groups:
            test_idx.append(idx)

    # Overlap assertions
    assert len(train_groups & val_groups) == 0, "Leakage detected between train and val groups!"
    assert len(train_groups & test_groups) == 0, "Leakage detected between train and test groups!"
    assert len(val_groups & test_groups) == 0, "Leakage detected between val and test groups!"

    def _build_subset(indices: List[int], grps: Set[str]) -> Dict[str, Any]:
        sub_records = [records[i] for i in indices]
        sub_X = X[indices] if X is not None and len(indices) > 0 else np.empty((0, 32))
        return {
            "records": sub_records,
            "indices": indices,
            "groups": sorted(list(grps)),
            "sample_count": len(indices),
            "X": sub_X,
        }

    train_subset = _build_subset(train_idx, train_groups)
    val_subset = _build_subset(val_idx, val_groups)
    test_subset = _build_subset(test_idx, test_groups)

    train_sources = sorted(list(set(r.get("source_dataset", "unknown") for r in train_subset["records"])))
    val_sources = sorted(list(set(r.get("source_dataset", "unknown") for r in val_subset["records"])))
    test_sources = sorted(list(set(r.get("source_dataset", "unknown") for r in test_subset["records"])))

    return {
        "train": train_subset,
        "val": val_subset,
        "test": test_subset,
        "group_overlap_check": True,
        "summary": {
            "total_samples": len(records),
            "total_groups": n_groups,
            "train_samples": len(train_idx),
            "train_groups": len(train_groups),
            "train_sources": train_sources,
            "val_samples": len(val_idx),
            "val_groups": len(val_groups),
            "val_sources": val_sources,
            "test_samples": len(test_idx),
            "test_groups": len(test_groups),
            "test_sources": test_sources,
            "holdout_sources_applied": holdout_sources or [],
        },
    }

