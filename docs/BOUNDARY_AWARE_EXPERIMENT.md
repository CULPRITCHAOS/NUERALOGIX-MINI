# Boundary-Aware Compression Experiment Guide

## Overview

This experiment answers a critical question: **Is boundary geometry exploitable or purely observational?**

The experiment implements a boundary-aware compression variant that applies differential treatment to vectors classified as "boundary vectors" (vectors near decision boundaries between clusters) versus "bulk vectors" (vectors clearly within clusters).

## Theory

### Boundary vs Bulk Classification

For each vector **x**, we compute:
- `d1` = distance to nearest centroid
- `d2` = distance to 2nd nearest centroid  
- `xi = d2 - d1` (ambiguity score)

**Interpretation:**
- **Small xi** → `d1 ≈ d2` → vector is near a decision boundary
- **Large xi** → clearly closer to one centroid (far from boundary)

**Classification:**
- **Boundary class** = bottom 10% of vectors by xi (most ambiguous)
- **Bulk class** = top 10% of vectors by xi (least ambiguous)

### Compression Strategy

**Baseline (lattice-hybrid):**
- Uses uniform grid step for all vectors
- Snaps k-means centroids to grid with step size `s`

**Boundary-Aware:**
- Uses **differential grid step**:
  - Boundary vectors: `s_boundary = s × 0.5` (finer grid)
  - Bulk vectors: `s_bulk = s` (standard grid)
- Preserves boundary vectors with higher fidelity

## Comparison Metrics

For both baseline and boundary-aware modes, the experiment computes:

| Metric | Description | Better is |
|--------|-------------|-----------|
| **Global MSE** | Mean squared error over all vectors | Lower |
| **Boundary MSE** | MSE for boundary vectors only | Lower |
| **Bulk MSE** | MSE for bulk vectors only | Lower |
| **Δ_boundary** | `MSE_boundary - MSE_bulk` | Smaller absolute value |
| **k-NN Overlap** | Jaccard similarity of k-nearest neighbors | Higher |
| **LSI** | Lattice stability index | Higher |
| **Compression Ratio** | Original bits / compressed bits | Higher (if quality maintained) |

## Running the Experiment

### Step 1: Prepare Synthetic Data

```bash
python analysis/run_boundary_aware_experiment.py --dataset synthetic_clusters --output results/boundary_exp
```

This generates:
- Synthetic embeddings (clusters, rings, or swiss roll)
- Experiment configurations for both baseline and boundary-aware modes

### Step 2: Run Experiments (TypeScript)

The experiment runner needs to execute both compression modes. In the TypeScript environment:

```typescript
import { runExperiment } from './src/experiments/experimentRunner';
import { EmbeddingMap } from './src/types';

// Load embeddings from generated file
const embeddings: EmbeddingMap = loadEmbeddings('results/boundary_exp/baseline_embeddings.json');

// Run baseline
const baselineConfig = loadConfig('results/boundary_exp/baseline_config.json');
const baselineResult = await runExperiment(baselineConfig, embeddings);
saveJSON('results/baseline_result.json', baselineResult);

// Run boundary-aware
const boundaryConfig = loadConfig('results/boundary_exp/boundary_aware_config.json');
const boundaryResult = await runExperiment(boundaryConfig, embeddings);
saveJSON('results/boundary_aware_result.json', boundaryResult);
```

### Step 3: Compare Results

```bash
python analysis/compare_boundary_aware.py \
  --baseline results/baseline_result.json \
  --boundary-aware results/boundary_aware_result.json \
  --output-dir results/comparison
```

Or, if both results are in the same directory:

```bash
python analysis/compare_boundary_aware.py --experiments results/ --output-dir results/comparison
```

## Interpreting Results

### Comparison Table

The script outputs a structured table:

```
Grid     | Mode            | Global MSE   | Boundary MSE  | Δ_boundary   | k-NN Overlap | LSI
---------|-----------------|--------------|---------------|--------------|--------------|--------
0.0100   | Baseline        | 0.001234     | 0.002456      | 0.000987     | 0.9876       | 0.8765
         | Boundary-Aware  | 0.000987     | 0.001234      | 0.000234     | 0.9912       | 0.8923 ✅
```

A ✅ marker indicates improvement over baseline.

### Verdict

The script automatically computes a verdict based on improvement frequency:

**✅ EXPLOITABLE** if boundary-aware shows:
- **High confidence**: Improvement in ≥70% of cases
- **Moderate confidence**: Improvement in ≥50% of cases  
- **Low confidence**: Some measurable improvement

**❌ OBSERVATIONAL ONLY** if:
- No consistent improvement detected

### Charts Generated

1. **`boundary_aware_comparison.png`**: 4-panel comparison
   - Global MSE vs grid step
   - Boundary MSE vs grid step
   - Δ_boundary vs grid step
   - k-NN overlap vs grid step

2. **`lsi_comparison.png`**: LSI comparison across compression levels

## Example Output

```
===============================================================================
VERDICT: Is boundary geometry operational or cosmetic?
===============================================================================

✅ EXPLOITABLE (Confidence: MODERATE)

Summary: Boundary-aware treatment shows moderate improvement (≥50% of cases)

Evidence:
  ✓ MSE Global: 8/15 improvements (53.3%)
  ✓ MSE Boundary: 11/15 improvements (73.3%)
  ✓ Delta Boundary: 9/15 improvements (60.0%)
  ✓ k-NN Overlap: 7/15 improvements (46.7%)
  ✓ LSI: 8/15 improvements (53.3%)

===============================================================================
```

## Success Criteria

The experiment is considered successful if it:

✅ **Quantifies improvement or lack of improvement** with concrete metrics  
✅ **Provides charts** comparing baseline vs boundary-aware  
✅ **States clearly** whether this changes system behavior  
✅ **Produces regression-safe code** (all tests pass)  
✅ **Updates report** with conclusion and verdict

## Implementation Details

### Boundary-Aware Compression Logic

Located in `src/services/compressionService.ts`:

```typescript
if (options.method === 'boundary-aware') {
  // 1. Run k-means to get initial centroids
  const kMeansResult = runKMeansLite(originalVectors, k);
  
  // 2. Classify boundary vectors (bottom 10% by ambiguity score)
  const boundaryIndices = classifyBoundaryVectors(originalVectors, kMeansResult.centroids);
  
  // 3. Create two codebooks:
  //    - Fine grid (step × 0.5) for boundary vectors
  //    - Coarse grid (step) for bulk vectors
  
  // 4. Assign each vector to nearest centroid from appropriate codebook
}
```

### Metrics Computation

Extended boundary metrics in `src/services/boundaryMetricsService.ts`:

- `computeKNNOverlap()`: Jaccard similarity of k-NN sets
- `computeCompressionMetrics()`: Bits per vector, compression ratio

## Limitations

1. **Synthetic Data**: Validation uses synthetic datasets (clusters, rings, swiss roll)
2. **Fixed Percentile**: Uses 10%/90% quantiles (not adaptive)
3. **Simple Treatment**: Currently uses only grid step reduction; other strategies possible
4. **No Statistical Testing**: Results are descriptive, not inferential

## Future Extensions

Possible enhancements:
- Adaptive percentile thresholds
- Alternative boundary treatments (separate codebook, refinement pass)
- Real-world dataset validation
- Cross-validation across multiple seeds
- Statistical significance testing

## References

This experiment builds on:
- Boundary geometry analysis (see `docs/BOUNDARY_GEOMETRY_EXPERIMENT.md`)
- Product quantization literature
- Vector quantization theory

---

**Last Updated:** 2025-12-05
