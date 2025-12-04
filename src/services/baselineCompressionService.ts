/**
 * Baseline Compression Methods
 * 
 * Standard compression techniques for comparison against lattice-based methods:
 * - Scalar Quantization: Reduces precision of each dimension independently
 * - Product Quantization (PQ): Splits vectors into subvectors and quantizes each
 */

import { Embedding, EmbeddingMap } from '../types';
import { euclideanDistance } from './mathService';

/**
 * Scalar Quantization
 * Reduces precision by rounding each component to fixed decimal places
 */
export const scalarQuantization = (
  embeddings: EmbeddingMap,
  bits: number = 8
): EmbeddingMap => {
  const compressed = new Map<string, Embedding>();
  const items = Array.from(embeddings.keys());
  const vectors = Array.from(embeddings.values());

  if (vectors.length === 0) return compressed;

  // Find min/max for normalization
  const dim = vectors[0].length;
  const mins = new Array(dim).fill(Infinity);
  const maxs = new Array(dim).fill(-Infinity);

  vectors.forEach(vec => {
    vec.forEach((val, i) => {
      if (val < mins[i]) mins[i] = val;
      if (val > maxs[i]) maxs[i] = val;
    });
  });

  // Quantization levels based on bits
  const levels = Math.pow(2, bits);

  items.forEach((item, idx) => {
    const vector = vectors[idx];
    const quantized = vector.map((val, i) => {
      const range = maxs[i] - mins[i];
      if (range === 0) return val;
      // Normalize to [0, 1], quantize, then denormalize
      const normalized = (val - mins[i]) / range;
      const quantizedNorm = Math.round(normalized * (levels - 1)) / (levels - 1);
      return mins[i] + quantizedNorm * range;
    });
    compressed.set(item, quantized);
  });

  return compressed;
};

/**
 * Product Quantization (PQ)
 * Splits vector into m subvectors, runs k-means on each subspace
 */
export const productQuantization = (
  embeddings: EmbeddingMap,
  m: number = 8,  // number of subvectors
  k: number = 256  // codebook size per subvector
): EmbeddingMap => {
  const items = Array.from(embeddings.keys());
  const vectors = Array.from(embeddings.values());

  if (vectors.length === 0 || vectors[0].length === 0) {
    return new Map();
  }

  const dim = vectors[0].length;
  const subvectorDim = Math.floor(dim / m);
  
  // Adjust m if dimension doesn't divide evenly
  const actualM = Math.floor(dim / subvectorDim);

  // Split vectors into subvectors and build codebooks
  const codebooks: Embedding[][] = [];
  const assignments: number[][] = Array(vectors.length).fill(0).map(() => []);

  for (let i = 0; i < actualM; i++) {
    const start = i * subvectorDim;
    const end = (i === actualM - 1) ? dim : (i + 1) * subvectorDim;
    
    // Extract subvectors for this dimension range
    const subvectors = vectors.map(v => v.slice(start, end));
    
    // Run k-means on subvectors
    const { centroids, labels } = kMeansSubspace(subvectors, Math.min(k, subvectors.length));
    
    codebooks.push(centroids);
    labels.forEach((label, idx) => {
      assignments[idx].push(label);
    });
  }

  // Reconstruct vectors using codebook assignments
  const compressed = new Map<string, Embedding>();
  items.forEach((item, idx) => {
    const reconstructed: number[] = [];
    assignments[idx].forEach((centroidIdx, subspaceIdx) => {
      reconstructed.push(...codebooks[subspaceIdx][centroidIdx]);
    });
    compressed.set(item, reconstructed);
  });

  return compressed;
};

/**
 * K-means clustering for a subspace
 */
function kMeansSubspace(
  vectors: Embedding[],
  k: number
): { centroids: Embedding[]; labels: number[] } {
  if (vectors.length <= k) {
    return {
      centroids: vectors.map(v => [...v]),
      labels: vectors.map((_, i) => i)
    };
  }

  const n = vectors.length;
  const dim = vectors[0].length;
  
  // Initialize centroids randomly
  let centroids = vectors.slice(0, k).map(v => [...v]);
  let labels = new Array(n).fill(0);
  
  const MAX_ITERATIONS = 20;
  
  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    // Assignment step
    let changed = false;
    vectors.forEach((vector, i) => {
      let minDist = Infinity;
      let bestCluster = 0;
      
      centroids.forEach((centroid, j) => {
        const dist = euclideanDistance(vector, centroid);
        if (dist < minDist) {
          minDist = dist;
          bestCluster = j;
        }
      });
      
      if (labels[i] !== bestCluster) {
        labels[i] = bestCluster;
        changed = true;
      }
    });
    
    if (!changed) break;
    
    // Update step
    const newCentroids: Embedding[] = Array.from({ length: k }, () => new Array(dim).fill(0));
    const counts = new Array(k).fill(0);
    
    vectors.forEach((vector, i) => {
      const cluster = labels[i];
      counts[cluster]++;
      vector.forEach((val, d) => {
        newCentroids[cluster][d] += val;
      });
    });
    
    centroids = newCentroids.map((centroid, i) => {
      if (counts[i] === 0) return centroids[i]; // Keep old centroid if empty
      return centroid.map(val => val / counts[i]);
    });
  }
  
  return { centroids, labels };
}

/**
 * Export available baseline compression methods
 */
export const BASELINE_METHODS = {
  'scalar-8bit': (embeddings: EmbeddingMap) => scalarQuantization(embeddings, 8),
  'scalar-4bit': (embeddings: EmbeddingMap) => scalarQuantization(embeddings, 4),
  'pq-8x256': (embeddings: EmbeddingMap) => productQuantization(embeddings, 8, 256),
  'pq-16x256': (embeddings: EmbeddingMap) => productQuantization(embeddings, 16, 256),
} as const;

export type BaselineMethod = keyof typeof BASELINE_METHODS;
