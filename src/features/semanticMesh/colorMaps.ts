// src/features/semanticMesh/colorMaps.ts

import { SemanticPoint, ColorMetric } from './types';

/**
 * Normalize a value to [0, 1] given min and max bounds
 */
function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0.5;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

/**
 * Convert a normalized value [0, 1] to an RGB color using a gradient
 * Uses a blue -> cyan -> green -> yellow -> red gradient (Viridis-like)
 */
function valueToRGB(t: number): [number, number, number] {
  // Clamp t to [0, 1]
  t = Math.max(0, Math.min(1, t));
  
  // Simple gradient: blue (low) -> green (mid) -> red (high)
  if (t < 0.5) {
    // Blue to green
    const s = t * 2;
    return [0, s, 1 - s];
  } else {
    // Green to red
    const s = (t - 0.5) * 2;
    return [s, 1 - s, 0];
  }
}

/**
 * Get RGB color for a point based on the selected metric
 */
export function getColorForPoint(
  point: SemanticPoint,
  stats: { lsi_min: number; lsi_max: number; energy_min: number; energy_max: number; density_min: number; density_max: number } | undefined,
  colorMetric: ColorMetric
): [number, number, number] {
  if (colorMetric === 'none' || !stats) {
    // Default gray color
    return [0.7, 0.7, 0.7];
  }

  let normalizedValue = 0.5;

  switch (colorMetric) {
    case 'lsi':
      normalizedValue = normalize(point.lsi, stats.lsi_min, stats.lsi_max);
      break;
    case 'energy':
      normalizedValue = normalize(point.energy, stats.energy_min, stats.energy_max);
      break;
    case 'collision_score':
      normalizedValue = normalize(point.collision_score, 0, 1);
      break;
    case 'cluster_id':
      // Use cluster_id mod 10 for color cycling
      normalizedValue = (point.cluster_id % 10) / 10;
      break;
    case 'density':
      normalizedValue = normalize(point.density, stats.density_min, stats.density_max);
      break;
  }

  return valueToRGB(normalizedValue);
}
