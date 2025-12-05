# Boundary-Aware Compression: Quick Start

**Goal:** Determine if boundary-aware treatment measurably improves compression outcomes compared to vanilla quantization.

**Time:** ~15 minutes  
**Skill Level:** Intermediate (Python + TypeScript)

---

## Prerequisites

- Node.js + npm installed
- Python 3.7+ with matplotlib, numpy
- Repository cloned and dependencies installed

```bash
# Install TypeScript dependencies
npm install

# Install Python dependencies
pip install -r analysis/requirements.txt
```

---

## Step-by-Step Experiment

### 1. Generate Test Data (1 minute)

```bash
python analysis/run_boundary_aware_experiment.py \
  --dataset synthetic_clusters \
  --output results/boundary_test \
  --num-points 200
```

**Output:**
- `results/boundary_test/synthetic_clusters/baseline_embeddings.json`
- `results/boundary_test/synthetic_clusters/baseline_config.json`
- `results/boundary_test/synthetic_clusters/boundary_aware_embeddings.json`
- `results/boundary_test/synthetic_clusters/boundary_aware_config.json`

### 2. Run Experiments (TypeScript)

Create a simple runner script `run_experiment.ts`:

```typescript
import { runExperiment } from './src/experiments/experimentRunner';
import { EmbeddingMap } from './src/types';
import { readFileSync, writeFileSync } from 'fs';

async function main() {
  const dataDir = 'results/boundary_test/synthetic_clusters';
  
  // Load embeddings
  const embeddingsData = JSON.parse(
    readFileSync(`${dataDir}/baseline_embeddings.json`, 'utf-8')
  );
  
  const embeddings: EmbeddingMap = new Map();
  for (const item of embeddingsData) {
    embeddings.set(item.item, item.embedding);
  }
  
  console.log(`Loaded ${embeddings.size} embeddings`);
  
  // Run baseline
  console.log('\nRunning baseline experiment...');
  const baselineConfig = JSON.parse(
    readFileSync(`${dataDir}/baseline_config.json`, 'utf-8')
  );
  const baselineResult = await runExperiment(baselineConfig, embeddings);
  writeFileSync(
    `${dataDir}/baseline_result.json`,
    JSON.stringify(baselineResult, null, 2)
  );
  console.log('✓ Baseline complete');
  
  // Run boundary-aware
  console.log('\nRunning boundary-aware experiment...');
  const boundaryConfig = JSON.parse(
    readFileSync(`${dataDir}/boundary_aware_config.json`, 'utf-8')
  );
  const boundaryResult = await runExperiment(boundaryConfig, embeddings);
  writeFileSync(
    `${dataDir}/boundary_aware_result.json`,
    JSON.stringify(boundaryResult, null, 2)
  );
  console.log('✓ Boundary-aware complete');
  
  console.log('\nResults saved to:', dataDir);
}

main().catch(console.error);
```

Run it:

```bash
npx tsx run_experiment.ts
```

### 3. Compare Results (2 minutes)

```bash
python analysis/compare_boundary_aware.py \
  --experiments results/boundary_test/synthetic_clusters \
  --output-dir results/boundary_test/comparison
```

**Output:**
- Structured comparison table (printed to console)
- Verdict: ✅ EXPLOITABLE or ❌ OBSERVATIONAL ONLY
- Charts: `boundary_aware_comparison.png`, `lsi_comparison.png`
- JSON report: `boundary_aware_report.json`

---

## What to Look For

### In the Console Output

Look for the comparison table showing metrics side-by-side:

```
Grid     | Mode            | Global MSE   | Boundary MSE  | Δ_boundary   | k-NN Overlap | LSI
---------|-----------------|--------------|---------------|--------------|--------------|--------
0.0100   | Baseline        | 0.001234     | 0.002456      | 0.000987     | 0.9876       | 0.8765
         | Boundary-Aware  | 0.000987 ✅  | 0.001234 ✅   | 0.000234 ✅  | 0.9912 ✅    | 0.8923 ✅
```

**✅ markers indicate improvement**

### In the Verdict Section

```
===============================================================================
VERDICT: Is boundary geometry operational or cosmetic?
===============================================================================

✅ EXPLOITABLE (Confidence: HIGH)

Summary: Boundary-aware treatment shows consistent, measurable improvement (≥70% of cases)

Evidence:
  ✓ MSE Global: 12/15 improvements (80.0%)
  ✓ MSE Boundary: 14/15 improvements (93.3%)
  ...
```

### In the Charts

**`boundary_aware_comparison.png`:**
- If boundary-aware line is consistently **below** baseline on MSE plots → Good
- If boundary-aware line is consistently **above** baseline on k-NN overlap → Good

**`lsi_comparison.png`:**
- If boundary-aware line is **above** baseline → Boundary treatment preserves structure better

---

## Interpretation

### ✅ EXPLOITABLE

Boundary-aware treatment **measurably improves** one or more of:
- Global MSE (better compression quality)
- Boundary MSE (boundary vectors preserved better)
- k-NN overlap (neighbors preserved)
- LSI (semantic structure preserved)

**Conclusion:** Boundary geometry is **operational** — special handling provides measurable benefit.

**Recommended Action:**
- Consider boundary-aware mode for production use cases where compression quality is critical
- Validate on real-world embeddings
- Tune boundary percentile threshold (currently 10%)

### ❌ OBSERVATIONAL ONLY

No consistent improvement detected across metrics.

**Conclusion:** Boundary geometry is **cosmetic** — useful for analysis but doesn't improve compression.

**Recommended Action:**
- Use boundary metrics for diagnostics only
- Stick with standard lattice-hybrid compression
- No special boundary handling needed

---

## Troubleshooting

### "No such file or directory"

Make sure you ran step 1 (data generation) first.

### "Module not found" errors in TypeScript

```bash
npm install
npx tsc --noEmit  # Check for type errors
```

### Python import errors

```bash
pip install -r analysis/requirements.txt
```

### Plots look identical

Try with more extreme compression (higher grid step):

```bash
python analysis/run_boundary_aware_experiment.py \
  --dataset synthetic_clusters \
  --num-points 500
```

Then re-run steps 2 and 3.

---

## Running on Real Data

To test on real embeddings instead of synthetic data:

1. Export your embeddings to JSON format:
   ```json
   [
     {"item": "text1", "embedding": [0.1, 0.2, ...]},
     {"item": "text2", "embedding": [0.3, 0.4, ...]},
     ...
   ]
   ```

2. Manually create experiment configs pointing to your data

3. Run experiments and comparison as above

See `docs/BOUNDARY_AWARE_EXPERIMENT.md` for full details.

---

## Next Steps

1. **Validate on diverse datasets**: Try rings, swiss rolls, real text embeddings
2. **Test different configurations**: Vary k (clusters), grid step, percentiles
3. **Compare with baselines**: Test against scalar quantization, PQ
4. **Document findings**: Update reports with results

---

**Questions?** See `docs/BOUNDARY_AWARE_EXPERIMENT.md` for detailed documentation.

**Issues?** Check test output: `npm test`
