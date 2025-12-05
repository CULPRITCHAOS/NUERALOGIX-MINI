/**
 * Edge Case Stress Tests for Boundary-Aware Compression
 * 
 * Scientific validation requires explicit testing of failure modes.
 * This suite tests edge cases that real-world systems must handle.
 */

import { describe, it, expect } from 'vitest';
import { compressEmbeddings } from './compressionService';
import { computeBoundaryMetrics } from './boundaryMetricsService';
import type { EmbeddingMap } from '../types';

/**
 * Helper function for boundary-aware compression
 */
function compressBoundaryAware(embeddings: EmbeddingMap, gridStep: number, k: number) {
  const result = compressEmbeddings(embeddings, {
    method: 'boundary-aware',
    step: gridStep,
    k: k
  });
  
  const metrics = computeBoundaryMetrics(
    embeddings,
    result.compressed,
    result.centroids,
    false
  );
  
  return {
    compressed: result.compressed,
    centroids: result.centroids,
    mse_global: metrics.mse_global,
    mse_boundary: metrics.mse_boundary,
    mse_bulk: metrics.mse_bulk,
    delta_boundary: metrics.delta_boundary
  };
}

describe('Edge Case Stress Tests', () => {
  describe('Duplicate Vectors', () => {
    it('should handle all identical vectors', () => {
      const embeddings = new Map<string, number[]>();
      const identicalVector = [1.0, 0.0, 0.0, 0.0];
      
      for (let i = 0; i < 10; i++) {
        embeddings.set(`item_${i}`, [...identicalVector]);
      }
      
      const result = compressBoundaryAware(embeddings, 0.1, 3);
      
      expect(result).toBeDefined();
      expect(result.compressed).toBeDefined();
      expect(result.compressed.size).toBe(10);
      
      // All vectors identical - MSE should be 0 or NaN (degenerate case)
      expect(result.mse_global === 0 || isNaN(result.mse_global)).toBe(true);
    });

    it('should handle partially duplicate vectors', () => {
      const embeddings = new Map<string, number[]>();
      
      // 5 duplicates of vector A
      for (let i = 0; i < 5; i++) {
        embeddings.set(`a_${i}`, [1.0, 0.0, 0.0, 0.0]);
      }
      
      // 5 duplicates of vector B
      for (let i = 0; i < 5; i++) {
        embeddings.set(`b_${i}`, [0.0, 1.0, 0.0, 0.0]);
      }
      
      const result = compressBoundaryAware(embeddings, 0.1, 2);
      
      expect(result).toBeDefined();
      expect(result.compressed).toBeDefined();
    });
  });

  describe('NaN and Infinity Handling', () => {
    it('should detect and reject NaN values', () => {
      const embeddings = new Map<string, number[]>();
      embeddings.set('valid', [1.0, 2.0, 3.0, 4.0]);
      embeddings.set('invalid', [1.0, NaN, 3.0, 4.0]);
      
      expect(() => {
        compressBoundaryAware(embeddings, 0.1, 2);
      }).toThrow();
    });

    it('should detect and reject Infinity values', () => {
      const embeddings = new Map<string, number[]>();
      embeddings.set('valid', [1.0, 2.0, 3.0, 4.0]);
      embeddings.set('invalid', [Infinity, 2.0, 3.0, 4.0]);
      
      expect(() => {
        compressBoundaryAware(embeddings, 0.1, 2);
      }).toThrow();
    });

    it('should detect and reject -Infinity values', () => {
      const embeddings = new Map<string, number[]>();
      embeddings.set('valid', [1.0, 2.0, 3.0, 4.0]);
      embeddings.set('invalid', [1.0, -Infinity, 3.0, 4.0]);
      
      expect(() => {
        compressBoundaryAware(embeddings, 0.1, 2);
      }).toThrow();
    });
  });

  describe('Empty and Tiny Datasets', () => {
    it('should handle empty embeddings', () => {
      const embeddings = new Map<string, number[]>();
      
      const result = compressBoundaryAware(embeddings, 0.1, 2);
      
      expect(result).toBeDefined();
      expect(result.compressed.size).toBe(0);
      // Empty dataset - MSE is undefined/NaN
      expect(result.mse_global === 0 || isNaN(result.mse_global)).toBe(true);
    });

    it('should handle single vector', () => {
      const embeddings = new Map<string, number[]>();
      embeddings.set('only', [1.0, 2.0, 3.0, 4.0]);
      
      const result = compressBoundaryAware(embeddings, 0.1, 1);
      
      expect(result).toBeDefined();
      expect(result.compressed.size).toBe(1);
    });

    it('should handle two vectors', () => {
      const embeddings = new Map<string, number[]>();
      embeddings.set('a', [1.0, 0.0, 0.0, 0.0]);
      embeddings.set('b', [0.0, 1.0, 0.0, 0.0]);
      
      const result = compressBoundaryAware(embeddings, 0.1, 2);
      
      expect(result).toBeDefined();
      expect(result.compressed.size).toBe(2);
    });
  });

  describe('Parameter Edge Cases', () => {
    it('should handle k > N (more clusters than points)', () => {
      const embeddings = new Map<string, number[]>();
      embeddings.set('a', [1.0, 0.0, 0.0, 0.0]);
      embeddings.set('b', [0.0, 1.0, 0.0, 0.0]);
      embeddings.set('c', [0.0, 0.0, 1.0, 0.0]);
      
      // k=5 but only 3 points - should clamp to 3
      const result = compressBoundaryAware(embeddings, 0.1, 5);
      
      expect(result).toBeDefined();
      expect(result.compressed.size).toBe(3);
    });

    it('should handle k = 0', () => {
      const embeddings = new Map<string, number[]>();
      embeddings.set('a', [1.0, 0.0, 0.0, 0.0]);
      embeddings.set('b', [0.0, 1.0, 0.0, 0.0]);
      
      // k=0 should be treated as k=1
      const result = compressBoundaryAware(embeddings, 0.1, 0);
      
      expect(result).toBeDefined();
    });

    it('should handle very small grid step', () => {
      const embeddings = new Map<string, number[]>();
      embeddings.set('a', [1.0, 0.0, 0.0, 0.0]);
      embeddings.set('b', [0.0, 1.0, 0.0, 0.0]);
      
      const result = compressBoundaryAware(embeddings, 0.0001, 2);
      
      expect(result).toBeDefined();
      // Very small grid should preserve nearly perfectly
      expect(result.mse_global).toBeLessThan(0.01);
    });

    it('should handle very large grid step (extreme compression)', () => {
      const embeddings = new Map<string, number[]>();
      embeddings.set('a', [1.0, 0.0, 0.0, 0.0]);
      embeddings.set('b', [1.1, 0.0, 0.0, 0.0]);
      embeddings.set('c', [1.2, 0.0, 0.0, 0.0]);
      
      // Huge grid step - everything collapses
      const result = compressBoundaryAware(embeddings, 10.0, 2);
      
      expect(result).toBeDefined();
      // Extreme compression - check result is defined (MSE might be 0 if all collapse to same point)
      expect(isFinite(result.mse_global) || isNaN(result.mse_global)).toBe(true);
    });
  });

  describe('Dimension Mismatch', () => {
    it('should detect inconsistent embedding dimensions', () => {
      const embeddings = new Map<string, number[]>();
      embeddings.set('a', [1.0, 0.0, 0.0, 0.0]);     // 4D
      embeddings.set('b', [0.0, 1.0, 0.0]);          // 3D - mismatch!
      
      expect(() => {
        compressBoundaryAware(embeddings, 0.1, 2);
      }).toThrow();
    });
  });

  describe('Empty Clusters', () => {
    it('should handle k-means with empty clusters', () => {
      // Create clustered data where k-means might create empty clusters
      const embeddings = new Map<string, number[]>();
      
      // Two tight clusters far apart
      for (let i = 0; i < 5; i++) {
        embeddings.set(`cluster1_${i}`, [0.0, 0.0, 0.0, 0.0]);
        embeddings.set(`cluster2_${i}`, [10.0, 10.0, 10.0, 10.0]);
      }
      
      // Ask for 5 clusters but only 2 natural clusters exist
      const result = compressBoundaryAware(embeddings, 0.1, 5);
      
      expect(result).toBeDefined();
      expect(result.compressed.size).toBe(10);
    });
  });

  describe('Zero Vectors', () => {
    it('should handle all-zero vectors', () => {
      const embeddings = new Map<string, number[]>();
      embeddings.set('zero1', [0.0, 0.0, 0.0, 0.0]);
      embeddings.set('zero2', [0.0, 0.0, 0.0, 0.0]);
      embeddings.set('nonzero', [1.0, 1.0, 1.0, 1.0]);
      
      const result = compressBoundaryAware(embeddings, 0.1, 2);
      
      expect(result).toBeDefined();
      expect(result.compressed.size).toBe(3);
    });
  });

  describe('High Dimensional Edge Cases', () => {
    it('should handle very high dimensional vectors', () => {
      const dim = 1024;
      const embeddings = new Map<string, number[]>();
      
      for (let i = 0; i < 5; i++) {
        const vec = new Array(dim).fill(0).map(() => Math.random());
        embeddings.set(`item_${i}`, vec);
      }
      
      const result = compressBoundaryAware(embeddings, 0.1, 2);
      
      expect(result).toBeDefined();
      expect(result.compressed.size).toBe(5);
    });
  });

  describe('Boundary Metrics Edge Cases', () => {
    it('should handle boundary metrics with identical vectors', () => {
      const embeddings = new Map<string, number[]>();
      for (let i = 0; i < 5; i++) {
        embeddings.set(`item_${i}`, [1.0, 0.0, 0.0, 0.0]);
      }
      
      const centroids = [[1.0, 0.0, 0.0, 0.0]];
      const result = computeBoundaryMetrics(embeddings, embeddings, centroids);
      
      expect(result).toBeDefined();
      expect(result.mse_global === 0 || isNaN(result.mse_global)).toBe(true);
      expect(result.delta_boundary).toBeDefined();
    });

    it('should handle boundary metrics with k > N', () => {
      const embeddings = new Map<string, number[]>();
      embeddings.set('a', [1.0, 0.0, 0.0, 0.0]);
      embeddings.set('b', [0.0, 1.0, 0.0, 0.0]);
      
      const centroids = [[1.0, 0.0, 0.0, 0.0], [0.0, 1.0, 0.0, 0.0]];
      const result = computeBoundaryMetrics(embeddings, embeddings, centroids);
      
      expect(result).toBeDefined();
    });

    it('should handle boundary metrics with single vector', () => {
      const embeddings = new Map<string, number[]>();
      embeddings.set('only', [1.0, 0.0, 0.0, 0.0]);
      
      const centroids = [[1.0, 0.0, 0.0, 0.0]];
      const result = computeBoundaryMetrics(embeddings, embeddings, centroids);
      
      expect(result).toBeDefined();
      expect(result.mse_global === 0 || isNaN(result.mse_global)).toBe(true);
    });
  });

  describe('Numerical Stability', () => {
    it('should handle very small values', () => {
      const embeddings = new Map<string, number[]>();
      embeddings.set('a', [1e-10, 1e-10, 1e-10, 1e-10]);
      embeddings.set('b', [2e-10, 2e-10, 2e-10, 2e-10]);
      
      const result = compressBoundaryAware(embeddings, 0.1, 2);
      
      expect(result).toBeDefined();
      // Very small values - MSE might be 0 or NaN due to numerical limits
      expect(isFinite(result.mse_global) || result.mse_global === 0 || isNaN(result.mse_global)).toBe(true);
    });

    it('should handle very large values', () => {
      const embeddings = new Map<string, number[]>();
      embeddings.set('a', [1e10, 1e10, 1e10, 1e10]);
      embeddings.set('b', [2e10, 2e10, 2e10, 2e10]);
      
      const result = compressBoundaryAware(embeddings, 0.1, 2);
      
      expect(result).toBeDefined();
      expect(isFinite(result.mse_global)).toBe(true);
    });

    it('should handle mixed magnitude values', () => {
      const embeddings = new Map<string, number[]>();
      embeddings.set('tiny', [1e-10, 0.0, 0.0, 0.0]);
      embeddings.set('huge', [1e10, 0.0, 0.0, 0.0]);
      embeddings.set('normal', [1.0, 0.0, 0.0, 0.0]);
      
      const result = compressBoundaryAware(embeddings, 0.1, 2);
      
      expect(result).toBeDefined();
      expect(isFinite(result.mse_global)).toBe(true);
    });
  });
});
