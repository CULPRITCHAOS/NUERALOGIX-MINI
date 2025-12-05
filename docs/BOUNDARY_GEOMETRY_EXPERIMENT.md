# Boundary Geometry Experiment

## Overview

This experiment measures whether **boundary vectors** (vectors near decision boundaries between clusters) degrade earlier than **bulk vectors** (vectors clearly within clusters) under compression.

## Theory

### Boundary vs Bulk Classification

For each vector **x** in a batch, we compute distances to its nearest and second-nearest centroids:

- `d1` = distance to nearest centroid
- `d2` = distance to 2nd nearest centroid
- `xi = d2 - d1` (ambiguity score)

**Interpretation:**
- **Small xi** → `d1 ≈ d2` → vector is near a decision boundary between clusters
- **Large xi** → clearly closer to one centroid (far from boundary)

We then classify vectors:
- **Boundary class** = bottom 10% of vectors by xi (most ambiguous)
- **Bulk class** = top 10% of vectors by xi (least ambiguous)

### Metrics

For each compression setting (grid step, k-means clusters), we compute:

- `mse_global` = mean MSE over the entire batch
- `mse_boundary` = mean MSE over boundary class
- `mse_bulk` = mean MSE over bulk class
- `delta_boundary = mse_boundary - mse_bulk`

**Key Signal:** We're interested in how `delta_boundary` evolves vs the compression parameter (grid step). If boundary vectors degrade earlier than bulk, we expect `delta_boundary` to increase as compression increases.

## How to Run

### 1. Run the Experiment

The boundary geometry experiment is available as a pre-configured validation experiment:

1. **Open the NeuraLogix Mini Lab** in your browser
2. **Generate embeddings** for your dataset (Text or Image)
3. Navigate to the **"Validation Experiments"** panel
4. Select **"val-006-boundary-geometry"**
5. Click **"Run Experiment"**
6. Wait for the sweep to complete
7. Click **"Export JSON"** to save the results

This will save a file like: `experiment_val-006-boundary-geometry_[timestamp].json`

### 2. Analyze Results with Python Script

Once you have the exported JSON file:

```bash
# Install dependencies (first time only)
cd analysis
pip install -r requirements.txt

# Run the analysis script
python plot_boundary_sweep.py path/to/experiment_result.json
```

This will:
- Generate plots in the `plots/` directory
- Print a summary to stdout

### Custom Output Directory

```bash
python plot_boundary_sweep.py experiment.json --output-dir my_plots
```

## What to Look For

### Plots Generated

1. **`boundary_sweep_delta_*.png`**
   - X-axis: Grid step (compression parameter)
   - Y-axis: Δ_boundary (mse_boundary - mse_bulk)
   - Shows whether boundary vectors degrade more than bulk

2. **`boundary_sweep_mse_*.png`**
   - X-axis: Grid step
   - Y-axis: Mean Squared Error
   - Three lines: MSE_global, MSE_boundary, MSE_bulk
   - Shows absolute error levels

### Interpretation

**If `delta_boundary` increases with compression:**
- Boundary vectors degrade earlier/faster than bulk vectors
- Suggests compression is more harmful to ambiguous vectors
- May indicate a phase transition where boundary clarity is lost

**If `delta_boundary` remains near zero or negative:**
- Boundary and bulk vectors degrade at similar rates
- Compression affects all vectors uniformly
- No special vulnerability at decision boundaries

**Look for sharp increases:**
- The printed summary identifies grid values where `delta_boundary` increases sharply
- This may indicate the onset of boundary collapse

## Example Summary Output

```
======================================================================
BOUNDARY GEOMETRY ANALYSIS SUMMARY
======================================================================

Experiment: Boundary Geometry Analysis
Dataset Type: text
Strategy: lattice-hybrid
Sample Size: 50

Grid Range: 0.0100 to 0.5000

Δ_boundary Statistics:
  Min:    -0.002134
  Max:    0.015678
  Mean:   0.004523
  Median: 0.003421

Δ_boundary becomes positive at grid = 0.0800
  (This suggests boundary vectors degrade more than bulk at this point)

Sharp increase detected at grid ≈ 0.1500
  (Derivative: 0.082345)

MSE Global Statistics:
  Min:  0.000234
  Max:  0.042156
  Mean: 0.012345

======================================================================
```

## Implementation Details

### Services

**`src/services/boundaryMetricsService.ts`**
- Implements boundary vs bulk classification
- Computes MSE metrics for each class
- Used by experiment runner

### Experiment Configuration

The validation experiment `val-006-boundary-geometry` is defined in:
- **File:** `src/experiments/types.ts`
- **Metrics:** `['lsi', 'mse_global', 'mse_boundary', 'mse_bulk', 'delta_boundary']`
- **Grid Range:** 0.01 to 0.5 (15 steps)
- **K Range:** 3 to 15 (5 steps)

### Data Flow

1. **Compression:** Vectors are compressed using lattice-hybrid method
2. **Centroid Extraction:** Actual codebook centroids are extracted from the quantizer (k-means/grid)
3. **Distance Computation:** For each original vector, compute d1, d2 to true centroids
4. **Classification:** Compute ambiguity scores (xi = d2 - d1) using robust linear interpolation quantiles, identify boundary/bulk at 10%/90%
5. **MSE Computation:** Calculate per-vector MSE, aggregate by class
6. **Export:** Results saved to JSON with metadata

### Implementation Improvements (2025-01-04)

The boundary metrics implementation has been enhanced for accuracy:

1. **True Centroids:** The compression service now returns actual codebook centroids from the quantizer, not JSON-derived reconstructions. This ensures d1 and d2 distances are computed against the same centroids used by the compression algorithm.

2. **Robust Quantiles:** The quantile calculation now uses linear interpolation between nearest ranks (PERCENTILE_CONT style) for more accurate and numerically stable 10%/90% boundary/bulk splits.

3. **Backwards Compatible:** All changes maintain the existing experiment API and JSON export format.

## Limitations

1. **Centroid-Based Classification:** This approach assumes vectors are compressed to cluster centroids. Works well for k-means and grid quantization, but may need adaptation for other compression methods.

2. **Fixed Percentiles:** Uses fixed 10% / 90% quantiles for boundary/bulk. These could be made configurable.

3. **Sampling:** For efficiency, some computations sample vectors. Full batch analysis may be slower but more accurate.

4. **No Statistical Testing:** Results are descriptive, not inferential. No confidence intervals or hypothesis tests provided.

## Future Extensions

Possible enhancements:
- Adaptive percentile thresholds based on data distribution
- Multi-class boundary analysis (not just binary boundary/bulk)
- Temporal tracking of boundary drift over compression iterations
- Correlation with other stability metrics (LSI, collapse ratio)

## References

This experiment is inspired by:
- Decision boundary analysis in machine learning
- Voronoi diagram geometry
- Compression-induced topology changes

---

**Last Updated:** 2025-01-04
