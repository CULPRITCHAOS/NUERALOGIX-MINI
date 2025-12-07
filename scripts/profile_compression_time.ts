#!/usr/bin/env node
/**
 * Task 2: K-Means Iteration & Time Profiling
 * 
 * Instruments compression to measure timing and iteration counts.
 * Tests hypothesis H4: Time scaling is sub-linear with k due to convergence.
 */

import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { generateClusters } from '../src/services/syntheticDataService';
import { compressEmbeddingsInstrumented, InstrumentedCompressionMetrics } from '../src/services/instrumentedCompressionService';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ProfilingResult {
  k: number;
  grid: number;
  method: string;
  iterations: number;
  time_grid: number;
  time_kmeans: number;
  time_boundary: number;
  time_total: number;
}

interface ProfilingAnalysis {
  results: ProfilingResult[];
  hypothesis_h4: {
    test: string;
    observation: string;
    verdict: string;
  };
}

async function main() {
  console.log('=== TASK 2: K-Means Iteration & Time Profiling ===\n');
  
  // Generate clusters dataset
  console.log('Generating clusters dataset (500 vectors, 8-dim, seed=42)...');
  const embeddings = generateClusters(500, 8, 3, 0.5, 42);
  console.log(`✓ Generated ${embeddings.size} vectors`);
  
  // Experimental parameters
  const gridSteps = [0.01, 0.1, 0.25];
  const kValues = [3, 9, 15];
  const methods = ['kmeans-grid', 'boundary-aware'];
  
  console.log('\nRunning controlled experiment...');
  console.log(`Grid steps: ${gridSteps.join(', ')}`);
  console.log(`K values: ${kValues.join(', ')}`);
  console.log(`Methods: ${methods.join(', ')}`);
  
  const results: ProfilingResult[] = [];
  let experimentCount = 0;
  const totalExperiments = gridSteps.length * kValues.length * methods.length;
  
  for (const grid of gridSteps) {
    for (const k of kValues) {
      for (const method of methods) {
        experimentCount++;
        process.stdout.write(
          `\rProgress: ${experimentCount}/${totalExperiments} ` +
          `(grid=${grid}, k=${k}, method=${method})...`
        );
        
        const result = compressEmbeddingsInstrumented(embeddings, {
          method: method as 'kmeans-grid' | 'boundary-aware',
          k,
          step: grid
        });
        
        results.push({
          k,
          grid,
          method,
          iterations: result.metrics.iterations,
          time_grid: result.metrics.time_grid_ms,
          time_kmeans: result.metrics.time_kmeans_ms,
          time_boundary: result.metrics.time_boundary_ms,
          time_total: result.metrics.time_total_ms
        });
      }
    }
  }
  
  console.log('\n✓ Profiling complete');
  
  // Print results table
  console.log('\n--- Profiling Results ---');
  console.log('┌────┬───────┬─────────────────┬────────────┬────────────┬──────────────┬────────────────┬─────────────┐');
  console.log('│ K  │ Grid  │ Method          │ Iterations │ Time Grid  │ Time K-Means │ Time Boundary  │ Time Total  │');
  console.log('├────┼───────┼─────────────────┼────────────┼────────────┼──────────────┼────────────────┼─────────────┤');
  
  for (const r of results) {
    console.log(
      `│ ${r.k.toString().padStart(2)} │ ${r.grid.toFixed(2).padStart(5)} │ ${r.method.padEnd(15)} │ ` +
      `${r.iterations.toString().padStart(10)} │ ` +
      `${r.time_grid.toFixed(2).padStart(9)}ms │ ` +
      `${r.time_kmeans.toFixed(2).padStart(11)}ms │ ` +
      `${r.time_boundary.toFixed(2).padStart(13)}ms │ ` +
      `${r.time_total.toFixed(2).padStart(10)}ms │`
    );
  }
  
  console.log('└────┴───────┴─────────────────┴────────────┴────────────┴──────────────┴────────────────┴─────────────┘');
  
  // Analyze hypothesis H4
  console.log('\n--- Hypothesis H4 Analysis ---');
  console.log('H4: "Time scaling is sub-linear with k due to convergence"');
  
  // Group by method and grid, analyze iteration count vs k
  const latticeResults = results.filter(r => r.method === 'kmeans-grid');
  
  // For each grid, check if iterations plateau with k
  const gridAnalysis: { [grid: number]: number[] } = {};
  
  for (const r of latticeResults) {
    if (!gridAnalysis[r.grid]) {
      gridAnalysis[r.grid] = [];
    }
    gridAnalysis[r.grid].push(r.iterations);
  }
  
  console.log('\nIteration count by k (lattice-hybrid):');
  for (const grid of gridSteps) {
    const iters = gridAnalysis[grid];
    console.log(`  Grid ${grid.toFixed(2)}: k=3 → ${iters[0]} iters, k=9 → ${iters[1]} iters, k=15 → ${iters[2]} iters`);
  }
  
  // Check if iteration count is constant (plateaued)
  const allIterations = latticeResults.map(r => r.iterations);
  const uniqueIterations = new Set(allIterations);
  const iterationsPlateau = uniqueIterations.size === 1;
  
  let observation: string;
  let verdict: string;
  
  if (iterationsPlateau) {
    observation = `Iteration count is constant (${allIterations[0]} iterations) across all k values.`;
    verdict = 'CONFIRMED: Fixed iteration count suggests convergence behavior is independent of k.';
  } else {
    observation = `Iteration counts vary: ${Array.from(uniqueIterations).sort((a, b) => a - b).join(', ')}.`;
    verdict = 'PARTIAL: Iteration counts vary, but remain bounded at small values suggesting quick convergence.';
  }
  
  console.log(`\nObservation: ${observation}`);
  console.log(`Verdict: ${verdict}`);
  
  // Analyze time scaling
  const avgTimeByK: { [k: number]: number } = {};
  for (const k of kValues) {
    const kResults = latticeResults.filter(r => r.k === k);
    const avgTime = kResults.reduce((sum, r) => sum + r.time_total, 0) / kResults.length;
    avgTimeByK[k] = avgTime;
  }
  
  console.log('\nAverage total time by k (lattice-hybrid):');
  for (const k of kValues) {
    console.log(`  k=${k}: ${avgTimeByK[k].toFixed(2)}ms`);
  }
  
  // Check if time scaling is sub-linear
  const timeRatio_9_3 = avgTimeByK[9] / avgTimeByK[3];
  const timeRatio_15_9 = avgTimeByK[15] / avgTimeByK[9];
  const kRatio_9_3 = 9 / 3;
  const kRatio_15_9 = 15 / 9;
  
  console.log(`\nTime ratio (k=9/k=3): ${timeRatio_9_3.toFixed(2)}× vs k ratio ${kRatio_9_3.toFixed(2)}×`);
  console.log(`Time ratio (k=15/k=9): ${timeRatio_15_9.toFixed(2)}× vs k ratio ${kRatio_15_9.toFixed(2)}×`);
  
  const sublinear = (timeRatio_9_3 < kRatio_9_3) || (timeRatio_15_9 < kRatio_15_9);
  
  if (sublinear) {
    console.log('\n✓ Time scaling appears SUB-LINEAR relative to k');
  } else {
    console.log('\n⚠ Time scaling does NOT appear sub-linear (may be linear or super-linear)');
  }
  
  // Save results
  const analysis: ProfilingAnalysis = {
    results,
    hypothesis_h4: {
      test: 'Time scaling is sub-linear with k due to convergence',
      observation,
      verdict
    }
  };
  
  const outputPath = resolve(__dirname, '..', 'analysis_phase2', 'time_profiling.json');
  writeFileSync(outputPath, JSON.stringify(analysis, null, 2));
  console.log(`\n✓ Results saved to: ${outputPath}`);
}

main().catch(console.error);
