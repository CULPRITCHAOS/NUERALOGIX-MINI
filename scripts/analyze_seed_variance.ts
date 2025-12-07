#!/usr/bin/env node
/**
 * Task 5: Seed Variance Quantification
 * 
 * Analyzes variance across seeds for all experiment configurations.
 * Identifies unstable configurations with high coefficient of variation.
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

interface ConfigKey {
  dataset: string;
  method: string;
  grid_step: number;
  k: number;
}

interface MetricStats {
  mean: number;
  std: number;
  cv: number; // coefficient of variation
  values: number[];
}

interface ConfigStats {
  config: ConfigKey;
  mse_global: MetricStats;
  recall_at_10: MetricStats;
  recall_at_100: MetricStats;
  mrr: MetricStats;
}

interface MetricSummary {
  mean_cv: number;
  max_cv: number;
  unstable_count: number;
}

interface UnstableConfig {
  dataset: string;
  method: string;
  grid: number;
  k: number;
  metric: string;
  cv: number;
}

interface VarianceAnalysis {
  by_metric: {
    mse_global: MetricSummary;
    recall_at_10: MetricSummary;
    recall_at_100: MetricSummary;
    mrr: MetricSummary;
  };
  unstable_configurations: UnstableConfig[];
  all_config_stats: ConfigStats[];
}

function loadAllResults(): DatasetResults[] {
  const results: DatasetResults[] = [];
  const datasets = ['clusters', 'rings', 'swiss_roll'];
  const seeds = [42, 123, 456];
  
  for (const dataset of datasets) {
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
  }
  
  return results;
}

function computeStats(values: number[]): MetricStats {
  if (values.length === 0) {
    return { mean: 0, std: 0, cv: 0, values: [] };
  }
  
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  
  if (values.length === 1) {
    return { mean, std: 0, cv: 0, values };
  }
  
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  const std = Math.sqrt(variance);
  const cv = mean !== 0 ? std / Math.abs(mean) : 0;
  
  return { mean, std, cv, values };
}

function groupByConfig(results: DatasetResults[]): Map<string, ExperimentResult[]> {
  const grouped = new Map<string, ExperimentResult[]>();
  
  for (const dataset of results) {
    for (const exp of dataset.experiments) {
      const key = `${dataset.dataset_id}|${exp.method}|${exp.grid_step}|${exp.k}`;
      
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      
      grouped.get(key)!.push(exp);
    }
  }
  
  return grouped;
}

function analyzeVariance(results: DatasetResults[]): VarianceAnalysis {
  const grouped = groupByConfig(results);
  const configStats: ConfigStats[] = [];
  
  // Compute stats for each configuration
  for (const [key, experiments] of grouped.entries()) {
    const [dataset, method, gridStepStr, kStr] = key.split('|');
    const grid_step = parseFloat(gridStepStr);
    const k = parseInt(kStr);
    
    const mse_values = experiments.map(e => e.mse_global);
    const recall10_values = experiments.map(e => e.recall_at_10);
    const recall100_values = experiments.map(e => e.recall_at_100);
    const mrr_values = experiments.map(e => e.mrr);
    
    configStats.push({
      config: { dataset, method, grid_step, k },
      mse_global: computeStats(mse_values),
      recall_at_10: computeStats(recall10_values),
      recall_at_100: computeStats(recall100_values),
      mrr: computeStats(mrr_values)
    });
  }
  
  // Aggregate by metric
  const mse_cvs: number[] = [];
  const recall10_cvs: number[] = [];
  const recall100_cvs: number[] = [];
  const mrr_cvs: number[] = [];
  
  for (const stats of configStats) {
    mse_cvs.push(stats.mse_global.cv);
    recall10_cvs.push(stats.recall_at_10.cv);
    recall100_cvs.push(stats.recall_at_100.cv);
    mrr_cvs.push(stats.mrr.cv);
  }
  
  const CV_THRESHOLD = 0.10; // 10% coefficient of variation
  
  const unstable: UnstableConfig[] = [];
  
  for (const stats of configStats) {
    const metrics = [
      { name: 'mse_global', cv: stats.mse_global.cv },
      { name: 'recall_at_10', cv: stats.recall_at_10.cv },
      { name: 'recall_at_100', cv: stats.recall_at_100.cv },
      { name: 'mrr', cv: stats.mrr.cv }
    ];
    
    for (const metric of metrics) {
      if (metric.cv >= CV_THRESHOLD) {
        unstable.push({
          dataset: stats.config.dataset,
          method: stats.config.method,
          grid: stats.config.grid_step,
          k: stats.config.k,
          metric: metric.name,
          cv: metric.cv
        });
      }
    }
  }
  
  return {
    by_metric: {
      mse_global: {
        mean_cv: mse_cvs.reduce((s, v) => s + v, 0) / mse_cvs.length,
        max_cv: Math.max(...mse_cvs),
        unstable_count: mse_cvs.filter(cv => cv >= CV_THRESHOLD).length
      },
      recall_at_10: {
        mean_cv: recall10_cvs.reduce((s, v) => s + v, 0) / recall10_cvs.length,
        max_cv: Math.max(...recall10_cvs),
        unstable_count: recall10_cvs.filter(cv => cv >= CV_THRESHOLD).length
      },
      recall_at_100: {
        mean_cv: recall100_cvs.reduce((s, v) => s + v, 0) / recall100_cvs.length,
        max_cv: Math.max(...recall100_cvs),
        unstable_count: recall100_cvs.filter(cv => cv >= CV_THRESHOLD).length
      },
      mrr: {
        mean_cv: mrr_cvs.reduce((s, v) => s + v, 0) / mrr_cvs.length,
        max_cv: Math.max(...mrr_cvs),
        unstable_count: mrr_cvs.filter(cv => cv >= CV_THRESHOLD).length
      }
    },
    unstable_configurations: unstable.sort((a, b) => b.cv - a.cv),
    all_config_stats: configStats
  };
}

function printMetricSummary(analysis: VarianceAnalysis) {
  console.log('\n┌────────────────┬──────────┬──────────┬─────────────────┐');
  console.log('│ Metric         │ Mean CV  │ Max CV   │ Unstable Count  │');
  console.log('├────────────────┼──────────┼──────────┼─────────────────┤');
  
  const metrics = [
    { name: 'MSE Global', key: 'mse_global' as const },
    { name: 'Recall@10', key: 'recall_at_10' as const },
    { name: 'Recall@100', key: 'recall_at_100' as const },
    { name: 'MRR', key: 'mrr' as const }
  ];
  
  for (const { name, key } of metrics) {
    const summary = analysis.by_metric[key];
    console.log(
      `│ ${name.padEnd(14)} │ ${(summary.mean_cv * 100).toFixed(2).padStart(7)}% │ ${(summary.max_cv * 100).toFixed(2).padStart(7)}% │ ${summary.unstable_count.toString().padStart(15)} │`
    );
  }
  
  console.log('└────────────────┴──────────┴──────────┴─────────────────┘');
}

function printUnstableConfigs(unstable: UnstableConfig[]) {
  if (unstable.length === 0) {
    console.log('\n✓ No unstable configurations found (all CV < 10%)');
    return;
  }
  
  console.log(`\n⚠ Found ${unstable.length} UNSTABLE configurations (CV ≥ 10%):\n`);
  console.log('┌────────────────┬─────────────────┬───────┬────┬────────────────┬──────────┐');
  console.log('│ Dataset        │ Method          │ Grid  │ K  │ Metric         │ CV       │');
  console.log('├────────────────┼─────────────────┼───────┼────┼────────────────┼──────────┤');
  
  for (const config of unstable) {
    console.log(
      `│ ${config.dataset.padEnd(14)} │ ${config.method.padEnd(15)} │ ${config.grid.toFixed(2).padStart(5)} │ ${config.k.toString().padStart(2)} │ ${config.metric.padEnd(14)} │ ${(config.cv * 100).toFixed(2).padStart(7)}% │`
    );
  }
  
  console.log('└────────────────┴─────────────────┴───────┴────┴────────────────┴──────────┘');
}

async function main() {
  console.log('=== TASK 5: Seed Variance Quantification ===\n');
  
  console.log('Loading all experiment results...');
  const results = loadAllResults();
  console.log(`✓ Loaded ${results.length} result files`);
  
  console.log('\nComputing variance statistics...');
  const analysis = analyzeVariance(results);
  
  console.log('\n--- Variance Summary by Metric ---');
  printMetricSummary(analysis);
  
  printUnstableConfigs(analysis.unstable_configurations);
  
  // Save results
  const outputPath = resolve(__dirname, '..', 'analysis_phase2', 'seed_variance.json');
  writeFileSync(outputPath, JSON.stringify(analysis, null, 2));
  console.log(`\n✓ Results saved to: ${outputPath}`);
  
  // Summary statistics
  console.log('\n--- Key Findings ---');
  const totalConfigs = analysis.all_config_stats.length;
  const totalUnstable = analysis.unstable_configurations.length;
  const stabilityRate = ((totalConfigs * 4 - totalUnstable) / (totalConfigs * 4)) * 100;
  
  console.log(`Total configurations tested: ${totalConfigs}`);
  console.log(`Total unstable metric/config pairs: ${totalUnstable}`);
  console.log(`Overall stability rate: ${stabilityRate.toFixed(1)}%`);
}

main().catch(console.error);
