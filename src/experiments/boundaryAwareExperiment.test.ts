/**
 * End-to-End Boundary-Aware Experiment Test
 * 
 * Runs a small-scale version of the full experiment to validate the pipeline
 */

import { describe, it, expect } from 'vitest';
import { runExperiment } from '../experiments/experimentRunner';
import { EmbeddingMap } from '../types';
import { ExperimentConfig } from '../experiments/types';

describe('Boundary-Aware E2E Experiment', () => {
  // Helper to create synthetic cluster data
  const createClusterData = (
    numClusters: number,
    pointsPerCluster: number,
    spread: number
  ): EmbeddingMap => {
    const embeddings = new Map<string, number[]>();
    
    // Create cluster centers spread out in 8D space
    const centers: number[][] = [];
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

  it('should run complete baseline vs boundary-aware experiment', async () => {
    // Generate test data
    const embeddings = createClusterData(3, 20, 0.5);
    expect(embeddings.size).toBe(60);

    // Baseline experiment config
    const baselineConfig: ExperimentConfig = {
      id: 'test-baseline',
      name: 'Test Baseline',
      description: 'Baseline lattice-hybrid compression',
      embeddingModel: 'gemini',
      datasetType: 'text',
      compressionStrategy: 'lattice-hybrid',
      gridRange: { min: 0.1, max: 0.5, steps: 3 },
      kRange: { min: 3, max: 5, steps: 2 },
      metrics: [
        'lsi',
        'mse_global',
        'mse_boundary',
        'mse_bulk',
        'delta_boundary',
        'neighborhoodOverlap'
      ],
      detectBoundaries: false,
    };

    // Boundary-aware experiment config
    const boundaryConfig: ExperimentConfig = {
      ...baselineConfig,
      id: 'test-boundary-aware',
      name: 'Test Boundary-Aware',
      description: 'Boundary-aware compression',
      compressionStrategy: 'boundary-aware',
    };

    // Run both experiments
    console.log('\nRunning baseline experiment...');
    const baselineResult = await runExperiment(baselineConfig, embeddings);
    
    console.log('Running boundary-aware experiment...');
    const boundaryResult = await runExperiment(boundaryConfig, embeddings);

    // Validate results structure
    expect(baselineResult.metadata).toBeDefined();
    expect(baselineResult.points).toBeDefined();
    expect(baselineResult.points.length).toBeGreaterThan(0);
    
    expect(boundaryResult.metadata).toBeDefined();
    expect(boundaryResult.points).toBeDefined();
    expect(boundaryResult.points.length).toBeGreaterThan(0);

    // Should have same number of points (same parameter grid)
    expect(boundaryResult.points.length).toBe(baselineResult.points.length);

    // Extract metrics for comparison
    const baselineMetrics = baselineResult.points.map(p => ({
      grid: p.grid!,
      k: p.k!,
      mse_global: p.metrics.mse_global!,
      mse_boundary: p.metrics.mse_boundary!,
      delta_boundary: p.metrics.delta_boundary!,
    }));

    const boundaryMetrics = boundaryResult.points.map(p => ({
      grid: p.grid!,
      k: p.k!,
      mse_global: p.metrics.mse_global!,
      mse_boundary: p.metrics.mse_boundary!,
      delta_boundary: p.metrics.delta_boundary!,
    }));

    // Print comparison for manual inspection
    console.log('\n=== COMPARISON ===');
    console.log('Grid | k | Mode            | Global MSE   | Boundary MSE | Δ_boundary');
    console.log('-----|---|-----------------|--------------|--------------|------------');
    
    for (let i = 0; i < baselineMetrics.length; i++) {
      const base = baselineMetrics[i];
      const boundary = boundaryMetrics[i];
      
      console.log(
        `${base.grid.toFixed(2)} | ${base.k} | Baseline        | ` +
        `${base.mse_global.toFixed(6)} | ${base.mse_boundary.toFixed(6)} | ${base.delta_boundary.toFixed(6)}`
      );
      console.log(
        `     |   | Boundary-Aware  | ` +
        `${boundary.mse_global.toFixed(6)} | ${boundary.mse_boundary.toFixed(6)} | ${boundary.delta_boundary.toFixed(6)}`
      );
      console.log('-----|---|-----------------|--------------|--------------|------------');
    }

    // Check that all metrics are finite
    for (const point of baselineResult.points) {
      expect(Number.isFinite(point.metrics.mse_global)).toBe(true);
      expect(Number.isFinite(point.metrics.lsi)).toBe(true);
    }

    for (const point of boundaryResult.points) {
      expect(Number.isFinite(point.metrics.mse_global)).toBe(true);
      expect(Number.isFinite(point.metrics.lsi)).toBe(true);
    }

    // Count improvements
    let improvements = 0;
    for (let i = 0; i < baselineMetrics.length; i++) {
      if (boundaryMetrics[i].mse_global < baselineMetrics[i].mse_global) {
        improvements++;
      }
    }

    console.log(`\nBoundary-aware improvements: ${improvements}/${baselineMetrics.length}`);

    // At minimum, both should produce valid results
    expect(baselineResult.points.length).toBeGreaterThan(0);
    expect(boundaryResult.points.length).toBeGreaterThan(0);
  }, 60000); // 60 second timeout for this test
});
