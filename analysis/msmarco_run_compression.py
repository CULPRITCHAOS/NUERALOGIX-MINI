#!/usr/bin/env python3
"""
MS MARCO Compression Script

Runs baseline and boundary-aware compression on MS MARCO passage embeddings.

NO SIMULATION. REAL COMPRESSION.
- Loads real embeddings from msmarco_embed.py
- Applies baseline (lattice-hybrid) compression
- Applies boundary-aware compression
- Measures compression time
- Saves compressed representations

Usage:
    python analysis/msmarco_run_compression.py
    python analysis/msmarco_run_compression.py --grid 0.1 --k 10
"""

import json
import sys
import argparse
import numpy as np
from pathlib import Path
from typing import List, Tuple, Dict
import time

try:
    from sklearn.cluster import KMeans
    from tqdm import tqdm
except ImportError as e:
    print(f"ERROR: Required library not installed: {e}")
    print("Install dependencies with: pip install scikit-learn tqdm numpy")
    sys.exit(1)


def snap_to_grid(vectors: np.ndarray, step: float) -> np.ndarray:
    """Snap vectors to grid with given step size."""
    return np.round(vectors / step) * step


def run_kmeans(vectors: np.ndarray, k: int, random_state: int = 42) -> Tuple[np.ndarray, np.ndarray]:
    """
    Run KMeans clustering on vectors.
    
    Args:
        vectors: (n_samples, n_features) array
        k: number of clusters
        random_state: random seed
    
    Returns:
        compressed: compressed vectors (cluster centroids)
        centroids: cluster centroids
    """
    if k <= 0:
        k = 1
    if len(vectors) <= k:
        return vectors, vectors
    
    kmeans = KMeans(n_clusters=k, random_state=random_state, n_init=10)
    kmeans.fit(vectors)
    
    # Assign each vector to its closest centroid
    compressed = kmeans.cluster_centers_[kmeans.labels_]
    centroids = kmeans.cluster_centers_
    
    return compressed, centroids


def extract_unique_vectors(vectors: np.ndarray, tolerance: float = 1e-9) -> np.ndarray:
    """Extract unique vectors from array."""
    # Use numpy unique with tolerance for floating point comparison
    # Round to avoid floating point issues
    rounded = np.round(vectors / tolerance) * tolerance
    unique_vectors = np.unique(rounded, axis=0)
    return unique_vectors


def classify_boundary_vectors(vectors: np.ndarray, centroids: np.ndarray, percentile: float = 10.0) -> np.ndarray:
    """
    Classify vectors as boundary based on ambiguity scores.
    
    Args:
        vectors: (n_samples, n_features) array
        centroids: (n_clusters, n_features) array
        percentile: percentile threshold for boundary classification
    
    Returns:
        boundary_indices: boolean array indicating boundary vectors
    """
    if len(centroids) < 2:
        return np.zeros(len(vectors), dtype=bool)
    
    # Compute distances to all centroids for each vector
    # distances[i, j] = distance from vector i to centroid j
    distances = np.linalg.norm(vectors[:, None, :] - centroids[None, :, :], axis=2)
    
    # Sort distances for each vector
    sorted_distances = np.sort(distances, axis=1)
    
    # Compute ambiguity scores: xi = d2 - d1
    d1 = sorted_distances[:, 0]  # nearest centroid
    d2 = sorted_distances[:, 1] if sorted_distances.shape[1] > 1 else d1  # 2nd nearest
    ambiguity_scores = d2 - d1
    
    # Find threshold at given percentile
    threshold = np.percentile(ambiguity_scores, percentile)
    
    # Boundary vectors are those with ambiguity <= threshold
    boundary_mask = ambiguity_scores <= threshold
    
    return boundary_mask


def compress_baseline(vectors: np.ndarray, grid: float, k: int, random_state: int = 42) -> Tuple[np.ndarray, Dict]:
    """
    Baseline compression: lattice-hybrid (kmeans + grid).
    
    Args:
        vectors: (n_samples, n_features) array
        grid: grid step size
        k: number of clusters
        random_state: random seed
    
    Returns:
        compressed: compressed vectors
        info: compression info dict
    """
    start_time = time.time()
    
    # 1. Run KMeans to get initial centroids
    _, ideal_centroids = run_kmeans(vectors, k, random_state)
    
    # 2. Snap centroids to grid
    snapped_centroids = snap_to_grid(ideal_centroids, grid)
    unique_snapped_centroids = extract_unique_vectors(snapped_centroids)
    
    # 3. Assign each vector to closest snapped centroid
    distances = np.linalg.norm(vectors[:, None, :] - unique_snapped_centroids[None, :, :], axis=2)
    assignments = np.argmin(distances, axis=1)
    compressed = unique_snapped_centroids[assignments]
    
    compression_time = time.time() - start_time
    
    info = {
        'mode': 'baseline',
        'grid': float(grid),
        'k': int(k),
        'num_unique_centroids': int(len(unique_snapped_centroids)),
        'compression_time_seconds': float(compression_time)
    }
    
    return compressed, info


def compress_boundary_aware(vectors: np.ndarray, grid: float, k: int, random_state: int = 42) -> Tuple[np.ndarray, Dict]:
    """
    Boundary-aware compression: differential treatment for boundary vs bulk.
    
    Args:
        vectors: (n_samples, n_features) array
        grid: grid step size for bulk vectors
        k: number of clusters
        random_state: random seed
    
    Returns:
        compressed: compressed vectors
        info: compression info dict
    """
    start_time = time.time()
    
    boundary_step = grid * 0.5  # Finer grid for boundary vectors
    
    # 1. Run KMeans to get initial centroids
    _, ideal_centroids = run_kmeans(vectors, k, random_state)
    
    # 2. Classify boundary vectors
    boundary_mask = classify_boundary_vectors(vectors, ideal_centroids, percentile=10.0)
    num_boundary = np.sum(boundary_mask)
    
    # 3. Create two sets of centroids: coarse for bulk, fine for boundary
    snapped_centroids_bulk = snap_to_grid(ideal_centroids, grid)
    unique_bulk_centroids = extract_unique_vectors(snapped_centroids_bulk)
    
    snapped_centroids_boundary = snap_to_grid(ideal_centroids, boundary_step)
    unique_boundary_centroids = extract_unique_vectors(snapped_centroids_boundary)
    
    # 4. Compress vectors: use appropriate centroids based on classification
    compressed = np.zeros_like(vectors)
    
    # Compress bulk vectors
    bulk_mask = ~boundary_mask
    if np.sum(bulk_mask) > 0:
        bulk_vectors = vectors[bulk_mask]
        distances = np.linalg.norm(bulk_vectors[:, None, :] - unique_bulk_centroids[None, :, :], axis=2)
        assignments = np.argmin(distances, axis=1)
        compressed[bulk_mask] = unique_bulk_centroids[assignments]
    
    # Compress boundary vectors
    if np.sum(boundary_mask) > 0:
        boundary_vectors = vectors[boundary_mask]
        distances = np.linalg.norm(boundary_vectors[:, None, :] - unique_boundary_centroids[None, :, :], axis=2)
        assignments = np.argmin(distances, axis=1)
        compressed[boundary_mask] = unique_boundary_centroids[assignments]
    
    compression_time = time.time() - start_time
    
    # Combine all unique centroids
    all_centroids = np.vstack([unique_bulk_centroids, unique_boundary_centroids])
    unique_all_centroids = extract_unique_vectors(all_centroids)
    
    info = {
        'mode': 'boundary-aware',
        'grid': float(grid),
        'k': int(k),
        'boundary_step': float(boundary_step),
        'num_boundary_vectors': int(num_boundary),
        'num_bulk_vectors': int(np.sum(bulk_mask)),
        'num_unique_centroids': int(len(unique_all_centroids)),
        'compression_time_seconds': float(compression_time)
    }
    
    return compressed, info


def save_compressed_embeddings(compressed: np.ndarray, info: Dict, output_dir: Path):
    """Save compressed embeddings and metadata."""
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Save compressed embeddings
    compressed_path = output_dir / 'compressed_passages.npy'
    np.save(compressed_path, compressed)
    
    # Save info
    info_path = output_dir / 'compression_info.json'
    with open(info_path, 'w') as f:
        json.dump(info, f, indent=2)
    
    print(f"✓ Saved compressed embeddings to {compressed_path}")
    print(f"✓ Saved compression info to {info_path}")


def main():
    parser = argparse.ArgumentParser(
        description='Run compression on MS MARCO embeddings'
    )
    parser.add_argument(
        '--input-dir',
        default='data/msmarco_subset',
        help='Input directory containing embeddings'
    )
    parser.add_argument(
        '--output-dir',
        default='results/msmarco',
        help='Output directory for compressed embeddings'
    )
    parser.add_argument(
        '--grid',
        type=float,
        default=0.1,
        help='Grid step size for compression (default: 0.1)'
    )
    parser.add_argument(
        '--k',
        type=int,
        default=10,
        help='Number of clusters for k-means (default: 10)'
    )
    parser.add_argument(
        '--seed',
        type=int,
        default=42,
        help='Random seed (default: 42)'
    )
    
    args = parser.parse_args()
    
    input_dir = Path(args.input_dir)
    output_dir = Path(args.output_dir)
    
    print("="*80)
    print("MS MARCO COMPRESSION")
    print("="*80)
    print(f"\nConfiguration:")
    print(f"  - Input: {input_dir}")
    print(f"  - Output: {output_dir}")
    print(f"  - Grid step: {args.grid}")
    print(f"  - K clusters: {args.k}")
    print(f"  - Seed: {args.seed}")
    print("\nNO SIMULATION. REAL COMPRESSION.")
    print("="*80)
    
    try:
        # Load embeddings
        embeddings_path = input_dir / 'passages_embeddings.npy'
        if not embeddings_path.exists():
            raise FileNotFoundError(f"Embeddings not found: {embeddings_path}")
        
        print(f"\nLoading embeddings from {embeddings_path}...")
        embeddings = np.load(embeddings_path)
        print(f"✓ Loaded embeddings: shape {embeddings.shape}")
        
        # Run baseline compression
        print("\n" + "="*80)
        print("BASELINE COMPRESSION (lattice-hybrid)")
        print("="*80)
        compressed_baseline, info_baseline = compress_baseline(
            embeddings, args.grid, args.k, args.seed
        )
        print(f"✓ Baseline compression complete")
        print(f"  - Time: {info_baseline['compression_time_seconds']:.3f} seconds")
        print(f"  - Unique centroids: {info_baseline['num_unique_centroids']}")
        
        # Save baseline
        baseline_dir = output_dir / 'baseline'
        save_compressed_embeddings(compressed_baseline, info_baseline, baseline_dir)
        
        # Run boundary-aware compression
        print("\n" + "="*80)
        print("BOUNDARY-AWARE COMPRESSION")
        print("="*80)
        compressed_boundary, info_boundary = compress_boundary_aware(
            embeddings, args.grid, args.k, args.seed
        )
        print(f"✓ Boundary-aware compression complete")
        print(f"  - Time: {info_boundary['compression_time_seconds']:.3f} seconds")
        print(f"  - Unique centroids: {info_boundary['num_unique_centroids']}")
        print(f"  - Boundary vectors: {info_boundary['num_boundary_vectors']}")
        print(f"  - Bulk vectors: {info_boundary['num_bulk_vectors']}")
        
        # Save boundary-aware
        boundary_dir = output_dir / 'boundary'
        save_compressed_embeddings(compressed_boundary, info_boundary, boundary_dir)
        
        # Save run configuration
        run_config = {
            'grid': float(args.grid),
            'k': int(args.k),
            'seed': int(args.seed),
            'num_passages': int(embeddings.shape[0]),
            'embedding_dim': int(embeddings.shape[1]),
            'baseline': info_baseline,
            'boundary': info_boundary
        }
        
        config_path = output_dir / 'run_config.json'
        with open(config_path, 'w') as f:
            json.dump(run_config, f, indent=2)
        print(f"\n✓ Saved run configuration to {config_path}")
        
        print("\n" + "="*80)
        print("SUCCESS: Compression complete")
        print("="*80)
        print(f"\nOutput directories:")
        print(f"  - Baseline: {baseline_dir}")
        print(f"  - Boundary-aware: {boundary_dir}")
        print(f"\nCompression overhead:")
        overhead = info_boundary['compression_time_seconds'] - info_baseline['compression_time_seconds']
        overhead_pct = (overhead / info_baseline['compression_time_seconds']) * 100 if info_baseline['compression_time_seconds'] > 0 else 0
        print(f"  - Baseline: {info_baseline['compression_time_seconds']:.3f}s")
        print(f"  - Boundary-aware: {info_boundary['compression_time_seconds']:.3f}s")
        print(f"  - Overhead: {overhead:.3f}s ({overhead_pct:.1f}%)")
        
        return 0
        
    except Exception as e:
        print("\n" + "="*80)
        print("FAILURE: Could not run compression")
        print("="*80)
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
        
        return 1


if __name__ == '__main__':
    sys.exit(main())
