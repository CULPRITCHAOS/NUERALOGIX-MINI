/**
 * Stability Confidence Service
 * 
 * Computes a confidence score indicating how reliable a stability region is.
 * The system can now say: "I'm 72% confident this region is real."
 * 
 * Components:
 * - Ridge sharpness: How pronounced is the ridge?
 * - Cliff steepness: How rapidly does LSI drop?
 * - Neighbor continuity: Are nearby points similar?
 * - Metric consistency: Do different metrics agree?
 */

import { SurfaceMetricPoint, EmbeddingMap } from '../types';
import { DistortionMetrics } from './distortionService';

export interface StabilityConfidence {
  confidenceScore: number; // 0-1, where 1 = high confidence
  ridgeSharpness: number; // 0-1, how pronounced is the ridge
  cliffSteepness: number; // 0-1, how steep is the collapse
  neighborContinuity: number; // 0-1, how smooth is the surface
  metricConsistency: number; // 0-1, how aligned are different metrics
  details: string; // Human-readable explanation
}

/**
 * Compute stability confidence score for a point in parameter space
 */
export function computeStabilityConfidence(
  point: SurfaceMetricPoint,
  allMetrics: SurfaceMetricPoint[],
  distortionMetrics?: DistortionMetrics
): StabilityConfidence {
  // Compute individual components
  const ridgeSharpness = computeRidgeSharpness(point, allMetrics);
  const cliffSteepness = computeCliffSteepness(point, allMetrics);
  const neighborContinuity = computeNeighborContinuity(point, allMetrics);
  const metricConsistency = computeMetricConsistency(point, distortionMetrics);
  
  // Overall confidence is weighted average
  const confidenceScore = (
    ridgeSharpness * 0.3 +
    cliffSteepness * 0.3 +
    neighborContinuity * 0.2 +
    metricConsistency * 0.2
  );
  
  // Generate human-readable explanation
  const details = generateConfidenceExplanation(
    confidenceScore,
    ridgeSharpness,
    cliffSteepness,
    neighborContinuity,
    metricConsistency
  );
  
  return {
    confidenceScore,
    ridgeSharpness,
    cliffSteepness,
    neighborContinuity,
    metricConsistency,
    details
  };
}

/**
 * Compute ridge sharpness
 * Measures how pronounced the local maximum is compared to neighbors
 */
function computeRidgeSharpness(
  point: SurfaceMetricPoint,
  allMetrics: SurfaceMetricPoint[]
): number {
  if (allMetrics.length === 0) return 0;
  
  // Find neighbors with same grid value
  const neighbors = allMetrics.filter(m => 
    m.grid === point.grid && m.k !== point.k
  );
  
  if (neighbors.length === 0) return 0.5; // No neighbors to compare
  
  // Compute how much higher this point is than average neighbor
  const avgNeighborLSI = neighbors.reduce((sum, m) => sum + m.lsi, 0) / neighbors.length;
  const maxNeighborLSI = Math.max(...neighbors.map(m => m.lsi));
  
  if (point.lsi <= avgNeighborLSI) return 0; // Not a peak
  
  // Sharpness is relative improvement over neighbors
  const improvement = (point.lsi - avgNeighborLSI) / (maxNeighborLSI - avgNeighborLSI + 1e-10);
  
  return Math.min(1, improvement);
}

/**
 * Compute cliff steepness
 * Measures how rapidly LSI drops when moving away from stable region
 */
function computeCliffSteepness(
  point: SurfaceMetricPoint,
  allMetrics: SurfaceMetricPoint[]
): number {
  if (allMetrics.length === 0) return 0;
  
  // Find points with same k but different grid
  const sameKPoints = allMetrics
    .filter(m => m.k === point.k)
    .sort((a, b) => a.grid - b.grid);
  
  if (sameKPoints.length < 2) return 0.5;
  
  // Find position of current point
  const idx = sameKPoints.findIndex(m => m.grid === point.grid);
  if (idx === -1 || idx === sameKPoints.length - 1) return 0.5;
  
  // Compute slope to next point
  const nextPoint = sameKPoints[idx + 1];
  const slope = Math.abs(nextPoint.lsi - point.lsi) / (nextPoint.grid - point.grid + 1e-10);
  
  // Normalize slope to 0-1 range (steeper = higher confidence)
  return Math.min(1, slope / 2);
}

/**
 * Compute neighbor continuity
 * Measures how smooth the surface is around this point
 */
function computeNeighborContinuity(
  point: SurfaceMetricPoint,
  allMetrics: SurfaceMetricPoint[]
): number {
  if (allMetrics.length === 0) return 0;
  
  // Find all 8-neighbors in grid
  const neighbors = allMetrics.filter(m => {
    const gridDiff = Math.abs(m.grid - point.grid);
    const kDiff = Math.abs(m.k - point.k);
    return (gridDiff <= 0.05 || kDiff <= 1) && (m.grid !== point.grid || m.k !== point.k);
  });
  
  if (neighbors.length === 0) return 0.5;
  
  // Compute variance in LSI among neighbors
  const lsiValues = neighbors.map(m => m.lsi);
  const mean = lsiValues.reduce((sum, val) => sum + val, 0) / lsiValues.length;
  const variance = lsiValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / lsiValues.length;
  const stdDev = Math.sqrt(variance);
  
  // Lower variance = higher continuity
  // Normalize: assume stdDev of 0.2 is high discontinuity
  const continuity = 1 - Math.min(1, stdDev / 0.2);
  
  return continuity;
}

/**
 * Compute metric consistency
 * Measures whether different distortion metrics agree with LSI assessment
 */
function computeMetricConsistency(
  point: SurfaceMetricPoint,
  distortionMetrics?: DistortionMetrics
): number {
  if (!distortionMetrics) return 0.5; // No data available
  
  // Check consistency between LSI and distortion metrics
  // High LSI should correspond to:
  // - High neighborhood overlap (> 0.7)
  // - Low pairwise distortion (< 0.3)
  // - Low collapse ratio (< 0.2)
  
  const lsiLevel = point.lsi > 0.5 ? 'high' : point.lsi > 0.2 ? 'medium' : 'low';
  
  let consistencyCount = 0;
  let totalChecks = 0;
  
  // Check neighborhood overlap
  if (distortionMetrics.neighborhoodOverlap !== undefined) {
    totalChecks++;
    const expected = lsiLevel === 'high' ? distortionMetrics.neighborhoodOverlap > 0.7 :
                     lsiLevel === 'medium' ? distortionMetrics.neighborhoodOverlap > 0.5 :
                     distortionMetrics.neighborhoodOverlap <= 0.5;
    if (expected) consistencyCount++;
  }
  
  // Check pairwise distortion
  if (distortionMetrics.pairwiseDistanceDistortion !== undefined) {
    totalChecks++;
    const expected = lsiLevel === 'high' ? distortionMetrics.pairwiseDistanceDistortion < 0.3 :
                     lsiLevel === 'medium' ? distortionMetrics.pairwiseDistanceDistortion < 0.5 :
                     distortionMetrics.pairwiseDistanceDistortion >= 0.5;
    if (expected) consistencyCount++;
  }
  
  // Check collapse ratio
  if (distortionMetrics.collapseRatio !== undefined) {
    totalChecks++;
    const expected = lsiLevel === 'high' ? distortionMetrics.collapseRatio < 0.2 :
                     lsiLevel === 'medium' ? distortionMetrics.collapseRatio < 0.4 :
                     distortionMetrics.collapseRatio >= 0.4;
    if (expected) consistencyCount++;
  }
  
  return totalChecks > 0 ? consistencyCount / totalChecks : 0.5;
}

/**
 * Generate human-readable confidence explanation
 */
function generateConfidenceExplanation(
  confidence: number,
  ridgeSharpness: number,
  cliffSteepness: number,
  neighborContinuity: number,
  metricConsistency: number
): string {
  const percentage = Math.round(confidence * 100);
  
  const factors: string[] = [];
  
  if (ridgeSharpness > 0.7) {
    factors.push('strong ridge peak');
  } else if (ridgeSharpness < 0.3) {
    factors.push('weak ridge definition');
  }
  
  if (cliffSteepness > 0.7) {
    factors.push('steep collapse boundary');
  } else if (cliffSteepness < 0.3) {
    factors.push('gradual degradation');
  }
  
  if (neighborContinuity > 0.7) {
    factors.push('smooth local surface');
  } else if (neighborContinuity < 0.3) {
    factors.push('noisy measurements');
  }
  
  if (metricConsistency > 0.7) {
    factors.push('consistent metrics');
  } else if (metricConsistency < 0.3) {
    factors.push('inconsistent metrics');
  }
  
  const factorStr = factors.length > 0 ? ` (${factors.join(', ')})` : '';
  
  if (confidence >= 0.7) {
    return `High confidence (${percentage}%)${factorStr} - this stability region appears reliable.`;
  } else if (confidence >= 0.4) {
    return `Moderate confidence (${percentage}%)${factorStr} - some uncertainty in stability assessment.`;
  } else {
    return `Low confidence (${percentage}%)${factorStr} - stability region may not be robust.`;
  }
}

/**
 * Batch compute confidence scores for all points
 */
export function computeStabilityConfidenceMap(
  metrics: SurfaceMetricPoint[],
  distortionMetricsMap?: Map<string, DistortionMetrics>
): Map<string, StabilityConfidence> {
  const confidenceMap = new Map<string, StabilityConfidence>();
  
  metrics.forEach(point => {
    const key = `${point.grid},${point.k}`;
    const distortion = distortionMetricsMap?.get(key);
    const confidence = computeStabilityConfidence(point, metrics, distortion);
    confidenceMap.set(key, confidence);
  });
  
  return confidenceMap;
}
