# Quick Start: Boundary Geometry Experiment

## 1. Run the Experiment (Web UI)

1. Open NeuraLogix Mini Lab in your browser: `npm run dev`
2. Generate embeddings (Text or Image)
3. Navigate to **"Validation Experiments"** panel
4. Select **"Boundary Geometry Analysis"** (val-006-boundary-geometry)
5. Click **"Run Experiment"**
6. Click **"Export JSON"** when complete

## 2. Analyze Results (Command Line)

```bash
# Install Python dependencies (first time only)
cd analysis
pip install -r requirements.txt

# Run analysis script
python plot_boundary_sweep.py path/to/experiment_result.json

# Custom output directory
python plot_boundary_sweep.py experiment.json --output-dir my_plots
```

## 3. View Results

**Plots (in `plots/` directory):**
- `boundary_sweep_delta_*.png` - Shows Δ_boundary vs grid parameter
- `boundary_sweep_mse_*.png` - Compares MSE across global/boundary/bulk

**Console Output:**
- Statistics summary
- Grid value where boundary degradation begins
- Detection of sharp increases

## What to Look For

**Key Signal:** Δ_boundary = MSE_boundary - MSE_bulk

- ✅ **Positive & Increasing** → Boundary vectors degrade earlier than bulk
- ⚠️ **Near Zero** → Uniform degradation across all vectors
- ❌ **Negative** → Unexpected behavior (investigate)

## Documentation

- **Full Guide:** [docs/BOUNDARY_GEOMETRY_EXPERIMENT.md](docs/BOUNDARY_GEOMETRY_EXPERIMENT.md)
- **Implementation Details:** [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)
- **Analysis Tools:** [analysis/README.md](analysis/README.md)

## Example Output

```
Δ_boundary Statistics:
  Min:    -0.002134
  Max:    0.015678
  Mean:   0.004523

Δ_boundary becomes positive at grid = 0.0800
  (Boundary vectors degrade more than bulk at this point)

Sharp increase detected at grid ≈ 0.1500
```

## Troubleshooting

**"No boundary metrics found"**
- Ensure experiment includes: `['mse_global', 'mse_boundary', 'mse_bulk', 'delta_boundary']`
- Check that experiment ran successfully and exported JSON

**Python dependencies error**
```bash
pip install numpy matplotlib
```

**TypeScript build issues**
```bash
npm install
npm run build
```

---

Need help? See full documentation in [docs/BOUNDARY_GEOMETRY_EXPERIMENT.md](docs/BOUNDARY_GEOMETRY_EXPERIMENT.md)
