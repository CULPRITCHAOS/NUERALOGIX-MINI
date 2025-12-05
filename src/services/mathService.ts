import { Embedding } from '../types';

export const euclideanDistance = (vec1: Embedding, vec2: Embedding): number => {
    let sum = 0;
    if (vec1.length !== vec2.length) return Infinity;
    for (let i = 0; i < vec1.length; i++) {
        sum += (vec1[i] - vec2[i]) ** 2;
    }
    return Math.sqrt(sum);
};

export const cosineSimilarity = (vec1: Embedding, vec2: Embedding): number => {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    if (vec1.length !== vec2.length) return 0;
    for (let i = 0; i < vec1.length; i++) {
        dotProduct += vec1[i] * vec2[i];
        normA += vec1[i] ** 2;
        normB += vec2[i] ** 2;
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

export const meanSquaredError = (vec1: Embedding, vec2: Embedding): number => {
    let sum = 0;
    if (vec1.length !== vec2.length) return Infinity;
    for (let i = 0; i < vec1.length; i++) {
        sum += (vec1[i] - vec2[i]) ** 2;
    }
    return sum / vec1.length;
};

/**
 * Extract unique vectors from a collection using JSON serialization
 * 
 * Note: This uses JSON.stringify for vector comparison, which is acceptable for:
 * - Grid-quantized vectors (deterministic values)
 * - Small sets of centroids (typically < 100)
 * - Scenarios where exact floating-point equality is desired
 * 
 * Performance: For large datasets (>1000 vectors), consider using a hash-based
 * approach or floating-point tolerant comparison for better performance.
 * 
 * @param vectors - Array of vectors to deduplicate
 * @returns Array of unique vectors
 */
export const extractUniqueVectors = (vectors: Embedding[]): Embedding[] => {
    const uniqueVectorsSet = new Set<string>();
    const uniqueVectors: Embedding[] = [];
    
    vectors.forEach(vector => {
        const key = JSON.stringify(vector);
        if (!uniqueVectorsSet.has(key)) {
            uniqueVectorsSet.add(key);
            uniqueVectors.push(vector);
        }
    });
    
    return uniqueVectors;
};

// Simplified PCA implementation for 2D visualization
export const pca = (vectors: Embedding[]): { x: number, y: number }[] => {
    if (vectors.length === 0 || vectors[0].length < 2) {
        return vectors.map(v => ({ x: v[0] || 0, y: v[1] || 0 }));
    }

    const n = vectors.length;
    const dim = vectors[0].length;

    // 1. Center the data
    const mean = new Array(dim).fill(0);
    for (let j = 0; j < dim; j++) {
        for (let i = 0; i < n; i++) {
            mean[j] += vectors[i][j];
        }
        mean[j] /= n;
    }
    const centered = vectors.map(vec => vec.map((val, j) => val - mean[j]));

    // 2. Compute covariance matrix
    const cov = Array.from({ length: dim }, () => new Array(dim).fill(0));
    for (let i = 0; i < dim; i++) {
        for (let j = i; j < dim; j++) {
            let sum = 0;
            for (let k = 0; k < n; k++) {
                sum += centered[k][i] * centered[k][j];
            }
            cov[i][j] = cov[j][i] = sum / (n - 1);
        }
    }
    
    // 3. Find principal components (eigenvectors of covariance matrix)
    // Using a simplified power iteration method for the first two components
    const getPrincipalComponent = (matrix: number[][], prevComponent: number[] | null = null): number[] => {
        let b_k = Array.from({length: dim}, () => Math.random());

        for (let iter = 0; iter < 20; iter++) {
            let Ab_k = matrix.map(row => row.reduce((sum, val, j) => sum + val * b_k[j], 0));

            if (prevComponent) {
                const dot = Ab_k.reduce((sum, val, j) => sum + val * prevComponent[j], 0);
                Ab_k = Ab_k.map((val, j) => val - dot * prevComponent[j]);
            }
            
            const norm = Math.sqrt(Ab_k.reduce((sum, val) => sum + val * val, 0));
            b_k = Ab_k.map(val => val / norm);
        }
        return b_k;
    }

    const pc1 = getPrincipalComponent(cov);
    const pc2 = getPrincipalComponent(cov, pc1);

    // 4. Project the data
    const project = (vec: number[], pc: number[]): number => {
        return vec.reduce((sum, val, i) => sum + val * pc[i], 0);
    };

    return centered.map(vec => ({
        x: project(vec, pc1),
        y: project(vec, pc2),
    }));
};
