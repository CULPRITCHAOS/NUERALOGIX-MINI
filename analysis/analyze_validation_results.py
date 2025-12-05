#!/usr/bin/env python3
"""
Analyze Real-World Validation Results

This script analyzes the validation results and generates a preliminary
verdict based on the data.

Usage:
    python analysis/analyze_validation_results.py --results results/real_world_validation
"""

import json
import sys
import argparse
import numpy as np
from pathlib import Path
from typing import Dict, List
from collections import defaultdict


def load_results(results_dir: Path) -> List[Dict]:
    """Load all JSON result files."""
    results = []
    for json_file in results_dir.glob("*.json"):
        with open(json_file, 'r') as f:
            results.append(json.load(f))
    return results


def aggregate_by_method(results: List[Dict]) -> Dict:
    """Aggregate metrics by compression method."""
    by_method = defaultdict(lambda: defaultdict(list))
    
    for result in results:
        for exp in result['experiments']:
            method = exp['method']
            for key, value in exp.items():
                if key != 'method' and isinstance(value, (int, float)):
                    by_method[method][key].append(value)
    
    # Compute statistics
    stats = {}
    for method, metrics in by_method.items():
        stats[method] = {}
        for metric, values in metrics.items():
            stats[method][metric] = {
                'mean': float(np.mean(values)),
                'std': float(np.std(values)),
                'min': float(np.min(values)),
                'max': float(np.max(values)),
                'median': float(np.median(values))
            }
    
    return stats


def compare_methods(stats: Dict) -> Dict:
    """Compare baseline vs boundary-aware."""
    if 'lattice-hybrid' not in stats or 'boundary-aware' not in stats:
        return {}
    
    baseline = stats['lattice-hybrid']
    boundary_aware = stats['boundary-aware']
    
    comparison = {}
    
    # Key metrics to compare
    metrics = ['recall_at_10', 'recall_at_100', 'mrr', 'ndcg_at_10', 
               'mse_global', 'compression_time_seconds']
    
    for metric in metrics:
        if metric in baseline and metric in boundary_aware:
            baseline_val = baseline[metric]['mean']
            ba_val = boundary_aware[metric]['mean']
            
            # For recall/mrr/ndcg, higher is better
            # For mse/time, lower is better
            if metric in ['recall_at_10', 'recall_at_100', 'mrr', 'ndcg_at_10']:
                improvement = (ba_val - baseline_val) / baseline_val if baseline_val != 0 else 0
            else:
                improvement = (baseline_val - ba_val) / baseline_val if baseline_val != 0 else 0
            
            comparison[metric] = {
                'baseline': baseline_val,
                'boundary_aware': ba_val,
                'improvement_pct': improvement * 100,
                'significant': abs(improvement) > 0.02  # 2% threshold
            }
    
    return comparison


def determine_verdict(comparison: Dict) -> str:
    """Determine verdict based on comparison."""
    if not comparison:
        return "INSUFFICIENT_DATA"
    
    # Check recall improvement
    recall_improvement = comparison.get('recall_at_10', {}).get('improvement_pct', 0)
    
    # Check overhead
    time_overhead = comparison.get('compression_time_seconds', {}).get('improvement_pct', 0)
    # Negative overhead means slower (bad)
    time_overhead_abs = abs(time_overhead)
    
    # Decision criteria
    significant_recall_improvement = recall_improvement > 2.0  # >2%
    acceptable_overhead = time_overhead_abs < 100  # <100% overhead (less than 2x slower)
    
    if significant_recall_improvement and acceptable_overhead:
        return "✅ EXPLOITABLE"
    elif recall_improvement > 0 and recall_improvement < 2.0:
        return "🟡 OBSERVATIONAL"
    else:
        return "❌ REJECTED"


def generate_summary_report(
    results: List[Dict],
    stats: Dict,
    comparison: Dict,
    verdict: str
) -> str:
    """Generate a summary report as text."""
    report = []
    report.append("="*80)
    report.append("REAL-WORLD VALIDATION SUMMARY")
    report.append("="*80)
    report.append("")
    
    # Datasets
    datasets = set(r['dataset_id'] for r in results)
    report.append(f"Datasets Evaluated: {len(datasets)}")
    for dataset in sorted(datasets):
        report.append(f"  - {dataset}")
    report.append("")
    
    # Total experiments
    total_exps = sum(len(r['experiments']) for r in results)
    report.append(f"Total Experiments: {total_exps}")
    report.append("")
    
    # Verdict
    report.append(f"VERDICT: {verdict}")
    report.append("")
    
    # Key findings
    report.append("KEY FINDINGS:")
    report.append("")
    
    if comparison:
        report.append("Baseline (lattice-hybrid) vs Boundary-Aware:")
        report.append("")
        
        for metric, data in sorted(comparison.items()):
            baseline_val = data['baseline']
            ba_val = data['boundary_aware']
            improvement = data['improvement_pct']
            significant = "✓" if data['significant'] else " "
            
            report.append(f"  [{significant}] {metric}:")
            report.append(f"      Baseline:       {baseline_val:.4f}")
            report.append(f"      Boundary-Aware: {ba_val:.4f}")
            report.append(f"      Improvement:    {improvement:+.2f}%")
            report.append("")
    
    # Performance overhead
    if 'compression_time_seconds' in comparison:
        time_data = comparison['compression_time_seconds']
        overhead_pct = -time_data['improvement_pct']  # Flip sign for overhead
        report.append(f"Performance Overhead: {overhead_pct:+.1f}%")
        if overhead_pct < 20:
            report.append("  Status: ✅ Acceptable (<20%)")
        elif overhead_pct < 100:
            report.append("  Status: ⚠️  Moderate (20-100%)")
        else:
            report.append("  Status: ❌ High (>100%)")
        report.append("")
    
    # Recommendations
    report.append("RECOMMENDATIONS:")
    report.append("")
    
    if verdict == "✅ EXPLOITABLE":
        report.append("  1. Deploy boundary-aware compression in production")
        report.append("  2. Monitor performance on real-world datasets")
        report.append("  3. Consider publishing findings")
    elif verdict == "🟡 OBSERVATIONAL":
        report.append("  1. Signal exists but marginal benefit")
        report.append("  2. Investigate further optimizations")
        report.append("  3. Not ready for production deployment")
    else:  # REJECTED
        report.append("  1. No significant benefit observed")
        report.append("  2. Focus on alternative approaches")
        report.append("  3. Document failure modes for future reference")
    
    report.append("")
    report.append("="*80)
    report.append("See docs/REAL_WORLD_VALIDATION_REPORT.md for full details")
    report.append("="*80)
    
    return "\n".join(report)


def main():
    parser = argparse.ArgumentParser(
        description='Analyze real-world validation results'
    )
    parser.add_argument(
        '--results',
        default='results/real_world_validation',
        help='Results directory'
    )
    parser.add_argument(
        '--output',
        default='results/real_world_validation/ANALYSIS_SUMMARY.txt',
        help='Output summary file'
    )
    
    args = parser.parse_args()
    
    results_dir = Path(args.results)
    if not results_dir.exists():
        print(f"Error: Results directory not found: {results_dir}")
        return 1
    
    # Load results
    print(f"Loading results from {results_dir}...")
    results = load_results(results_dir)
    print(f"Loaded {len(results)} result files")
    
    # Aggregate
    print("Aggregating metrics...")
    stats = aggregate_by_method(results)
    
    # Compare
    print("Comparing methods...")
    comparison = compare_methods(stats)
    
    # Determine verdict
    print("Determining verdict...")
    verdict = determine_verdict(comparison)
    
    # Generate report
    print("Generating summary report...")
    report = generate_summary_report(results, stats, comparison, verdict)
    
    # Print to console
    print("\n" + report)
    
    # Save to file
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'w') as f:
        f.write(report)
    
    print(f"\nSummary saved to: {output_path}")
    
    # Save detailed stats as JSON
    stats_path = output_path.parent / "ANALYSIS_STATS.json"
    with open(stats_path, 'w') as f:
        json.dump({
            'stats': stats,
            'comparison': comparison,
            'verdict': verdict
        }, f, indent=2)
    
    print(f"Detailed stats saved to: {stats_path}")
    
    return 0


if __name__ == '__main__':
    sys.exit(main())
