#!/usr/bin/env python3
"""
MS MARCO Pipeline Runner

Orchestrates the entire MS MARCO benchmark pipeline:
1. Prepare subset
2. Generate embeddings
3. Run compression
4. Evaluate retrieval
5. Generate final report

Handles failures gracefully and generates appropriate documentation.
"""

import sys
import subprocess
import json
from pathlib import Path
from typing import Dict, Optional, Tuple


def run_script(script_path: str, args: list = None) -> Tuple[bool, str]:
    """
    Run a Python script and capture output.
    
    Returns:
        (success, output)
    """
    cmd = ['python3', script_path]
    if args:
        cmd.extend(args)
    
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=600  # 10 minute timeout
        )
        
        output = result.stdout + result.stderr
        success = result.returncode == 0
        
        return success, output
        
    except subprocess.TimeoutExpired:
        return False, "Script timed out after 10 minutes"
    except Exception as e:
        return False, f"Failed to run script: {e}"


def generate_failure_report(failure_stage: str, error_message: str, output_dir: Path):
    """
    Generate failure report when benchmark cannot be run.
    
    This is the ONLY acceptable outcome if real data cannot be obtained.
    NO SIMULATION. NO FABRICATION.
    """
    report = f"""# MS MARCO Real Data Benchmark - FAILURE REPORT

## Status: COULD NOT RUN

**This is NOT a simulation or estimate. This is a real failure report.**

---

## Failure Details

**Failed at stage:** {failure_stage}

**Reason:**
```
{error_message}
```

---

## What We Attempted

1. **Data Preparation**: Download MS MARCO passage ranking dataset from Hugging Face
   - Target: 50,000 passages, 1,000 queries with relevance labels
   - Method: Using `datasets` library from Hugging Face
   
2. **Embedding Generation**: Compute embeddings with sentence-transformers
   - Model: sentence-transformers/all-MiniLM-L6-v2
   - Method: Real neural network inference
   
3. **Compression**: Apply baseline and boundary-aware compression
   - Baseline: Lattice-hybrid (k-means + grid quantization)
   - Boundary-aware: Differential treatment for boundary vectors
   
4. **Retrieval Evaluation**: Compute real retrieval metrics
   - Metrics: Recall@10, Recall@100, MRR, NDCG@10
   - Method: Exact search over compressed embeddings

---

## Why This Failed

The MS MARCO real-data evaluation could not be run in this environment because:

**{failure_stage}**

Possible reasons:
- Network connectivity issue preventing dataset download
- Insufficient disk space or memory
- Missing system dependencies
- Library version incompatibility
- Environment restrictions (firewall, permissions, etc.)

---

## What This Means

**We CANNOT and WILL NOT:**
- Generate synthetic "MS MARCO-like" data
- Estimate or project metrics from other datasets
- Simulate the benchmark results
- Fabricate any numbers

**The benchmark requires:**
- Real MS MARCO dataset
- Real embeddings from a neural model
- Real compression and retrieval
- Real metrics computed from actual results

**Without these, we have NO RESULTS to report.**

---

## Next Steps

To run this benchmark successfully, you would need:

1. **Environment with internet access** to download MS MARCO from Hugging Face
2. **Sufficient resources**:
   - ~2GB disk space for dataset
   - ~4GB RAM for embedding generation
   - GPU recommended but not required
3. **Required Python packages** (see `analysis/requirements.txt`)
4. **Execution time**: ~30-60 minutes for full pipeline

---

## Conclusion

**VERDICT: UNABLE TO EVALUATE**

The boundary-aware compression approach cannot be validated on real MS MARCO data in this environment. No metrics, comparisons, or conclusions can be drawn without actual data and results.

This is an honest failure report, not a simulation or fabrication.

---

*Generated: {failure_stage} failure*
*Pipeline: MS MARCO Real Data Benchmark*
*Status: FAILED*
"""
    
    output_dir.mkdir(parents=True, exist_ok=True)
    report_path = output_dir / 'MSMARCO_REAL_DATA_VERDICT.md'
    
    with open(report_path, 'w') as f:
        f.write(report)
    
    print(f"\n{'='*80}")
    print("FAILURE REPORT GENERATED")
    print(f"{'='*80}")
    print(f"\nReport saved to: {report_path}")
    print(f"\nThis is NOT a simulation. The benchmark could not be run.")
    print(f"Failed at: {failure_stage}")
    print(f"{'='*80}\n")
    
    return report_path


def generate_success_report(
    baseline_metrics: Dict,
    boundary_metrics: Dict,
    compression_info: Dict,
    output_dir: Path
):
    """
    Generate success report with real metrics.
    
    ONLY called when we have REAL data and REAL results.
    """
    # Compute deltas
    metrics_to_compare = ['recall@10', 'recall@100', 'mrr', 'ndcg@10']
    deltas = {}
    
    for metric in metrics_to_compare:
        baseline_val = baseline_metrics.get(metric, 0)
        boundary_val = boundary_metrics.get(metric, 0)
        delta = ((boundary_val - baseline_val) / baseline_val * 100) if baseline_val > 0 else 0
        deltas[metric] = delta
    
    # Compute compression overhead
    baseline_time = compression_info['baseline']['compression_time_seconds']
    boundary_time = compression_info['boundary']['compression_time_seconds']
    time_overhead = ((boundary_time - baseline_time) / baseline_time * 100) if baseline_time > 0 else 0
    
    # Determine verdict
    avg_improvement = sum(deltas.values()) / len(deltas) if deltas else 0
    significant_improvements = sum(1 for d in deltas.values() if d > 1.0)  # > 1% improvement
    
    if avg_improvement > 2.0 and significant_improvements >= 3:
        verdict = "✅ EXPLOITABLE"
        verdict_explanation = "Boundary-aware compression shows consistent, measurable improvements in retrieval quality."
    elif avg_improvement > 0.5:
        verdict = "🟡 OBSERVATIONAL"
        verdict_explanation = "Boundary-aware compression shows marginal improvements. Benefits are observable but may not justify the overhead."
    else:
        verdict = "❌ REJECTED"
        verdict_explanation = "Boundary-aware compression does not improve retrieval quality. The approach is observational only."
    
    overhead_acceptable = time_overhead < 20.0
    
    report = f"""# MS MARCO Real Data Benchmark - RESULTS

## Status: COMPLETED SUCCESSFULLY

**All results below are from REAL data and REAL experiments.**
**NO SIMULATION. NO FABRICATION.**

---

## Dataset Details

- **Source**: MS MARCO Passage Ranking v1.1 (Hugging Face)
- **Passages**: {baseline_metrics.get('num_passages', 'N/A'):,}
- **Queries**: {baseline_metrics.get('num_queries_with_qrels', 'N/A'):,}
- **Relevance judgments**: Used real qrels from MS MARCO

## Embedding Model

- **Model**: sentence-transformers/all-MiniLM-L6-v2
- **Dimension**: {compression_info.get('embedding_dim', 'N/A')}
- **Library**: sentence-transformers (real neural network)

## Compression Parameters

- **Grid step**: {compression_info.get('grid', 'N/A')}
- **K clusters**: {compression_info.get('k', 'N/A')}
- **Boundary step**: {compression_info['boundary'].get('boundary_step', 'N/A')} (50% of grid)
- **Boundary vectors identified**: {compression_info['boundary'].get('num_boundary_vectors', 'N/A')} ({compression_info['boundary'].get('num_boundary_vectors', 0) / compression_info.get('num_passages', 1) * 100:.1f}%)

---

## Retrieval Metrics Comparison

| Metric | Baseline | Boundary-Aware | Δ (%) |
|--------|----------|----------------|-------|
| **Recall@10** | {baseline_metrics.get('recall@10', 0):.4f} | {boundary_metrics.get('recall@10', 0):.4f} | {deltas.get('recall@10', 0):+.2f}% |
| **Recall@100** | {baseline_metrics.get('recall@100', 0):.4f} | {boundary_metrics.get('recall@100', 0):.4f} | {deltas.get('recall@100', 0):+.2f}% |
| **MRR** | {baseline_metrics.get('mrr', 0):.4f} | {boundary_metrics.get('mrr', 0):.4f} | {deltas.get('mrr', 0):+.2f}% |
| **NDCG@10** | {baseline_metrics.get('ndcg@10', 0):.4f} | {boundary_metrics.get('ndcg@10', 0):.4f} | {deltas.get('ndcg@10', 0):+.2f}% |

## Performance Overhead

| Metric | Baseline | Boundary-Aware | Δ (%) |
|--------|----------|----------------|-------|
| **Compression Time** | {baseline_time:.3f}s | {boundary_time:.3f}s | {time_overhead:+.1f}% |
| **Query Latency** | {baseline_metrics.get('avg_query_latency_ms', 0):.2f}ms | {boundary_metrics.get('avg_query_latency_ms', 0):.2f}ms | {((boundary_metrics.get('avg_query_latency_ms', 0) - baseline_metrics.get('avg_query_latency_ms', 0)) / baseline_metrics.get('avg_query_latency_ms', 1) * 100):+.1f}% |

---

## Analysis

### Retrieval Quality

**Average improvement**: {avg_improvement:+.2f}%

**Metrics with >1% improvement**: {significant_improvements} out of {len(metrics_to_compare)}

{verdict_explanation}

### Performance Overhead

**Compression overhead**: {time_overhead:.1f}%

{"✅ Acceptable (< 20%)" if overhead_acceptable else "⚠️ High (≥ 20%)"}

The boundary-aware approach requires {time_overhead:.1f}% more time for compression due to the additional boundary classification and dual-centroid computation.

---

## Verdict

**{verdict}**

### Interpretation

{verdict_explanation}

**Overhead assessment**: {"The performance overhead is acceptable for the gains achieved." if overhead_acceptable and avg_improvement > 0 else "The performance overhead may not justify the marginal improvements." if avg_improvement > 0 else "The overhead is unjustified given no quality improvement."}

### Is Boundary Geometry Operational?

{"✅ YES - Boundary geometry is exploitable for improving retrieval quality." if "EXPLOITABLE" in verdict else "🟡 PARTIALLY - Boundary geometry has observable effects but limited practical value." if "OBSERVATIONAL" in verdict else "❌ NO - Boundary geometry is observational only and does not improve retrieval."}

---

## Notes

- **Real data**: All results computed from actual MS MARCO passages and queries
- **Real embeddings**: Generated using sentence-transformers neural network
- **Real metrics**: Computed using standard retrieval evaluation formulas
- **No simulation**: Zero fabricated or estimated values

---

*Generated from real MS MARCO data*
*Pipeline: Data Preparation → Embedding → Compression → Retrieval Evaluation*
*Status: COMPLETED*
"""
    
    output_dir.mkdir(parents=True, exist_ok=True)
    report_path = output_dir / 'MSMARCO_REAL_DATA_VERDICT.md'
    
    with open(report_path, 'w') as f:
        f.write(report)
    
    print(f"\n{'='*80}")
    print("SUCCESS REPORT GENERATED")
    print(f"{'='*80}")
    print(f"\nReport saved to: {report_path}")
    print(f"\nVerdict: {verdict}")
    print(f"Average improvement: {avg_improvement:+.2f}%")
    print(f"Overhead: {time_overhead:.1f}%")
    print(f"{'='*80}\n")
    
    return report_path


def main():
    """Run the full MS MARCO benchmark pipeline."""
    base_dir = Path('/home/runner/work/NUERALOGIX-MINI/NUERALOGIX-MINI')
    analysis_dir = base_dir / 'analysis'
    data_dir = base_dir / 'data' / 'msmarco_subset'
    results_dir = base_dir / 'results' / 'msmarco'
    docs_dir = base_dir / 'docs'
    
    print("="*80)
    print("MS MARCO REAL DATA BENCHMARK PIPELINE")
    print("="*80)
    print("\nThis pipeline will:")
    print("1. Download real MS MARCO data")
    print("2. Generate real embeddings")
    print("3. Run real compression experiments")
    print("4. Evaluate real retrieval metrics")
    print("5. Generate final report")
    print("\nNO SIMULATION. NO FABRICATION.")
    print("="*80 + "\n")
    
    # Step 1: Prepare MS MARCO subset
    print("\n" + "="*80)
    print("STEP 1: PREPARE MS MARCO SUBSET")
    print("="*80)
    
    success, output = run_script(
        str(analysis_dir / 'msmarco_prepare_subset.py'),
        ['--num-passages', '10000', '--num-queries', '500']  # Smaller subset for faster execution
    )
    
    print(output)
    
    if not success:
        print("\n❌ Failed to prepare MS MARCO subset")
        report_path = generate_failure_report(
            "Data Preparation",
            output,
            docs_dir
        )
        print(f"\nFailure report: {report_path}")
        return 1
    
    print("✅ MS MARCO subset prepared successfully")
    
    # Step 2: Generate embeddings
    print("\n" + "="*80)
    print("STEP 2: GENERATE EMBEDDINGS")
    print("="*80)
    
    success, output = run_script(
        str(analysis_dir / 'msmarco_embed.py'),
        ['--batch-size', '32']
    )
    
    print(output)
    
    if not success:
        print("\n❌ Failed to generate embeddings")
        report_path = generate_failure_report(
            "Embedding Generation",
            output,
            docs_dir
        )
        print(f"\nFailure report: {report_path}")
        return 1
    
    print("✅ Embeddings generated successfully")
    
    # Step 3: Run compression
    print("\n" + "="*80)
    print("STEP 3: RUN COMPRESSION")
    print("="*80)
    
    success, output = run_script(
        str(analysis_dir / 'msmarco_run_compression.py'),
        ['--grid', '0.1', '--k', '10']
    )
    
    print(output)
    
    if not success:
        print("\n❌ Failed to run compression")
        report_path = generate_failure_report(
            "Compression",
            output,
            docs_dir
        )
        print(f"\nFailure report: {report_path}")
        return 1
    
    print("✅ Compression completed successfully")
    
    # Step 4: Evaluate retrieval
    print("\n" + "="*80)
    print("STEP 4: EVALUATE RETRIEVAL")
    print("="*80)
    
    success, output = run_script(
        str(analysis_dir / 'msmarco_eval_retrieval.py'),
        ['--mode', 'both']
    )
    
    print(output)
    
    if not success:
        print("\n❌ Failed to evaluate retrieval")
        report_path = generate_failure_report(
            "Retrieval Evaluation",
            output,
            docs_dir
        )
        print(f"\nFailure report: {report_path}")
        return 1
    
    print("✅ Retrieval evaluation completed successfully")
    
    # Step 5: Generate final report
    print("\n" + "="*80)
    print("STEP 5: GENERATE FINAL REPORT")
    print("="*80)
    
    # Load results
    try:
        with open(results_dir / 'baseline' / 'metrics.json', 'r') as f:
            baseline_metrics = json.load(f)
        
        with open(results_dir / 'boundary' / 'metrics.json', 'r') as f:
            boundary_metrics = json.load(f)
        
        with open(results_dir / 'run_config.json', 'r') as f:
            compression_info = json.load(f)
        
        report_path = generate_success_report(
            baseline_metrics,
            boundary_metrics,
            compression_info,
            docs_dir
        )
        
        print(f"\n✅ Final report generated: {report_path}")
        
    except Exception as e:
        print(f"\n❌ Failed to generate final report: {e}")
        report_path = generate_failure_report(
            "Report Generation",
            f"Could not load results: {e}",
            docs_dir
        )
        print(f"\nFailure report: {report_path}")
        return 1
    
    print("\n" + "="*80)
    print("PIPELINE COMPLETED SUCCESSFULLY")
    print("="*80)
    print(f"\nFinal report: {report_path}")
    print(f"Results directory: {results_dir}")
    print("="*80 + "\n")
    
    return 0


if __name__ == '__main__':
    sys.exit(main())
