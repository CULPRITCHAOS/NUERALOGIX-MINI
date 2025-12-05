#!/usr/bin/env python3
"""
Real-World Validation Execution Script

This script orchestrates the complete validation pipeline:
1. Dataset preparation
2. Compression evaluation
3. Metric computation
4. Report generation

Usage:
    python analysis/run_real_world_evaluation.py --config analysis/real_world_validation_config.json
    python analysis/run_real_world_evaluation.py --datasets synthetic --quick
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

# Import the validation framework
sys.path.insert(0, str(Path(__file__).parent))
from real_world_validation import (
    get_hardware_info,
    compute_recall_at_k,
    compute_mrr,
    compute_ndcg,
    compute_silhouette_score,
    compute_nmi,
    compute_ari,
    detect_stability_regions,
    HardwareInfo,
    RunMetadata
)


def load_config(config_path: str) -> Dict:
    """Load validation configuration."""
    with open(config_path, 'r') as f:
        return json.load(f)


def generate_synthetic_embeddings(
    generator: str,
    params: Dict,
    seed: int
) -> Tuple[np.ndarray, List[str]]:
    """Generate synthetic embeddings for validation."""
    np.random.seed(seed)
    
    num_points = params.get('sample_size', 500)
    dimension = params.get('dimension', 8)
    noise = params.get('noise', 0.0)
    
    embeddings = []
    labels = []
    
    if generator == 'clusters':
        num_clusters = params.get('numClusters', 5)
        spread = params.get('spread', 0.5)
        points_per_cluster = num_points // num_clusters
        
        # Generate cluster centers
        centers = np.random.rand(num_clusters, dimension) * 4 - 2
        
        for c in range(num_clusters):
            for i in range(points_per_cluster):
                embedding = centers[c] + np.random.randn(dimension) * spread
                embeddings.append(embedding)
                labels.append(f'cluster{c}_{i}')
    
    elif generator == 'ring':
        radius = params.get('radius', 1.0)
        for i in range(num_points):
            angle = (2 * np.pi * i) / num_points
            embedding = np.zeros(dimension)
            embedding[0] = radius * np.cos(angle)
            embedding[1] = radius * np.sin(angle)
            if noise > 0:
                embedding += np.random.randn(dimension) * noise
            embeddings.append(embedding)
            labels.append(f'ring_{i}')
    
    elif generator == 'swiss-roll':
        turns = params.get('turns', 1.5)
        for i in range(num_points):
            t = (i / num_points) * (2 * np.pi * turns)
            y = np.random.rand()
            embedding = np.zeros(dimension)
            embedding[0] = t * np.cos(t)
            embedding[1] = y
            embedding[2] = t * np.sin(t)
            if noise > 0:
                embedding += np.random.randn(dimension) * noise
            embeddings.append(embedding)
            labels.append(f'swissroll_{i}')
    
    else:
        raise ValueError(f"Unknown generator: {generator}")
    
    return np.array(embeddings), labels


def simple_kmeans_compression(
    embeddings: np.ndarray,
    k: int,
    grid_step: float,
    boundary_aware: bool = False
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Simple k-means compression with optional boundary-aware treatment.
    
    Returns:
        compressed_embeddings: Compressed version of input
        centroids: K-means centroids
    """
    n, d = embeddings.shape
    
    if n <= k:
        return embeddings.copy(), embeddings.copy()
    
    # K-means clustering
    centroids = embeddings[:k].copy()
    
    for _ in range(10):  # 10 iterations
        # Assign to nearest centroid
        distances = np.linalg.norm(
            embeddings[:, np.newaxis, :] - centroids[np.newaxis, :, :],
            axis=2
        )
        assignments = np.argmin(distances, axis=1)
        
        # Update centroids
        for i in range(k):
            cluster_points = embeddings[assignments == i]
            if len(cluster_points) > 0:
                centroids[i] = cluster_points.mean(axis=0)
    
    # Grid quantization of centroids
    snapped_centroids = np.round(centroids / grid_step) * grid_step
    
    if boundary_aware:
        # Classify boundary vectors
        distances = np.linalg.norm(
            embeddings[:, np.newaxis, :] - centroids[np.newaxis, :, :],
            axis=2
        )
        sorted_dists = np.sort(distances, axis=1)
        ambiguity = sorted_dists[:, 1] - sorted_dists[:, 0] if k > 1 else sorted_dists[:, 0]
        
        # Bottom 10% are boundary vectors
        threshold = np.percentile(ambiguity, 10)
        is_boundary = ambiguity <= threshold
        
        # Finer grid for boundary
        boundary_centroids = np.round(centroids / (grid_step * 0.5)) * (grid_step * 0.5)
        
        # Compress with appropriate centroids
        compressed = np.zeros_like(embeddings)
        for i in range(n):
            if is_boundary[i]:
                dists = np.linalg.norm(boundary_centroids - embeddings[i], axis=1)
                compressed[i] = boundary_centroids[np.argmin(dists)]
            else:
                dists = np.linalg.norm(snapped_centroids - embeddings[i], axis=1)
                compressed[i] = snapped_centroids[np.argmin(dists)]
    else:
        # Vanilla: assign to nearest snapped centroid
        distances = np.linalg.norm(
            embeddings[:, np.newaxis, :] - snapped_centroids[np.newaxis, :, :],
            axis=2
        )
        assignments = np.argmin(distances, axis=1)
        compressed = snapped_centroids[assignments]
    
    return compressed, snapped_centroids


def run_evaluation_experiment(
    dataset_id: str,
    embeddings: np.ndarray,
    config: Dict,
    seed: int,
    output_dir: Path
) -> Dict[str, Any]:
    """Run evaluation experiment on a single dataset."""
    print(f"\n{'='*80}")
    print(f"Evaluating: {dataset_id} (seed={seed})")
    print(f"{'='*80}\n")
    
    results = {
        'dataset_id': dataset_id,
        'seed': seed,
        'embedding_dimension': embeddings.shape[1],
        'num_vectors': embeddings.shape[0],
        'timestamp': datetime.utcnow().isoformat(),
        'hardware': asdict(get_hardware_info()),
        'experiments': []
    }
    
    # Grid sweep parameters
    grid_sweep = config['compression_configs']['grid_sweep']
    k_sweep = config['compression_configs']['k_sweep']
    
    grid_values = np.linspace(grid_sweep['min'], grid_sweep['max'], grid_sweep['steps'])
    k_values = np.linspace(k_sweep['min'], k_sweep['max'], k_sweep['steps'], dtype=int)
    
    for method in config['compression_configs']['methods']:
        boundary_aware = (method == 'boundary-aware')
        
        print(f"\nMethod: {method}")
        print(f"Grid values: {len(grid_values)}, K values: {len(k_values)}")
        
        for grid_step in grid_values:
            for k in k_values:
                start_time = time.time()
                
                # Compress
                compressed, centroids = simple_kmeans_compression(
                    embeddings, k, grid_step, boundary_aware
                )
                
                compression_time = time.time() - start_time
                
                # Compute metrics
                mse = np.mean((embeddings - compressed) ** 2)
                
                # Retrieval metrics
                recall_10 = compute_recall_at_k(embeddings, compressed, k=10)
                recall_100 = compute_recall_at_k(embeddings, compressed, k=100)
                mrr = compute_mrr(embeddings, compressed, k=10)
                ndcg_10 = compute_ndcg(embeddings, compressed, k=10)
                
                # Memory footprint estimate
                unique_centroids = len(np.unique(compressed.reshape(compressed.shape[0], -1), axis=0))
                memory_bits = unique_centroids * embeddings.shape[1] * 32  # float32
                
                experiment = {
                    'method': method,
                    'grid_step': float(grid_step),
                    'k': int(k),
                    'mse_global': float(mse),
                    'recall_at_10': float(recall_10),
                    'recall_at_100': float(recall_100),
                    'mrr': float(mrr),
                    'ndcg_at_10': float(ndcg_10),
                    'compression_time_seconds': float(compression_time),
                    'memory_bits': int(memory_bits),
                    'unique_centroids': int(unique_centroids)
                }
                
                results['experiments'].append(experiment)
                
                print(f"  grid={grid_step:.3f}, k={k}: " +
                      f"MSE={mse:.4f}, Recall@10={recall_10:.3f}, " +
                      f"Time={compression_time:.3f}s")
    
    # Save results
    output_file = output_dir / f"{dataset_id}_seed{seed}.json"
    output_file.parent.mkdir(parents=True, exist_ok=True)
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\nResults saved to: {output_file}")
    
    return results


def main():
    parser = argparse.ArgumentParser(
        description='Execute real-world validation of boundary-aware compression'
    )
    parser.add_argument(
        '--config',
        default='analysis/real_world_validation_config.json',
        help='Configuration file path'
    )
    parser.add_argument(
        '--datasets',
        default='all',
        help='Datasets to evaluate (all, synthetic, text, image, or comma-separated list)'
    )
    parser.add_argument(
        '--quick',
        action='store_true',
        help='Quick mode: fewer grid/k steps for faster testing'
    )
    parser.add_argument(
        '--output',
        default='results/real_world_validation',
        help='Output directory'
    )
    
    args = parser.parse_args()
    
    # Load configuration
    config_path = Path(args.config)
    if not config_path.exists():
        print(f"Error: Config file not found: {config_path}")
        return 1
    
    config = load_config(str(config_path))
    
    # Quick mode adjustments
    if args.quick:
        config['compression_configs']['grid_sweep']['steps'] = 5
        config['compression_configs']['k_sweep']['steps'] = 3
        config['execution']['runs_per_config'] = 1
        print("Quick mode enabled: reduced sweep steps")
    
    # Determine which datasets to run
    all_results = []
    output_dir = Path(args.output)
    
    # Run synthetic datasets (always available)
    if args.datasets in ['all', 'synthetic']:
        for dataset_id, dataset_config in config['datasets']['synthetic_validation'].items():
            if not dataset_config.get('enabled', True):
                continue
            
            for seed in config['execution']['random_seeds']:
                # Generate synthetic data
                embeddings, labels = generate_synthetic_embeddings(
                    dataset_config['generator'],
                    dataset_config,
                    seed
                )
                
                # Run evaluation
                results = run_evaluation_experiment(
                    dataset_id,
                    embeddings,
                    config,
                    seed,
                    output_dir
                )
                all_results.append(results)
    
    # Real-world datasets would require pre-computed embeddings
    if args.datasets in ['all', 'text', 'image']:
        print("\nNote: Real-world dataset evaluation requires pre-computed embeddings.")
        print("Please prepare embeddings using the appropriate models (SentenceBERT, CLIP, etc.)")
        print("See docs/REAL_WORLD_VALIDATION_REPORT.md for dataset setup instructions.")
    
    # Summary
    print(f"\n{'='*80}")
    print(f"Validation Complete")
    print(f"{'='*80}")
    print(f"Total experiments: {len(all_results)}")
    print(f"Output directory: {output_dir}")
    print(f"\nNext steps:")
    print(f"1. Review results in {output_dir}")
    print(f"2. Generate validation report: python analysis/generate_validation_report.py")
    print(f"3. Review docs/REAL_WORLD_VALIDATION_REPORT.md")
    
    return 0


if __name__ == '__main__':
    sys.exit(main())
