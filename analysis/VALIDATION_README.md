# Real-World Validation Infrastructure

This directory contains the complete validation framework for evaluating boundary-aware compression on real-world datasets.

## Quick Start

### 1. Run Validation (Synthetic Data)

```bash
# Quick test (5 grid steps, 3 k values, 1 seed)
python analysis/run_real_world_evaluation.py --datasets synthetic --quick

# Full validation (15 grid steps, 5 k values, 3 seeds)
python analysis/run_real_world_evaluation.py --datasets synthetic
```

### 2. Analyze Results

```bash
python analysis/analyze_validation_results.py
```

### 3. Review Reports

- **Summary:** `results/real_world_validation/ANALYSIS_SUMMARY.txt`
- **Detailed Stats:** `results/real_world_validation/ANALYSIS_STATS.json`
- **Full Report:** `docs/REAL_WORLD_VALIDATION_REPORT.md`
- **Decision:** `docs/DECISION_SUMMARY.md`

---

## Files Overview

### Configuration

- **`real_world_validation_config.json`** - Master configuration file
  - Defines datasets (synthetic, text, image)
  - Specifies compression parameter sweeps
  - Sets quality thresholds and execution settings

### Execution Scripts

- **`run_real_world_evaluation.py`** - Main evaluation runner
  - Generates synthetic datasets
  - Runs compression experiments
  - Computes all metrics
  - Saves results as JSON

- **`analyze_validation_results.py`** - Results analyzer
  - Aggregates metrics across runs
  - Compares baseline vs boundary-aware
  - Determines verdict (Exploitable/Observational/Rejected)
  - Generates summary reports

- **`real_world_validation.py`** - Core validation framework
  - Metric computation functions
  - Hardware profiling
  - Stability region detection
  - Supporting utilities

### Legacy Scripts (from earlier phases)

- **`run_boundary_aware_experiment.py`** - Boundary-aware experiment setup
- **`run_boundary_eval.py`** - Boundary evaluation harness
- **`plot_boundary_sweep.py`** - Boundary sweep visualization
- **`compare_boundary_aware.py`** - Method comparison

---

## Validation Workflow

```
1. Prepare datasets
   └─> generate_synthetic_embeddings()
   └─> OR load pre-computed real-world embeddings

2. Run experiments
   └─> For each dataset:
       └─> For each (grid_step, k) pair:
           └─> Compress with baseline
           └─> Compress with boundary-aware
           └─> Compute metrics

3. Analyze results
   └─> Aggregate by method
   └─> Compare methods
   └─> Determine verdict

4. Generate reports
   └─> ANALYSIS_SUMMARY.txt
   └─> ANALYSIS_STATS.json
   └─> Update validation report
   └─> Update decision summary
```

---

## Metrics Computed

### Retrieval Metrics
- **Recall@10** - Fraction of true top-10 neighbors preserved
- **Recall@100** - Fraction of true top-100 neighbors preserved
- **MRR** - Mean Reciprocal Rank of true nearest neighbor
- **NDCG@10** - Normalized Discounted Cumulative Gain

### Clustering Metrics
- **Silhouette Score** - Cluster cohesion measure
- **NMI** - Normalized Mutual Information
- **ARI** - Adjusted Rand Index

### Performance Metrics
- **Compression Time** - Time to compress embeddings
- **Memory Footprint** - Estimated bits per vector
- **Unique Centroids** - Number of distinct compressed points

---

## Verdict Criteria

### ✅ EXPLOITABLE
- Recall@10 improvement > 2%
- Performance overhead < 100%
- **Action:** Deploy in production

### 🟡 OBSERVATIONAL
- Signal exists but below thresholds
- 0% < Recall improvement < 2%
- OR overhead > 100%
- **Action:** Research contribution, not production-ready

### ❌ REJECTED
- No improvement or regression
- Overhead unacceptable
- **Action:** Abandon approach

---

## Adding Real-World Datasets

To evaluate on real embeddings:

1. **Generate embeddings** using your embedding model:
   ```python
   from sentence_transformers import SentenceTransformer
   
   model = SentenceTransformer('all-MiniLM-L6-v2')
   sentences = [...]  # Your data
   embeddings = model.encode(sentences)
   
   # Save as numpy array
   np.save('embeddings.npy', embeddings)
   ```

2. **Update config** (`real_world_validation_config.json`):
   ```json
   {
     "datasets": {
       "text_embeddings": {
         "my_dataset": {
           "type": "text",
           "source": "custom",
           "embeddings_path": "data/embeddings.npy",
           "dimension": 384,
           "enabled": true
         }
       }
     }
   }
   ```

3. **Run validation:**
   ```bash
   python analysis/run_real_world_evaluation.py --datasets my_dataset
   ```

---

## Current Validation Results (Synthetic Data)

**Datasets:** 3 (clusters, rings, swiss_roll)  
**Seeds:** 3 (42, 123, 456)  
**Total Experiments:** 270

### Key Findings

| Metric | Baseline | Boundary-Aware | Improvement |
|--------|----------|----------------|-------------|
| **Recall@10** | 0.133 | 0.149 | **+12.1%** ✓ |
| **MRR** | 0.041 | 0.054 | **+30.6%** ✓ |
| **NDCG@10** | 0.339 | 0.354 | **+4.4%** ✓ |
| **Compression Time** | 3.6ms | 7.7ms | **+114%** ✗ |

### Verdict: ❌ REJECTED

**Reason:** While boundary-aware compression demonstrates measurable improvements in retrieval metrics (Recall@10: +12%, MRR: +31%), the performance overhead (+114%, more than 2x slower) makes it impractical for production use.

**Interpretation:** The boundary geometry signal is **real** and **exploitable in principle**, but the current implementation is too slow. Future work could focus on optimizing the boundary classification step or using approximate methods.

---

## Dependencies

```bash
pip install -r requirements.txt
```

Requirements:
- numpy >= 1.20.0
- matplotlib >= 3.3.0
- psutil >= 5.8.0
- scipy >= 1.7.0

---

## Scientific Rigor

This validation framework follows scientific best practices:

1. **No cherry-picking** - All experimental runs are saved
2. **Multiple seeds** - Cross-validation with different random seeds
3. **Clear thresholds** - Predefined criteria for verdict
4. **Full transparency** - All results available in JSON
5. **Reproducibility** - Configuration and scripts provided
6. **No hype** - Honest assessment including failures

---

## Future Work

### Optimizations to Explore
1. **Faster boundary classification** - Use approximate methods
2. **Adaptive grid steps** - Learn optimal grid per region
3. **Hybrid approaches** - Boundary-aware only for critical vectors

### Real-World Validation
1. **Text:** SentenceBERT on Wikipedia, STS, BEIR
2. **Images:** CLIP on ImageNet, CIFAR-10
3. **Comparison:** FAISS IVF, ScaNN, Product Quantization

### Open Questions
1. Does boundary stress vary by embedding type?
2. Can we predict which datasets benefit most?
3. Is there a faster boundary detection algorithm?

---

## License

MIT License - See repository LICENSE file

---

## Contact

See main repository README for contact information.

**Remember: Truth over narrative. Data over hype.**
