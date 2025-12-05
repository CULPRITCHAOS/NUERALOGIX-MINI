# Boundary Geometry Evaluation Guide

## Overview

This guide explains how to run the boundary geometry evaluation suite, which tests whether the **Δ_boundary** metric (difference between boundary and bulk MSE) behaves consistently across different datasets, runs, and backend configurations.

The evaluation suite helps answer the key question:
> "Does Δ_boundary behave consistently across real datasets, runs, and integrations—or is it fragile noise?"

## Quick Start

### Basic Usage

Run evaluation on all configured datasets:

```bash
python analysis/run_boundary_eval.py --datasets all --runs 3 --backend internal
```

Run on specific datasets only:

```bash
python analysis/run_boundary_eval.py --datasets synthetic_rings,text_real_sts --runs 5 --seed 42
```

### Command-Line Options

| Option | Description | Default |
|--------|-------------|---------|
| `--datasets` | Comma-separated dataset names or "all" | `all` |
| `--runs` | Number of runs per dataset with different seeds | `1` |
| `--seed` | Base random seed for reproducibility | Random |
| `--backend` | Backend to simulate: `internal` or `faiss_like` | `internal` |
| `--output-root` | Root directory for outputs | `results/boundary_eval` |
| `--config` | Path to configuration file | `analysis/boundary_eval_config.json` |
| `--generate-plots` | Generate individual plots using `plot_boundary_sweep.py` | False |

## Configuration

### Dataset Configuration

Datasets are defined in `analysis/boundary_eval_config.json`:

```json
{
  "datasets": [
    {
      "name": "synthetic_rings",
      "modality": "synthetic",
      "generator": "ring",
      "params": {
        "numPoints": 500,
        "dimension": 8,
        "radius": 1.0,
        "noise": 0.05
      }
    },
    {
      "name": "text_real_sts",
      "modality": "text",
      "path": "public/semantic_mesh/mini_sts_e8_v1.json",
      "embeddingModel": "text-embedding"
    }
  ],
  "experiment_defaults": {
    "gridRange": { "min": 0.01, "max": 0.5, "steps": 15 },
    "kRange": { "min": 3, "max": 15, "steps": 5 }
  }
}
```

### Adding New Datasets

#### Synthetic Datasets

For synthetic data, specify a `generator` and `params`:

```json
{
  "name": "my_synthetic",
  "modality": "synthetic",
  "generator": "clusters",
  "params": {
    "numPoints": 1000,
    "dimension": 8,
    "numClusters": 5,
    "spread": 0.5
  }
}
```

Supported generators:
- `ring` - Circular manifold
- `swiss-roll` - 2D manifold in 3D
- `clusters` - Gaussian clusters

#### Real Datasets

For real embeddings, specify a `path` to a JSON file:

```json
{
  "name": "my_real_data",
  "modality": "text",
  "path": "path/to/embeddings.json",
  "embeddingModel": "your-model-name"
}
```

The JSON file should contain embeddings in one of these formats:

**Array format:**
```json
[
  {"item": "item1", "embedding": [0.1, 0.2, ...]},
  {"item": "item2", "embedding": [0.3, 0.4, ...]}
]
```

**Dictionary format:**
```json
{
  "item1": [0.1, 0.2, ...],
  "item2": [0.3, 0.4, ...]
}
```

## Output Structure

Results are organized by dataset:

```
results/boundary_eval/
├── synthetic_rings/
│   ├── experiment_synthetic_rings_2025-12-05T02-11-43_42.json
│   ├── experiment_synthetic_rings_2025-12-05T02-11-43_43.json
│   ├── stability_overlay_synthetic_rings.png
│   ├── stability_summary_synthetic_rings.json
│   └── plots/
│       ├── boundary_sweep_delta_*.png
│       └── boundary_sweep_mse_*.png
├── text_real_sts/
│   └── ...
└── ...
```

### Experiment JSON Format

Each experiment run produces a JSON file with:

```json
{
  "metadata": {
    "experimentId": "boundary-eval",
    "name": "Boundary Geometry - synthetic_rings",
    "timestamp": "2025-12-05T02:11:43.000943",
    "datasetType": "synthetic",
    "strategy": "lattice-hybrid",
    "sampleSize": 500,
    "parameters": {
      "gridRange": {"min": 0.01, "max": 0.5, "steps": 15},
      "kRange": {"min": 3, "max": 15, "steps": 5}
    }
  },
  "run_metadata": {
    "timestamp": "2025-12-05T02:11:43.000943",
    "git_commit": "92960cc2...",
    "dataset_name": "synthetic_rings",
    "modality": "synthetic",
    "backend": "internal",
    "random_seed": 42,
    "run_id": "2025-12-05T02-11-43-000943_42",
    "grid_range": {...},
    "k_range": {...}
  },
  "points": [
    {
      "grid": 0.01,
      "k": 3,
      "metrics": {
        "lsi": 0.995,
        "mse_global": 0.0005,
        "mse_boundary": 0.0006,
        "mse_bulk": 0.0004,
        "delta_boundary": 0.0002
      }
    },
    ...
  ]
}
```

### Stability Summary JSON

When running multiple times (`--runs > 1`), a stability summary is generated:

```json
{
  "dataset": "synthetic_rings",
  "num_runs": 3,
  "grid_values": [0.01, 0.05, 0.1, ...],
  "mean_delta_boundary": [0.0002, 0.0005, 0.001, ...],
  "std_delta_boundary": [0.00001, 0.00002, 0.00005, ...],
  "zero_crossings": [0.08],
  "high_variance_regions": [0.45, 0.5],
  "average_std_dev": 0.00003
}
```

## Backends

### Internal (Default)

Uses the exact compression implementation in the codebase:

```bash
python analysis/run_boundary_eval.py --backend internal
```

### FAISS-like Approximation

Simulates vector database behavior by adding small perturbations to centroids:

```bash
python analysis/run_boundary_eval.py --backend faiss_like
```

This is useful for testing sensitivity of boundary metrics to approximate search noise.

## Interpreting Results

### Stability Metrics

When running multiple iterations (`--runs > 1`), the evaluation computes:

1. **Mean Δ_boundary**: Average Δ_boundary at each grid value across runs
2. **Std Dev**: Standard deviation of Δ_boundary across runs
3. **Zero Crossings**: Grid values where Δ_boundary crosses zero consistently
4. **High-Variance Regions**: Grid values where variance is unusually high (potentially unstable)

### Plots

#### Stability Overlay Plot

Shows individual run traces (transparent blue lines) and mean with error bars (red):

- **Transparent lines**: Individual runs
- **Red line with error bars**: Mean ± std dev
- **Green dotted lines**: Zero crossings
- **Orange shaded regions**: High-variance regions

#### Individual Sweep Plots

Generated when using `--generate-plots`:

- `boundary_sweep_delta_*.png`: Δ_boundary vs grid parameter
- `boundary_sweep_mse_*.png`: MSE comparison (global, boundary, bulk)

### Interpreting Δ_boundary Behavior

**Consistent positive Δ_boundary:**
- Boundary vectors degrade more than bulk vectors
- Effect is robust across runs
- Suggests compression is more harmful to ambiguous vectors

**High variance in Δ_boundary:**
- Metric is sensitive to random initialization
- Results may be fragile or dataset-dependent
- Consider more runs or different seeds

**Zero crossings:**
- Grid value where boundary/bulk degradation becomes equal
- May indicate a phase transition in compression behavior

**Backend differences:**
- Large differences between `internal` and `faiss_like` suggest sensitivity to approximate search
- Small differences suggest robustness

## Examples

### Example 1: Quick Check

Test a single dataset with 1 run:

```bash
python analysis/run_boundary_eval.py --datasets synthetic_rings --runs 1
```

### Example 2: Stability Analysis

Run 5 times to check consistency:

```bash
python analysis/run_boundary_eval.py --datasets synthetic_rings --runs 5 --seed 42
```

Examine the stability summary:

```
Δ_boundary across runs:
  Mean range: [0.000016, 0.004683]
  Std dev range: [0.000010, 0.000435]
  Average std dev: 0.000215

No zero crossings - Δ_boundary consistently positive
```

### Example 3: Backend Comparison

Compare internal vs FAISS-like behavior:

```bash
# Internal
python analysis/run_boundary_eval.py --datasets text_real_sts --runs 3 --backend internal

# FAISS-like
python analysis/run_boundary_eval.py --datasets text_real_sts --runs 3 --backend faiss_like
```

Compare the `delta_boundary` curves in the output plots.

### Example 4: Full Evaluation Suite

Run all datasets with multiple runs and both backends:

```bash
# Internal backend
python analysis/run_boundary_eval.py --datasets all --runs 3 --backend internal --generate-plots

# FAISS-like backend
python analysis/run_boundary_eval.py --datasets all --runs 3 --backend faiss_like --generate-plots
```

## Reproducibility

All runs include complete metadata for reproducibility:

1. **Git commit hash**: Captures exact code version
2. **Random seed**: Ensures identical randomness
3. **Hyperparameters**: Grid range, k range, etc.
4. **Dataset info**: Name, modality, path

To reproduce a specific run:

```bash
# From the run_metadata in the JSON:
python analysis/run_boundary_eval.py \
  --datasets <dataset_name> \
  --seed <random_seed> \
  --backend <backend> \
  --runs 1
```

## Testing

Edge-case tests for boundary metrics are in:
```
src/services/boundaryMetricsService.test.ts
```

Run tests with:
```bash
npm test
```

Tests cover:
- Empty input (no vectors)
- All identical points
- Empty/collapsed clusters
- Duplicate points
- NaN/Inf handling

## Troubleshooting

### "No boundary metrics found in the experiment data"

Ensure the experiment configuration includes boundary metrics:
```json
"metrics": ["lsi", "mse_global", "mse_boundary", "mse_bulk", "delta_boundary"]
```

### "Could not load text embeddings"

Check that the path in `boundary_eval_config.json` is correct and the file exists:
```bash
ls -la public/semantic_mesh/mini_sts_e8_v1.json
```

### High variance across runs

This may indicate:
- Insufficient sample size
- Sensitive dataset
- Need for more runs to establish confidence

Try increasing `--runs` to 10 or more.

### Python dependencies missing

Install requirements:
```bash
cd analysis
pip install -r requirements.txt
```

## Limitations

1. **Placeholder FAISS-like backend**: Simplified simulation, not full FAISS integration
2. **Mock experiment runner**: Current implementation uses placeholder metrics; full integration with TypeScript runner would require Node.js bridge
3. **Image datasets**: Currently placeholder; requires actual image embedding data

## Future Extensions

Possible enhancements:
- Full TypeScript experiment runner integration via Node.js subprocess
- Real FAISS/Qdrant/Milvus integration
- Automated statistical significance testing
- Confidence intervals for stability metrics
- Comparison reports across datasets and backends

---

**Last Updated:** 2025-12-05
