#!/usr/bin/env python3
"""
MS MARCO Subset Preparation Script

Downloads and prepares a real MS MARCO passage subset for retrieval benchmarking.

NO SIMULATION. NO FABRICATION.
- Uses real MS MARCO dataset from Hugging Face
- Selects ~50k passages and ~1k queries with relevance labels
- Saves to data/msmarco_subset/

Usage:
    python analysis/msmarco_prepare_subset.py
    python analysis/msmarco_prepare_subset.py --num-passages 50000 --num-queries 1000
"""

import json
import sys
import argparse
from pathlib import Path
from typing import Dict, List, Tuple
import random

try:
    from datasets import load_dataset
    from tqdm import tqdm
except ImportError as e:
    print(f"ERROR: Required library not installed: {e}")
    print("Install dependencies with: pip install datasets tqdm")
    sys.exit(1)


def load_msmarco_data(num_passages: int, num_queries: int, seed: int = 42) -> Tuple[List[Dict], List[Dict], List[Dict]]:
    """
    Load MS MARCO passage ranking dataset from Hugging Face.
    
    Returns:
        (passages, queries, qrels)
    """
    print("Loading MS MARCO dataset from Hugging Face...")
    
    try:
        # Load MS MARCO passage ranking dataset
        # Using the 'train' split which has passages, queries, and relevance judgments
        dataset = load_dataset('ms_marco', 'v1.1', split='train', trust_remote_code=True)
        
        print(f"Dataset loaded successfully. Total examples: {len(dataset)}")
        
        # MS MARCO v1.1 format:
        # - query: the query text
        # - passages: list of passage objects with 'passage_text' and other fields
        # - query_id: unique identifier for query
        # - answers: list of answer strings (we'll use these for relevance)
        
        passages_dict = {}
        queries_list = []
        qrels_list = []
        
        # Set random seed for reproducibility
        random.seed(seed)
        indices = list(range(len(dataset)))
        random.shuffle(indices)
        
        # Sample subset of data
        sampled_indices = indices[:min(num_queries * 10, len(dataset))]  # Sample more to ensure we get enough passages
        
        query_count = 0
        passage_id_counter = 0
        
        print(f"\nProcessing {len(sampled_indices)} examples to extract passages, queries, and qrels...")
        
        for idx in tqdm(sampled_indices):
            if query_count >= num_queries:
                break
                
            example = dataset[idx]
            
            query_text = example.get('query', '')
            passages = example.get('passages', {})
            
            if not query_text or not passages:
                continue
            
            # Extract query
            query_id = f"q{query_count}"
            queries_list.append({
                'query_id': query_id,
                'query': query_text
            })
            
            # Extract passages from this query's context
            passage_texts = passages.get('passage_text', [])
            is_selected = passages.get('is_selected', [])
            
            for i, passage_text in enumerate(passage_texts):
                if len(passages_dict) >= num_passages:
                    break
                    
                # Create passage entry
                passage_id = f"p{passage_id_counter}"
                if passage_id not in passages_dict:
                    passages_dict[passage_id] = {
                        'passage_id': passage_id,
                        'passage': passage_text
                    }
                    passage_id_counter += 1
                
                # Create qrel if this passage is relevant to the query
                if i < len(is_selected) and is_selected[i] == 1:
                    qrels_list.append({
                        'query_id': query_id,
                        'passage_id': passage_id,
                        'relevance': 1
                    })
            
            query_count += 1
            
            if len(passages_dict) >= num_passages:
                break
        
        passages_list = list(passages_dict.values())
        
        print(f"\nExtracted:")
        print(f"  - {len(passages_list)} passages")
        print(f"  - {len(queries_list)} queries")
        print(f"  - {len(qrels_list)} relevance judgments")
        
        return passages_list, queries_list, qrels_list
        
    except Exception as e:
        print(f"\nERROR: Failed to load MS MARCO dataset: {e}")
        print("\nPossible reasons:")
        print("  1. Network connectivity issue")
        print("  2. Hugging Face datasets library version incompatible")
        print("  3. Dataset format changed")
        print("\nThis is a HARD FAILURE - cannot proceed with simulated data.")
        raise


def save_subset(passages: List[Dict], queries: List[Dict], qrels: List[Dict], output_dir: Path):
    """
    Save MS MARCO subset to files.
    
    Saves:
        - passages.jsonl: one passage per line
        - queries.jsonl: one query per line
        - qrels.tsv: tab-separated relevance judgments
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Save passages
    passages_path = output_dir / 'passages.jsonl'
    print(f"\nSaving {len(passages)} passages to {passages_path}...")
    with open(passages_path, 'w') as f:
        for passage in passages:
            f.write(json.dumps(passage) + '\n')
    
    # Save queries
    queries_path = output_dir / 'queries.jsonl'
    print(f"Saving {len(queries)} queries to {queries_path}...")
    with open(queries_path, 'w') as f:
        for query in queries:
            f.write(json.dumps(query) + '\n')
    
    # Save qrels (tab-separated format: query_id \t passage_id \t relevance)
    qrels_path = output_dir / 'qrels.tsv'
    print(f"Saving {len(qrels)} qrels to {qrels_path}...")
    with open(qrels_path, 'w') as f:
        f.write("query_id\tpassage_id\trelevance\n")
        for qrel in qrels:
            f.write(f"{qrel['query_id']}\t{qrel['passage_id']}\t{qrel['relevance']}\n")
    
    # Save metadata
    metadata = {
        'dataset': 'ms_marco',
        'version': 'v1.1',
        'num_passages': len(passages),
        'num_queries': len(queries),
        'num_qrels': len(qrels),
        'avg_qrels_per_query': len(qrels) / len(queries) if queries else 0
    }
    
    metadata_path = output_dir / 'dataset_info.json'
    print(f"Saving metadata to {metadata_path}...")
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    
    print(f"\n✓ MS MARCO subset saved successfully to {output_dir}")
    print(f"\nDataset statistics:")
    print(f"  - Passages: {metadata['num_passages']}")
    print(f"  - Queries: {metadata['num_queries']}")
    print(f"  - Relevance judgments: {metadata['num_qrels']}")
    print(f"  - Avg qrels per query: {metadata['avg_qrels_per_query']:.2f}")


def main():
    parser = argparse.ArgumentParser(
        description='Prepare MS MARCO subset for retrieval benchmarking'
    )
    parser.add_argument(
        '--num-passages',
        type=int,
        default=50000,
        help='Target number of passages (default: 50000)'
    )
    parser.add_argument(
        '--num-queries',
        type=int,
        default=1000,
        help='Target number of queries (default: 1000)'
    )
    parser.add_argument(
        '--output-dir',
        default='data/msmarco_subset',
        help='Output directory (default: data/msmarco_subset)'
    )
    parser.add_argument(
        '--seed',
        type=int,
        default=42,
        help='Random seed for reproducibility (default: 42)'
    )
    
    args = parser.parse_args()
    
    print("="*80)
    print("MS MARCO SUBSET PREPARATION")
    print("="*80)
    print(f"\nTarget:")
    print(f"  - Passages: {args.num_passages}")
    print(f"  - Queries: {args.num_queries}")
    print(f"  - Output: {args.output_dir}")
    print(f"\nWARNING: This will download real MS MARCO data from Hugging Face.")
    print("NO SIMULATION. NO FABRICATION.")
    print("="*80)
    
    try:
        # Load MS MARCO data
        passages, queries, qrels = load_msmarco_data(
            args.num_passages,
            args.num_queries,
            args.seed
        )
        
        # Save subset
        output_dir = Path(args.output_dir)
        save_subset(passages, queries, qrels, output_dir)
        
        print("\n" + "="*80)
        print("SUCCESS: MS MARCO subset prepared")
        print("="*80)
        
        return 0
        
    except Exception as e:
        print("\n" + "="*80)
        print("FAILURE: Could not prepare MS MARCO subset")
        print("="*80)
        print(f"\nError: {e}")
        print("\nThis environment cannot run the MS MARCO benchmark.")
        print("A failure report will need to be generated instead.")
        
        return 1


if __name__ == '__main__':
    sys.exit(main())
