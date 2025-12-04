/**
 * Experiment Runner
 * 
 * Executes batch sweeps over parameter space and saves results
 */

import { EmbeddingMap, SurfaceMetricPoint } from '../types';
import { compressEmbeddings } from '../services/compressionService';
import { analyzeCompression } from '../services/analysisService';
import { computeAllDistortionMetrics } from '../services/distortionService';
import { computeStabilityBoundary } from '../services/stabilityBoundaryService';
import { BASELINE_METHODS } from '../services/baselineCompressionService';
import {
  ExperimentConfig,
  ExperimentResult,
  ExperimentPoint,
  ExperimentMetadata,
  MetricType
} from './types';

/**
 * Run a single experiment configuration
 */
export async function runExperiment(
  config: ExperimentConfig,
  embeddings: EmbeddingMap
): Promise<ExperimentResult> {
  const metadata: ExperimentMetadata = {
    experimentId: config.id,
    name: config.name,
    timestamp: new Date().toISOString(),
    model: config.embeddingModel,
    strategy: config.compressionStrategy,
    datasetType: config.datasetType,
    sampleSize: embeddings.size,
    parameters: {
      gridRange: config.gridRange,
      kRange: config.kRange,
    },
  };

  const points: ExperimentPoint[] = [];
  const surfacePoints: SurfaceMetricPoint[] = [];

  // Generate parameter grid
  const gridValues = config.gridRange 
    ? generateRange(config.gridRange.min, config.gridRange.max, config.gridRange.steps)
    : [0.1];
  
  const kValues = config.kRange
    ? generateRangeInt(config.kRange.min, config.kRange.max, config.kRange.steps)
    : [5];

  // Run sweep
  for (const grid of gridValues) {
    for (const k of kValues) {
      const point = await runSinglePoint(
        embeddings,
        config.compressionStrategy,
        { grid, k },
        config.metrics
      );
      
      points.push(point);
      
      // Also store as surface point for boundary detection
      if (point.metrics.lsi !== undefined) {
        surfacePoints.push({
          grid: grid,
          k: k,
          lsi: point.metrics.lsi,
          cosine: point.metrics.cosine || 0,
          energy: point.metrics.energy || 0,
          semanticEfficiency: point.metrics.semanticEfficiency || 0,
        });
      }
    }
  }

  // Detect boundaries if requested
  let boundaries = undefined;
  if (config.detectBoundaries && surfacePoints.length > 0) {
    const stabilityBoundary = computeStabilityBoundary(surfacePoints);
    boundaries = {
      ridgeLine: stabilityBoundary.ridgeLine.map(p => ({
        grid: p.grid,
        k: p.k,
        lsi: p.lsi,
      })),
      collapseThreshold: stabilityBoundary.collapseThreshold,
      zones: {
        stable: stabilityBoundary.zones.stable.map(p => ({ grid: p.grid, k: p.k })),
        degradation: stabilityBoundary.zones.degradation.map(p => ({ grid: p.grid, k: p.k })),
        collapse: stabilityBoundary.zones.collapse.map(p => ({ grid: p.grid, k: p.k })),
      },
    };
  }

  // Find best point (highest LSI)
  const bestPoint = points.reduce((best, current) => {
    const bestLSI = best.metrics.lsi || 0;
    const currentLSI = current.metrics.lsi || 0;
    return currentLSI > bestLSI ? current : best;
  }, points[0]);

  // Compute stability score (average LSI in stable zone)
  const stablePoints = boundaries?.zones?.stable || [];
  const stabilityScore = stablePoints.length > 0
    ? stablePoints.reduce((sum, p) => {
        const point = surfacePoints.find(sp => sp.grid === p.grid && sp.k === p.k);
        return sum + (point?.lsi || 0);
      }, 0) / stablePoints.length
    : 0;

  return {
    metadata,
    points,
    boundaries,
    summary: {
      totalPoints: points.length,
      bestPoint,
      stabilityScore,
    },
  };
}

/**
 * Run a single parameter point
 */
async function runSinglePoint(
  embeddings: EmbeddingMap,
  strategy: string,
  params: { grid: number; k: number },
  metricTypes: MetricType[]
): Promise<ExperimentPoint> {
  // Determine compression method
  let compressed: EmbeddingMap;
  
  if (strategy.startsWith('scalar-') || strategy.startsWith('pq-')) {
    // Baseline compression
    const baselineMethod = strategy as keyof typeof BASELINE_METHODS;
    if (BASELINE_METHODS[baselineMethod]) {
      compressed = BASELINE_METHODS[baselineMethod](embeddings);
    } else {
      throw new Error(`Unknown baseline method: ${strategy}`);
    }
  } else {
    // Lattice-based compression
    const method = strategy === 'lattice-grid' ? 'grid' 
                 : strategy === 'lattice-kmeans' ? 'kmeans'
                 : 'kmeans-grid';
    
    compressed = compressEmbeddings(embeddings, {
      method,
      step: params.grid,
      k: params.k,
    });
  }

  // Compute requested metrics
  const metrics: { [key in MetricType]?: number } = {};

  // Basic compression metrics
  if (metricTypes.some(m => ['lsi', 'cosine', 'energy', 'semanticEfficiency'].includes(m))) {
    const basicMetrics = analyzeCompression(embeddings, compressed);
    
    if (metricTypes.includes('lsi')) metrics.lsi = basicMetrics.lsi;
    if (metricTypes.includes('cosine')) metrics.cosine = basicMetrics.averageCosineSimilarity;
    if (metricTypes.includes('energy')) metrics.energy = basicMetrics.compressionEnergy;
    if (metricTypes.includes('semanticEfficiency')) metrics.semanticEfficiency = basicMetrics.semanticEfficiency;
  }

  // Distortion metrics
  const distortionMetricTypes = [
    'pairwiseDistortion',
    'neighborhoodOverlap',
    'collapseRatio',
    'clusterDrift',
    'densityChange',
    'geodesicDistortion'
  ];
  
  if (metricTypes.some(m => distortionMetricTypes.includes(m))) {
    const distortionMetrics = computeAllDistortionMetrics(embeddings, compressed);
    
    if (metricTypes.includes('pairwiseDistortion')) {
      metrics.pairwiseDistortion = distortionMetrics.pairwiseDistanceDistortion;
    }
    if (metricTypes.includes('neighborhoodOverlap')) {
      metrics.neighborhoodOverlap = distortionMetrics.neighborhoodOverlap;
    }
    if (metricTypes.includes('collapseRatio')) {
      metrics.collapseRatio = distortionMetrics.collapseRatio;
    }
    if (metricTypes.includes('clusterDrift')) {
      metrics.clusterDrift = distortionMetrics.clusterDriftScore;
    }
    if (metricTypes.includes('densityChange')) {
      metrics.densityChange = distortionMetrics.localDensityChange;
    }
    if (metricTypes.includes('geodesicDistortion')) {
      metrics.geodesicDistortion = distortionMetrics.geodesicDistortion;
    }
  }

  return {
    grid: params.grid,
    k: params.k,
    metrics,
  };
}

/**
 * Generate range of values
 */
function generateRange(min: number, max: number, steps: number): number[] {
  if (steps <= 1) return [min];
  
  const range: number[] = [];
  const stepSize = (max - min) / (steps - 1);
  
  for (let i = 0; i < steps; i++) {
    range.push(min + i * stepSize);
  }
  
  return range;
}

/**
 * Generate range of integer values
 */
function generateRangeInt(min: number, max: number, steps: number): number[] {
  if (steps <= 1) return [Math.round(min)];
  
  const range: number[] = [];
  const stepSize = (max - min) / (steps - 1);
  
  for (let i = 0; i < steps; i++) {
    range.push(Math.round(min + i * stepSize));
  }
  
  // Remove duplicates and sort
  return [...new Set(range)].sort((a, b) => a - b);
}

/**
 * Save experiment result to file
 */
export function saveExperimentResult(result: ExperimentResult): string {
  const filename = `experiment-${result.metadata.experimentId}-${Date.now()}.json`;
  const json = JSON.stringify(result, null, 2);
  
  // Return JSON string (actual file saving would be handled by the caller)
  return json;
}

/**
 * Export experiment results to CSV
 */
export function exportToCSV(result: ExperimentResult): string {
  const headers = ['grid', 'k', ...Object.keys(result.points[0]?.metrics || {})];
  const rows = result.points.map(point => {
    const row = [
      point.grid?.toString() || '',
      point.k?.toString() || '',
    ];
    
    headers.slice(2).forEach(metric => {
      row.push((point.metrics[metric as MetricType]?.toString() || ''));
    });
    
    return row.join(',');
  });
  
  return [headers.join(','), ...rows].join('\n');
}
