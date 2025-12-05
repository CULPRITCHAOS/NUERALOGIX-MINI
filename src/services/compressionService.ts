

import { EmbeddingMap, CompressionOptions, Embedding, CompressionResult } from '../types';
import { euclideanDistance } from './mathService';

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
        // Extract unique compressed vectors as centroids
        const uniqueVectorsSet = new Set<string>();
        const uniqueCentroids: Embedding[] = [];
        
        compressed.forEach(vector => {
            const key = JSON.stringify(vector);
            if (!uniqueVectorsSet.has(key)) {
                uniqueVectorsSet.add(key);
                uniqueCentroids.push(vector);
            }
        });
        centroids = uniqueCentroids;
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

        // 3. For each original vector, find the closest snapped centroid and assign it.
        items.forEach((item: string, i: number) => {
            const originalVector = originalVectors[i];
            let bestCentroid = snappedCentroids[0];
            let minDistance = Infinity;

            for (const snappedCentroid of snappedCentroids) {
                const distance = euclideanDistance(originalVector, snappedCentroid);
                if (distance < minDistance) {
                    minDistance = distance;
                    bestCentroid = snappedCentroid;
                }
            }
            compressed.set(item, bestCentroid);
        });
        centroids = snappedCentroids;
    }

    return { compressed, centroids };
};