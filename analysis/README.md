# Boundary Geometry Analysis

This directory contains analysis tools for the boundary geometry diagnostic experiment.

## Files

- **`plot_boundary_sweep.py`** - Python script to analyze and plot boundary sweep results from single experiments
- **`run_boundary_eval.py`** - Evaluation harness for running boundary experiments across multiple datasets, runs, and backends
- **`boundary_eval_config.json`** - Configuration file defining datasets for the evaluation suite
- **`requirements.txt`** - Python dependencies (numpy, matplotlib)

## Installation

```bash
pip install -r requirements.txt
```

## Usage

### Single Experiment Analysis

After running a boundary geometry experiment in the NeuraLogix Mini Lab and exporting the results to JSON:

```bash
python plot_boundary_sweep.py path/to/experiment_result.json
```

This will:
1. Load the experiment data from JSON
2. Generate plots in the `../plots/` directory
3. Print a summary to stdout

#### Options

```bash
# Specify custom output directory
python plot_boundary_sweep.py experiment.json --output-dir my_plots

# Get help
python plot_boundary_sweep.py --help
```

### Evaluation Suite (Multiple Datasets & Stability Analysis)

Run comprehensive evaluation across multiple datasets:

```bash
# Run on all configured datasets with 3 runs each
python run_boundary_eval.py --datasets all --runs 3 --backend internal

# Run specific datasets only
python run_boundary_eval.py --datasets synthetic_rings,text_real_sts --runs 5 --seed 42

# Compare backends
python run_boundary_eval.py --datasets all --runs 3 --backend faiss_like

# Get help
python run_boundary_eval.py --help
```

See **[../docs/BOUNDARY_EVAL_GUIDE.md](../docs/BOUNDARY_EVAL_GUIDE.md)** for detailed documentation.

## Output

### Single Experiment

The `plot_boundary_sweep.py` script generates two plots:

1. **`boundary_sweep_delta_*.png`** - Δ_boundary vs grid parameter
2. **`boundary_sweep_mse_*.png`** - MSE comparison (global, boundary, bulk)

And prints a summary including:
- Δ_boundary statistics (min, max, mean, median)
- Grid value where Δ_boundary becomes positive
- Detection of sharp increases in degradation
- MSE global statistics

### Evaluation Suite

The `run_boundary_eval.py` script generates:

1. **Per-dataset experiment JSONs** - `results/boundary_eval/<dataset>/experiment_*.json`
2. **Stability overlay plots** - `stability_overlay_<dataset>.png` (for multi-run evaluations)
3. **Stability summary JSON** - `stability_summary_<dataset>.json` (statistics across runs)
4. **Optional individual plots** - When using `--generate-plots` flag

## See Also

- [../docs/BOUNDARY_GEOMETRY_EXPERIMENT.md](../docs/BOUNDARY_GEOMETRY_EXPERIMENT.md) - Full experiment documentation
- [../docs/BOUNDARY_EVAL_GUIDE.md](../docs/BOUNDARY_EVAL_GUIDE.md) - Evaluation suite guide
- [../README.md](../README.md) - Main project README

