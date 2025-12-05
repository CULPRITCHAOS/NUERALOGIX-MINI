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
 * Get unique centroids from compressed embeddings
 */
function getUniqueCentroids(compressed: EmbeddingMap): Embedding[] {
  const uniqueVectorsSet = new Set<string>();
  const uniqueCentroids: Embedding[] = [];
  
  compressed.forEach(vector => {
    const key = JSON.stringify(vector);
    if (!uniqueVectorsSet.has(key)) {
      uniqueVectorsSet.add(key);
      uniqueCentroids.push(vector);
    }
  });
  
  return uniqueCentroids;
}

/**
 * Compute quantile value from array
 */
function quantile(arr: number[], q: number): number {
  if (arr.length === 0) return NaN;
  
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.floor(sorted.length * q);
  return sorted[Math.min(index, sorted.length - 1)];
}

/**
 * Compute boundary vs bulk MSE metrics
 * 
 * @param original - Original embeddings before compression
 * @param compressed - Compressed embeddings
 * @returns Boundary metrics including global, boundary, bulk MSE and delta
 */
export function computeBoundaryMetrics(
  original: EmbeddingMap,
  compressed: EmbeddingMap
): BoundaryMetrics {
  const items = Array.from(original.keys());
  const originalVectors = items.map(item => original.get(item)!);
  const compressedVectors = items.map(item => compressed.get(item)!);
  
  // Get unique centroids from compressed vectors
  const centroids = getUniqueCentroids(compressed);
  
  // Need at least 2 centroids for boundary analysis
  if (centroids.length < 2 || items.length === 0) {
    return {
      mse_global: NaN,
      mse_boundary: NaN,
      mse_bulk: NaN,
      delta_boundary: NaN,
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
  
  return {
    mse_global,
    mse_boundary,
    mse_bulk,
    delta_boundary,
  };
}
