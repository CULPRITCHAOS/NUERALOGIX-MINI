#!/usr/bin/env node
/**
 * Task 3: MSE Transition Boundary Detection
 * 
 * Runs a parameter sweep on grid_step to detect the transition point
 * where MSE transitions from stable to collapse.
 */

import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { generateClusters } from '../src/services/syntheticDataService';
import { compressEmbeddings } from '../src/services/compressionService';
import { meanSquaredError } from '../src/services/mathService';
import { EmbeddingMap, Embedding } from '../src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface SweepPoint {
  grid_step: number;
  mse: number;
  recall_100: number;
}

interface TransitionAnalysis {
  data: SweepPoint[];
  transition_point: number | null;
  transition_mse: number | null;
  baseline_slope: number;
  transition_slope: number | null;
}

/**
 * Compute k-nearest neighbors in embedding space
 */
function computeKNN(
  embeddings: EmbeddingMap,
  k: number
): Map<string, string[]> {
  const items = Array.from(embeddings.keys());
  const knnMap = new Map<string, string[]>();
  
  for (const item of items) {
    const vec = embeddings.get(item)!;
    
    // Compute distances to all other items
    const distances = items
      .filter(other => other !== item)
      .map(other => ({
        item: other,
        dist: euclideanDistance(vec, embeddings.get(other)!)
      }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, k)
      .map(d => d.item);
    
    knnMap.set(item, distances);
  }
  
  return knnMap;
}

/**
 * Euclidean distance between two vectors
 */
function euclideanDistance(a: Embedding, b: Embedding): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/**
 * Compute recall@k
 */
function computeRecall(
  originalKNN: Map<string, string[]>,
  compressedKNN: Map<string, string[]>,
  k: number
): number {
  const items = Array.from(originalKNN.keys());
  let totalRecall = 0;
  
  for (const item of items) {
    const origNeighbors = new Set(originalKNN.get(item)!.slice(0, k));
    const compNeighbors = new Set(compressedKNN.get(item)!.slice(0, k));
    
    // Count intersection
    let intersection = 0;
    for (const neighbor of origNeighbors) {
      if (compNeighbors.has(neighbor)) {
        intersection++;
      }
    }
    
    totalRecall += intersection / k;
  }
  
  return totalRecall / items.length;
}

/**
 * Run compression experiment for a single grid_step value
 */
function runSweepPoint(
  embeddings: EmbeddingMap,
  gridStep: number,
  k: number
): SweepPoint {
  // Compress with lattice-hybrid method
  const { compressed } = compressEmbeddings(embeddings, {
    method: 'kmeans-grid',
    k: k,
    step: gridStep
  });
  
  // Compute MSE
  const items = Array.from(embeddings.keys());
  let totalMSE = 0;
  for (const item of items) {
    const orig = embeddings.get(item)!;
    const comp = compressed.get(item)!;
    totalMSE += meanSquaredError(orig, comp);
  }
  const mse = totalMSE / items.length;
  
  // Compute recall@100
  const origKNN = computeKNN(embeddings, 100);
  const compKNN = computeKNN(compressed, 100);
  const recall100 = computeRecall(origKNN, compKNN, 100);
  
  return {
    grid_step: gridStep,
    mse,
    recall_100: recall100
  };
}

/**
 * Detect transition point using derivative analysis
 */
function detectTransition(data: SweepPoint[]): TransitionAnalysis {
  // Sort by grid_step
  const sorted = [...data].sort((a, b) => a.grid_step - b.grid_step);
  
  // Compute derivatives (finite differences)
  const derivatives: number[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const dMSE = sorted[i + 1].mse - sorted[i].mse;
    const dGrid = sorted[i + 1].grid_step - sorted[i].grid_step;
    derivatives.push(dMSE / dGrid);
  }
  
  // Compute median slope as baseline
  const sortedDerivatives = [...derivatives].sort((a, b) => a - b);
  const medianIdx = Math.floor(sortedDerivatives.length / 2);
  const baselineSlope = sortedDerivatives.length > 0 
    ? sortedDerivatives[medianIdx] 
    : 0;
  
  // Find transition point: where derivative exceeds 2× median
  const threshold = 2 * baselineSlope;
  let transitionIdx: number | null = null;
  let transitionSlope: number | null = null;
  
  for (let i = 0; i < derivatives.length; i++) {
    if (derivatives[i] > threshold) {
      transitionIdx = i;
      transitionSlope = derivatives[i];
      break;
    }
  }
  
  let transitionPoint: number | null = null;
  let transitionMSE: number | null = null;
  
  if (transitionIdx !== null) {
    // Use the grid_step where transition occurs
    transitionPoint = sorted[transitionIdx + 1].grid_step;
    transitionMSE = sorted[transitionIdx + 1].mse;
  }
  
  return {
    data: sorted,
    transition_point: transitionPoint,
    transition_mse: transitionMSE,
    baseline_slope: baselineSlope,
    transition_slope: transitionSlope
  };
}

async function main() {
  console.log('=== TASK 3: MSE Transition Boundary Detection ===\n');
  
  // Generate clusters_500 dataset with seed=42
  console.log('Generating clusters_500 dataset (seed=42)...');
  const embeddings = generateClusters(500, 8, 3, 0.5, 42);
  console.log(`✓ Generated ${embeddings.size} vectors`);
  
  // Parameter sweep
  const gridSteps: number[] = [];
  for (let g = 0.20; g <= 0.40; g += 0.02) {
    gridSteps.push(parseFloat(g.toFixed(2)));
  }
  
  console.log(`\nRunning parameter sweep: grid_step ∈ [0.20, 0.40], step=0.02 (${gridSteps.length} values)`);
  console.log('Fixed parameters: k=9, method=lattice-hybrid');
  
  const sweepData: SweepPoint[] = [];
  
  for (let i = 0; i < gridSteps.length; i++) {
    const gridStep = gridSteps[i];
    process.stdout.write(`\rProgress: ${i + 1}/${gridSteps.length} (grid=${gridStep.toFixed(2)})...`);
    
    const point = runSweepPoint(embeddings, gridStep, 9);
    sweepData.push(point);
  }
  
  console.log('\n✓ Sweep complete');
  
  // Detect transition
  console.log('\nAnalyzing MSE transition...');
  const analysis = detectTransition(sweepData);
  
  // Print results
  console.log('\n--- MSE Transition Analysis ---');
  console.log(`Baseline slope (median): ${analysis.baseline_slope.toFixed(4)}`);
  
  if (analysis.transition_point !== null) {
    console.log(`\n⚠ MSE transitions from stable→collapse at grid ≈ ${analysis.transition_point.toFixed(2)}`);
    console.log(`Transition MSE: ${analysis.transition_mse!.toFixed(4)}`);
    console.log(`Transition slope: ${analysis.transition_slope!.toFixed(4)} (${(analysis.transition_slope! / analysis.baseline_slope).toFixed(2)}× baseline)`);
  } else {
    console.log('\n✓ No sharp transition detected in range [0.20, 0.40]');
    console.log('MSE appears to increase smoothly without a collapse point');
  }
  
  // Print data table
  console.log('\n--- Sweep Data ---');
  console.log('┌──────────┬──────────┬────────────┐');
  console.log('│ Grid     │ MSE      │ Recall@100 │');
  console.log('├──────────┼──────────┼────────────┤');
  
  for (const point of analysis.data) {
    const marker = (point.grid_step === analysis.transition_point) ? ' ← TRANSITION' : '';
    console.log(
      `│ ${point.grid_step.toFixed(2).padStart(8)} │ ${point.mse.toFixed(4).padStart(8)} │ ${point.recall_100.toFixed(4).padStart(10)} │${marker}`
    );
  }
  
  console.log('└──────────┴──────────┴────────────┘');
  
  // Save results
  const outputPath = resolve(__dirname, '..', 'analysis_phase2', 'mse_transition.json');
  writeFileSync(outputPath, JSON.stringify(analysis, null, 2));
  console.log(`\n✓ Results saved to: ${outputPath}`);
}

main().catch(console.error);
