#!/usr/bin/env python3
"""
Boundary-Aware Compression Comparison Script

Compares baseline (lattice-hybrid) vs boundary-aware compression modes
to determine if boundary geometry is exploitable or purely observational.

Usage:
    python analysis/compare_boundary_aware.py --baseline baseline.json --boundary-aware boundary_aware.json
    python analysis/compare_boundary_aware.py --experiments experiments_dir/
"""

import json
import sys
import argparse
import numpy as np
import matplotlib.pyplot as plt
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from datetime import datetime


def load_experiment_result(path: str) -> Optional[Dict]:
    """Load experiment result from JSON file."""
    try:
        with open(path, 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading {path}: {e}")
        return None


def extract_metrics_by_grid(result: Dict) -> Dict[float, Dict[str, float]]:
    """
    Extract metrics grouped by grid parameter.
    Returns: {grid: {metric_name: value}}
    """
    grid_metrics = {}
    
    for point in result.get('points', []):
        grid = point.get('grid')
        if grid is None:
            continue
            
        metrics = point.get('metrics', {})
        
        if grid not in grid_metrics:
            grid_metrics[grid] = {
                'mse_global': [],
                'mse_boundary': [],
                'mse_bulk': [],
                'delta_boundary': [],
                'knn_overlap': [],
                'lsi': []
            }
        
        # Accumulate metrics across k values
        for metric in ['mse_global', 'mse_boundary', 'mse_bulk', 'delta_boundary', 'lsi']:
            if metric in metrics and metrics[metric] is not None and not np.isnan(metrics[metric]):
                grid_metrics[grid][metric].append(metrics[metric])
        
        # Handle neighborhoodOverlap as knn_overlap
        if 'neighborhoodOverlap' in metrics and metrics['neighborhoodOverlap'] is not None:
            grid_metrics[grid]['knn_overlap'].append(metrics['neighborhoodOverlap'])
    
    # Average across k values for each grid
    averaged_metrics = {}
    for grid, metrics in grid_metrics.items():
        averaged_metrics[grid] = {}
        for metric, values in metrics.items():
            if values:
                averaged_metrics[grid][metric] = np.mean(values)
            else:
                averaged_metrics[grid][metric] = np.nan
    
    return averaged_metrics


def compute_comparison_table(baseline_metrics: Dict, boundary_metrics: Dict) -> List[Dict]:
    """
    Compute comparison table for baseline vs boundary-aware.
    Returns list of rows with metrics for each grid value.
    """
    rows = []
    
    # Get all grid values (sorted)
    all_grids = sorted(set(list(baseline_metrics.keys()) + list(boundary_metrics.keys())))
    
    for grid in all_grids:
        base = baseline_metrics.get(grid, {})
        boundary = boundary_metrics.get(grid, {})
        
        row = {
            'grid': grid,
            'baseline_mse_global': base.get('mse_global', np.nan),
            'boundary_mse_global': boundary.get('mse_global', np.nan),
            'baseline_mse_boundary': base.get('mse_boundary', np.nan),
            'boundary_mse_boundary': boundary.get('mse_boundary', np.nan),
            'baseline_delta': base.get('delta_boundary', np.nan),
            'boundary_delta': boundary.get('delta_boundary', np.nan),
            'baseline_knn': base.get('knn_overlap', np.nan),
            'boundary_knn': boundary.get('knn_overlap', np.nan),
            'baseline_lsi': base.get('lsi', np.nan),
            'boundary_lsi': boundary.get('lsi', np.nan),
        }
        
        rows.append(row)
    
    return rows


def print_comparison_table(rows: List[Dict]):
    """Print formatted comparison table."""
    print("\n" + "="*120)
    print("BOUNDARY-AWARE COMPRESSION COMPARISON")
    print("="*120)
    print()
    print(f"{'Grid':<8} | {'Mode':<15} | {'Global MSE':<12} | {'Boundary MSE':<13} | {'Δ_boundary':<12} | {'k-NN Overlap':<12} | {'LSI':<8}")
    print("-" * 120)
    
    for row in rows:
        grid = row['grid']
        
        # Baseline row
        print(f"{grid:<8.4f} | {'Baseline':<15} | "
              f"{row['baseline_mse_global']:<12.6f} | "
              f"{row['baseline_mse_boundary']:<13.6f} | "
              f"{row['baseline_delta']:<12.6f} | "
              f"{row['baseline_knn']:<12.4f} | "
              f"{row['baseline_lsi']:<8.4f}")
        
        # Boundary-aware row
        improvement_marker = ""
        if not np.isnan(row['boundary_mse_global']) and not np.isnan(row['baseline_mse_global']):
            if row['boundary_mse_global'] < row['baseline_mse_global']:
                improvement_marker = " ✅"
        
        print(f"{'':<8} | {'Boundary-Aware':<15} | "
              f"{row['boundary_mse_global']:<12.6f} | "
              f"{row['boundary_mse_boundary']:<13.6f} | "
              f"{row['boundary_delta']:<12.6f} | "
              f"{row['boundary_knn']:<12.4f} | "
              f"{row['boundary_lsi']:<8.4f}{improvement_marker}")
        
        print("-" * 120)
    
    print()


# Verdict thresholds
MODERATE_IMPROVEMENT_THRESHOLD = 0.5  # 50% of cases
HIGH_IMPROVEMENT_THRESHOLD = 0.7       # 70% of cases

def compute_verdict(rows: List[Dict]) -> Dict:
    """
    Compute verdict: Is boundary geometry exploitable or observational only?
    
    Returns dict with verdict and supporting evidence.
    """
    verdict = {
        'exploitable': False,
        'confidence': 'low',
        'improvements': {},
        'summary': ''
    }
    
    # Count improvements across metrics
    improvements = {
        'mse_global': 0,
        'mse_boundary': 0,
        'delta_boundary': 0,
        'knn_overlap': 0,
        'lsi': 0
    }
    
    total_comparisons = 0
    
    for row in rows:
        # Compare MSE global (lower is better)
        if not np.isnan(row['baseline_mse_global']) and not np.isnan(row['boundary_mse_global']):
            total_comparisons += 1
            if row['boundary_mse_global'] < row['baseline_mse_global']:
                improvements['mse_global'] += 1
        
        # Compare boundary MSE (lower is better)
        if not np.isnan(row['baseline_mse_boundary']) and not np.isnan(row['boundary_mse_boundary']):
            if row['boundary_mse_boundary'] < row['baseline_mse_boundary']:
                improvements['mse_boundary'] += 1
        
        # Compare delta_boundary (smaller absolute value is better)
        if not np.isnan(row['baseline_delta']) and not np.isnan(row['boundary_delta']):
            if abs(row['boundary_delta']) < abs(row['baseline_delta']):
                improvements['delta_boundary'] += 1
        
        # Compare k-NN overlap (higher is better)
        if not np.isnan(row['baseline_knn']) and not np.isnan(row['boundary_knn']):
            if row['boundary_knn'] > row['baseline_knn']:
                improvements['knn_overlap'] += 1
        
        # Compare LSI (higher is better)
        if not np.isnan(row['baseline_lsi']) and not np.isnan(row['boundary_lsi']):
            if row['boundary_lsi'] > row['baseline_lsi']:
                improvements['lsi'] += 1
    
    # Determine verdict
    any_improvement = any(count > 0 for count in improvements.values())
    consistent_improvement = any(count >= total_comparisons * MODERATE_IMPROVEMENT_THRESHOLD for count in improvements.values())
    strong_improvement = any(count >= total_comparisons * HIGH_IMPROVEMENT_THRESHOLD for count in improvements.values())
    
    verdict['improvements'] = improvements
    verdict['total_comparisons'] = total_comparisons
    
    if strong_improvement:
        verdict['exploitable'] = True
        verdict['confidence'] = 'high'
        verdict['summary'] = f'Boundary-aware treatment shows consistent, measurable improvement (≥{int(HIGH_IMPROVEMENT_THRESHOLD*100)}% of cases)'
    elif consistent_improvement:
        verdict['exploitable'] = True
        verdict['confidence'] = 'moderate'
        verdict['summary'] = f'Boundary-aware treatment shows moderate improvement (≥{int(MODERATE_IMPROVEMENT_THRESHOLD*100)}% of cases)'
    elif any_improvement:
        verdict['exploitable'] = True
        verdict['confidence'] = 'low'
        verdict['summary'] = 'Boundary-aware treatment shows marginal improvement (some cases)'
    else:
        verdict['exploitable'] = False
        verdict['confidence'] = 'high'
        verdict['summary'] = 'No measurable improvement - boundary geometry is observational only'
    
    return verdict


def print_verdict(verdict: Dict):
    """Print verdict section."""
    print("\n" + "="*120)
    print("VERDICT: Is boundary geometry operational or cosmetic?")
    print("="*120)
    print()
    
    if verdict['exploitable']:
        print(f"✅ EXPLOITABLE (Confidence: {verdict['confidence'].upper()})")
    else:
        print(f"❌ OBSERVATIONAL ONLY (Confidence: {verdict['confidence'].upper()})")
    
    print()
    print(f"Summary: {verdict['summary']}")
    print()
    print("Evidence:")
    improvements = verdict['improvements']
    total = verdict.get('total_comparisons', 1)
    
    for metric, count in improvements.items():
        pct = (count / total * 100) if total > 0 else 0
        marker = "✓" if count > 0 else "✗"
        print(f"  {marker} {metric.replace('_', ' ').title()}: {count}/{total} improvements ({pct:.1f}%)")
    
    print()
    print("="*120)
    print()


def plot_comparison(rows: List[Dict], output_dir: Path):
    """Generate comparison plots."""
    output_dir.mkdir(parents=True, exist_ok=True)
    
    grids = [row['grid'] for row in rows]
    
    # Plot 1: MSE Comparison
    fig, axes = plt.subplots(2, 2, figsize=(14, 10))
    
    # Global MSE
    ax = axes[0, 0]
    ax.plot(grids, [row['baseline_mse_global'] for row in rows], 
            marker='o', label='Baseline', linewidth=2)
    ax.plot(grids, [row['boundary_mse_global'] for row in rows], 
            marker='s', label='Boundary-Aware', linewidth=2)
    ax.set_xlabel('Grid Step (compression parameter)')
    ax.set_ylabel('Global MSE')
    ax.set_title('Global MSE: Baseline vs Boundary-Aware')
    ax.legend()
    ax.grid(True, alpha=0.3)
    
    # Boundary MSE
    ax = axes[0, 1]
    ax.plot(grids, [row['baseline_mse_boundary'] for row in rows], 
            marker='o', label='Baseline', linewidth=2)
    ax.plot(grids, [row['boundary_mse_boundary'] for row in rows], 
            marker='s', label='Boundary-Aware', linewidth=2)
    ax.set_xlabel('Grid Step (compression parameter)')
    ax.set_ylabel('Boundary MSE')
    ax.set_title('Boundary MSE: Baseline vs Boundary-Aware')
    ax.legend()
    ax.grid(True, alpha=0.3)
    
    # Δ_boundary
    ax = axes[1, 0]
    ax.plot(grids, [row['baseline_delta'] for row in rows], 
            marker='o', label='Baseline', linewidth=2)
    ax.plot(grids, [row['boundary_delta'] for row in rows], 
            marker='s', label='Boundary-Aware', linewidth=2)
    ax.axhline(y=0, color='black', linestyle='--', alpha=0.3)
    ax.set_xlabel('Grid Step (compression parameter)')
    ax.set_ylabel('Δ_boundary (MSE_boundary - MSE_bulk)')
    ax.set_title('Δ_boundary: Baseline vs Boundary-Aware')
    ax.legend()
    ax.grid(True, alpha=0.3)
    
    # k-NN Overlap
    ax = axes[1, 1]
    ax.plot(grids, [row['baseline_knn'] for row in rows], 
            marker='o', label='Baseline', linewidth=2)
    ax.plot(grids, [row['boundary_knn'] for row in rows], 
            marker='s', label='Boundary-Aware', linewidth=2)
    ax.set_xlabel('Grid Step (compression parameter)')
    ax.set_ylabel('k-NN Overlap (Jaccard)')
    ax.set_title('k-NN Overlap: Baseline vs Boundary-Aware')
    ax.legend()
    ax.grid(True, alpha=0.3)
    
    plt.tight_layout()
    output_path = output_dir / 'boundary_aware_comparison.png'
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    print(f"Saved comparison plot to {output_path}")
    plt.close()
    
    # Plot 2: LSI Comparison
    fig, ax = plt.subplots(figsize=(10, 6))
    ax.plot(grids, [row['baseline_lsi'] for row in rows], 
            marker='o', label='Baseline (lattice-hybrid)', linewidth=2)
    ax.plot(grids, [row['boundary_lsi'] for row in rows], 
            marker='s', label='Boundary-Aware', linewidth=2)
    ax.set_xlabel('Grid Step (compression parameter)')
    ax.set_ylabel('LSI (Lattice Stability Index)')
    ax.set_title('LSI Comparison: Baseline vs Boundary-Aware')
    ax.legend()
    ax.grid(True, alpha=0.3)
    
    plt.tight_layout()
    output_path = output_dir / 'lsi_comparison.png'
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    print(f"Saved LSI comparison plot to {output_path}")
    plt.close()


def save_comparison_report(rows: List[Dict], verdict: Dict, output_dir: Path):
    """Save comparison report as JSON."""
    report = {
        'timestamp': datetime.now().isoformat(),
        'verdict': verdict,
        'comparison_data': rows
    }
    
    output_path = output_dir / 'boundary_aware_report.json'
    with open(output_path, 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f"Saved report to {output_path}")


def main():
    parser = argparse.ArgumentParser(
        description='Compare baseline vs boundary-aware compression'
    )
    parser.add_argument(
        '--baseline',
        help='Path to baseline experiment result JSON'
    )
    parser.add_argument(
        '--boundary-aware',
        help='Path to boundary-aware experiment result JSON'
    )
    parser.add_argument(
        '--experiments',
        help='Directory containing both experiments (auto-detect files)'
    )
    parser.add_argument(
        '--output-dir',
        default='results/boundary_aware_comparison',
        help='Output directory for plots and reports'
    )
    
    args = parser.parse_args()
    
    # Load experiments
    baseline_result = None
    boundary_result = None
    
    if args.experiments:
        # Auto-detect files in directory
        exp_dir = Path(args.experiments)
        if not exp_dir.exists():
            print(f"Error: Directory {exp_dir} does not exist")
            return 1
        
        # Look for baseline and boundary-aware results
        for file in exp_dir.glob('*.json'):
            result = load_experiment_result(str(file))
            if result:
                strategy = result.get('metadata', {}).get('strategy', '')
                if strategy == 'lattice-hybrid' or 'baseline' in file.name.lower():
                    baseline_result = result
                    print(f"Found baseline: {file}")
                elif strategy == 'boundary-aware' or 'boundary' in file.name.lower():
                    boundary_result = result
                    print(f"Found boundary-aware: {file}")
    else:
        if not args.baseline or not args.boundary_aware:
            print("Error: Must provide either --experiments or both --baseline and --boundary-aware")
            return 1
        
        baseline_result = load_experiment_result(args.baseline)
        boundary_result = load_experiment_result(args.boundary_aware)
    
    if not baseline_result:
        print("Error: Could not load baseline experiment")
        return 1
    
    if not boundary_result:
        print("Error: Could not load boundary-aware experiment")
        return 1
    
    # Extract metrics
    print("\nExtracting metrics...")
    baseline_metrics = extract_metrics_by_grid(baseline_result)
    boundary_metrics = extract_metrics_by_grid(boundary_result)
    
    # Compute comparison
    print("Computing comparison...")
    rows = compute_comparison_table(baseline_metrics, boundary_metrics)
    
    # Print table
    print_comparison_table(rows)
    
    # Compute and print verdict
    verdict = compute_verdict(rows)
    print_verdict(verdict)
    
    # Generate plots
    output_dir = Path(args.output_dir)
    print(f"\nGenerating plots in {output_dir}...")
    plot_comparison(rows, output_dir)
    
    # Save report
    save_comparison_report(rows, verdict, output_dir)
    
    print("\nComparison complete!")
    
    return 0


if __name__ == '__main__':
    sys.exit(main())
