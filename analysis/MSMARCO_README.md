# MS MARCO Real Data Benchmark

This directory contains scripts for running a real MS MARCO retrieval benchmark to evaluate boundary-aware compression.

## Scripts

### 1. `msmarco_prepare_subset.py`
Downloads and prepares a real MS MARCO passage subset.
- Downloads MS MARCO v1.1 from Hugging Face
- Selects a subset of passages and queries with relevance labels
- Saves to `data/msmarco_subset/`

**Usage:**
```bash
python analysis/msmarco_prepare_subset.py
python analysis/msmarco_prepare_subset.py --num-passages 50000 --num-queries 1000
```

### 2. `msmarco_embed.py`
Generates real embeddings using a neural network model.
- Uses sentence-transformers/all-MiniLM-L6-v2
- Processes in batches to avoid OOM
- Saves embeddings as .npy files

**Usage:**
```bash
python analysis/msmarco_embed.py
python analysis/msmarco_embed.py --batch-size 32 --model sentence-transformers/all-MiniLM-L6-v2
```

### 3. `msmarco_run_compression.py`
Runs baseline and boundary-aware compression.
- Baseline: lattice-hybrid (k-means + grid)
- Boundary-aware: differential treatment for boundary vectors
- Measures compression time
- Saves compressed embeddings

**Usage:**
```bash
python analysis/msmarco_run_compression.py
python analysis/msmarco_run_compression.py --grid 0.1 --k 10
```

### 4. `msmarco_eval_retrieval.py`
Evaluates retrieval quality with compressed embeddings.
- Computes Recall@10, Recall@100, MRR, NDCG@10
- Uses real relevance judgments from MS MARCO
- Measures query latency
- Saves metrics for both baseline and boundary-aware modes

**Usage:**
```bash
python analysis/msmarco_eval_retrieval.py --mode both
python analysis/msmarco_eval_retrieval.py --mode baseline
python analysis/msmarco_eval_retrieval.py --mode boundary
```

### 5. `msmarco_run_pipeline.py`
Orchestrates the complete pipeline.
- Runs all steps in sequence
- Generates final report with metrics comparison
- Handles failures gracefully (NO simulation fallback)

**Usage:**
```bash
python analysis/msmarco_run_pipeline.py
```

## Requirements

Install dependencies:
```bash
pip install -r analysis/requirements.txt
```

Required packages:
- `datasets` - for downloading MS MARCO from Hugging Face
- `sentence-transformers` - for generating embeddings
- `torch` - PyTorch backend for transformers
- `scikit-learn` - for k-means clustering
- `numpy`, `scipy`, `tqdm`, `matplotlib`

## NO SIMULATION POLICY

**CRITICAL:** These scripts follow a strict NO SIMULATION policy:

- ✅ Use real MS MARCO data from Hugging Face
- ✅ Use real neural network models for embeddings
- ✅ Compute real metrics from actual retrieval results
- ❌ NO synthetic "MS MARCO-like" data
- ❌ NO fabricated metrics
- ❌ NO simulated results

**If the benchmark cannot be run** (e.g., network issues, resource constraints), the pipeline will:
1. Clearly state the failure reason
2. Generate a failure report in `docs/MSMARCO_REAL_DATA_VERDICT.md`
3. **NOT** fall back to simulation or fabrication

## Pipeline Flow

```
1. msmarco_prepare_subset.py
   ↓
   Downloads MS MARCO → saves to data/msmarco_subset/
   
2. msmarco_embed.py
   ↓
   Loads passages/queries → generates embeddings → saves .npy files
   
3. msmarco_run_compression.py
   ↓
   Loads embeddings → runs baseline & boundary compression → saves to results/msmarco/
   
4. msmarco_eval_retrieval.py
   ↓
   Loads compressed embeddings → evaluates retrieval → saves metrics
   
5. msmarco_run_pipeline.py
   ↓
   Orchestrates all steps → generates final report in docs/MSMARCO_REAL_DATA_VERDICT.md
```

## Output Structure

```
data/msmarco_subset/
├── passages.jsonl           # MS MARCO passages
├── queries.jsonl            # MS MARCO queries
├── qrels.tsv                # Relevance judgments
├── passages_embeddings.npy  # Passage embeddings
├── queries_embeddings.npy   # Query embeddings
├── meta.json                # Embedding metadata
└── dataset_info.json        # Dataset statistics

results/msmarco/
├── baseline/
│   ├── compressed_passages.npy  # Baseline compressed embeddings
│   ├── compression_info.json    # Compression metadata
│   ├── metrics.json             # Retrieval metrics
│   └── perf.json                # Performance metrics
├── boundary/
│   ├── compressed_passages.npy  # Boundary-aware compressed embeddings
│   ├── compression_info.json    # Compression metadata
│   ├── metrics.json             # Retrieval metrics
│   └── perf.json                # Performance metrics
└── run_config.json              # Overall run configuration

docs/
└── MSMARCO_REAL_DATA_VERDICT.md  # Final report with verdict
```

## Example Output

When successful, `MSMARCO_REAL_DATA_VERDICT.md` will contain:
- Dataset details (num passages, queries)
- Embedding model information
- Compression parameters
- Metrics comparison table (Recall@10, Recall@100, MRR, NDCG@10)
- Performance overhead analysis
- Final verdict: ✅ EXPLOITABLE / 🟡 OBSERVATIONAL / ❌ REJECTED

When failed (e.g., network issues), it will contain:
- Clear failure statement
- Exact error message
- What was attempted
- Why it failed
- NO fabricated results

## Resource Requirements

- **Disk space**: ~2-3GB for dataset and embeddings
- **RAM**: ~4-8GB (for embedding generation)
- **Time**: ~30-60 minutes for full pipeline
- **Network**: Required for downloading MS MARCO and model weights
- **GPU**: Optional (speeds up embedding generation)

## Troubleshooting

**Network errors:**
- Ensure access to `huggingface.co`
- Check firewall/proxy settings

**Out of memory:**
- Reduce `--num-passages` or `--num-queries`
- Reduce `--batch-size` for embedding generation

**Slow execution:**
- Use GPU if available
- Reduce dataset size
- Increase `--batch-size` if you have enough RAM
