#!/usr/bin/env python3
"""
Real-World Validation Framework for Boundary-Aware Compression

This script orchestrates comprehensive validation of boundary-aware compression
on real-world datasets with downstream task evaluation.

Scientific audit - no hype, just metrics.
"""

import json
import sys
import argparse
import time
import platform
import psutil
import numpy as np
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime
from dataclasses import dataclass, asdict


@dataclass
class HardwareInfo:
    """Hardware and environment metadata."""
    platform: str
    cpu_count: int
    memory_gb: float
    python_version: str
    numpy_version: str
    timestamp: str


@dataclass
class RunMetadata:
    """Metadata for a single experiment run."""
    run_id: str
    seed: int
    dataset_id: str
    embedding_dimension: int
    compression_config: Dict[str, Any]
    hardware: HardwareInfo
    elapsed_time_seconds: float


def get_hardware_info() -> HardwareInfo:
    """Capture hardware and environment information."""
    return HardwareInfo(
        platform=platform.platform(),
        cpu_count=psutil.cpu_count(),
        memory_gb=psutil.virtual_memory().total / (1024**3),
        python_version=platform.python_version(),
        numpy_version=np.__version__,
        timestamp=datetime.utcnow().isoformat()
    )


def compute_recall_at_k(
    original_embeddings: np.ndarray,
    compressed_embeddings: np.ndarray,
    k: int = 10
) -> float:
    """
    Compute Recall@k for retrieval evaluation.
    
    For each query, find k nearest neighbors in original space,
    then measure how many are in top-k of compressed space.
    """
    n = len(original_embeddings)
    if n < k + 1:
        return 1.0  # Degenerate case
    
    recalls = []
    
    for i in range(n):
        # Original space: find k nearest neighbors (excluding self)
        orig_dists = np.linalg.norm(original_embeddings - original_embeddings[i], axis=1)
        orig_nearest = np.argsort(orig_dists)[1:k+1]  # Exclude self at index 0
        
        # Compressed space: find k nearest neighbors
        comp_dists = np.linalg.norm(compressed_embeddings - compressed_embeddings[i], axis=1)
        comp_nearest = np.argsort(comp_dists)[1:k+1]
        
        # Compute recall: |intersection| / k
        intersection = len(set(orig_nearest) & set(comp_nearest))
        recalls.append(intersection / k)
    
    return float(np.mean(recalls))


def compute_mrr(
    original_embeddings: np.ndarray,
    compressed_embeddings: np.ndarray,
    k: int = 10
) -> float:
    """
    Compute Mean Reciprocal Rank.
    
    For each query's true nearest neighbor in original space,
    find its rank in compressed space.
    """
    n = len(original_embeddings)
    reciprocal_ranks = []
    
    for i in range(n):
        # Original space: find nearest neighbor
        orig_dists = np.linalg.norm(original_embeddings - original_embeddings[i], axis=1)
        orig_dists[i] = np.inf  # Exclude self
        true_nearest = np.argmin(orig_dists)
        
        # Compressed space: find rank of true nearest
        comp_dists = np.linalg.norm(compressed_embeddings - compressed_embeddings[i], axis=1)
        comp_ranks = np.argsort(comp_dists)
        
        # Find rank of true nearest (1-indexed)
        rank = np.where(comp_ranks == true_nearest)[0][0] + 1
        reciprocal_ranks.append(1.0 / rank if rank <= k else 0.0)
    
    return float(np.mean(reciprocal_ranks))


def compute_ndcg(
    original_embeddings: np.ndarray,
    compressed_embeddings: np.ndarray,
    k: int = 10
) -> float:
    """
    Compute Normalized Discounted Cumulative Gain.
    
    Uses distance in original space as relevance score.
    """
    n = len(original_embeddings)
    if n < k + 1:
        return 1.0
    
    ndcgs = []
    
    for i in range(n):
        # Original space: compute relevance scores (inverse distance)
        orig_dists = np.linalg.norm(original_embeddings - original_embeddings[i], axis=1)
        orig_dists[i] = np.inf
        relevance = 1.0 / (orig_dists + 1e-10)
        
        # Ideal DCG: top-k by relevance
        ideal_order = np.argsort(relevance)[::-1][:k]
        ideal_dcg = np.sum(relevance[ideal_order] / np.log2(np.arange(2, k + 2)))
        
        # Compressed space: actual ranking
        comp_dists = np.linalg.norm(compressed_embeddings - compressed_embeddings[i], axis=1)
        actual_order = np.argsort(comp_dists)[1:k+1]  # Exclude self
        actual_dcg = np.sum(relevance[actual_order] / np.log2(np.arange(2, k + 2)))
        
        ndcgs.append(actual_dcg / (ideal_dcg + 1e-10))
    
    return float(np.mean(ndcgs))


def compute_silhouette_score(embeddings: np.ndarray, labels: np.ndarray) -> float:
    """
    Compute Silhouette score for clustering evaluation.
    
    Simple implementation without sklearn dependency.
    """
    n = len(embeddings)
    unique_labels = np.unique(labels)
    
    if len(unique_labels) <= 1:
        return 0.0
    
    silhouettes = []
    
    for i in range(n):
        label = labels[i]
        
        # a: mean distance to points in same cluster
        same_cluster = labels == label
        if np.sum(same_cluster) <= 1:
            continue
        a = np.mean(np.linalg.norm(embeddings[same_cluster] - embeddings[i], axis=1))
        
        # b: min mean distance to points in other clusters
        b = np.inf
        for other_label in unique_labels:
            if other_label == label:
                continue
            other_cluster = labels == other_label
            if np.sum(other_cluster) == 0:
                continue
            mean_dist = np.mean(np.linalg.norm(embeddings[other_cluster] - embeddings[i], axis=1))
            b = min(b, mean_dist)
        
        if b == np.inf:
            continue
        
        silhouettes.append((b - a) / max(a, b))
    
    return float(np.mean(silhouettes)) if silhouettes else 0.0


def compute_nmi(labels_true: np.ndarray, labels_pred: np.ndarray) -> float:
    """
    Compute Normalized Mutual Information.
    
    Simple implementation for clustering evaluation.
    """
    from collections import Counter
    
    n = len(labels_true)
    
    # Entropy of true labels
    true_counts = Counter(labels_true)
    h_true = -sum((count/n) * np.log2(count/n) for count in true_counts.values())
    
    # Entropy of predicted labels
    pred_counts = Counter(labels_pred)
    h_pred = -sum((count/n) * np.log2(count/n) for count in pred_counts.values())
    
    # Mutual information
    mi = 0.0
    for t_label in true_counts:
        for p_label in pred_counts:
            count = np.sum((labels_true == t_label) & (labels_pred == p_label))
            if count > 0:
                mi += (count/n) * np.log2((count * n) / (true_counts[t_label] * pred_counts[p_label]))
    
    # Normalized MI
    return mi / np.sqrt(h_true * h_pred) if h_true > 0 and h_pred > 0 else 0.0


def compute_ari(labels_true: np.ndarray, labels_pred: np.ndarray) -> float:
    """
    Compute Adjusted Rand Index.
    
    Simple implementation for clustering evaluation.
    """
    from scipy.special import comb
    
    n = len(labels_true)
    
    # Contingency table
    unique_true = np.unique(labels_true)
    unique_pred = np.unique(labels_pred)
    
    contingency = np.zeros((len(unique_true), len(unique_pred)))
    for i, t_label in enumerate(unique_true):
        for j, p_label in enumerate(unique_pred):
            contingency[i, j] = np.sum((labels_true == t_label) & (labels_pred == p_label))
    
    # Sum combinations
    sum_comb_c = sum(comb(n_ij, 2) for n_ij in contingency.flatten() if n_ij >= 2)
    sum_comb_k = sum(comb(np.sum(contingency[i, :]), 2) for i in range(len(unique_true)))
    sum_comb_c_pred = sum(comb(np.sum(contingency[:, j]), 2) for j in range(len(unique_pred)))
    
    expected_index = sum_comb_k * sum_comb_c_pred / comb(n, 2)
    max_index = (sum_comb_k + sum_comb_c_pred) / 2
    
    if max_index == expected_index:
        return 1.0
    
    return (sum_comb_c - expected_index) / (max_index - expected_index)


def detect_stability_regions(
    grid_values: np.ndarray,
    delta_boundary_values: np.ndarray,
    mse_values: np.ndarray
) -> Dict[str, Any]:
    """
    Classify compression parameter space into stability regions.
    
    Returns:
        stable_region: parameters where compression is safe
        ridge_region: boundary between stable and unstable
        instability_region: parameters where compression fails
    """
    # Detect collapse threshold
    collapse_threshold = None
    for i, (delta, mse) in enumerate(zip(delta_boundary_values, mse_values)):
        if mse > 0.5 or delta > 1.0:  # Arbitrary collapse criteria
            collapse_threshold = grid_values[i]
            break
    
    # Compute variance by compression level
    variance = np.var(delta_boundary_values) if len(delta_boundary_values) > 1 else 0.0
    
    # Classify regions
    if collapse_threshold is None:
        stable_region = grid_values.tolist()
        ridge_region = []
        instability_region = []
    else:
        stable_idx = np.where(grid_values < collapse_threshold * 0.5)[0]
        ridge_idx = np.where((grid_values >= collapse_threshold * 0.5) & 
                            (grid_values < collapse_threshold))[0]
        instability_idx = np.where(grid_values >= collapse_threshold)[0]
        
        stable_region = grid_values[stable_idx].tolist()
        ridge_region = grid_values[ridge_idx].tolist()
        instability_region = grid_values[instability_idx].tolist()
    
    return {
        'stable_region': stable_region,
        'ridge_region': ridge_region,
        'instability_region': instability_region,
        'collapse_threshold': collapse_threshold,
        'variance': float(variance),
        'delta_boundary_range': {
            'min': float(np.min(delta_boundary_values)),
            'max': float(np.max(delta_boundary_values)),
            'mean': float(np.mean(delta_boundary_values)),
            'std': float(np.std(delta_boundary_values))
        }
    }


def main():
    parser = argparse.ArgumentParser(
        description='Real-world validation framework for boundary-aware compression'
    )
    parser.add_argument(
        '--mode',
        choices=['prepare', 'evaluate', 'report'],
        default='evaluate',
        help='Execution mode'
    )
    parser.add_argument(
        '--config',
        default='analysis/real_world_validation_config.json',
        help='Configuration file'
    )
    parser.add_argument(
        '--output',
        default='results/real_world_validation',
        help='Output directory'
    )
    
    args = parser.parse_args()
    
    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"Real-World Validation Framework")
    print(f"Mode: {args.mode}")
    print(f"Output: {output_dir}")
    print()
    
    if args.mode == 'prepare':
        print("Prepare mode: Dataset preparation instructions")
        print("This framework requires pre-computed embeddings.")
        print("See docs/REAL_WORLD_VALIDATION_REPORT.md for dataset setup.")
        return 0
    
    elif args.mode == 'evaluate':
        print("Evaluate mode: Run validation experiments")
        print("Note: Full evaluation requires real-world embeddings.")
        print("This is a framework placeholder for integration with TypeScript.")
        return 0
    
    elif args.mode == 'report':
        print("Report mode: Generate validation report")
        print("See report generation script for full implementation.")
        return 0
    
    return 0


if __name__ == '__main__':
    sys.exit(main())
