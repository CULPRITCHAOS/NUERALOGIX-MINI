# Boundary Geometry Analysis

This directory contains analysis tools for the boundary geometry diagnostic experiment.

## Files

- **`plot_boundary_sweep.py`** - Python script to analyze and plot boundary sweep results
- **`requirements.txt`** - Python dependencies (numpy, matplotlib)

## Installation

```bash
pip install -r requirements.txt
```

## Usage

After running a boundary geometry experiment in the NeuraLogix Mini Lab and exporting the results to JSON:

```bash
python plot_boundary_sweep.py path/to/experiment_result.json
```

This will:
1. Load the experiment data from JSON
2. Generate plots in the `../plots/` directory
3. Print a summary to stdout

### Options

```bash
# Specify custom output directory
python plot_boundary_sweep.py experiment.json --output-dir my_plots

# Get help
python plot_boundary_sweep.py --help
```

## Output

The script generates two plots:

1. **`boundary_sweep_delta_*.png`** - Δ_boundary vs grid parameter
2. **`boundary_sweep_mse_*.png`** - MSE comparison (global, boundary, bulk)

And prints a summary including:
- Δ_boundary statistics (min, max, mean, median)
- Grid value where Δ_boundary becomes positive
- Detection of sharp increases in degradation
- MSE global statistics

## See Also

- [../docs/BOUNDARY_GEOMETRY_EXPERIMENT.md](../docs/BOUNDARY_GEOMETRY_EXPERIMENT.md) - Full experiment documentation
- [../README.md](../README.md) - Main project README
