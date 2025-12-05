#!/usr/bin/env node
/**
 * Boundary-Aware Experiment Runner
 * 
 * Runs both baseline and boundary-aware experiments from pre-generated configs
 * 
 * Usage:
 *   npx tsx scripts/run_boundary_experiment.ts results/boundary_test/synthetic_clusters
 */

import { runExperiment } from '../src/experiments/experimentRunner';
import { EmbeddingMap } from '../src/types';
import { ExperimentConfig } from '../src/experiments/types';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';

interface EmbeddingData {
  item: string;
  embedding: number[];
}

function loadEmbeddings(path: string): EmbeddingMap {
  const data: EmbeddingData[] = JSON.parse(readFileSync(path, 'utf-8'));
  const embeddings: EmbeddingMap = new Map();
  
  for (const item of data) {
    embeddings.set(item.item, item.embedding);
  }
  
  return embeddings;
}

async function runBoundaryExperiment(dataDir: string) {
  const baselineEmbPath = resolve(dataDir, 'baseline_embeddings.json');
  const baselineConfigPath = resolve(dataDir, 'baseline_config.json');
  const boundaryEmbPath = resolve(dataDir, 'boundary_aware_embeddings.json');
  const boundaryConfigPath = resolve(dataDir, 'boundary_aware_config.json');
  
  // Check if files exist
  if (!existsSync(baselineEmbPath)) {
    console.error(`Error: ${baselineEmbPath} not found`);
    console.error('Run: python analysis/run_boundary_aware_experiment.py first');
    process.exit(1);
  }
  
  console.log('Loading embeddings...');
  const embeddings = loadEmbeddings(baselineEmbPath);
  console.log(`✓ Loaded ${embeddings.size} embeddings`);
  
  // Run baseline experiment
  console.log('\n' + '='.repeat(70));
  console.log('Running BASELINE experiment (lattice-hybrid)');
  console.log('='.repeat(70));
  
  const baselineConfig: ExperimentConfig = JSON.parse(
    readFileSync(baselineConfigPath, 'utf-8')
  );
  
  console.log(`Config: grid [${baselineConfig.gridRange?.min} to ${baselineConfig.gridRange?.max}], k [${baselineConfig.kRange?.min} to ${baselineConfig.kRange?.max}]`);
  console.log('Running...');
  
  const baselineStart = Date.now();
  const baselineResult = await runExperiment(baselineConfig, embeddings);
  const baselineTime = (Date.now() - baselineStart) / 1000;
  
  const baselineOutputPath = resolve(dataDir, 'baseline_result.json');
  writeFileSync(baselineOutputPath, JSON.stringify(baselineResult, null, 2));
  
  console.log(`✓ Baseline complete in ${baselineTime.toFixed(2)}s`);
  console.log(`  Total points: ${baselineResult.points.length}`);
  console.log(`  Output: ${baselineOutputPath}`);
  
  // Run boundary-aware experiment
  console.log('\n' + '='.repeat(70));
  console.log('Running BOUNDARY-AWARE experiment');
  console.log('='.repeat(70));
  
  const boundaryConfig: ExperimentConfig = JSON.parse(
    readFileSync(boundaryConfigPath, 'utf-8')
  );
  
  console.log(`Config: grid [${boundaryConfig.gridRange?.min} to ${boundaryConfig.gridRange?.max}], k [${boundaryConfig.kRange?.min} to ${boundaryConfig.kRange?.max}]`);
  console.log('Running...');
  
  const boundaryStart = Date.now();
  const boundaryResult = await runExperiment(boundaryConfig, embeddings);
  const boundaryTime = (Date.now() - boundaryStart) / 1000;
  
  const boundaryOutputPath = resolve(dataDir, 'boundary_aware_result.json');
  writeFileSync(boundaryOutputPath, JSON.stringify(boundaryResult, null, 2));
  
  console.log(`✓ Boundary-aware complete in ${boundaryTime.toFixed(2)}s`);
  console.log(`  Total points: ${boundaryResult.points.length}`);
  console.log(`  Output: ${boundaryOutputPath}`);
  
  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('EXPERIMENT COMPLETE');
  console.log('='.repeat(70));
  console.log(`\nResults saved to: ${dataDir}`);
  console.log('\nNext steps:');
  console.log('  1. Compare results:');
  console.log(`     python analysis/compare_boundary_aware.py --experiments ${dataDir}`);
  console.log('  2. View charts in the comparison output directory');
  console.log('\n');
}

// Main
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage: npx tsx scripts/run_boundary_experiment.ts <data_directory>');
  console.error('');
  console.error('Example:');
  console.error('  npx tsx scripts/run_boundary_experiment.ts results/boundary_test/synthetic_clusters');
  process.exit(1);
}

const dataDir = args[0];

runBoundaryExperiment(dataDir).catch(err => {
  console.error('Error running experiment:', err);
  process.exit(1);
});
