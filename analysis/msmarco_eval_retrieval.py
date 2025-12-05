#!/usr/bin/env python3
"""
MS MARCO Retrieval Evaluation Script

Evaluates retrieval quality using compressed embeddings.

NO SIMULATION. REAL METRICS.
- Computes Recall@10, Recall@100, MRR, NDCG@10
- Uses real relevance judgments from MS MARCO
- Saves metrics for baseline and boundary-aware modes

Usage:
    python analysis/msmarco_eval_retrieval.py
    python analysis/msmarco_eval_retrieval.py --mode baseline
"""

import json
import sys
import argparse
import numpy as np
from pathlib import Path
from typing import List, Dict, Set, Tuple
import time

try:
    from tqdm import tqdm
except ImportError:
    print("ERROR: tqdm not installed")
    print("Install with: pip install tqdm")
    sys.exit(1)


def load_qrels(qrels_path: Path) -> Dict[str, Set[str]]:
    """
    Load relevance judgments.
    
    Returns:
        dict mapping query_id -> set of relevant passage_ids
    """
    print(f"Loading qrels from {qrels_path}...")
    qrels = {}
    
    with open(qrels_path, 'r') as f:
        # Skip header
        next(f)
        for line in f:
            parts = line.strip().split('\t')
            if len(parts) >= 3:
                query_id, passage_id, relevance = parts[0], parts[1], int(parts[2])
                if relevance > 0:  # Only consider positive relevance
                    if query_id not in qrels:
                        qrels[query_id] = set()
                    qrels[query_id].add(passage_id)
    
    print(f"✓ Loaded qrels for {len(qrels)} queries")
    return qrels


def load_queries_metadata(queries_path: Path) -> List[Dict]:
    """Load query metadata (query_id, query text)."""
    print(f"Loading queries metadata from {queries_path}...")
    queries = []
    with open(queries_path, 'r') as f:
        for line in f:
            queries.append(json.loads(line.strip()))
    print(f"✓ Loaded {len(queries)} queries")
    return queries


def load_passages_metadata(passages_path: Path) -> List[Dict]:
    """Load passage metadata (passage_id, passage text)."""
    print(f"Loading passages metadata from {passages_path}...")
    passages = []
    with open(passages_path, 'r') as f:
        for line in f:
            passages.append(json.loads(line.strip()))
    print(f"✓ Loaded {len(passages)} passages")
    return passages


def search_top_k(query_embedding: np.ndarray, passage_embeddings: np.ndarray, k: int) -> np.ndarray:
    """
    Find top-k nearest passages to query using exact search.
    
    Args:
        query_embedding: (embedding_dim,) array
        passage_embeddings: (n_passages, embedding_dim) array
        k: number of top results to return
    
    Returns:
        indices: (k,) array of passage indices, sorted by similarity (highest first)
    """
    # Compute cosine similarity
    # Normalize vectors
    query_norm = query_embedding / (np.linalg.norm(query_embedding) + 1e-10)
    passages_norm = passage_embeddings / (np.linalg.norm(passage_embeddings, axis=1, keepdims=True) + 1e-10)
    
    # Compute similarities
    similarities = np.dot(passages_norm, query_norm)
    
    # Get top-k indices (argsort returns ascending, so we reverse)
    top_k_indices = np.argsort(similarities)[::-1][:k]
    
    return top_k_indices


def compute_recall_at_k(retrieved: List[str], relevant: Set[str], k: int) -> float:
    """
    Compute Recall@k.
    
    Args:
        retrieved: list of retrieved passage IDs (ordered)
        relevant: set of relevant passage IDs
        k: cutoff
    
    Returns:
        recall@k value
    """
    if not relevant:
        return 0.0
    
    retrieved_at_k = set(retrieved[:k])
    relevant_retrieved = retrieved_at_k & relevant
    
    return len(relevant_retrieved) / len(relevant)


def compute_mrr(retrieved: List[str], relevant: Set[str]) -> float:
    """
    Compute Mean Reciprocal Rank (MRR).
    
    Args:
        retrieved: list of retrieved passage IDs (ordered)
        relevant: set of relevant passage IDs
    
    Returns:
        reciprocal rank (1/rank of first relevant document, or 0 if none found)
    """
    for i, passage_id in enumerate(retrieved):
        if passage_id in relevant:
            return 1.0 / (i + 1)
    return 0.0


def compute_dcg_at_k(retrieved: List[str], relevant: Set[str], k: int) -> float:
    """
    Compute Discounted Cumulative Gain at k.
    
    Args:
        retrieved: list of retrieved passage IDs (ordered)
        relevant: set of relevant passage IDs
        k: cutoff
    
    Returns:
        DCG@k value
    """
    dcg = 0.0
    for i, passage_id in enumerate(retrieved[:k]):
        if passage_id in relevant:
            # Binary relevance: rel = 1 if relevant, 0 otherwise
            # DCG formula: sum(rel_i / log2(i+2))
            dcg += 1.0 / np.log2(i + 2)
    return dcg


def compute_ndcg_at_k(retrieved: List[str], relevant: Set[str], k: int) -> float:
    """
    Compute Normalized Discounted Cumulative Gain at k.
    
    Args:
        retrieved: list of retrieved passage IDs (ordered)
        relevant: set of relevant passage IDs
        k: cutoff
    
    Returns:
        NDCG@k value
    """
    dcg = compute_dcg_at_k(retrieved, relevant, k)
    
    # Compute ideal DCG (all relevant docs at top)
    num_relevant = len(relevant)
    ideal_retrieved = ['relevant'] * min(num_relevant, k)
    ideal_relevant = set(ideal_retrieved)
    idcg = compute_dcg_at_k(ideal_retrieved, ideal_relevant, k)
    
    if idcg == 0:
        return 0.0
    
    return dcg / idcg


def evaluate_retrieval(
    query_embeddings: np.ndarray,
    passage_embeddings: np.ndarray,
    qrels: Dict[str, Set[str]],
    queries_metadata: List[Dict],
    passages_metadata: List[Dict],
    top_k: int = 100
) -> Dict:
    """
    Evaluate retrieval metrics.
    
    Args:
        query_embeddings: (n_queries, embedding_dim)
        passage_embeddings: (n_passages, embedding_dim)
        qrels: query_id -> set of relevant passage_ids
        queries_metadata: list of query dicts with 'query_id'
        passages_metadata: list of passage dicts with 'passage_id'
        top_k: maximum k for retrieval
    
    Returns:
        metrics dict
    """
    print(f"\nEvaluating retrieval (top-{top_k})...")
    
    recall_10_scores = []
    recall_100_scores = []
    mrr_scores = []
    ndcg_10_scores = []
    
    num_queries = len(queries_metadata)
    queries_with_qrels = 0
    
    # Create passage_id to index mapping
    passage_id_to_idx = {p['passage_id']: i for i, p in enumerate(passages_metadata)}
    
    start_time = time.time()
    
    for i, query_meta in enumerate(tqdm(queries_metadata, desc="Evaluating queries")):
        query_id = query_meta['query_id']
        
        # Skip if no qrels for this query
        if query_id not in qrels:
            continue
        
        queries_with_qrels += 1
        query_embedding = query_embeddings[i]
        
        # Retrieve top-k passages
        top_indices = search_top_k(query_embedding, passage_embeddings, top_k)
        
        # Convert indices to passage IDs
        retrieved_ids = [passages_metadata[idx]['passage_id'] for idx in top_indices]
        
        # Get relevant passage IDs for this query
        relevant_ids = qrels[query_id]
        
        # Compute metrics
        recall_10 = compute_recall_at_k(retrieved_ids, relevant_ids, 10)
        recall_100 = compute_recall_at_k(retrieved_ids, relevant_ids, 100)
        mrr = compute_mrr(retrieved_ids, relevant_ids)
        ndcg_10 = compute_ndcg_at_k(retrieved_ids, relevant_ids, 10)
        
        recall_10_scores.append(recall_10)
        recall_100_scores.append(recall_100)
        mrr_scores.append(mrr)
        ndcg_10_scores.append(ndcg_10)
    
    eval_time = time.time() - start_time
    
    # Compute average metrics
    metrics = {
        'recall@10': float(np.mean(recall_10_scores)) if recall_10_scores else 0.0,
        'recall@100': float(np.mean(recall_100_scores)) if recall_100_scores else 0.0,
        'mrr': float(np.mean(mrr_scores)) if mrr_scores else 0.0,
        'ndcg@10': float(np.mean(ndcg_10_scores)) if ndcg_10_scores else 0.0,
        'num_queries': int(num_queries),
        'num_queries_with_qrels': int(queries_with_qrels),
        'num_passages': int(len(passages_metadata)),
        'evaluation_time_seconds': float(eval_time),
        'avg_query_latency_ms': float(eval_time / queries_with_qrels * 1000) if queries_with_qrels > 0 else 0.0
    }
    
    print(f"\n✓ Evaluation complete")
    print(f"  - Queries evaluated: {queries_with_qrels}")
    print(f"  - Evaluation time: {eval_time:.2f} seconds")
    print(f"  - Avg query latency: {metrics['avg_query_latency_ms']:.2f} ms")
    
    return metrics


def save_metrics(metrics: Dict, output_path: Path):
    """Save metrics to JSON file."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'w') as f:
        json.dump(metrics, f, indent=2)
    print(f"✓ Saved metrics to {output_path}")


def print_metrics(metrics: Dict, mode: str):
    """Print metrics summary."""
    print("\n" + "="*80)
    print(f"{mode.upper()} RETRIEVAL METRICS")
    print("="*80)
    print(f"Recall@10:   {metrics['recall@10']:.4f}")
    print(f"Recall@100:  {metrics['recall@100']:.4f}")
    print(f"MRR:         {metrics['mrr']:.4f}")
    print(f"NDCG@10:     {metrics['ndcg@10']:.4f}")
    print(f"\nQueries:     {metrics['num_queries_with_qrels']} (with qrels)")
    print(f"Passages:    {metrics['num_passages']}")
    print(f"Query latency: {metrics['avg_query_latency_ms']:.2f} ms")
    print("="*80)


def main():
    parser = argparse.ArgumentParser(
        description='Evaluate retrieval on MS MARCO with compressed embeddings'
    )
    parser.add_argument(
        '--mode',
        choices=['baseline', 'boundary', 'both'],
        default='both',
        help='Which compression mode to evaluate (default: both)'
    )
    parser.add_argument(
        '--data-dir',
        default='data/msmarco_subset',
        help='Directory containing MS MARCO subset data'
    )
    parser.add_argument(
        '--results-dir',
        default='results/msmarco',
        help='Directory containing compressed embeddings'
    )
    parser.add_argument(
        '--top-k',
        type=int,
        default=100,
        help='Maximum k for retrieval (default: 100)'
    )
    
    args = parser.parse_args()
    
    data_dir = Path(args.data_dir)
    results_dir = Path(args.results_dir)
    
    print("="*80)
    print("MS MARCO RETRIEVAL EVALUATION")
    print("="*80)
    print(f"\nConfiguration:")
    print(f"  - Mode: {args.mode}")
    print(f"  - Data: {data_dir}")
    print(f"  - Results: {results_dir}")
    print(f"  - Top-k: {args.top_k}")
    print("\nNO SIMULATION. REAL METRICS.")
    print("="*80)
    
    try:
        # Load metadata
        queries_metadata = load_queries_metadata(data_dir / 'queries.jsonl')
        passages_metadata = load_passages_metadata(data_dir / 'passages.jsonl')
        qrels = load_qrels(data_dir / 'qrels.tsv')
        
        # Load query embeddings (same for both modes)
        query_embeddings_path = data_dir / 'queries_embeddings.npy'
        if not query_embeddings_path.exists():
            raise FileNotFoundError(f"Query embeddings not found: {query_embeddings_path}")
        
        print(f"\nLoading query embeddings from {query_embeddings_path}...")
        query_embeddings = np.load(query_embeddings_path)
        print(f"✓ Loaded query embeddings: shape {query_embeddings.shape}")
        
        # Evaluate baseline
        if args.mode in ['baseline', 'both']:
            print("\n" + "="*80)
            print("EVALUATING BASELINE")
            print("="*80)
            
            baseline_embeddings_path = results_dir / 'baseline' / 'compressed_passages.npy'
            if not baseline_embeddings_path.exists():
                raise FileNotFoundError(f"Baseline compressed embeddings not found: {baseline_embeddings_path}")
            
            print(f"Loading baseline compressed embeddings from {baseline_embeddings_path}...")
            baseline_embeddings = np.load(baseline_embeddings_path)
            print(f"✓ Loaded baseline embeddings: shape {baseline_embeddings.shape}")
            
            baseline_metrics = evaluate_retrieval(
                query_embeddings,
                baseline_embeddings,
                qrels,
                queries_metadata,
                passages_metadata,
                args.top_k
            )
            
            # Save metrics
            baseline_metrics_path = results_dir / 'baseline' / 'metrics.json'
            save_metrics(baseline_metrics, baseline_metrics_path)
            
            # Save performance info
            perf_info = {
                'avg_query_latency_ms': baseline_metrics['avg_query_latency_ms'],
                'evaluation_time_seconds': baseline_metrics['evaluation_time_seconds'],
                'mode': 'baseline'
            }
            perf_path = results_dir / 'baseline' / 'perf.json'
            save_metrics(perf_info, perf_path)
            
            print_metrics(baseline_metrics, 'baseline')
        
        # Evaluate boundary-aware
        if args.mode in ['boundary', 'both']:
            print("\n" + "="*80)
            print("EVALUATING BOUNDARY-AWARE")
            print("="*80)
            
            boundary_embeddings_path = results_dir / 'boundary' / 'compressed_passages.npy'
            if not boundary_embeddings_path.exists():
                raise FileNotFoundError(f"Boundary-aware compressed embeddings not found: {boundary_embeddings_path}")
            
            print(f"Loading boundary-aware compressed embeddings from {boundary_embeddings_path}...")
            boundary_embeddings = np.load(boundary_embeddings_path)
            print(f"✓ Loaded boundary-aware embeddings: shape {boundary_embeddings.shape}")
            
            boundary_metrics = evaluate_retrieval(
                query_embeddings,
                boundary_embeddings,
                qrels,
                queries_metadata,
                passages_metadata,
                args.top_k
            )
            
            # Save metrics
            boundary_metrics_path = results_dir / 'boundary' / 'metrics.json'
            save_metrics(boundary_metrics, boundary_metrics_path)
            
            # Save performance info
            perf_info = {
                'avg_query_latency_ms': boundary_metrics['avg_query_latency_ms'],
                'evaluation_time_seconds': boundary_metrics['evaluation_time_seconds'],
                'mode': 'boundary-aware'
            }
            perf_path = results_dir / 'boundary' / 'perf.json'
            save_metrics(perf_info, perf_path)
            
            print_metrics(boundary_metrics, 'boundary-aware')
        
        print("\n" + "="*80)
        print("SUCCESS: Retrieval evaluation complete")
        print("="*80)
        
        return 0
        
    except Exception as e:
        print("\n" + "="*80)
        print("FAILURE: Could not evaluate retrieval")
        print("="*80)
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
        
        return 1


if __name__ == '__main__':
    sys.exit(main())
