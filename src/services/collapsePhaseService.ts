/**
 * Collapse Phase Detection Service
 * 
 * Detects phase transitions in compression quality instead of using thresholds.
 * Uses computational geometry and statistics - no ML, no heuristics.
 * 
 * Features:
 * - Slope change detection (first derivative)
 * - Curvature analysis (second derivative)
 * - Boundary steepness scoring
 * - Phase transition identification
 */

import { SurfaceMetricPoint } from '../types';

export interface PhaseTransition {
  location: { grid: number; k: number };
  type: 'ridge-to-degradation' | 'degradation-to-collapse' | 'smooth' | 'cliff';
  steepness: number; // Rate of change
  confidence: number; // 0-1, how certain we are this is a real transition
}

export interface CollapsePhase {
  phase: 'stable' | 'degradation' | 'collapse';
  transitions: PhaseTransition[];
  slopeProfile: Array<{ grid: number; slope: number }>;
  curvatureProfile: Array<{ grid: number; curvature: number }>;
}

/**
 * Detect phase transitions in LSI curve
 */
export function detectPhaseTransitions(
  metrics: SurfaceMetricPoint[],
  k: number
): PhaseTransition[] {
  if (metrics.length < 3) return [];
  
  // Filter metrics for specific k value and sort by grid
  const sortedMetrics = metrics
    .filter(m => m.k === k)
    .sort((a, b) => a.grid - b.grid);
  
  if (sortedMetrics.length < 3) return [];
  
  const transitions: PhaseTransition[] = [];
  
  // Compute slopes between consecutive points
  const slopes: number[] = [];
  for (let i = 0; i < sortedMetrics.length - 1; i++) {
    const m1 = sortedMetrics[i];
    const m2 = sortedMetrics[i + 1];
    const slope = (m2.lsi - m1.lsi) / (m2.grid - m1.grid);
    slopes.push(slope);
  }
  
  // Compute curvatures (change in slope)
  const curvatures: number[] = [];
  for (let i = 0; i < slopes.length - 1; i++) {
    const curvature = slopes[i + 1] - slopes[i];
    curvatures.push(curvature);
  }
  
  // Find significant curvature changes (inflection points)
  const meanCurvature = curvatures.reduce((sum, c) => sum + c, 0) / curvatures.length;
  const stdCurvature = Math.sqrt(
    curvatures.reduce((sum, c) => sum + Math.pow(c - meanCurvature, 2), 0) / curvatures.length
  );
  
  // Detect transitions where curvature exceeds threshold
  const threshold = Math.abs(stdCurvature) * 1.5;
  
  for (let i = 0; i < curvatures.length; i++) {
    if (Math.abs(curvatures[i]) > threshold) {
      const point = sortedMetrics[i + 1];
      const slope = slopes[i];
      
      // Classify transition type
      let type: PhaseTransition['type'];
      if (slope < -0.5 && Math.abs(curvatures[i]) > threshold * 2) {
        type = 'cliff'; // Rapid collapse
      } else if (slope < -0.2) {
        type = 'degradation-to-collapse';
      } else if (slope > -0.1 && slope < 0) {
        type = 'ridge-to-degradation';
      } else {
        type = 'smooth';
      }
      
      // Confidence based on magnitude of curvature change
      const confidence = Math.min(1, Math.abs(curvatures[i]) / (threshold * 3));
      
      transitions.push({
        location: { grid: point.grid, k: point.k },
        type,
        steepness: Math.abs(slope),
        confidence
      });
    }
  }
  
  return transitions;
}

/**
 * Compute slope profile across grid steps
 */
export function computeSlopeProfile(
  metrics: SurfaceMetricPoint[],
  k: number
): Array<{ grid: number; slope: number }> {
  const sortedMetrics = metrics
    .filter(m => m.k === k)
    .sort((a, b) => a.grid - b.grid);
  
  if (sortedMetrics.length < 2) return [];
  
  const profile: Array<{ grid: number; slope: number }> = [];
  
  for (let i = 0; i < sortedMetrics.length - 1; i++) {
    const m1 = sortedMetrics[i];
    const m2 = sortedMetrics[i + 1];
    const slope = (m2.lsi - m1.lsi) / (m2.grid - m1.grid);
    
    // Associate slope with midpoint
    const midGrid = (m1.grid + m2.grid) / 2;
    profile.push({ grid: midGrid, slope });
  }
  
  return profile;
}

/**
 * Compute curvature profile (second derivative)
 */
export function computeCurvatureProfile(
  metrics: SurfaceMetricPoint[],
  k: number
): Array<{ grid: number; curvature: number }> {
  const sortedMetrics = metrics
    .filter(m => m.k === k)
    .sort((a, b) => a.grid - b.grid);
  
  if (sortedMetrics.length < 3) return [];
  
  const profile: Array<{ grid: number; curvature: number }> = [];
  
  // Compute second derivative using three-point stencil
  for (let i = 1; i < sortedMetrics.length - 1; i++) {
    const m0 = sortedMetrics[i - 1];
    const m1 = sortedMetrics[i];
    const m2 = sortedMetrics[i + 1];
    
    // Assume uniform spacing for simplicity
    const h = (m2.grid - m0.grid) / 2;
    const curvature = (m2.lsi - 2 * m1.lsi + m0.lsi) / (h * h);
    
    profile.push({ grid: m1.grid, curvature });
  }
  
  return profile;
}

/**
 * Classify collapse phase for a region
 */
export function classifyCollapsePhase(
  metrics: SurfaceMetricPoint[],
  k: number
): CollapsePhase {
  const transitions = detectPhaseTransitions(metrics, k);
  const slopeProfile = computeSlopeProfile(metrics, k);
  const curvatureProfile = computeCurvatureProfile(metrics, k);
  
  // Determine overall phase based on transitions and slopes
  let phase: 'stable' | 'degradation' | 'collapse' = 'stable';
  
  if (slopeProfile.length > 0) {
    const avgSlope = slopeProfile.reduce((sum, p) => sum + p.slope, 0) / slopeProfile.length;
    
    if (avgSlope < -0.5) {
      phase = 'collapse';
    } else if (avgSlope < -0.1) {
      phase = 'degradation';
    }
  }
  
  // Check if there's a cliff transition
  const hasCliff = transitions.some(t => t.type === 'cliff');
  if (hasCliff) {
    phase = 'collapse';
  }
  
  return {
    phase,
    transitions,
    slopeProfile,
    curvatureProfile
  };
}

/**
 * Detect all phase transitions across all k values
 */
export function detectAllPhaseTransitions(
  metrics: SurfaceMetricPoint[]
): Map<number, PhaseTransition[]> {
  const transitionMap = new Map<number, PhaseTransition[]>();
  
  // Get unique k values
  const kValues = [...new Set(metrics.map(m => m.k))].sort((a, b) => a - b);
  
  kValues.forEach(k => {
    const transitions = detectPhaseTransitions(metrics, k);
    if (transitions.length > 0) {
      transitionMap.set(k, transitions);
    }
  });
  
  return transitionMap;
}

/**
 * Compute boundary steepness at a specific point
 * Measures how rapidly LSI changes when moving in parameter space
 */
export function computeBoundarySteepness(
  point: SurfaceMetricPoint,
  allMetrics: SurfaceMetricPoint[]
): number {
  // Find neighbors in all 4 cardinal directions
  const neighbors = allMetrics.filter(m => {
    const sameGrid = Math.abs(m.grid - point.grid) < 0.01;
    const sameK = m.k === point.k;
    return (sameGrid || sameK) && (m.grid !== point.grid || m.k !== point.k);
  });
  
  if (neighbors.length === 0) return 0;
  
  // Compute gradient magnitude
  let maxGradient = 0;
  
  neighbors.forEach(neighbor => {
    const dx = neighbor.grid - point.grid;
    const dk = neighbor.k - point.k;
    const dLSI = neighbor.lsi - point.lsi;
    
    const distance = Math.sqrt(dx * dx + dk * dk);
    if (distance > 0) {
      const gradient = Math.abs(dLSI) / distance;
      maxGradient = Math.max(maxGradient, gradient);
    }
  });
  
  return maxGradient;
}

/**
 * Find the steepest collapse boundary in parameter space
 */
export function findSteepestCollapseBoundary(
  metrics: SurfaceMetricPoint[]
): { point: SurfaceMetricPoint; steepness: number } | null {
  if (metrics.length === 0) return null;
  
  let steepestPoint: SurfaceMetricPoint | null = null;
  let maxSteepness = 0;
  
  metrics.forEach(point => {
    const steepness = computeBoundarySteepness(point, metrics);
    if (steepness > maxSteepness) {
      maxSteepness = steepness;
      steepestPoint = point;
    }
  });
  
  return steepestPoint ? { point: steepestPoint, steepness: maxSteepness } : null;
}

/**
 * Compute collapse slope (rate of quality degradation)
 * Returns the average slope in the degradation region
 */
export function computeCollapseSlope(
  metrics: SurfaceMetricPoint[],
  k: number
): number {
  const sortedMetrics = metrics
    .filter(m => m.k === k)
    .sort((a, b) => a.grid - b.grid);
  
  if (sortedMetrics.length < 2) return 0;
  
  // Find the degradation region (where LSI is declining)
  const slopes: number[] = [];
  
  for (let i = 0; i < sortedMetrics.length - 1; i++) {
    const m1 = sortedMetrics[i];
    const m2 = sortedMetrics[i + 1];
    const slope = (m2.lsi - m1.lsi) / (m2.grid - m1.grid);
    
    // Only include negative slopes (degradation)
    if (slope < 0) {
      slopes.push(Math.abs(slope));
    }
  }
  
  if (slopes.length === 0) return 0;
  
  return slopes.reduce((sum, s) => sum + s, 0) / slopes.length;
}
