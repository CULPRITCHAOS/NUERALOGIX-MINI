/**
 * Stability Boundary Detector
 * 
 * Automatically detects ridge lines (local maxima) and collapse boundaries
 * in the compression parameter space.
 */

import { SurfaceMetricPoint } from '../types';

export type StabilityZone = 'stable' | 'degradation' | 'collapse';

export interface RidgePoint {
  grid: number;
  k: number;
  lsi: number;
  semanticEfficiency: number;
  zone: StabilityZone;
}

export interface StabilityBoundary {
  ridgeLine: RidgePoint[];
  collapseThreshold: { grid: number; k: number } | null;
  zones: {
    stable: RidgePoint[];
    degradation: RidgePoint[];
    collapse: RidgePoint[];
  };
}

/**
 * Detect ridge line (local maxima) in the parameter space
 * Uses a simple gradient-based approach
 */
export function detectRidgeLine(
  metrics: SurfaceMetricPoint[],
  metricName: 'lsi' | 'semanticEfficiency' = 'lsi'
): RidgePoint[] {
  if (metrics.length === 0) return [];
  
  // Group metrics by grid step
  const byGrid = new Map<number, SurfaceMetricPoint[]>();
  metrics.forEach(m => {
    if (!byGrid.has(m.grid)) {
      byGrid.set(m.grid, []);
    }
    byGrid.get(m.grid)!.push(m);
  });
  
  // For each grid step, find the k value with maximum metric
  const ridgePoints: RidgePoint[] = [];
  
  Array.from(byGrid.keys()).sort((a, b) => a - b).forEach(grid => {
    const points = byGrid.get(grid)!;
    const maxPoint = points.reduce((max, current) => 
      current[metricName] > max[metricName] ? current : max
    );
    
    ridgePoints.push({
      grid: maxPoint.grid,
      k: maxPoint.k,
      lsi: maxPoint.lsi,
      semanticEfficiency: maxPoint.semanticEfficiency,
      zone: classifyStabilityZone(maxPoint)
    });
  });
  
  return ridgePoints;
}

/**
 * Detect collapse cliff where LSI trends to zero
 * Returns grid step where LSI drops below threshold
 */
export function detectCollapseCliff(
  metrics: SurfaceMetricPoint[],
  lsiThreshold: number = 0.1
): { grid: number; k: number } | null {
  if (metrics.length === 0) return null;
  
  // Sort by grid step
  const sorted = [...metrics].sort((a, b) => a.grid - b.grid);
  
  // Find first point where all k values have LSI below threshold
  const byGrid = new Map<number, SurfaceMetricPoint[]>();
  sorted.forEach(m => {
    if (!byGrid.has(m.grid)) {
      byGrid.set(m.grid, []);
    }
    byGrid.get(m.grid)!.push(m);
  });
  
  for (const [grid, points] of byGrid.entries()) {
    const allBelowThreshold = points.every(p => p.lsi < lsiThreshold);
    if (allBelowThreshold) {
      // Return the point with highest k
      const maxK = points.reduce((max, current) => 
        current.k > max.k ? current : max
      );
      return { grid: maxK.grid, k: maxK.k };
    }
  }
  
  return null;
}

/**
 * Classify a point into stability zone
 * 
 * Thresholds based on empirical observations:
 * - LSI >= 0.5: Stable zone (good preservation of semantic structure)
 * - 0.2 <= LSI < 0.5: Degradation zone (noticeable quality loss)
 * - LSI < 0.2: Collapse zone (semantic structure destroyed)
 */
export function classifyStabilityZone(point: SurfaceMetricPoint): StabilityZone {
  const STABLE_LSI_THRESHOLD = 0.5;
  const DEGRADATION_LSI_THRESHOLD = 0.2;
  
  if (point.lsi >= STABLE_LSI_THRESHOLD) {
    return 'stable';
  } else if (point.lsi >= DEGRADATION_LSI_THRESHOLD) {
    return 'degradation';
  } else {
    return 'collapse';
  }
}

/**
 * Compute full stability boundary analysis
 */
export function computeStabilityBoundary(
  metrics: SurfaceMetricPoint[]
): StabilityBoundary {
  const ridgeLine = detectRidgeLine(metrics, 'lsi');
  const collapseThreshold = detectCollapseCliff(metrics);
  
  // Classify all ridge points into zones
  const zones = {
    stable: ridgeLine.filter(p => p.zone === 'stable'),
    degradation: ridgeLine.filter(p => p.zone === 'degradation'),
    collapse: ridgeLine.filter(p => p.zone === 'collapse'),
  };
  
  return {
    ridgeLine,
    collapseThreshold,
    zones,
  };
}

/**
 * Detect local maxima in 2D surface
 * A point is a local maximum if it's greater than all 8 neighbors
 */
export function detectLocalMaxima(
  metrics: SurfaceMetricPoint[],
  metricName: 'lsi' | 'semanticEfficiency' = 'lsi'
): RidgePoint[] {
  if (metrics.length === 0) return [];
  
  // Create a grid lookup
  const grid = new Map<string, SurfaceMetricPoint>();
  metrics.forEach(m => {
    grid.set(`${m.grid},${m.k}`, m);
  });
  
  const localMaxima: RidgePoint[] = [];
  
  // Get unique grid and k values
  const gridValues = [...new Set(metrics.map(m => m.grid))].sort((a, b) => a - b);
  const kValues = [...new Set(metrics.map(m => m.k))].sort((a, b) => a - b);
  
  // Check each point
  gridValues.forEach((gridVal, gridIdx) => {
    kValues.forEach((kVal, kIdx) => {
      const point = grid.get(`${gridVal},${kVal}`);
      if (!point) return;
      
      const value = point[metricName];
      let isLocalMax = true;
      
      // Check all 8 neighbors
      for (let di = -1; di <= 1; di++) {
        for (let dj = -1; dj <= 1; dj++) {
          if (di === 0 && dj === 0) continue; // Skip self
          
          const neighborGridIdx = gridIdx + di;
          const neighborKIdx = kIdx + dj;
          
          if (neighborGridIdx >= 0 && neighborGridIdx < gridValues.length &&
              neighborKIdx >= 0 && neighborKIdx < kValues.length) {
            const neighborGrid = gridValues[neighborGridIdx];
            const neighborK = kValues[neighborKIdx];
            const neighbor = grid.get(`${neighborGrid},${neighborK}`);
            
            if (neighbor && neighbor[metricName] > value) {
              isLocalMax = false;
              break;
            }
          }
        }
        if (!isLocalMax) break;
      }
      
      if (isLocalMax) {
        localMaxima.push({
          grid: point.grid,
          k: point.k,
          lsi: point.lsi,
          semanticEfficiency: point.semanticEfficiency,
          zone: classifyStabilityZone(point)
        });
      }
    });
  });
  
  return localMaxima;
}

/**
 * Compute efficiency frontier
 * Returns points that are Pareto-optimal in terms of compression vs quality
 */
export function computeEfficiencyFrontier(
  metrics: SurfaceMetricPoint[]
): RidgePoint[] {
  if (metrics.length === 0) return [];
  
  // Sort by grid step (higher grid = more compression)
  const sorted = [...metrics].sort((a, b) => b.grid - a.grid);
  
  const frontier: RidgePoint[] = [];
  let maxLSI = -Infinity;
  
  // A point is on the frontier if it has higher LSI than all points with more compression
  sorted.forEach(point => {
    if (point.lsi > maxLSI) {
      maxLSI = point.lsi;
      frontier.push({
        grid: point.grid,
        k: point.k,
        lsi: point.lsi,
        semanticEfficiency: point.semanticEfficiency,
        zone: classifyStabilityZone(point)
      });
    }
  });
  
  return frontier.reverse(); // Return in order of increasing compression
}
