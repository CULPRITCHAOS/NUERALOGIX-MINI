/**
 * Distortion Analytics Service
 * 
 * Measures semantic collapse and topology distortion across compression conditions.
 * All metrics return numeric scalar outputs for scientific analysis.
 */

import { Embedding, EmbeddingMap } from '../types';
import { euclideanDistance, cosineSimilarity } from './mathService';

/**
 * Distortion Metrics Interface
 */
export interface DistortionMetrics {
  pairwiseDistanceDistortion: number;
  neighborhoodOverlap: number;
  collapseRatio: number;
  clusterDriftScore: number;
  localDensityChange: number;
  triangleDistortionScore: number; // Renamed from geodesicDistortion
  approxGeodesicDistortionTSNE?: number; // New: t-SNE based geodesic approximation
  graphGeodesicDistortion?: number; // New: Graph-based geodesic distortion
}

/**
 * Compute pairwise distance distortion
 * Measures how much distances between points change after compression
 * Returns average relative change in distances
 */
export function computePairwiseDistanceDistortion(
  original: EmbeddingMap,
  compressed: EmbeddingMap
): number {
  const items = Array.from(original.keys());
  const n = items.length;
  
  if (n < 2) return 0;
  
  let totalDistortion = 0;
  let pairCount = 0;
  
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const origVec1 = original.get(items[i])!;
      const origVec2 = original.get(items[j])!;
      const compVec1 = compressed.get(items[i])!;
      const compVec2 = compressed.get(items[j])!;
      
      const origDist = euclideanDistance(origVec1, origVec2);
      const compDist = euclideanDistance(compVec1, compVec2);
      
      // Relative distortion (avoid division by zero)
      if (origDist > 0) {
        totalDistortion += Math.abs(compDist - origDist) / origDist;
        pairCount++;
      }
    }
  }
  
  return pairCount > 0 ? totalDistortion / pairCount : 0;
}

/**
 * Compute k-nearest neighbor preservation
 * Measures what fraction of k-nearest neighbors are preserved after compression
 */
export function computeNeighborhoodOverlap(
  original: EmbeddingMap,
  compressed: EmbeddingMap,
  k: number = 5
): number {
  const items = Array.from(original.keys());
  const n = items.length;
  
  if (n < k + 1) return 1.0; // Perfect overlap if not enough points
  
  let totalOverlap = 0;
  
  items.forEach(item => {
    const origVec = original.get(item)!;
    const compVec = compressed.get(item)!;
    
    // Find k nearest neighbors in original space
    const origNeighbors = items
      .filter(other => other !== item)
      .map(other => ({
        item: other,
        dist: euclideanDistance(origVec, original.get(other)!)
      }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, k)
      .map(n => n.item);
    
    // Find k nearest neighbors in compressed space
    const compNeighbors = items
      .filter(other => other !== item)
      .map(other => ({
        item: other,
        dist: euclideanDistance(compVec, compressed.get(other)!)
      }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, k)
      .map(n => n.item);
    
    // Compute overlap (Jaccard similarity)
    const intersection = origNeighbors.filter(n => compNeighbors.includes(n)).length;
    totalOverlap += intersection / k;
  });
  
  return totalOverlap / n;
}

/**
 * Compute collapse ratio
 * Returns fraction of points that moved beyond tolerance epsilon
 */
export function computeCollapseRatio(
  original: EmbeddingMap,
  compressed: EmbeddingMap,
  epsilon: number = 0.1
): number {
  const items = Array.from(original.keys());
  let collapsedCount = 0;
  
  items.forEach(item => {
    const origVec = original.get(item)!;
    const compVec = compressed.get(item)!;
    const distance = euclideanDistance(origVec, compVec);
    
    // Normalize by vector magnitude
    const magnitude = Math.sqrt(origVec.reduce((sum, val) => sum + val * val, 0));
    const normalizedDist = magnitude > 0 ? distance / magnitude : distance;
    
    if (normalizedDist > epsilon) {
      collapsedCount++;
    }
  });
  
  return items.length > 0 ? collapsedCount / items.length : 0;
}

/**
 * Compute cluster drift score
 * Measures how much cluster centroids move after compression
 */
export function computeClusterDriftScore(
  original: EmbeddingMap,
  compressed: EmbeddingMap
): number {
  const items = Array.from(original.keys());
  const n = items.length;
  
  if (n === 0) return 0;
  
  // Compute centroids
  const dim = original.get(items[0])!.length;
  const origCentroid = new Array(dim).fill(0);
  const compCentroid = new Array(dim).fill(0);
  
  items.forEach(item => {
    const origVec = original.get(item)!;
    const compVec = compressed.get(item)!;
    
    origVec.forEach((val, i) => {
      origCentroid[i] += val;
    });
    
    compVec.forEach((val, i) => {
      compCentroid[i] += val;
    });
  });
  
  origCentroid.forEach((_, i) => {
    origCentroid[i] /= n;
    compCentroid[i] /= n;
  });
  
  // Return normalized distance between centroids
  const drift = euclideanDistance(origCentroid, compCentroid);
  const origMagnitude = Math.sqrt(origCentroid.reduce((sum, val) => sum + val * val, 0));
  
  return origMagnitude > 0 ? drift / origMagnitude : drift;
}

/**
 * Compute local density change
 * Measures change in average distance to k-nearest neighbors
 */
export function computeLocalDensityChange(
  original: EmbeddingMap,
  compressed: EmbeddingMap,
  k: number = 5
): number {
  const items = Array.from(original.keys());
  const n = items.length;
  
  if (n < k + 1) return 0;
  
  let totalDensityChange = 0;
  
  items.forEach(item => {
    const origVec = original.get(item)!;
    const compVec = compressed.get(item)!;
    
    // Compute average distance to k-nearest neighbors in original space
    const origDistances = items
      .filter(other => other !== item)
      .map(other => euclideanDistance(origVec, original.get(other)!))
      .sort((a, b) => a - b)
      .slice(0, k);
    const origDensity = origDistances.reduce((sum, d) => sum + d, 0) / k;
    
    // Compute average distance to k-nearest neighbors in compressed space
    const compDistances = items
      .filter(other => other !== item)
      .map(other => euclideanDistance(compVec, compressed.get(other)!))
      .sort((a, b) => a - b)
      .slice(0, k);
    const compDensity = compDistances.reduce((sum, d) => sum + d, 0) / k;
    
    // Relative change in density
    if (origDensity > 0) {
      totalDensityChange += Math.abs(compDensity - origDensity) / origDensity;
    }
  });
  
  return totalDensityChange / n;
}

/**
 * Compute triangle distortion score (proxy for geodesic distortion)
 * Uses triangle inequality violations as a proxy for geodesic distortion
 * 
 * Note: Full computation is O(n^3), so we sample a subset for efficiency.
 * Sample size of 20 provides good coverage while maintaining reasonable performance.
 */
export function computeTriangleDistortionScore(
  original: EmbeddingMap,
  compressed: EmbeddingMap,
  sampleSize: number = 20
): number {
  const items = Array.from(original.keys());
  const n = items.length;
  
  if (n < 3) return 0;
  
  let totalViolation = 0;
  let tripleCount = 0;
  
  // Sample subset of triples for efficiency
  const maxSampleSize = Math.min(n, sampleSize);
  const sampledItems = items.slice(0, maxSampleSize);
  
  for (let i = 0; i < sampledItems.length; i++) {
    for (let j = i + 1; j < sampledItems.length; j++) {
      for (let k = j + 1; k < sampledItems.length; k++) {
        const item1 = sampledItems[i];
        const item2 = sampledItems[j];
        const item3 = sampledItems[k];
        
        // Original distances
        const d12_orig = euclideanDistance(original.get(item1)!, original.get(item2)!);
        const d23_orig = euclideanDistance(original.get(item2)!, original.get(item3)!);
        const d13_orig = euclideanDistance(original.get(item1)!, original.get(item3)!);
        
        // Compressed distances
        const d12_comp = euclideanDistance(compressed.get(item1)!, compressed.get(item2)!);
        const d23_comp = euclideanDistance(compressed.get(item2)!, compressed.get(item3)!);
        const d13_comp = euclideanDistance(compressed.get(item1)!, compressed.get(item3)!);
        
        // Check triangle inequality preservation
        // d13 should be <= d12 + d23
        const origSatisfaction = (d13_orig <= d12_orig + d23_orig) ? 1 : 0;
        const compSatisfaction = (d13_comp <= d12_comp + d23_comp) ? 1 : 0;
        
        // Measure violation
        if (origSatisfaction === 1 && compSatisfaction === 0) {
          totalViolation += 1;
        }
        
        tripleCount++;
      }
    }
  }
  
  return tripleCount > 0 ? totalViolation / tripleCount : 0;
}

// Legacy alias for backward compatibility
/**
 * @deprecated Use computeTriangleDistortionScore instead.
 * This alias is provided for backward compatibility only.
 */
export const computeGeodesicDistortion = computeTriangleDistortionScore;

/**
 * Compute approximate geodesic distortion using t-SNE style local preservation
 * 
 * This metric measures how well local neighborhoods preserve their geodesic structure
 * by examining the preservation of relative distances within k-nearest neighborhoods.
 * Inspired by t-SNE's focus on local structure preservation.
 */
export function computeApproxGeodesicDistortionTSNE(
  original: EmbeddingMap,
  compressed: EmbeddingMap,
  k: number = 10
): number {
  const items = Array.from(original.keys());
  const n = items.length;
  
  if (n < k + 1) return 0;
  
  let totalDistortion = 0;
  
  items.forEach(item => {
    const origVec = original.get(item)!;
    const compVec = compressed.get(item)!;
    
    // Find k nearest neighbors in original space
    const origNeighbors = items
      .filter(other => other !== item)
      .map(other => ({
        item: other,
        dist: euclideanDistance(origVec, original.get(other)!)
      }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, k);
    
    // Get distances to same neighbors in compressed space
    const compNeighborDists = origNeighbors.map(n => ({
      item: n.item,
      origDist: n.dist,
      compDist: euclideanDistance(compVec, compressed.get(n.item)!)
    }));
    
    // Compute relative distortion in local neighborhood
    // Similar to t-SNE's local preservation metric
    let localDistortion = 0;
    compNeighborDists.forEach(({ origDist, compDist }) => {
      if (origDist > 0) {
        // Use log ratio to measure multiplicative distortion
        localDistortion += Math.abs(Math.log(compDist + 1e-10) - Math.log(origDist + 1e-10));
      }
    });
    
    totalDistortion += localDistortion / k;
  });
  
  return totalDistortion / n;
}

/**
 * Compute graph-based geodesic distortion
 * 
 * Builds a k-nearest neighbor graph and computes approximate geodesic distances
 * using shortest paths on the graph. Measures how compression distorts these
 * manifold distances compared to Euclidean distances.
 */
export function computeGraphGeodesicDistortion(
  original: EmbeddingMap,
  compressed: EmbeddingMap,
  k: number = 5,
  sampleSize: number = 20
): number {
  const items = Array.from(original.keys());
  const n = items.length;
  
  if (n < k + 1) return 0;
  
  // Build k-NN graphs for both original and compressed spaces
  const origGraph = buildKNNGraph(original, k);
  const compGraph = buildKNNGraph(compressed, k);
  
  // Sample pairs for efficiency
  const maxSampleSize = Math.min(n, sampleSize);
  const sampledItems = items.slice(0, maxSampleSize);
  
  let totalDistortion = 0;
  let pairCount = 0;
  
  // Compute geodesic distortion for sampled pairs
  for (let i = 0; i < sampledItems.length; i++) {
    for (let j = i + 1; j < sampledItems.length; j++) {
      const item1 = sampledItems[i];
      const item2 = sampledItems[j];
      
      // Compute approximate geodesic distance on original graph
      const origGeoDist = approximateGeodesicDistance(origGraph, item1, item2);
      const compGeoDist = approximateGeodesicDistance(compGraph, item1, item2);
      
      // Compute Euclidean distances
      const origEucDist = euclideanDistance(original.get(item1)!, original.get(item2)!);
      const compEucDist = euclideanDistance(compressed.get(item1)!, compressed.get(item2)!);
      
      // Measure how compression affects the geodesic-to-Euclidean ratio
      const origRatio = origGeoDist / (origEucDist + 1e-10);
      const compRatio = compGeoDist / (compEucDist + 1e-10);
      
      totalDistortion += Math.abs(compRatio - origRatio) / (origRatio + 1e-10);
      pairCount++;
    }
  }
  
  return pairCount > 0 ? totalDistortion / pairCount : 0;
}

/**
 * Build k-nearest neighbor graph
 * Returns adjacency list with edge weights
 */
function buildKNNGraph(
  embeddings: EmbeddingMap,
  k: number
): Map<string, Map<string, number>> {
  const items = Array.from(embeddings.keys());
  const graph = new Map<string, Map<string, number>>();
  
  items.forEach(item => {
    const vec = embeddings.get(item)!;
    
    // Find k nearest neighbors
    const neighbors = items
      .filter(other => other !== item)
      .map(other => ({
        item: other,
        dist: euclideanDistance(vec, embeddings.get(other)!)
      }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, k);
    
    // Add edges to graph
    const edges = new Map<string, number>();
    neighbors.forEach(n => {
      edges.set(n.item, n.dist);
    });
    
    graph.set(item, edges);
  });
  
  return graph;
}

/**
 * Approximate geodesic distance using Dijkstra's algorithm
 * Returns shortest path distance on the k-NN graph
 */
function approximateGeodesicDistance(
  graph: Map<string, Map<string, number>>,
  source: string,
  target: string
): number {
  if (source === target) return 0;
  
  const distances = new Map<string, number>();
  const visited = new Set<string>();
  const items = Array.from(graph.keys());
  
  // Initialize distances
  items.forEach(item => {
    distances.set(item, item === source ? 0 : Infinity);
  });
  
  // Dijkstra's algorithm
  while (visited.size < items.length) {
    // Find unvisited node with minimum distance
    let minDist = Infinity;
    let minNode: string | null = null;
    
    items.forEach(item => {
      if (!visited.has(item) && distances.get(item)! < minDist) {
        minDist = distances.get(item)!;
        minNode = item;
      }
    });
    
    if (minNode === null || minDist === Infinity) break;
    
    visited.add(minNode);
    
    // Early exit if we reached target
    if (minNode === target) break;
    
    // Update neighbors
    const edges = graph.get(minNode);
    if (edges) {
      edges.forEach((weight, neighbor) => {
        const newDist = distances.get(minNode)! + weight;
        if (newDist < distances.get(neighbor)!) {
          distances.set(neighbor, newDist);
        }
      });
    }
  }
  
  return distances.get(target) || Infinity;
}


/**
 * Compute all distortion metrics
 */
export function computeAllDistortionMetrics(
  original: EmbeddingMap,
  compressed: EmbeddingMap,
  options: { k?: number; epsilon?: number; includeAdvanced?: boolean } = {}
): DistortionMetrics {
  const k = options.k || 5;
  const epsilon = options.epsilon || 0.1;
  const includeAdvanced = options.includeAdvanced ?? false;
  
  const metrics: DistortionMetrics = {
    pairwiseDistanceDistortion: computePairwiseDistanceDistortion(original, compressed),
    neighborhoodOverlap: computeNeighborhoodOverlap(original, compressed, k),
    collapseRatio: computeCollapseRatio(original, compressed, epsilon),
    clusterDriftScore: computeClusterDriftScore(original, compressed),
    localDensityChange: computeLocalDensityChange(original, compressed, k),
    triangleDistortionScore: computeTriangleDistortionScore(original, compressed),
  };
  
  // Include advanced geodesic metrics if requested
  if (includeAdvanced) {
    metrics.approxGeodesicDistortionTSNE = computeApproxGeodesicDistortionTSNE(original, compressed, k);
    metrics.graphGeodesicDistortion = computeGraphGeodesicDistortion(original, compressed, k);
  }
  
  return metrics;
}
