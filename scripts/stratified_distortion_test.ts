#!/usr/bin/env node
/**
 * Task 4: Local vs Global Distortion Split
 * 
 * Tests hypothesis H1: "Boundary-aware optimizes local geometry, sacrifices global"
 * by measuring distortion separately for local and global neighborhoods.
 */

import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { generateClusters } from '../src/services/syntheticDataService';
import { compressEmbeddings } from '../src/services/compressionService';
import { computeStratifiedDistortion } from '../src/services/distortionService';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface DistortionResult {
  method: string;
  local_distortion: number;
  global_distortion: number;
  ratio: number;
}

interface StratifiedAnalysis {
  results: DistortionResult[];
  hypothesis_h1: {
    test: string;
    expected: string;
    observation: string;
    verdict: string;
  };
}

async function main() {
  console.log('=== TASK 4: Local vs Global Distortion Split ===\n');
  
  // Generate clusters dataset
  console.log('Generating clusters_500 dataset (seed=42)...');
  const embeddings = generateClusters(500, 8, 3, 0.5, 42);
  console.log(`✓ Generated ${embeddings.size} vectors`);
  
  // Fixed parameters
  const grid_step = 0.1;
  const k = 15;
  
  console.log(`\nFixed parameters: grid_step=${grid_step}, k=${k}`);
  console.log('Testing methods: lattice-hybrid, boundary-aware');
  
  const results: DistortionResult[] = [];
  
  // Test lattice-hybrid
  console.log('\nRunning lattice-hybrid compression...');
  const latticeResult = compressEmbeddings(embeddings, {
    method: 'kmeans-grid',
    k,
    step: grid_step
  });
  
  const latticeDistortion = computeStratifiedDistortion(
    embeddings,
    latticeResult.compressed,
    10,  // k_local
    100  // k_global
  );
  
  results.push({
    method: 'lattice-hybrid',
    local_distortion: latticeDistortion.local_distortion,
    global_distortion: latticeDistortion.global_distortion,
    ratio: latticeDistortion.global_distortion / latticeDistortion.local_distortion
  });
  
  console.log(`✓ Local distortion: ${latticeDistortion.local_distortion.toFixed(4)}`);
  console.log(`✓ Global distortion: ${latticeDistortion.global_distortion.toFixed(4)}`);
  
  // Test boundary-aware
  console.log('\nRunning boundary-aware compression...');
  const boundaryResult = compressEmbeddings(embeddings, {
    method: 'boundary-aware',
    k,
    step: grid_step
  });
  
  const boundaryDistortion = computeStratifiedDistortion(
    embeddings,
    boundaryResult.compressed,
    10,
    100
  );
  
  results.push({
    method: 'boundary-aware',
    local_distortion: boundaryDistortion.local_distortion,
    global_distortion: boundaryDistortion.global_distortion,
    ratio: boundaryDistortion.global_distortion / boundaryDistortion.local_distortion
  });
  
  console.log(`✓ Local distortion: ${boundaryDistortion.local_distortion.toFixed(4)}`);
  console.log(`✓ Global distortion: ${boundaryDistortion.global_distortion.toFixed(4)}`);
  
  // Print comparison table
  console.log('\n--- Stratified Distortion Results ---');
  console.log('┌─────────────────┬───────────────────┬────────────────────┬────────────────┐');
  console.log('│ Method          │ Local Distortion  │ Global Distortion  │ Ratio (G/L)    │');
  console.log('├─────────────────┼───────────────────┼────────────────────┼────────────────┤');
  
  for (const r of results) {
    console.log(
      `│ ${r.method.padEnd(15)} │ ${r.local_distortion.toFixed(6).padStart(17)} │ ${r.global_distortion.toFixed(6).padStart(18)} │ ${r.ratio.toFixed(4).padStart(14)} │`
    );
  }
  
  console.log('└─────────────────┴───────────────────┴────────────────────┴────────────────┘');
  
  // Hypothesis testing
  console.log('\n--- Hypothesis H1 Testing ---');
  console.log('H1: "Boundary-aware optimizes local geometry, sacrifices global"');
  console.log('Expected: boundary-aware shows LOWER local_distortion but HIGHER global_distortion vs lattice-hybrid');
  
  const lattice = results.find(r => r.method === 'lattice-hybrid')!;
  const boundary = results.find(r => r.method === 'boundary-aware')!;
  
  const localImprovement = lattice.local_distortion - boundary.local_distortion;
  const globalSacrifice = boundary.global_distortion - lattice.global_distortion;
  
  console.log(`\nLocal distortion change: ${localImprovement > 0 ? '↓' : '↑'} ${Math.abs(localImprovement).toFixed(6)}`);
  console.log(`  Lattice-hybrid: ${lattice.local_distortion.toFixed(6)}`);
  console.log(`  Boundary-aware: ${boundary.local_distortion.toFixed(6)}`);
  
  console.log(`\nGlobal distortion change: ${globalSacrifice > 0 ? '↑' : '↓'} ${Math.abs(globalSacrifice).toFixed(6)}`);
  console.log(`  Lattice-hybrid: ${lattice.global_distortion.toFixed(6)}`);
  console.log(`  Boundary-aware: ${boundary.global_distortion.toFixed(6)}`);
  
  // Determine verdict
  let observation: string;
  let verdict: string;
  
  const localBetter = boundary.local_distortion < lattice.local_distortion;
  const globalWorse = boundary.global_distortion > lattice.global_distortion;
  
  if (localBetter && globalWorse) {
    observation = 'Boundary-aware shows LOWER local distortion and HIGHER global distortion';
    verdict = 'CONFIRMED: H1 holds. Boundary-aware trades global accuracy for local precision.';
  } else if (localBetter && !globalWorse) {
    observation = 'Boundary-aware shows LOWER local distortion but also LOWER global distortion';
    verdict = 'FALSIFIED: H1 does not hold. Boundary-aware improves both local AND global geometry.';
  } else if (!localBetter && globalWorse) {
    observation = 'Boundary-aware shows HIGHER local distortion and HIGHER global distortion';
    verdict = 'FALSIFIED: H1 does not hold. Boundary-aware performs worse on both metrics.';
  } else {
    observation = 'Boundary-aware shows HIGHER local distortion but LOWER global distortion';
    verdict = 'FALSIFIED: H1 does not hold. Boundary-aware shows opposite pattern to hypothesis.';
  }
  
  console.log(`\nObservation: ${observation}`);
  console.log(`Verdict: ${verdict}`);
  
  // Additional analysis: ratio comparison
  console.log('\n--- Distortion Ratio Analysis ---');
  console.log(`Lattice-hybrid ratio (global/local): ${lattice.ratio.toFixed(4)}`);
  console.log(`Boundary-aware ratio (global/local): ${boundary.ratio.toFixed(4)}`);
  
  if (boundary.ratio > lattice.ratio) {
    console.log('→ Boundary-aware has a HIGHER ratio, meaning global distortion is relatively worse');
  } else {
    console.log('→ Boundary-aware has a LOWER ratio, meaning distortion is more balanced');
  }
  
  // Save results
  const analysis: StratifiedAnalysis = {
    results,
    hypothesis_h1: {
      test: 'Boundary-aware optimizes local geometry, sacrifices global',
      expected: 'Lower local_distortion, higher global_distortion for boundary-aware',
      observation,
      verdict
    }
  };
  
  const outputPath = resolve(__dirname, '..', 'analysis_phase2', 'stratified_distortion.json');
  writeFileSync(outputPath, JSON.stringify(analysis, null, 2));
  console.log(`\n✓ Results saved to: ${outputPath}`);
}

main().catch(console.error);
