#!/usr/bin/env node
/**
 * Task 1: Swiss Roll Topology Classification
 * 
 * Analyzes swiss_roll topology by comparing recall ratios against clusters and rings.
 * Determines which topology swiss_roll most closely resembles.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ExperimentResult {
  method: string;
  grid_step: number;
  k: number;
  mse_global: number;
  recall_at_10: number;
  recall_at_100: number;
  mrr: number;
}

interface DatasetResults {
  dataset_id: string;
  seed: number;
  experiments: ExperimentResult[];
}

interface MetricSummary {
  dataset: string;
  method: string;
  recall_10: number;
  recall_100: number;
  ratio: number;
  mse: number;
}

interface TopologyAnalysis {
  swiss_roll_metrics: MetricSummary[];
  clusters_metrics: MetricSummary[];
  rings_metrics: MetricSummary[];
  swiss_roll_mean_ratio: number;
  clusters_mean_ratio: number;
  rings_mean_ratio: number;
  verdict: string;
  justification: string;
}

function loadDatasetResults(dataset: string, seeds: number[]): DatasetResults[] {
  const results: DatasetResults[] = [];
  
  for (const seed of seeds) {
    const path = resolve(
      __dirname,
      '..',
      'results',
      'real_world_validation',
      `${dataset}_500_seed${seed}.json`
    );
    
    try {
      const data = JSON.parse(readFileSync(path, 'utf-8'));
      results.push(data);
    } catch (error) {
      console.error(`Warning: Could not load ${path}`);
    }
  }
  
  return results;
}

function computeMetrics(datasets: DatasetResults[]): MetricSummary[] {
  const metrics: MetricSummary[] = [];
  
  for (const dataset of datasets) {
    for (const exp of dataset.experiments) {
      const ratio = exp.recall_at_100 > 0 
        ? exp.recall_at_10 / exp.recall_at_100 
        : 0;
      
      metrics.push({
        dataset: dataset.dataset_id,
        method: exp.method,
        recall_10: exp.recall_at_10,
        recall_100: exp.recall_at_100,
        ratio: ratio,
        mse: exp.mse_global
      });
    }
  }
  
  return metrics;
}

function computeMeanRatio(metrics: MetricSummary[]): number {
  if (metrics.length === 0) return 0;
  const sum = metrics.reduce((acc, m) => acc + m.ratio, 0);
  return sum / metrics.length;
}

function classifySwissRoll(
  swissRollRatio: number,
  clustersRatio: number,
  ringsRatio: number
): { verdict: string; justification: string } {
  // Decision criteria from task description
  const CLUSTERS_MIN = 0.14;
  const CLUSTERS_MAX = 0.16;
  const RINGS_MIN = 0.21;
  const RINGS_MAX = 0.23;
  
  let verdict: string;
  let justification: string;
  
  if (swissRollRatio >= CLUSTERS_MIN && swissRollRatio <= CLUSTERS_MAX) {
    verdict = "swiss_roll behaves like clusters";
    justification = `Mean ratio ${swissRollRatio.toFixed(4)} falls within clusters range [${CLUSTERS_MIN}, ${CLUSTERS_MAX}]`;
  } else if (swissRollRatio >= RINGS_MIN && swissRollRatio <= RINGS_MAX) {
    verdict = "swiss_roll behaves like rings";
    justification = `Mean ratio ${swissRollRatio.toFixed(4)} falls within rings range [${RINGS_MIN}, ${RINGS_MAX}]`;
  } else {
    verdict = "swiss_roll behaves like neither";
    justification = `Mean ratio ${swissRollRatio.toFixed(4)} outside both clusters [${CLUSTERS_MIN}, ${CLUSTERS_MAX}] and rings [${RINGS_MIN}, ${RINGS_MAX}] ranges`;
  }
  
  // Additional context
  const diffClusters = Math.abs(swissRollRatio - clustersRatio);
  const diffRings = Math.abs(swissRollRatio - ringsRatio);
  
  justification += `\nDistance to clusters: ${diffClusters.toFixed(4)}, distance to rings: ${diffRings.toFixed(4)}`;
  justification += `\nClusters mean ratio: ${clustersRatio.toFixed(4)}`;
  justification += `\nRings mean ratio: ${ringsRatio.toFixed(4)}`;
  
  return { verdict, justification };
}

function printTable(metrics: MetricSummary[]) {
  console.log('\n┌────────────────┬─────────────────┬───────────┬────────────┬────────┬──────────┐');
  console.log('│ Dataset        │ Method          │ Recall@10 │ Recall@100 │ Ratio  │ MSE      │');
  console.log('├────────────────┼─────────────────┼───────────┼────────────┼────────┼──────────┤');
  
  // Group by dataset and method, then average
  const grouped = new Map<string, MetricSummary[]>();
  
  for (const m of metrics) {
    const key = `${m.dataset}|${m.method}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(m);
  }
  
  // Print averaged values
  for (const [key, values] of Array.from(grouped.entries()).sort()) {
    const [dataset, method] = key.split('|');
    const avgRecall10 = values.reduce((s, v) => s + v.recall_10, 0) / values.length;
    const avgRecall100 = values.reduce((s, v) => s + v.recall_100, 0) / values.length;
    const avgRatio = values.reduce((s, v) => s + v.ratio, 0) / values.length;
    const avgMse = values.reduce((s, v) => s + v.mse, 0) / values.length;
    
    console.log(
      `│ ${dataset.padEnd(14)} │ ${method.padEnd(15)} │ ${avgRecall10.toFixed(4).padStart(9)} │ ${avgRecall100.toFixed(4).padStart(10)} │ ${avgRatio.toFixed(4).padStart(6)} │ ${avgMse.toFixed(4).padStart(8)} │`
    );
  }
  
  console.log('└────────────────┴─────────────────┴───────────┴────────────┴────────┴──────────┘');
}

async function main() {
  console.log('=== TASK 1: Swiss Roll Topology Classification ===\n');
  
  const seeds = [42, 123, 456];
  
  // Load all datasets
  console.log('Loading datasets...');
  const swissRollData = loadDatasetResults('swiss_roll', seeds);
  const clustersData = loadDatasetResults('clusters', seeds);
  const ringsData = loadDatasetResults('rings', seeds);
  
  console.log(`✓ Loaded ${swissRollData.length} swiss_roll files`);
  console.log(`✓ Loaded ${clustersData.length} clusters files`);
  console.log(`✓ Loaded ${ringsData.length} rings files`);
  
  // Compute metrics
  const swissRollMetrics = computeMetrics(swissRollData);
  const clustersMetrics = computeMetrics(clustersData);
  const ringsMetrics = computeMetrics(ringsData);
  
  // Compute mean ratios
  const swissRollMeanRatio = computeMeanRatio(swissRollMetrics);
  const clustersMeanRatio = computeMeanRatio(clustersMetrics);
  const ringsMeanRatio = computeMeanRatio(ringsMetrics);
  
  console.log('\n--- Mean Recall Ratios (recall@10 / recall@100) ---');
  console.log(`Swiss Roll: ${swissRollMeanRatio.toFixed(4)}`);
  console.log(`Clusters:   ${clustersMeanRatio.toFixed(4)}`);
  console.log(`Rings:      ${ringsMeanRatio.toFixed(4)}`);
  
  // Classify swiss roll
  const { verdict, justification } = classifySwissRoll(
    swissRollMeanRatio,
    clustersMeanRatio,
    ringsMeanRatio
  );
  
  console.log('\n--- Classification Verdict ---');
  console.log(`\n${verdict}`);
  console.log(`\n${justification}`);
  
  // Print detailed table
  console.log('\n--- Detailed Metrics (averaged across seeds) ---');
  printTable([...swissRollMetrics, ...clustersMetrics, ...ringsMetrics]);
  
  // Save results
  const analysis: TopologyAnalysis = {
    swiss_roll_metrics: swissRollMetrics,
    clusters_metrics: clustersMetrics,
    rings_metrics: ringsMetrics,
    swiss_roll_mean_ratio: swissRollMeanRatio,
    clusters_mean_ratio: clustersMeanRatio,
    rings_mean_ratio: ringsMeanRatio,
    verdict,
    justification
  };
  
  const outputPath = resolve(__dirname, '..', 'analysis_phase2', 'swiss_roll_classification.json');
  writeFileSync(outputPath, JSON.stringify(analysis, null, 2));
  console.log(`\n✓ Results saved to: ${outputPath}`);
}

main().catch(console.error);
