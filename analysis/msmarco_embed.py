#!/usr/bin/env python3
"""
MS MARCO Embedding Generation Script

Computes real embeddings for MS MARCO passages and queries using a real model.

NO SIMULATION. NO FAKE EMBEDDINGS.
- Uses sentence-transformers/all-MiniLM-L6-v2 (or similar)
- Generates real embeddings for passages and queries
- Saves to .npy files with metadata

Usage:
    python analysis/msmarco_embed.py
    python analysis/msmarco_embed.py --model sentence-transformers/all-MiniLM-L6-v2
"""

import json
import sys
import argparse
import numpy as np
from pathlib import Path
from typing import List, Dict
import time

try:
    from sentence_transformers import SentenceTransformer
    from tqdm import tqdm
except ImportError as e:
    print(f"ERROR: Required library not installed: {e}")
    print("Install dependencies with: pip install sentence-transformers tqdm")
    sys.exit(1)


def load_passages(passages_path: Path) -> List[Dict]:
    """Load passages from JSONL file."""
    print(f"Loading passages from {passages_path}...")
    passages = []
    with open(passages_path, 'r') as f:
        for line in f:
            passages.append(json.loads(line.strip()))
    print(f"Loaded {len(passages)} passages")
    return passages


def load_queries(queries_path: Path) -> List[Dict]:
    """Load queries from JSONL file."""
    print(f"Loading queries from {queries_path}...")
    queries = []
    with open(queries_path, 'r') as f:
        for line in f:
            queries.append(json.loads(line.strip()))
    print(f"Loaded {len(queries)} queries")
    return queries


def embed_texts(model: SentenceTransformer, texts: List[str], batch_size: int = 32, desc: str = "Embedding") -> np.ndarray:
    """
    Embed texts using the model.
    
    Args:
        model: SentenceTransformer model
        texts: List of text strings to embed
        batch_size: Batch size for processing
        desc: Description for progress bar
    
    Returns:
        numpy array of embeddings (num_texts, embedding_dim)
    """
    print(f"\n{desc}...")
    print(f"  - Texts: {len(texts)}")
    print(f"  - Batch size: {batch_size}")
    
    embeddings = []
    
    # Process in batches with progress bar
    for i in tqdm(range(0, len(texts), batch_size), desc=desc):
        batch_texts = texts[i:i+batch_size]
        batch_embeddings = model.encode(batch_texts, show_progress_bar=False)
        embeddings.append(batch_embeddings)
    
    # Concatenate all batches
    embeddings = np.vstack(embeddings)
    
    print(f"✓ Generated embeddings: shape {embeddings.shape}")
    
    return embeddings


def save_embeddings(embeddings: np.ndarray, output_path: Path, entity_type: str):
    """Save embeddings to .npy file."""
    print(f"\nSaving {entity_type} embeddings to {output_path}...")
    np.save(output_path, embeddings)
    print(f"✓ Saved {embeddings.shape[0]} {entity_type} embeddings")


def save_metadata(model_name: str, embedding_dim: int, num_passages: int, num_queries: int, output_path: Path):
    """Save embedding metadata."""
    metadata = {
        'model_name': model_name,
        'embedding_dim': embedding_dim,
        'num_passages': num_passages,
        'num_queries': num_queries,
        'embedding_library': 'sentence-transformers'
    }
    
    print(f"\nSaving metadata to {output_path}...")
    with open(output_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    
    print("✓ Metadata saved")


def main():
    parser = argparse.ArgumentParser(
        description='Generate embeddings for MS MARCO subset'
    )
    parser.add_argument(
        '--input-dir',
        default='data/msmarco_subset',
        help='Input directory containing passages.jsonl and queries.jsonl'
    )
    parser.add_argument(
        '--output-dir',
        default='data/msmarco_subset',
        help='Output directory for embeddings'
    )
    parser.add_argument(
        '--model',
        default='sentence-transformers/all-MiniLM-L6-v2',
        help='Sentence-BERT model to use (default: all-MiniLM-L6-v2)'
    )
    parser.add_argument(
        '--batch-size',
        type=int,
        default=32,
        help='Batch size for embedding (default: 32)'
    )
    
    args = parser.parse_args()
    
    input_dir = Path(args.input_dir)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print("="*80)
    print("MS MARCO EMBEDDING GENERATION")
    print("="*80)
    print(f"\nConfiguration:")
    print(f"  - Model: {args.model}")
    print(f"  - Input: {input_dir}")
    print(f"  - Output: {output_dir}")
    print(f"  - Batch size: {args.batch_size}")
    print(f"\nWARNING: This will download and use a REAL embedding model.")
    print("NO FAKE EMBEDDINGS. NO SIMULATION.")
    print("="*80)
    
    try:
        # Check if input files exist
        passages_path = input_dir / 'passages.jsonl'
        queries_path = input_dir / 'queries.jsonl'
        
        if not passages_path.exists():
            raise FileNotFoundError(f"Passages file not found: {passages_path}")
        if not queries_path.exists():
            raise FileNotFoundError(f"Queries file not found: {queries_path}")
        
        # Load data
        passages = load_passages(passages_path)
        queries = load_queries(queries_path)
        
        # Load model
        print(f"\nLoading model: {args.model}...")
        start_time = time.time()
        model = SentenceTransformer(args.model)
        load_time = time.time() - start_time
        print(f"✓ Model loaded in {load_time:.2f} seconds")
        
        # Get embedding dimension
        test_embedding = model.encode(["test"], show_progress_bar=False)
        embedding_dim = test_embedding.shape[1]
        print(f"  - Embedding dimension: {embedding_dim}")
        
        # Embed passages
        passage_texts = [p['passage'] for p in passages]
        passage_embeddings = embed_texts(
            model,
            passage_texts,
            batch_size=args.batch_size,
            desc="Embedding passages"
        )
        
        # Embed queries
        query_texts = [q['query'] for q in queries]
        query_embeddings = embed_texts(
            model,
            query_texts,
            batch_size=args.batch_size,
            desc="Embedding queries"
        )
        
        # Save embeddings
        passage_emb_path = output_dir / 'passages_embeddings.npy'
        query_emb_path = output_dir / 'queries_embeddings.npy'
        
        save_embeddings(passage_embeddings, passage_emb_path, "passage")
        save_embeddings(query_embeddings, query_emb_path, "query")
        
        # Save metadata
        meta_path = output_dir / 'meta.json'
        save_metadata(
            args.model,
            embedding_dim,
            len(passages),
            len(queries),
            meta_path
        )
        
        print("\n" + "="*80)
        print("SUCCESS: Embeddings generated")
        print("="*80)
        print(f"\nOutput files:")
        print(f"  - {passage_emb_path}")
        print(f"  - {query_emb_path}")
        print(f"  - {meta_path}")
        print(f"\nEmbedding statistics:")
        print(f"  - Model: {args.model}")
        print(f"  - Dimension: {embedding_dim}")
        print(f"  - Passage embeddings: {passage_embeddings.shape}")
        print(f"  - Query embeddings: {query_embeddings.shape}")
        
        return 0
        
    except Exception as e:
        print("\n" + "="*80)
        print("FAILURE: Could not generate embeddings")
        print("="*80)
        print(f"\nError: {e}")
        print("\nThis environment cannot run the MS MARCO benchmark.")
        
        return 1


if __name__ == '__main__':
    sys.exit(main())
