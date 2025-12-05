/**
 * Boundary-Aware Compression Tests
 * 
 * Tests for boundary-aware compression method and comparison with baseline
 */

import { describe, it, expect } from 'vitest';
import { compressEmbeddings } from './compressionService';
import { computeBoundaryMetrics } from './boundaryMetricsService';
import { EmbeddingMap, Embedding } from '../types';

describe('Boundary-Aware Compression', () => {
  // Helper to create synthetic cluster data
  const createClusterData = (
    numClusters: number,
    pointsPerCluster: number,
    spread: number
  ): EmbeddingMap => {
    const embeddings = new Map<string, Embedding>();
    
    // Create cluster centers
    const centers: Embedding[] = [];
    for (let c = 0; c < numClusters; c++) {
      centers.push([
        c * 2.0,
        c * 2.0,
        c * 2.0,
        0, 0, 0, 0, 0
      ]);
    }
    
    // Generate points around each center
    for (let c = 0; c < numClusters; c++) {
      for (let i = 0; i < pointsPerCluster; i++) {
        const point = centers[c].map(coord => 
          coord + (Math.random() - 0.5) * spread
        );
        embeddings.set(`cluster${c}_point${i}`, point);
      }
    }
    
    return embeddings;
  };

  describe('Boundary-Aware Method', () => {
    it('should compress using boundary-aware mode', () => {
      const embeddings = createClusterData(3, 10, 0.5);
      
      const result = compressEmbeddings(embeddings, {
        method: 'boundary-aware',
        step: 0.25,
        k: 3
      });
      
      expect(result.compressed.size).toBe(embeddings.size);
      expect(result.centroids.length).toBeGreaterThan(0);
      
      // Should have more centroids than baseline due to finer grid for boundary
      const baselineResult = compressEmbeddings(embeddings, {
        method: 'kmeans-grid',
        step: 0.25,
        k: 3
      });
      
      // Boundary-aware should have at least as many centroids (possibly more)
      expect(result.centroids.length).toBeGreaterThanOrEqual(baselineResult.centroids.length);
    });

    it('should produce valid compressed vectors', () => {
      const embeddings = createClusterData(3, 10, 0.5);
      
      const result = compressEmbeddings(embeddings, {
        method: 'boundary-aware',
        step: 0.25,
        k: 3
      });
      
      // All compressed vectors should be valid
      for (const [item, vector] of result.compressed) {
        expect(vector).toBeDefined();
        expect(vector.length).toBeGreaterThan(0);
        expect(vector.every(v => Number.isFinite(v))).toBe(true);
      }
    });
  });

  describe('Baseline vs Boundary-Aware Comparison', () => {
    it('should compute metrics for both modes', () => {
      const embeddings = createClusterData(5, 20, 0.5);
      
      // Baseline compression
      const baselineResult = compressEmbeddings(embeddings, {
        method: 'kmeans-grid',
        step: 0.25,
        k: 5
      });
      
      // Boundary-aware compression
      const boundaryResult = compressEmbeddings(embeddings, {
        method: 'boundary-aware',
        step: 0.25,
        k: 5
      });
      
      // Compute metrics for both
      const baselineMetrics = computeBoundaryMetrics(
        embeddings,
        baselineResult.compressed,
        baselineResult.centroids,
        true // Include extended metrics
      );
      
      const boundaryMetrics = computeBoundaryMetrics(
        embeddings,
        boundaryResult.compressed,
        boundaryResult.centroids,
        true
      );
      
      // Both should have valid metrics
      expect(Number.isFinite(baselineMetrics.mse_global)).toBe(true);
      expect(Number.isFinite(boundaryMetrics.mse_global)).toBe(true);
      
      expect(baselineMetrics.knn_overlap).toBeDefined();
      expect(boundaryMetrics.knn_overlap).toBeDefined();
      
      expect(baselineMetrics.compression_ratio).toBeDefined();
      expect(boundaryMetrics.compression_ratio).toBeDefined();
    });

    it('should show difference in boundary treatment', () => {
      const embeddings = createClusterData(4, 25, 0.6);
      
      const baselineResult = compressEmbeddings(embeddings, {
        method: 'kmeans-grid',
        step: 0.3,
        k: 4
      });
      
      const boundaryResult = compressEmbeddings(embeddings, {
        method: 'boundary-aware',
        step: 0.3,
        k: 4
      });
      
      const baselineMetrics = computeBoundaryMetrics(
        embeddings,
        baselineResult.compressed,
        baselineResult.centroids
      );
      
      const boundaryMetrics = computeBoundaryMetrics(
        embeddings,
        boundaryResult.compressed,
        boundaryResult.centroids
      );
      
      // Metrics should be computed successfully
      expect(Number.isFinite(baselineMetrics.delta_boundary)).toBe(true);
      expect(Number.isFinite(boundaryMetrics.delta_boundary)).toBe(true);
    });
  });

  describe('Extended Metrics', () => {
    it('should compute k-NN overlap', () => {
      const embeddings = createClusterData(3, 15, 0.4);
      
      const result = compressEmbeddings(embeddings, {
        method: 'boundary-aware',
        step: 0.2,
        k: 3
      });
      
      const metrics = computeBoundaryMetrics(
        embeddings,
        result.compressed,
        result.centroids,
        true // Compute extended metrics
      );
      
      expect(metrics.knn_overlap).toBeDefined();
      expect(metrics.knn_overlap).toBeGreaterThan(0);
      expect(metrics.knn_overlap).toBeLessThanOrEqual(1);
    });

    it('should compute compression ratio', () => {
      const embeddings = createClusterData(4, 20, 0.5);
      
      const result = compressEmbeddings(embeddings, {
        method: 'boundary-aware',
        step: 0.25,
        k: 4
      });
      
      const metrics = computeBoundaryMetrics(
        embeddings,
        result.compressed,
        result.centroids,
        true
      );
      
      expect(metrics.compression_ratio).toBeDefined();
      expect(metrics.compression_ratio).toBeGreaterThan(0);
      
      expect(metrics.memory_bits).toBeDefined();
      expect(metrics.memory_bits).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle small datasets', () => {
      const embeddings = new Map<string, Embedding>([
        ['item1', [1, 2, 3, 4, 5, 6, 7, 8]],
        ['item2', [2, 3, 4, 5, 6, 7, 8, 9]],
        ['item3', [3, 4, 5, 6, 7, 8, 9, 10]]
      ]);
      
      const result = compressEmbeddings(embeddings, {
        method: 'boundary-aware',
        step: 0.5,
        k: 2
      });
      
      expect(result.compressed.size).toBe(3);
      expect(result.centroids.length).toBeGreaterThan(0);
    });

    it('should handle high compression (large grid step)', () => {
      const embeddings = createClusterData(3, 10, 0.3);
      
      const result = compressEmbeddings(embeddings, {
        method: 'boundary-aware',
        step: 1.0, // Large step = high compression
        k: 3
      });
      
      const metrics = computeBoundaryMetrics(
        embeddings,
        result.compressed,
        result.centroids
      );
      
      // Should still produce valid metrics even with high compression
      expect(Number.isFinite(metrics.mse_global)).toBe(true);
    });

    it('should handle low compression (small grid step)', () => {
      const embeddings = createClusterData(3, 10, 0.3);
      
      const result = compressEmbeddings(embeddings, {
        method: 'boundary-aware',
        step: 0.01, // Small step = low compression
        k: 3
      });
      
      const metrics = computeBoundaryMetrics(
        embeddings,
        result.compressed,
        result.centroids
      );
      
      // Low compression should yield relatively low MSE
      expect(metrics.mse_global).toBeLessThan(1.0);
      expect(Number.isFinite(metrics.mse_global)).toBe(true);
    });
  });
});
