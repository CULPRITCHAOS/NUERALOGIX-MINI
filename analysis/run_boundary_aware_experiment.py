#!/usr/bin/env python3
"""
Run Boundary-Aware Experiment

This script generates synthetic data and runs both baseline and boundary-aware
compression experiments for direct comparison.

Usage:
    python analysis/run_boundary_aware_experiment.py --dataset synthetic_clusters --output results/boundary_comparison
    python analysis/run_boundary_aware_experiment.py --dataset all
"""

import json
import sys
import argparse
import numpy as np
from pathlib import Path
from typing import Dict, List
from datetime import datetime


def generate_synthetic_dataset(generator: str, params: Dict, seed: int) -> List[Dict]:
    """
    Generate synthetic dataset embeddings.
    """
    np.random.seed(seed)
    
    num_points = params.get('numPoints', 500)
    dimension = params.get('dimension', 8)
    noise = params.get('noise', 0.0)
    
    embeddings = []
    
    if generator == 'ring':
        radius = params.get('radius', 1.0)
        for i in range(num_points):
            angle = (2 * np.pi * i) / num_points
            embedding = np.zeros(dimension)
            embedding[0] = radius * np.cos(angle)
            embedding[1] = radius * np.sin(angle)
            if noise > 0:
                embedding += np.random.randn(dimension) * noise
            embeddings.append({
                'item': f'ring_{i}',
                'embedding': embedding.tolist()
            })
    
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
            embeddings.append({
                'item': f'swissroll_{i}',
                'embedding': embedding.tolist()
            })
    
    elif generator == 'clusters':
        num_clusters = params.get('numClusters', 5)
        spread = params.get('spread', 0.5)
        points_per_cluster = num_points // num_clusters
        
        # Generate cluster centers spread out in space
        centers = np.random.rand(num_clusters, dimension) * 4 - 2
        
        for c in range(num_clusters):
            for i in range(points_per_cluster):
                embedding = centers[c] + np.random.randn(dimension) * spread
                embeddings.append({
                    'item': f'cluster{c}_{i}',
                    'embedding': embedding.tolist()
                })
    
    else:
        raise ValueError(f"Unknown generator: {generator}")
    
    return embeddings


def create_experiment_config(
    experiment_id: str,
    name: str,
    strategy: str,
    grid_range: Dict,
    k_range: Dict
) -> Dict:
    """Create experiment configuration."""
    return {
        'id': experiment_id,
        'name': name,
        'description': f'{strategy} compression experiment',
        'embeddingModel': 'synthetic',
        'datasetType': 'synthetic',
        'compressionStrategy': strategy,
        'gridRange': grid_range,
        'kRange': k_range,
        'metrics': [
            'lsi',
            'mse_global',
            'mse_boundary',
            'mse_bulk',
            'delta_boundary',
            'neighborhoodOverlap'
        ],
        'detectBoundaries': False,
        'detectRidge': False
    }


def save_embeddings_and_config(
    embeddings: List[Dict],
    config: Dict,
    output_dir: Path,
    name: str
):
    """Save embeddings and experiment configuration."""
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Save embeddings
    embeddings_path = output_dir / f'{name}_embeddings.json'
    with open(embeddings_path, 'w') as f:
        json.dump(embeddings, f, indent=2)
    
    # Save config
    config_path = output_dir / f'{name}_config.json'
    with open(config_path, 'w') as f:
        json.dump(config, f, indent=2)
    
    print(f"Saved {name} embeddings to {embeddings_path}")
    print(f"Saved {name} config to {config_path}")
    
    return embeddings_path, config_path


def print_instructions(baseline_config_path: Path, boundary_config_path: Path):
    """Print instructions for running experiments in TypeScript."""
    print("\n" + "="*80)
    print("NEXT STEPS: Run Experiments in TypeScript Environment")
    print("="*80)
    print()
    print("The experiment configurations and embeddings have been prepared.")
    print("To run the comparison, you need to execute the experiments using the")
    print("TypeScript experiment runner.")
    print()
    print("If you have a TypeScript/Node.js experiment runner, use:")
    print(f"  - Baseline config: {baseline_config_path}")
    print(f"  - Boundary-aware config: {boundary_config_path}")
    print()
    print("After running both experiments, use:")
    print("  python analysis/compare_boundary_aware.py --experiments <output_dir>")
    print()
    print("="*80)
    print()


def main():
    parser = argparse.ArgumentParser(
        description='Run boundary-aware compression experiment'
    )
    parser.add_argument(
        '--dataset',
        default='synthetic_clusters',
        choices=['synthetic_clusters', 'synthetic_rings', 'synthetic_swiss_roll', 'all'],
        help='Dataset to use for experiment'
    )
    parser.add_argument(
        '--output',
        default='results/boundary_aware_experiment',
        help='Output directory'
    )
    parser.add_argument(
        '--seed',
        type=int,
        default=42,
        help='Random seed'
    )
    parser.add_argument(
        '--num-points',
        type=int,
        default=500,
        help='Number of points in synthetic dataset'
    )
    
    args = parser.parse_args()
    
    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Define datasets
    datasets = {
        'synthetic_clusters': {
            'generator': 'clusters',
            'params': {
                'numPoints': args.num_points,
                'dimension': 8,
                'numClusters': 5,
                'spread': 0.5,
                'noise': 0.05
            }
        },
        'synthetic_rings': {
            'generator': 'ring',
            'params': {
                'numPoints': args.num_points,
                'dimension': 8,
                'radius': 1.0,
                'noise': 0.05
            }
        },
        'synthetic_swiss_roll': {
            'generator': 'swiss-roll',
            'params': {
                'numPoints': args.num_points,
                'dimension': 8,
                'turns': 1.5,
                'noise': 0.05
            }
        }
    }
    
    # Select datasets to run
    if args.dataset == 'all':
        datasets_to_run = datasets
    else:
        datasets_to_run = {args.dataset: datasets[args.dataset]}
    
    # Experiment parameters
    grid_range = {'min': 0.01, 'max': 0.5, 'steps': 15}
    k_range = {'min': 3, 'max': 15, 'steps': 5}
    
    for dataset_name, dataset_config in datasets_to_run.items():
        print(f"\n{'='*80}")
        print(f"Preparing experiment: {dataset_name}")
        print(f"{'='*80}\n")
        
        # Generate synthetic data
        print(f"Generating {dataset_config['params']['numPoints']} points...")
        embeddings = generate_synthetic_dataset(
            dataset_config['generator'],
            dataset_config['params'],
            args.seed
        )
        
        dataset_output_dir = output_dir / dataset_name
        dataset_output_dir.mkdir(parents=True, exist_ok=True)
        
        # Create baseline experiment config
        baseline_config = create_experiment_config(
            f'baseline_{dataset_name}',
            f'Baseline - {dataset_name}',
            'lattice-hybrid',
            grid_range,
            k_range
        )
        
        # Create boundary-aware experiment config
        boundary_config = create_experiment_config(
            f'boundary_aware_{dataset_name}',
            f'Boundary-Aware - {dataset_name}',
            'boundary-aware',
            grid_range,
            k_range
        )
        
        # Save both
        baseline_emb_path, baseline_cfg_path = save_embeddings_and_config(
            embeddings, baseline_config, dataset_output_dir, 'baseline'
        )
        
        boundary_emb_path, boundary_cfg_path = save_embeddings_and_config(
            embeddings, boundary_config, dataset_output_dir, 'boundary_aware'
        )
        
        print(f"\n✓ Prepared {dataset_name} experiment")
        print(f"  Output directory: {dataset_output_dir}")
    
    print(f"\n{'='*80}")
    print("Experiment preparation complete!")
    print(f"{'='*80}\n")
    print(f"Output directory: {output_dir}")
    print()
    print("Note: This script prepares the experiment configurations.")
    print("You will need to run the actual compression experiments using the")
    print("TypeScript experiment runner with the generated configs and embeddings.")
    
    return 0


if __name__ == '__main__':
    sys.exit(main())
