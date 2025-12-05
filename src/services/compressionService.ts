
import { EmbeddingMap, CompressionOptions, Embedding, CompressionResult } from '../types';
import { euclideanDistance, extractUniqueVectors } from './mathService';

const snapToGrid = (vector: Embedding, step: number): Embedding => {
    return vector.map(component => Math.round(component / step) * step);
};

const runKMeansLite = (vectors: Embedding[], k: number): { compressed: Embedding[], centroids: Embedding[] } => {
    if (vectors.length <= k) {
        return {
            compressed: vectors,
            centroids: vectors.map(v => [...v])
        };
    }

    // 1. Initialize centroids by picking k random vectors
    let centroids = vectors.slice(0, k).map(v => [...v]);
    let assignments = new Array(vectors.length).fill(0);
    
    const KMEANS_ITERATIONS = 10;

    for (let iter = 0; iter < KMEANS_ITERATIONS; iter++) {
        // 2. Assign each vector to the closest centroid
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

        // 3. Recalculate centroids
        const newCentroids: Embedding[] = Array.from({ length: k }, () => new Array(vectors[0].length).fill(0));
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

    // 4. Return the centroid for each vector's final assignment
    const compressed = assignments.map(clusterIndex => centroids[clusterIndex]);
    return {
        compressed,
        centroids
    };
};


/**
 * Classify vectors as boundary or bulk based on ambiguity scores
 * Returns indices of boundary vectors (bottom 10% by xi = d2 - d1)
 */
const classifyBoundaryVectors = (
    vectors: Embedding[],
    centroids: Embedding[]
): number[] => {
    if (centroids.length < 2) {
        return [];
    }

    // Compute ambiguity scores for each vector
    const ambiguityScores = vectors.map(vector => {
        // Find distances to nearest and 2nd nearest centroids
        const distances = centroids.map(c => euclideanDistance(vector, c)).sort((a, b) => a - b);
        const d1 = distances[0];
        const d2 = distances.length > 1 ? distances[1] : distances[0];
        return d2 - d1; // xi = d2 - d1
    });

    // Find 10th percentile threshold
    const sortedScores = [...ambiguityScores].sort((a, b) => a - b);
    const n = sortedScores.length;
    const q10Position = (n - 1) * 0.10;
    const lower = Math.floor(q10Position);
    const upper = Math.ceil(q10Position);
    const weight = q10Position - lower;
    const threshold = lower === upper 
        ? sortedScores[lower]
        : sortedScores[lower] * (1 - weight) + sortedScores[upper] * weight;

    // Return indices of boundary vectors (those with xi <= threshold)
    return ambiguityScores
        .map((score, i) => ({ score, i }))
        .filter(({ score }) => score <= threshold)
        .map(({ i }) => i);
};

export const compressEmbeddings = (embeddings: EmbeddingMap, options: CompressionOptions): CompressionResult => {
    const compressed = new Map<string, Embedding>();
    const items: string[] = Array.from(embeddings.keys());
    const originalVectors: Embedding[] = Array.from(embeddings.values());
    let centroids: Embedding[] = [];

    if (originalVectors.length === 0) {
        return { compressed, centroids };
    }

    if (options.method === 'grid') {
        const step = options.step || 0.25;
        items.forEach((item: string, i: number) => {
            compressed.set(item, snapToGrid(originalVectors[i], step));
        });
        // For grid method, centroids are the unique grid points
        // Using extractUniqueVectors is appropriate here because grid points
        // are deterministic and JSON.stringify preserves exact values
        centroids = extractUniqueVectors(Array.from(compressed.values()));
    } else if (options.method === 'kmeans') {
        const k = options.k || 3;
        const result = runKMeansLite(originalVectors, k);
        items.forEach((item: string, i: number) => {
            compressed.set(item, result.compressed[i]);
        });
        centroids = result.centroids;
    } else if (options.method === 'kmeans-grid') {
        const k = options.k || 3;
        const step = options.step || 0.25;

        // 1. Run KMeans on all vectors to find the ideal centroids.
        const kMeansResult = runKMeansLite(originalVectors, k);
        const idealCentroids = kMeansResult.centroids;

        // 2. Snap these unique centroids to the grid.
        const snappedCentroids = idealCentroids.map(centroid => snapToGrid(centroid, step));
        
        // 3. Deduplicate snapped centroids (grid snapping may create duplicates)
        const uniqueSnappedCentroids = extractUniqueVectors(snappedCentroids);

        // 4. For each original vector, find the closest snapped centroid and assign it.
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
    } else if (options.method === 'boundary-aware') {
        // Boundary-aware compression: differential treatment for boundary vs bulk vectors
        const k = options.k || 3;
        const step = options.step || 0.25;
        const boundaryStep = step * 0.5; // Lower quantization aggressiveness for boundary vectors

        // 1. Run KMeans to get initial centroids
        const kMeansResult = runKMeansLite(originalVectors, k);
        const idealCentroids = kMeansResult.centroids;

        // 2. Classify boundary vectors using initial centroids
        const boundaryIndices = new Set(classifyBoundaryVectors(originalVectors, idealCentroids));

        // 3. Snap centroids to grid
        const snappedCentroids = idealCentroids.map(centroid => snapToGrid(centroid, step));
        const uniqueSnappedCentroids = extractUniqueVectors(snappedCentroids);

        // 4. For boundary vectors, create finer-grained centroids
        const boundaryCentroids = idealCentroids.map(centroid => snapToGrid(centroid, boundaryStep));
        const uniqueBoundaryCentroids = extractUniqueVectors(boundaryCentroids);

        // 5. Compress: use finer grid for boundary, coarser for bulk
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

        // Combine all unique centroids for metrics computation
        centroids = extractUniqueVectors([...uniqueSnappedCentroids, ...uniqueBoundaryCentroids]);
    }

    return { compressed, centroids };
};