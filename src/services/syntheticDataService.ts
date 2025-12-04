/**
 * Synthetic Shape Dataset Generator
 * 
 * Generates synthetic datasets with known topological structure
 * for validation and testing.
 * 
 * Shapes:
 * - Rings (circular manifolds)
 * - Spirals (helical manifolds)
 * - Swiss roll (2D manifold in 3D)
 * - Layered manifolds (stacked structures)
 */

import { EmbeddingMap } from '../types';

export type SyntheticShape = 'ring' | 'spiral' | 'swiss-roll' | 'layered-manifolds' | 'clusters';

export interface SyntheticDatasetConfig {
  shape: SyntheticShape;
  numPoints: number;
  dimension: number;
  noise?: number;
  seed?: number;
  params?: Record<string, number>;
}

/**
 * Simple seeded random number generator
 */
class SeededRandom {
  private seed: number;
  
  constructor(seed: number = Date.now()) {
    this.seed = seed;
  }
  
  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }
  
  nextGaussian(): number {
    const u1 = this.next();
    const u2 = this.next();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
}

/**
 * Generate a ring (circular manifold)
 */
export function generateRing(
  numPoints: number,
  dimension: number,
  radius: number = 1.0,
  noise: number = 0.0,
  seed?: number
): EmbeddingMap {
  const rng = new SeededRandom(seed);
  const embeddings = new Map<string, number[]>();
  
  for (let i = 0; i < numPoints; i++) {
    const angle = (2 * Math.PI * i) / numPoints;
    const embedding = new Array(dimension).fill(0);
    
    // Place points on a circle in first 2 dimensions
    embedding[0] = radius * Math.cos(angle);
    embedding[1] = radius * Math.sin(angle);
    
    // Add noise to all dimensions
    if (noise > 0) {
      for (let d = 0; d < dimension; d++) {
        embedding[d] += rng.nextGaussian() * noise;
      }
    }
    
    embeddings.set(`ring_${i}`, embedding);
  }
  
  return embeddings;
}

/**
 * Generate a spiral (helical manifold)
 */
export function generateSpiral(
  numPoints: number,
  dimension: number,
  turns: number = 2.0,
  noise: number = 0.0,
  seed?: number
): EmbeddingMap {
  const rng = new SeededRandom(seed);
  const embeddings = new Map<string, number[]>();
  
  for (let i = 0; i < numPoints; i++) {
    const t = i / numPoints;
    const angle = 2 * Math.PI * turns * t;
    const radius = t;
    
    const embedding = new Array(dimension).fill(0);
    
    // Spiral in first 2 dimensions
    embedding[0] = radius * Math.cos(angle);
    embedding[1] = radius * Math.sin(angle);
    
    // Add noise
    if (noise > 0) {
      for (let d = 0; d < dimension; d++) {
        embedding[d] += rng.nextGaussian() * noise;
      }
    }
    
    embeddings.set(`spiral_${i}`, embedding);
  }
  
  return embeddings;
}

/**
 * Generate Swiss roll (2D manifold in 3D)
 */
export function generateSwissRoll(
  numPoints: number,
  dimension: number,
  turns: number = 1.5,
  noise: number = 0.0,
  seed?: number
): EmbeddingMap {
  const rng = new SeededRandom(seed);
  const embeddings = new Map<string, number[]>();
  
  for (let i = 0; i < numPoints; i++) {
    const t = (i / numPoints) * (2 * Math.PI * turns);
    const y = rng.next(); // Random height
    
    const embedding = new Array(dimension).fill(0);
    
    // Swiss roll in first 3 dimensions
    embedding[0] = t * Math.cos(t);
    embedding[1] = y;
    embedding[2] = t * Math.sin(t);
    
    // Add noise
    if (noise > 0) {
      for (let d = 0; d < dimension; d++) {
        embedding[d] += rng.nextGaussian() * noise;
      }
    }
    
    embeddings.set(`swissroll_${i}`, embedding);
  }
  
  return embeddings;
}

/**
 * Generate layered manifolds (stacked structures)
 */
export function generateLayeredManifolds(
  numPoints: number,
  dimension: number,
  numLayers: number = 3,
  noise: number = 0.0,
  seed?: number
): EmbeddingMap {
  const rng = new SeededRandom(seed);
  const embeddings = new Map<string, number[]>();
  const pointsPerLayer = Math.floor(numPoints / numLayers);
  
  for (let layer = 0; layer < numLayers; layer++) {
    for (let i = 0; i < pointsPerLayer; i++) {
      const embedding = new Array(dimension).fill(0);
      
      // Each layer is a 2D plane at different z-height
      const x = (rng.next() - 0.5) * 2;
      const y = (rng.next() - 0.5) * 2;
      const z = layer * 0.5;
      
      embedding[0] = x;
      embedding[1] = y;
      if (dimension > 2) {
        embedding[2] = z;
      }
      
      // Add noise
      if (noise > 0) {
        for (let d = 0; d < dimension; d++) {
          embedding[d] += rng.nextGaussian() * noise;
        }
      }
      
      embeddings.set(`layer${layer}_${i}`, embedding);
    }
  }
  
  return embeddings;
}

/**
 * Generate Gaussian clusters
 */
export function generateClusters(
  numPoints: number,
  dimension: number,
  numClusters: number = 3,
  spread: number = 0.5,
  seed?: number
): EmbeddingMap {
  const rng = new SeededRandom(seed);
  const embeddings = new Map<string, number[]>();
  const pointsPerCluster = Math.floor(numPoints / numClusters);
  
  // Generate cluster centers
  const centers: number[][] = [];
  for (let c = 0; c < numClusters; c++) {
    const center = new Array(dimension).fill(0);
    for (let d = 0; d < dimension; d++) {
      center[d] = (rng.next() - 0.5) * 4; // Centers spread in [-2, 2]
    }
    centers.push(center);
  }
  
  // Generate points around centers
  for (let c = 0; c < numClusters; c++) {
    for (let i = 0; i < pointsPerCluster; i++) {
      const embedding = new Array(dimension).fill(0);
      
      for (let d = 0; d < dimension; d++) {
        embedding[d] = centers[c][d] + rng.nextGaussian() * spread;
      }
      
      embeddings.set(`cluster${c}_${i}`, embedding);
    }
  }
  
  return embeddings;
}

/**
 * Generate synthetic dataset based on configuration
 */
export function generateSyntheticDataset(
  config: SyntheticDatasetConfig
): EmbeddingMap {
  const { shape, numPoints, dimension, noise = 0, seed, params = {} } = config;
  
  switch (shape) {
    case 'ring':
      return generateRing(
        numPoints,
        dimension,
        params.radius || 1.0,
        noise,
        seed
      );
    
    case 'spiral':
      return generateSpiral(
        numPoints,
        dimension,
        params.turns || 2.0,
        noise,
        seed
      );
    
    case 'swiss-roll':
      return generateSwissRoll(
        numPoints,
        dimension,
        params.turns || 1.5,
        noise,
        seed
      );
    
    case 'layered-manifolds':
      return generateLayeredManifolds(
        numPoints,
        dimension,
        params.numLayers || 3,
        noise,
        seed
      );
    
    case 'clusters':
      return generateClusters(
        numPoints,
        dimension,
        params.numClusters || 3,
        params.spread || 0.5,
        seed
      );
    
    default:
      throw new Error(`Unknown shape: ${shape}`);
  }
}

/**
 * Pad embeddings to target dimension if needed
 */
export function padEmbeddings(
  embeddings: EmbeddingMap,
  targetDimension: number
): EmbeddingMap {
  const padded = new Map<string, number[]>();
  
  embeddings.forEach((embedding, key) => {
    if (embedding.length === targetDimension) {
      padded.set(key, embedding);
    } else if (embedding.length < targetDimension) {
      const paddedEmbedding = [...embedding, ...new Array(targetDimension - embedding.length).fill(0)];
      padded.set(key, paddedEmbedding);
    } else {
      // Truncate if too long
      padded.set(key, embedding.slice(0, targetDimension));
    }
  });
  
  return padded;
}

/**
 * Get expected topological properties for a synthetic shape
 */
export function getExpectedTopology(shape: SyntheticShape): {
  hasLoops: boolean;
  connectedComponents: number;
  intrinsicDimension: number;
  description: string;
} {
  switch (shape) {
    case 'ring':
      return {
        hasLoops: true,
        connectedComponents: 1,
        intrinsicDimension: 1,
        description: 'One-dimensional circle with a single loop'
      };
    
    case 'spiral':
      return {
        hasLoops: false,
        connectedComponents: 1,
        intrinsicDimension: 1,
        description: 'One-dimensional curve without loops'
      };
    
    case 'swiss-roll':
      return {
        hasLoops: false,
        connectedComponents: 1,
        intrinsicDimension: 2,
        description: 'Two-dimensional manifold embedded in 3D'
      };
    
    case 'layered-manifolds':
      return {
        hasLoops: false,
        connectedComponents: 3,
        intrinsicDimension: 2,
        description: 'Multiple disconnected 2D planes'
      };
    
    case 'clusters':
      return {
        hasLoops: false,
        connectedComponents: 3,
        intrinsicDimension: 0,
        description: 'Discrete point clusters'
      };
    
    default:
      return {
        hasLoops: false,
        connectedComponents: 1,
        intrinsicDimension: 0,
        description: 'Unknown shape'
      };
  }
}
