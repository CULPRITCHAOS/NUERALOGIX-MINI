/**
 * Instrumented Compression Service
 * 
 * Extended compression functions that track timing and iteration metrics.
 * Used for Task 2: K-Means Iteration & Time Profiling
 */

import { EmbeddingMap, CompressionOptions, Embedding } from '../types';
import { euclideanDistance, extractUniqueVectors } from './mathService';

export interface InstrumentedCompressionMetrics {
  k: number;
  grid_step: number;
  method: string;
  iterations: number;              // k-means iterations
  time_grid_ms: number;
  time_kmeans_ms: number;
  time_boundary_ms: number;        // 0 for lattice-hybrid
  time_total_ms: number;
}

export interface InstrumentedCompressionResult {
  compressed: EmbeddingMap;
  centroids: Embedding[];
  metrics: InstrumentedCompressionMetrics;
}

const snapToGrid = (vector: Embedding, step: number): Embedding => {
  return vector.map(component => Math.round(component / step) * step);
};

/**
 * Instrumented K-Means with iteration tracking
 */
const runKMeansLiteInstrumented = (
  vectors: Embedding[],
  k: number
): { compressed: Embedding[], centroids: Embedding[], iterations: number, timeMs: number } => {
  const startTime = performance.now();
  
  // Handle edge cases
  if (k <= 0) {
    k = 1;
  }
  if (vectors.length <= k) {
    return {
      compressed: vectors,
      centroids: vectors.map(v => [...v]),
      iterations: 0,
      timeMs: performance.now() - startTime
    };
  }

  // Initialize centroids
  let centroids = vectors.slice(0, k).map(v => [...v]);
  let assignments = new Array(vectors.length).fill(0);
  
  const KMEANS_ITERATIONS = 10;
  let actualIterations = 0;

  for (let iter = 0; iter < KMEANS_ITERATIONS; iter++) {
    actualIterations++;
    
    // Assign vectors to nearest centroid
    vectors.forEach((vector, i) => {
      let minDistance = Infinity;
      let bestCluster = 0;
      centroids.forEach((centroid, j) => {
        const distance = euclideanDistance(vector, centroid);
        if (distance < minDistance) {
          minDistance = distance;
          bestCluster = j;
        }
      });
      assignments[i] = bestCluster;
    });

    // Recalculate centroids
    const newCentroids: Embedding[] = Array.from(
      { length: k },
      () => new Array(vectors[0].length).fill(0)
    );
    const clusterCounts = new Array(k).fill(0);

    vectors.forEach((vector, i) => {
      const clusterIndex = assignments[i];
      clusterCounts[clusterIndex]++;
      vector.forEach((val, dim) => {
        newCentroids[clusterIndex][dim] += val;
      });
    });

    newCentroids.forEach((centroid, i) => {
      if (clusterCounts[i] > 0) {
        centroids[i] = centroid.map(val => val / clusterCounts[i]);
      }
    });
  }

  const compressed = assignments.map(clusterIndex => centroids[clusterIndex]);
  
  return {
    compressed,
    centroids,
    iterations: actualIterations,
    timeMs: performance.now() - startTime
  };
};

/**
 * Classify boundary vectors (bottom 10% by ambiguity score)
 */
const classifyBoundaryVectors = (
  vectors: Embedding[],
  centroids: Embedding[]
): number[] => {
  if (centroids.length < 2) {
    return [];
  }

  const ambiguityScores = vectors.map(vector => {
    const distances = centroids.map(c => euclideanDistance(vector, c)).sort((a, b) => a - b);
    const d1 = distances[0];
    const d2 = distances.length > 1 ? distances[1] : distances[0];
    return d2 - d1;
  });

  const sortedScores = [...ambiguityScores].sort((a, b) => a - b);
  const n = sortedScores.length;
  const q10Position = (n - 1) * 0.10;
  const lower = Math.floor(q10Position);
  const upper = Math.ceil(q10Position);
  const weight = q10Position - lower;
  const threshold = lower === upper 
    ? sortedScores[lower]
    : sortedScores[lower] * (1 - weight) + sortedScores[upper] * weight;

  return ambiguityScores
    .map((score, i) => ({ score, i }))
    .filter(({ score }) => score <= threshold)
    .map(({ i }) => i);
};

/**
 * Instrumented compression with detailed timing
 */
export function compressEmbeddingsInstrumented(
  embeddings: EmbeddingMap,
  options: CompressionOptions
): InstrumentedCompressionResult {
  const startTimeTotal = performance.now();
  
  const compressed = new Map<string, Embedding>();
  const items: string[] = Array.from(embeddings.keys());
  const originalVectors: Embedding[] = Array.from(embeddings.values());
  let centroids: Embedding[] = [];
  
  let iterations = 0;
  let timeGridMs = 0;
  let timeKMeansMs = 0;
  let timeBoundaryMs = 0;
  
  if (originalVectors.length === 0) {
    return {
      compressed,
      centroids,
      metrics: {
        k: options.k || 0,
        grid_step: options.step || 0,
        method: options.method,
        iterations: 0,
        time_grid_ms: 0,
        time_kmeans_ms: 0,
        time_boundary_ms: 0,
        time_total_ms: 0
      }
    };
  }

  const k = options.k || 3;
  const step = options.step || 0.25;

  if (options.method === 'kmeans-grid' || options.method === 'boundary-aware') {
    // Phase 1: K-Means
    const kmeansResult = runKMeansLiteInstrumented(originalVectors, k);
    timeKMeansMs = kmeansResult.timeMs;
    iterations = kmeansResult.iterations;
    const idealCentroids = kmeansResult.centroids;

    // Phase 2: Grid quantization
    const startGrid = performance.now();
    const snappedCentroids = idealCentroids.map(centroid => snapToGrid(centroid, step));
    const uniqueSnappedCentroids = extractUniqueVectors(snappedCentroids);
    timeGridMs = performance.now() - startGrid;

    if (options.method === 'boundary-aware') {
      // Phase 3: Boundary detection and refinement
      const startBoundary = performance.now();
      
      const boundaryIndices = new Set(classifyBoundaryVectors(originalVectors, idealCentroids));
      const boundaryStep = step * 0.5;
      const boundaryCentroids = idealCentroids.map(centroid => snapToGrid(centroid, boundaryStep));
      const uniqueBoundaryCentroids = extractUniqueVectors(boundaryCentroids);
      
      timeBoundaryMs = performance.now() - startBoundary;

      // Compress with boundary awareness
      items.forEach((item: string, i: number) => {
        const originalVector = originalVectors[i];
        const isBoundary = boundaryIndices.has(i);
        const centroidsToUse = isBoundary ? uniqueBoundaryCentroids : uniqueSnappedCentroids;

        let bestCentroid = centroidsToUse[0];
        let minDistance = Infinity;

        for (const centroid of centroidsToUse) {
          const distance = euclideanDistance(originalVector, centroid);
          if (distance < minDistance) {
            minDistance = distance;
            bestCentroid = centroid;
          }
        }
        compressed.set(item, bestCentroid);
      });

      centroids = extractUniqueVectors([...uniqueSnappedCentroids, ...uniqueBoundaryCentroids]);
    } else {
      // lattice-hybrid: no boundary detection
      items.forEach((item: string, i: number) => {
        const originalVector = originalVectors[i];
        let bestCentroid = uniqueSnappedCentroids[0];
        let minDistance = Infinity;

        for (const snappedCentroid of uniqueSnappedCentroids) {
          const distance = euclideanDistance(originalVector, snappedCentroid);
          if (distance < minDistance) {
            minDistance = distance;
            bestCentroid = snappedCentroid;
          }
        }
        compressed.set(item, bestCentroid);
      });
      
      centroids = uniqueSnappedCentroids;
    }
  }

  const timeTotalMs = performance.now() - startTimeTotal;

  return {
    compressed,
    centroids,
    metrics: {
      k,
      grid_step: step,
      method: options.method,
      iterations,
      time_grid_ms: timeGridMs,
      time_kmeans_ms: timeKMeansMs,
      time_boundary_ms: timeBoundaryMs,
      time_total_ms: timeTotalMs
    }
  };
}
