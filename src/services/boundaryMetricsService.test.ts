/**
 * Boundary Metrics Service - Edge Case Tests
 * 
 * Tests for edge cases in boundary geometry metrics computation:
 * - Empty input
 * - All identical points
 * - Empty/collapsed clusters
 * - Duplicate points
 * - NaN/Inf handling
 */

import { describe, it, expect } from 'vitest';
import { computeBoundaryMetrics } from '../services/boundaryMetricsService';
import { EmbeddingMap, Embedding } from '../types';

describe('BoundaryMetricsService - Edge Cases', () => {
  describe('Empty Input', () => {
    it('should handle empty embeddings map', () => {
      const original: EmbeddingMap = new Map();
      const compressed: EmbeddingMap = new Map();
      const centroids: Embedding[] = [];
      
      const metrics = computeBoundaryMetrics(original, compressed, centroids);
      
      expect(Number.isNaN(metrics.mse_global)).toBe(true);
      expect(Number.isNaN(metrics.mse_boundary)).toBe(true);
      expect(Number.isNaN(metrics.mse_bulk)).toBe(true);
      expect(Number.isNaN(metrics.delta_boundary)).toBe(true);
    });
    
    it('should handle no vectors but some centroids', () => {
      const original: EmbeddingMap = new Map();
      const compressed: EmbeddingMap = new Map();
      const centroids: Embedding[] = [[1, 2, 3], [4, 5, 6]];
      
      const metrics = computeBoundaryMetrics(original, compressed, centroids);
      
      expect(Number.isNaN(metrics.mse_global)).toBe(true);
      expect(Number.isNaN(metrics.mse_boundary)).toBe(true);
      expect(Number.isNaN(metrics.mse_bulk)).toBe(true);
      expect(Number.isNaN(metrics.delta_boundary)).toBe(true);
    });
    
    it('should handle insufficient centroids (< 2)', () => {
      const original: EmbeddingMap = new Map([
        ['item1', [1, 2, 3]],
        ['item2', [4, 5, 6]]
      ]);
      const compressed: EmbeddingMap = new Map([
        ['item1', [1.1, 2.1, 3.1]],
        ['item2', [4.1, 5.1, 6.1]]
      ]);
      const centroids: Embedding[] = [[2.5, 3.5, 4.5]]; // Only 1 centroid
      
      const metrics = computeBoundaryMetrics(original, compressed, centroids);
      
      // Should return NaN when fewer than 2 centroids
      expect(Number.isNaN(metrics.mse_global)).toBe(true);
      expect(Number.isNaN(metrics.mse_boundary)).toBe(true);
      expect(Number.isNaN(metrics.mse_bulk)).toBe(true);
      expect(Number.isNaN(metrics.delta_boundary)).toBe(true);
    });
  });
  
  describe('All Identical Points', () => {
    it('should handle all vectors identical (no compression error)', () => {
      const identicalVector = [1, 2, 3, 4];
      const original: EmbeddingMap = new Map([
        ['item1', identicalVector],
        ['item2', identicalVector],
        ['item3', identicalVector],
        ['item4', identicalVector],
        ['item5', identicalVector]
      ]);
      
      // Compressed is also identical (perfect compression)
      const compressed: EmbeddingMap = new Map([
        ['item1', identicalVector],
        ['item2', identicalVector],
        ['item3', identicalVector],
        ['item4', identicalVector],
        ['item5', identicalVector]
      ]);
      
      // Two centroids at the same location
      const centroids: Embedding[] = [
        identicalVector,
        [...identicalVector] // Copy
      ];
      
      const metrics = computeBoundaryMetrics(original, compressed, centroids);
      
      // MSE should be 0 (perfect reconstruction)
      expect(metrics.mse_global).toBe(0);
      expect(metrics.mse_boundary).toBeGreaterThanOrEqual(0); // Could be 0 or NaN depending on classification
      expect(metrics.mse_bulk).toBeGreaterThanOrEqual(0);
      
      // Delta should be 0 or close to 0 (or NaN if no boundary/bulk split)
      if (!Number.isNaN(metrics.delta_boundary)) {
        expect(Math.abs(metrics.delta_boundary)).toBeLessThan(1e-10);
      }
    });
    
    it('should handle identical vectors with slight compression error', () => {
      const identicalVector = [1, 2, 3, 4];
      const original: EmbeddingMap = new Map([
        ['item1', identicalVector],
        ['item2', identicalVector],
        ['item3', identicalVector],
        ['item4', identicalVector],
        ['item5', identicalVector],
        ['item6', identicalVector],
        ['item7', identicalVector],
        ['item8', identicalVector],
        ['item9', identicalVector],
        ['item10', identicalVector]
      ]);
      
      // Compressed with small uniform error
      const compressedVector = [1.01, 2.01, 3.01, 4.01];
      const compressed: EmbeddingMap = new Map([
        ['item1', compressedVector],
        ['item2', compressedVector],
        ['item3', compressedVector],
        ['item4', compressedVector],
        ['item5', compressedVector],
        ['item6', compressedVector],
        ['item7', compressedVector],
        ['item8', compressedVector],
        ['item9', compressedVector],
        ['item10', compressedVector]
      ]);
      
      // Two centroids at the same location
      const centroids: Embedding[] = [
        identicalVector,
        [...identicalVector]
      ];
      
      const metrics = computeBoundaryMetrics(original, compressed, centroids);
      
      // All MSEs should be the same (uniform error)
      expect(metrics.mse_global).toBeGreaterThan(0);
      
      // Boundary and bulk should have same MSE since all points are identical
      // Delta should be 0 or close to 0
      if (!Number.isNaN(metrics.mse_boundary) && !Number.isNaN(metrics.mse_bulk)) {
        expect(Math.abs(metrics.mse_boundary - metrics.mse_bulk)).toBeLessThan(1e-6);
        expect(Math.abs(metrics.delta_boundary)).toBeLessThan(1e-6);
      }
    });
  });
  
  describe('Empty/Collapsed Clusters', () => {
    it('should handle centroids with no assigned points', () => {
      // Create a scenario where all points are near centroid 1,
      // but centroid 2 is far away with no points assigned
      const original: EmbeddingMap = new Map([
        ['item1', [0, 0, 0]],
        ['item2', [0.1, 0.1, 0.1]],
        ['item3', [0.2, 0.2, 0.2]],
        ['item4', [-0.1, -0.1, -0.1]],
        ['item5', [-0.2, -0.2, -0.2]],
        ['item6', [0.05, 0.05, 0.05]],
        ['item7', [-0.05, -0.05, -0.05]],
        ['item8', [0.15, 0.15, 0.15]],
        ['item9', [-0.15, -0.15, -0.15]],
        ['item10', [0.0, 0.0, 0.0]]
      ]);
      
      const compressed: EmbeddingMap = new Map([
        ['item1', [0, 0, 0]],
        ['item2', [0, 0, 0]],
        ['item3', [0, 0, 0]],
        ['item4', [0, 0, 0]],
        ['item5', [0, 0, 0]],
        ['item6', [0, 0, 0]],
        ['item7', [0, 0, 0]],
        ['item8', [0, 0, 0]],
        ['item9', [0, 0, 0]],
        ['item10', [0, 0, 0]]
      ]);
      
      // Centroid 1 at origin, Centroid 2 very far away (likely unused)
      const centroids: Embedding[] = [
        [0, 0, 0],
        [100, 100, 100] // Far away, no points assigned here
      ];
      
      const metrics = computeBoundaryMetrics(original, compressed, centroids);
      
      // Should not crash, should compute valid metrics
      expect(Number.isFinite(metrics.mse_global)).toBe(true);
      expect(metrics.mse_global).toBeGreaterThanOrEqual(0);
      
      // Boundary/bulk metrics may be valid or NaN depending on quantile split
      // Just ensure no crash
      expect(metrics).toBeDefined();
    });
  });
  
  describe('Duplicate Points', () => {
    it('should handle multiple identical input vectors', () => {
      // Multiple copies of the same vectors
      const original: EmbeddingMap = new Map([
        ['item1', [1, 2, 3]],
        ['item2', [1, 2, 3]], // Duplicate
        ['item3', [1, 2, 3]], // Duplicate
        ['item4', [4, 5, 6]],
        ['item5', [4, 5, 6]], // Duplicate
        ['item6', [4, 5, 6]], // Duplicate
        ['item7', [7, 8, 9]],
        ['item8', [7, 8, 9]], // Duplicate
        ['item9', [7, 8, 9]], // Duplicate
        ['item10', [7, 8, 9]] // Duplicate
      ]);
      
      const compressed: EmbeddingMap = new Map([
        ['item1', [1.1, 2.1, 3.1]],
        ['item2', [1.1, 2.1, 3.1]],
        ['item3', [1.1, 2.1, 3.1]],
        ['item4', [4.1, 5.1, 6.1]],
        ['item5', [4.1, 5.1, 6.1]],
        ['item6', [4.1, 5.1, 6.1]],
        ['item7', [7.1, 8.1, 9.1]],
        ['item8', [7.1, 8.1, 9.1]],
        ['item9', [7.1, 8.1, 9.1]],
        ['item10', [7.1, 8.1, 9.1]]
      ]);
      
      const centroids: Embedding[] = [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9]
      ];
      
      const metrics = computeBoundaryMetrics(original, compressed, centroids);
      
      // Should handle duplicates deterministically
      expect(Number.isFinite(metrics.mse_global)).toBe(true);
      expect(metrics.mse_global).toBeGreaterThan(0);
      
      // Ambiguity scores should be deterministic for duplicates
      if (metrics.ambiguity_scores) {
        // Items 1-3 should have same ambiguity score
        const scores = metrics.ambiguity_scores;
        expect(scores.length).toBe(10);
        expect(scores[0]).toBeCloseTo(scores[1], 10);
        expect(scores[1]).toBeCloseTo(scores[2], 10);
      }
    });
  });
  
  describe('NaN and Inf Handling', () => {
    it('should handle NaN in distance calculations gracefully', () => {
      const original: EmbeddingMap = new Map([
        ['item1', [1, 2, 3]],
        ['item2', [4, 5, 6]],
        ['item3', [7, 8, 9]],
        ['item4', [10, 11, 12]],
        ['item5', [13, 14, 15]]
      ]);
      
      const compressed: EmbeddingMap = new Map([
        ['item1', [1.1, 2.1, 3.1]],
        ['item2', [4.1, 5.1, 6.1]],
        ['item3', [7.1, 8.1, 9.1]],
        ['item4', [10.1, 11.1, 12.1]],
        ['item5', [13.1, 14.1, 15.1]]
      ]);
      
      // Centroid with NaN value
      const centroids: Embedding[] = [
        [1, 2, 3],
        [NaN, NaN, NaN] // NaN centroid
      ];
      
      const metrics = computeBoundaryMetrics(original, compressed, centroids);
      
      // Should either filter NaN or handle gracefully
      // At minimum, should not crash
      expect(metrics).toBeDefined();
      
      // If it returns results, they should either be valid or NaN
      if (Number.isFinite(metrics.mse_global)) {
        expect(metrics.mse_global).toBeGreaterThanOrEqual(0);
      }
    });
    
    it('should handle Inf in centroids', () => {
      const original: EmbeddingMap = new Map([
        ['item1', [1, 2, 3]],
        ['item2', [4, 5, 6]],
        ['item3', [7, 8, 9]],
        ['item4', [10, 11, 12]],
        ['item5', [13, 14, 15]]
      ]);
      
      const compressed: EmbeddingMap = new Map([
        ['item1', [1.1, 2.1, 3.1]],
        ['item2', [4.1, 5.1, 6.1]],
        ['item3', [7.1, 8.1, 9.1]],
        ['item4', [10.1, 11.1, 12.1]],
        ['item5', [13.1, 14.1, 15.1]]
      ]);
      
      // Centroid with Infinity
      const centroids: Embedding[] = [
        [1, 2, 3],
        [Infinity, Infinity, Infinity]
      ];
      
      const metrics = computeBoundaryMetrics(original, compressed, centroids);
      
      // Should not crash
      expect(metrics).toBeDefined();
    });
    
    it('should handle NaN in compressed vectors', () => {
      const original: EmbeddingMap = new Map([
        ['item1', [1, 2, 3]],
        ['item2', [4, 5, 6]],
        ['item3', [7, 8, 9]],
        ['item4', [10, 11, 12]],
        ['item5', [13, 14, 15]]
      ]);
      
      // Compressed with NaN
      const compressed: EmbeddingMap = new Map([
        ['item1', [NaN, NaN, NaN]],
        ['item2', [4.1, 5.1, 6.1]],
        ['item3', [7.1, 8.1, 9.1]],
        ['item4', [10.1, 11.1, 12.1]],
        ['item5', [13.1, 14.1, 15.1]]
      ]);
      
      const centroids: Embedding[] = [
        [1, 2, 3],
        [7, 8, 9]
      ];
      
      const metrics = computeBoundaryMetrics(original, compressed, centroids);
      
      // Should handle gracefully
      expect(metrics).toBeDefined();
      
      // MSE should be NaN or Inf for item1
      // Overall metrics may be valid if other items are computed
    });
  });
  
  describe('Quantile Edge Cases', () => {
    it('should handle very small datasets (< 10 points)', () => {
      // Only 5 points - 10% and 90% quantiles will be at edges
      const original: EmbeddingMap = new Map([
        ['item1', [0, 0, 0]],
        ['item2', [1, 1, 1]],
        ['item3', [2, 2, 2]],
        ['item4', [3, 3, 3]],
        ['item5', [4, 4, 4]]
      ]);
      
      const compressed: EmbeddingMap = new Map([
        ['item1', [0.1, 0.1, 0.1]],
        ['item2', [1.1, 1.1, 1.1]],
        ['item3', [2.1, 2.1, 2.1]],
        ['item4', [3.1, 3.1, 3.1]],
        ['item5', [4.1, 4.1, 4.1]]
      ]);
      
      const centroids: Embedding[] = [
        [0, 0, 0],
        [2, 2, 2],
        [4, 4, 4]
      ];
      
      const metrics = computeBoundaryMetrics(original, compressed, centroids);
      
      // Should compute valid metrics even with small dataset
      expect(Number.isFinite(metrics.mse_global)).toBe(true);
      expect(metrics.mse_global).toBeGreaterThan(0);
      
      // Boundary and bulk may have only 1 point each
      // Just ensure no crash
      expect(metrics).toBeDefined();
    });
    
    it('should handle edge case where all xi values are identical', () => {
      // Create scenario where d2-d1 is same for all points
      // This happens when points are equidistant from two centroids
      const original: EmbeddingMap = new Map([
        ['item1', [0.5, 0, 0]],
        ['item2', [0.5, 0.1, 0]],
        ['item3', [0.5, 0.2, 0]],
        ['item4', [0.5, 0.3, 0]],
        ['item5', [0.5, 0.4, 0]],
        ['item6', [0.5, 0.5, 0]],
        ['item7', [0.5, 0.6, 0]],
        ['item8', [0.5, 0.7, 0]],
        ['item9', [0.5, 0.8, 0]],
        ['item10', [0.5, 0.9, 0]]
      ]);
      
      const compressed: EmbeddingMap = new Map([
        ['item1', [0, 0, 0]],
        ['item2', [0, 0, 0]],
        ['item3', [0, 0, 0]],
        ['item4', [0, 0, 0]],
        ['item5', [0, 0, 0]],
        ['item6', [1, 0, 0]],
        ['item7', [1, 0, 0]],
        ['item8', [1, 0, 0]],
        ['item9', [1, 0, 0]],
        ['item10', [1, 0, 0]]
      ]);
      
      // Two centroids equidistant from x=0.5
      const centroids: Embedding[] = [
        [0, 0, 0],
        [1, 0, 0]
      ];
      
      const metrics = computeBoundaryMetrics(original, compressed, centroids);
      
      // Should handle this edge case where quantile split may be ambiguous
      expect(metrics).toBeDefined();
      expect(Number.isFinite(metrics.mse_global)).toBe(true);
    });
  });
});
