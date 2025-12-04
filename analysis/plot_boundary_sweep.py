#!/usr/bin/env python3
"""
Boundary Geometry Sweep Analysis Script

This script analyzes boundary vs bulk MSE metrics from compression experiments.
It loads the exported experiment results (JSON format) and generates plots showing:
- Δ_boundary (delta_boundary) vs grid parameter
- MSE_global vs grid parameter
- Comparison across different datasets/modalities

The key signal we're looking for is whether boundary vectors degrade earlier
than bulk vectors as compression increases.

Usage:
    python analysis/plot_boundary_sweep.py <experiment_result.json>
    python analysis/plot_boundary_sweep.py path/to/experiment_results.json --output-dir plots
"""

import json
import sys
import argparse
import numpy as np
import matplotlib.pyplot as plt
from pathlib import Path
from typing import Dict, List, Tuple, Optional


def load_experiment_data(filepath: str) -> Dict:
    """Load experiment result from JSON file."""
    with open(filepath, 'r') as f:
        return json.load(f)


def extract_boundary_metrics(data: Dict) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """
    Extract boundary metrics from experiment data.
    
    Returns:
        Tuple of (grid, k, mse_global, mse_boundary, mse_bulk, delta_boundary)
    """
    points = data.get('points', [])
    
    grid_values = []
    k_values = []
    mse_global = []
    mse_boundary = []
    mse_bulk = []
    delta_boundary = []
    
    for point in points:
        metrics = point.get('metrics', {})
        
        # Only include points that have boundary metrics
        if 'delta_boundary' not in metrics:
            continue
            
        grid_values.append(point.get('grid', 0))
        k_values.append(point.get('k', 0))
        mse_global.append(metrics.get('mse_global', np.nan))
        mse_boundary.append(metrics.get('mse_boundary', np.nan))
        mse_bulk.append(metrics.get('mse_bulk', np.nan))
        delta_boundary.append(metrics.get('delta_boundary', np.nan))
    
    return (
        np.array(grid_values),
        np.array(k_values),
        np.array(mse_global),
        np.array(mse_boundary),
        np.array(mse_bulk),
        np.array(delta_boundary)
    )


def plot_delta_boundary_vs_grid(
    grid: np.ndarray,
    delta_boundary: np.ndarray,
    k_values: np.ndarray,
    metadata: Dict,
    output_path: Optional[str] = None
):
    """
    Plot Δ_boundary vs grid parameter.
    
    If multiple k values exist, plot separate lines for each k.
    """
    plt.figure(figsize=(10, 6))
    
    # Get unique k values
    unique_k = np.unique(k_values)
    
    if len(unique_k) == 1:
        # Single k value - simple line plot
        plt.plot(grid, delta_boundary, marker='o', linewidth=2, markersize=6)
        plt.title(f'Δ_boundary vs Grid Step (k={unique_k[0]})')
    else:
        # Multiple k values - plot one line per k
        for k in unique_k:
            mask = k_values == k
            plt.plot(
                grid[mask],
                delta_boundary[mask],
                marker='o',
                label=f'k={int(k)}',
                linewidth=2,
                markersize=6
            )
        plt.legend()
        plt.title('Δ_boundary vs Grid Step (Multiple k values)')
    
    plt.xlabel('Grid Step (compression parameter)')
    plt.ylabel('Δ_boundary = MSE_boundary - MSE_bulk')
    plt.grid(True, alpha=0.3)
    
    # Add zero line for reference
    plt.axhline(y=0, color='black', linestyle='--', alpha=0.3, linewidth=1)
    
    # Add metadata as text
    dataset_type = metadata.get('datasetType', 'unknown')
    strategy = metadata.get('strategy', 'unknown')
    plt.text(
        0.02, 0.98,
        f'Dataset: {dataset_type}\nStrategy: {strategy}',
        transform=plt.gca().transAxes,
        verticalalignment='top',
        fontsize=9,
        bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.3)
    )
    
    plt.tight_layout()
    
    if output_path:
        plt.savefig(output_path, dpi=150, bbox_inches='tight')
        print(f"Saved plot to {output_path}")
    else:
        plt.show()
    
    plt.close()


def plot_mse_comparison(
    grid: np.ndarray,
    mse_global: np.ndarray,
    mse_boundary: np.ndarray,
    mse_bulk: np.ndarray,
    k_values: np.ndarray,
    metadata: Dict,
    output_path: Optional[str] = None
):
    """
    Plot MSE comparison showing global, boundary, and bulk MSE.
    """
    plt.figure(figsize=(12, 6))
    
    # Get unique k values
    unique_k = np.unique(k_values)
    
    # For simplicity, plot the average across k values if there are multiple
    if len(unique_k) > 1:
        # Average metrics across k for each grid value
        unique_grid = np.unique(grid)
        avg_global = []
        avg_boundary = []
        avg_bulk = []
        
        for g in unique_grid:
            mask = grid == g
            avg_global.append(np.nanmean(mse_global[mask]))
            avg_boundary.append(np.nanmean(mse_boundary[mask]))
            avg_bulk.append(np.nanmean(mse_bulk[mask]))
        
        grid_plot = unique_grid
        global_plot = np.array(avg_global)
        boundary_plot = np.array(avg_boundary)
        bulk_plot = np.array(avg_bulk)
    else:
        grid_plot = grid
        global_plot = mse_global
        boundary_plot = mse_boundary
        bulk_plot = mse_bulk
    
    plt.plot(grid_plot, global_plot, marker='o', label='MSE Global', linewidth=2, markersize=6)
    plt.plot(grid_plot, boundary_plot, marker='s', label='MSE Boundary', linewidth=2, markersize=6)
    plt.plot(grid_plot, bulk_plot, marker='^', label='MSE Bulk', linewidth=2, markersize=6)
    
    plt.xlabel('Grid Step (compression parameter)')
    plt.ylabel('Mean Squared Error')
    plt.title('MSE Comparison: Global vs Boundary vs Bulk')
    plt.legend()
    plt.grid(True, alpha=0.3)
    
    # Add metadata
    dataset_type = metadata.get('datasetType', 'unknown')
    strategy = metadata.get('strategy', 'unknown')
    plt.text(
        0.02, 0.98,
        f'Dataset: {dataset_type}\nStrategy: {strategy}',
        transform=plt.gca().transAxes,
        verticalalignment='top',
        fontsize=9,
        bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.3)
    )
    
    plt.tight_layout()
    
    if output_path:
        plt.savefig(output_path, dpi=150, bbox_inches='tight')
        print(f"Saved plot to {output_path}")
    else:
        plt.show()
    
    plt.close()


def print_summary(
    grid: np.ndarray,
    delta_boundary: np.ndarray,
    mse_global: np.ndarray,
    metadata: Dict
):
    """Print textual summary of boundary geometry analysis."""
    print("\n" + "="*70)
    print("BOUNDARY GEOMETRY ANALYSIS SUMMARY")
    print("="*70)
    
    print(f"\nExperiment: {metadata.get('name', 'Unknown')}")
    print(f"Dataset Type: {metadata.get('datasetType', 'Unknown')}")
    print(f"Strategy: {metadata.get('strategy', 'Unknown')}")
    print(f"Sample Size: {metadata.get('sampleSize', 'Unknown')}")
    
    # Filter out NaN values
    valid_mask = ~np.isnan(delta_boundary)
    valid_delta = delta_boundary[valid_mask]
    valid_grid = grid[valid_mask]
    
    if len(valid_delta) == 0:
        print("\nNo valid delta_boundary data found.")
        return
    
    print(f"\nGrid Range: {valid_grid.min():.4f} to {valid_grid.max():.4f}")
    print(f"\nΔ_boundary Statistics:")
    print(f"  Min:    {valid_delta.min():.6f}")
    print(f"  Max:    {valid_delta.max():.6f}")
    print(f"  Mean:   {valid_delta.mean():.6f}")
    print(f"  Median: {np.median(valid_delta):.6f}")
    
    # Find where delta_boundary becomes positive (if it does)
    positive_mask = valid_delta > 0
    if np.any(positive_mask):
        first_positive_idx = np.where(positive_mask)[0][0]
        print(f"\nΔ_boundary becomes positive at grid = {valid_grid[first_positive_idx]:.4f}")
        print("  (This suggests boundary vectors degrade more than bulk at this point)")
    else:
        print("\nΔ_boundary remains non-positive throughout the sweep")
        print("  (Boundary vectors do not degrade more than bulk)")
    
    # Look for sharp increases (heuristic: derivative exceeds threshold)
    if len(valid_delta) > 2:
        # Compute finite differences
        delta_diff = np.diff(valid_delta)
        grid_diff = np.diff(valid_grid)
        derivatives = delta_diff / (grid_diff + 1e-10)
        
        # Find where derivative is significantly large (heuristic: > 2 * median)
        threshold = 2 * np.abs(np.median(derivatives))
        sharp_increases = derivatives > threshold
        
        if np.any(sharp_increases):
            sharp_idx = np.where(sharp_increases)[0][0]
            print(f"\nSharp increase detected at grid ≈ {valid_grid[sharp_idx]:.4f}")
            print(f"  (Derivative: {derivatives[sharp_idx]:.6f})")
        else:
            print("\nNo sharp increases in Δ_boundary detected")
    
    # MSE global statistics
    valid_mse_mask = ~np.isnan(mse_global)
    if np.any(valid_mse_mask):
        valid_mse = mse_global[valid_mse_mask]
        print(f"\nMSE Global Statistics:")
        print(f"  Min:  {valid_mse.min():.6f}")
        print(f"  Max:  {valid_mse.max():.6f}")
        print(f"  Mean: {valid_mse.mean():.6f}")
    
    print("\n" + "="*70 + "\n")


def main():
    parser = argparse.ArgumentParser(
        description='Analyze and plot boundary geometry sweep results'
    )
    parser.add_argument(
        'input_file',
        help='Path to experiment result JSON file'
    )
    parser.add_argument(
        '--output-dir',
        default='plots',
        help='Directory to save plots (default: plots)'
    )
    
    args = parser.parse_args()
    
    # Load data
    print(f"Loading experiment data from {args.input_file}...")
    data = load_experiment_data(args.input_file)
    metadata = data.get('metadata', {})
    
    # Extract boundary metrics
    grid, k_values, mse_global, mse_boundary, mse_bulk, delta_boundary = extract_boundary_metrics(data)
    
    if len(grid) == 0:
        print("Error: No boundary metrics found in the experiment data.")
        print("Make sure the experiment included boundary metrics:")
        print("  ['mse_global', 'mse_boundary', 'mse_bulk', 'delta_boundary']")
        return 1
    
    print(f"Loaded {len(grid)} data points")
    
    # Create output directory
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate output filenames
    experiment_id = metadata.get('experimentId', 'unknown')
    dataset_type = metadata.get('datasetType', 'unknown')
    
    delta_plot_path = output_dir / f"boundary_sweep_delta_{experiment_id}_{dataset_type}.png"
    mse_plot_path = output_dir / f"boundary_sweep_mse_{experiment_id}_{dataset_type}.png"
    
    # Generate plots
    print("\nGenerating plots...")
    plot_delta_boundary_vs_grid(grid, delta_boundary, k_values, metadata, str(delta_plot_path))
    plot_mse_comparison(grid, mse_global, mse_boundary, mse_bulk, k_values, metadata, str(mse_plot_path))
    
    # Print summary
    print_summary(grid, delta_boundary, mse_global, metadata)
    
    print("Analysis complete!")
    return 0


if __name__ == '__main__':
    sys.exit(main())
