/**
 * Boundary Geometry Metrics Service
 * 
 * Implements boundary vs bulk error measurement for compression analysis.
 * 
 * Theory:
 * For each vector x in a batch, we compute distances to its nearest and second-nearest centroids:
 * - d1 = distance to nearest centroid
 * - d2 = distance to 2nd nearest centroid
 * - xi = d2 - d1 (ambiguity score)
 * 
 * Small xi → d1 ≈ d2 → vector is near a decision boundary
 * Large xi → clearly closer to one centroid (far from boundary)
 * 
 * We define:
 * - boundary class = bottom 10% of vectors by xi (most ambiguous)
 * - bulk class = top 10% of vectors by xi (least ambiguous)
 * 
 * For each compression setting, we compute:
 * - mse_boundary = mean MSE over boundary class
 * - mse_bulk = mean MSE over bulk class
 * - mse_global = mean MSE over entire batch
 * - delta_boundary = mse_boundary - mse_bulk
 */

import { Embedding, EmbeddingMap } from '../types';
import { euclideanDistance, meanSquaredError } from './mathService';

export interface BoundaryMetrics {
  mse_global: number;
  mse_boundary: number;
  mse_bulk: number;
  delta_boundary: number;
  ambiguity_scores?: number[];  // xi values for each vector
  knn_overlap?: number;  // k-NN overlap preservation
  compression_ratio?: number;  // Compression ratio (original size / compressed size)
  memory_bits?: number;  // Estimated bits per vector in compressed representation
}

/**
 * Compute distances to k nearest centroids for each vector
 * Returns array of [d1, d2] for each vector (nearest and 2nd nearest distances)
 */
function computeTopKDistances(
  vectors: Embedding[],
  centroids: Embedding[],
  k: number = 2
): number[][] {
  return vectors.map(vector => {
    // Compute distances to all centroids
    const distances = centroids.map(centroid => 
      euclideanDistance(vector, centroid)
    );
    
    // Sort and take top k (smallest distances)
    const sortedDistances = [...distances].sort((a, b) => a - b);
    return sortedDistances.slice(0, k);
  });
}

/**
 * Compute quantile value from array using linear interpolation
 * 
 * This implements PERCENTILE_CONT style interpolation between nearest ranks
 * for more accurate and numerically stable quantile estimation.
 * 
 * @param arr - Array of numbers
 * @param q - Quantile value (0 to 1)
 * @returns The quantile value, or NaN if array is empty or q is invalid
 */
function quantile(arr: number[], q: number): number {
  if (arr.length === 0) return NaN;
  if (q < 0 || q > 1) return NaN;
  
  const sorted = [...arr].sort((a, b) => a - b);
  const n = sorted.length;
  
  // Handle edge cases
  if (q === 0) return sorted[0];
  if (q === 1) return sorted[n - 1];
  
  // Linear interpolation between ranks
  // Using (n - 1) * q to get proper position in 0-indexed array
  const position = (n - 1) * q;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  
  if (lower === upper) {
    return sorted[lower];
  }
  
  // Linear interpolation between lower and upper values
  const weight = position - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

/**
 * Compute k-NN overlap between original and compressed embeddings
 * Returns Jaccard similarity of k-nearest neighbor sets
 */
function computeKNNOverlap(
  original: EmbeddingMap,
  compressed: EmbeddingMap,
  k: number = 5
): number {
  const items = Array.from(original.keys());
  if (items.length < k + 1) {
    return 1.0; // If not enough items for k-NN, consider perfect overlap
  }

  const originalVectors = items.map(item => original.get(item)!);
  const compressedVectors = items.map(item => compressed.get(item)!);

  let totalOverlap = 0;

  // For each vector, compute k-NN in both spaces
  for (let i = 0; i < items.length; i++) {
    // Compute distances in original space
    const originalDistances = originalVectors.map((vec, j) => ({
      index: j,
      distance: i === j ? Infinity : euclideanDistance(originalVectors[i], vec)
    }));
    originalDistances.sort((a, b) => a.distance - b.distance);
    const originalKNN = new Set(originalDistances.slice(0, k).map(d => d.index));

    // Compute distances in compressed space
    const compressedDistances = compressedVectors.map((vec, j) => ({
      index: j,
      distance: i === j ? Infinity : euclideanDistance(compressedVectors[i], vec)
    }));
    compressedDistances.sort((a, b) => a.distance - b.distance);
    const compressedKNN = new Set(compressedDistances.slice(0, k).map(d => d.index));

    // Compute Jaccard similarity
    const intersection = new Set([...originalKNN].filter(x => compressedKNN.has(x)));
    const union = new Set([...originalKNN, ...compressedKNN]);
    const jaccard = intersection.size / union.size;
    totalOverlap += jaccard;
  }

  return totalOverlap / items.length;
}

/**
 * Compute compression ratio and memory usage
 */
function computeCompressionMetrics(
  centroids: Embedding[],
  numVectors: number,
  dimension: number
): { compression_ratio: number; memory_bits: number } {
  if (numVectors === 0 || centroids.length === 0) {
    return { compression_ratio: 1.0, memory_bits: 0 };
  }

  // Original: numVectors * dimension * 32 bits (float32)
  const originalBits = numVectors * dimension * 32;

  // Compressed: 
  // - Codebook: centroids.length * dimension * 32 bits
  // - Indices: numVectors * log2(centroids.length) bits
  const codebookBits = centroids.length * dimension * 32;
  const indexBits = Math.ceil(Math.log2(centroids.length));
  const indicesBits = numVectors * indexBits;
  const compressedBits = codebookBits + indicesBits;

  const compression_ratio = originalBits / compressedBits;
  const memory_bits = compressedBits / numVectors; // Bits per vector

  return { compression_ratio, memory_bits };
}

/**
 * Compute boundary vs bulk MSE metrics
 * 
 * @param original - Original embeddings before compression
 * @param compressed - Compressed embeddings
 * @param centroids - Actual codebook centroids from the quantizer
 * @param computeExtendedMetrics - Whether to compute kNN overlap and compression metrics
 * @returns Boundary metrics including global, boundary, bulk MSE and delta
 */
export function computeBoundaryMetrics(
  original: EmbeddingMap,
  compressed: EmbeddingMap,
  centroids: Embedding[],
  computeExtendedMetrics: boolean = false
): BoundaryMetrics {
  const items = Array.from(original.keys());
  const originalVectors = items.map(item => original.get(item)!);
  const compressedVectors = items.map(item => compressed.get(item)!);
  
  // Need at least 2 centroids for boundary analysis
  if (centroids.length < 2 || items.length === 0) {
    return {
      mse_global: NaN,
      mse_boundary: NaN,
      mse_bulk: NaN,
      delta_boundary: NaN,
      ambiguity_scores: [],
    };
  }
  
  // Compute distances to nearest and 2nd nearest centroids for each vector
  const topKDistances = computeTopKDistances(originalVectors, centroids, 2);
  
  // Compute ambiguity scores: xi = d2 - d1
  const ambiguityScores = topKDistances.map(distances => {
    const d1 = distances[0];
    const d2 = distances.length > 1 ? distances[1] : distances[0];
    return d2 - d1;
  });
  
  // Compute per-vector MSE
  const msePerVector = items.map((_, i) => 
    meanSquaredError(originalVectors[i], compressedVectors[i])
  );
  
  // Compute global MSE
  const mse_global = msePerVector.reduce((sum, mse) => sum + mse, 0) / msePerVector.length;
  
  // Compute quantile thresholds at 10% and 90%
  const q10 = quantile(ambiguityScores, 0.10);
  const q90 = quantile(ambiguityScores, 0.90);
  
  // Identify boundary and bulk vectors
  const boundaryIndices = ambiguityScores
    .map((score, i) => ({ score, i }))
    .filter(({ score }) => score <= q10)
    .map(({ i }) => i);
  
  const bulkIndices = ambiguityScores
    .map((score, i) => ({ score, i }))
    .filter(({ score }) => score >= q90)
    .map(({ i }) => i);
  
  // Compute MSE for boundary class
  const mse_boundary = boundaryIndices.length > 0
    ? boundaryIndices.reduce((sum, i) => sum + msePerVector[i], 0) / boundaryIndices.length
    : NaN;
  
  // Compute MSE for bulk class
  const mse_bulk = bulkIndices.length > 0
    ? bulkIndices.reduce((sum, i) => sum + msePerVector[i], 0) / bulkIndices.length
    : NaN;
  
  // Compute delta
  const delta_boundary = mse_boundary - mse_bulk;

  const result: BoundaryMetrics = {
    mse_global,
    mse_boundary,
    mse_bulk,
    delta_boundary,
    ambiguity_scores: ambiguityScores,
  };

  // Optionally compute extended metrics
  if (computeExtendedMetrics) {
    result.knn_overlap = computeKNNOverlap(original, compressed);
    const compressionMetrics = computeCompressionMetrics(
      centroids,
      items.length,
      originalVectors[0]?.length || 0
    );
    result.compression_ratio = compressionMetrics.compression_ratio;
    result.memory_bits = compressionMetrics.memory_bits;
  }
  
  return result;
}
