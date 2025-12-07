#!/usr/bin/env node
/**
 * Task 6: Centroid Degeneracy Analysis
 * 
 * Analyzes centroid spatial distribution to detect degeneracy.
 * Computes pairwise distances and clustering statistics.
 */

import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { generateClusters } from '../src/services/syntheticDataService';
import { compressEmbeddings } from '../src/services/compressionService';
import { euclideanDistance } from '../src/services/mathService';
import { Embedding } from '../src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Analysis constants
const DEGENERACY_THRESHOLD = 0.1;  // Centroid pairs closer than this are considered degenerate

interface CentroidDegeneracyAnalysis {
  method: string;
  num_centroids: number;
  min_centroid_distance: number;
  max_centroid_distance: number;
  avg_centroid_distance: number;
  close_pairs_count: number;
  close_pairs_percentage: number;
  spatial_clustering_coefficient: number;
  accessible: boolean;
  note?: string;
}

function analyzeCentroids(
  centroids: Embedding[],
  method: string,
  threshold: number = DEGENERACY_THRESHOLD
): CentroidDegeneracyAnalysis {
  if (centroids.length < 2) {
    return {
      method,
      num_centroids: centroids.length,
      min_centroid_distance: 0,
      max_centroid_distance: 0,
      avg_centroid_distance: 0,
      close_pairs_count: 0,
      close_pairs_percentage: 0,
      spatial_clustering_coefficient: 0,
      accessible: true,
      note: 'Insufficient centroids for analysis (< 2)'
    };
  }

  // Compute all pairwise distances
  const distances: number[] = [];
  let closePairsCount = 0;

  for (let i = 0; i < centroids.length; i++) {
    for (let j = i + 1; j < centroids.length; j++) {
      const dist = euclideanDistance(centroids[i], centroids[j]);
      distances.push(dist);
      
      if (dist < threshold) {
        closePairsCount++;
      }
    }
  }

  const minDistance = Math.min(...distances);
  const maxDistance = Math.max(...distances);
  const avgDistance = distances.reduce((sum, d) => sum + d, 0) / distances.length;
  const totalPairs = distances.length;
  const closePairsPercentage = (closePairsCount / totalPairs) * 100;

  // Spatial clustering coefficient: variance of distances / mean distance
  // High coefficient = centroids are spread out
  // Low coefficient = centroids are clustered together
  const variance = distances.reduce((sum, d) => sum + Math.pow(d - avgDistance, 2), 0) / distances.length;
  const stdDev = Math.sqrt(variance);
  const spatialClusteringCoefficient = avgDistance > 0 ? stdDev / avgDistance : 0;

  return {
    method,
    num_centroids: centroids.length,
    min_centroid_distance: minDistance,
    max_centroid_distance: maxDistance,
    avg_centroid_distance: avgDistance,
    close_pairs_count: closePairsCount,
    close_pairs_percentage: closePairsPercentage,
    spatial_clustering_coefficient: spatialClusteringCoefficient,
    accessible: true
  };
}

async function main() {
  console.log('=== TASK 6: Centroid Degeneracy Analysis ===\n');
  
  // Generate clusters dataset
  console.log('Generating clusters_500 dataset (seed=42)...');
  const embeddings = generateClusters(500, 8, 3, 0.5, 42);
  console.log(`✓ Generated ${embeddings.size} vectors`);
  
  // Test parameters
  const grid_step = 0.1;
  const k = 15;
  
  console.log(`\nTest parameters: grid_step=${grid_step}, k=${k}`);
  console.log('Analyzing centroid positions for both methods\n');
  
  const analyses: CentroidDegeneracyAnalysis[] = [];
  
  // Test lattice-hybrid
  console.log('Running lattice-hybrid compression...');
  const latticeResult = compressEmbeddings(embeddings, {
    method: 'kmeans-grid',
    k,
    step: grid_step
  });
  
  console.log(`✓ Extracted ${latticeResult.centroids.length} centroids`);
  const latticeAnalysis = analyzeCentroids(latticeResult.centroids, 'lattice-hybrid', 0.1);
  analyses.push(latticeAnalysis);
  
  // Test boundary-aware
  console.log('\nRunning boundary-aware compression...');
  const boundaryResult = compressEmbeddings(embeddings, {
    method: 'boundary-aware',
    k,
    step: grid_step
  });
  
  console.log(`✓ Extracted ${boundaryResult.centroids.length} centroids`);
  const boundaryAnalysis = analyzeCentroids(boundaryResult.centroids, 'boundary-aware', 0.1);
  analyses.push(boundaryAnalysis);
  
  // Print results table
  console.log('\n--- Centroid Degeneracy Analysis ---');
  console.log('┌─────────────────┬──────────────┬─────────────┬─────────────┬─────────────┬─────────────┬──────────┐');
  console.log('│ Method          │ # Centroids  │ Min Dist    │ Max Dist    │ Avg Dist    │ Close Pairs │ Spatial  │');
  console.log('│                 │              │             │             │             │ (< 0.1)     │ Coeff    │');
  console.log('├─────────────────┼──────────────┼─────────────┼─────────────┼─────────────┼─────────────┼──────────┤');
  
  for (const a of analyses) {
    console.log(
      `│ ${a.method.padEnd(15)} │ ${a.num_centroids.toString().padStart(12)} │ ` +
      `${a.min_centroid_distance.toFixed(4).padStart(11)} │ ` +
      `${a.max_centroid_distance.toFixed(4).padStart(11)} │ ` +
      `${a.avg_centroid_distance.toFixed(4).padStart(11)} │ ` +
      `${a.close_pairs_count.toString().padStart(5)} (${a.close_pairs_percentage.toFixed(1).padStart(4)}%) │ ` +
      `${a.spatial_clustering_coefficient.toFixed(4).padStart(8)} │`
    );
  }
  
  console.log('└─────────────────┴──────────────┴─────────────┴─────────────┴─────────────┴─────────────┴──────────┘');
  
  // Interpretation
  console.log('\n--- Interpretation ---');
  
  for (const a of analyses) {
    console.log(`\n${a.method}:`);
    console.log(`  - ${a.num_centroids} unique centroids`);
    console.log(`  - Minimum distance: ${a.min_centroid_distance.toFixed(4)}`);
    
    if (a.close_pairs_percentage > 10) {
      console.log(`  ⚠ ${a.close_pairs_percentage.toFixed(1)}% of centroid pairs are very close (< 0.1)`);
      console.log(`    This suggests potential degeneracy`);
    } else {
      console.log(`  ✓ Only ${a.close_pairs_percentage.toFixed(1)}% of pairs very close (< 0.1)`);
      console.log(`    Centroids are well-separated`);
    }
    
    if (a.spatial_clustering_coefficient < 0.3) {
      console.log(`  ⚠ Low spatial clustering coefficient (${a.spatial_clustering_coefficient.toFixed(4)})`);
      console.log(`    Centroids are tightly clustered`);
    } else if (a.spatial_clustering_coefficient > 0.7) {
      console.log(`  ✓ High spatial clustering coefficient (${a.spatial_clustering_coefficient.toFixed(4)})`);
      console.log(`    Centroids are well-distributed`);
    } else {
      console.log(`  ○ Moderate spatial clustering coefficient (${a.spatial_clustering_coefficient.toFixed(4)})`);
      console.log(`    Centroids show balanced distribution`);
    }
  }
  
  // Comparison
  console.log('\n--- Method Comparison ---');
  const lattice = analyses.find(a => a.method === 'lattice-hybrid')!;
  const boundary = analyses.find(a => a.method === 'boundary-aware')!;
  
  console.log(`Number of centroids: lattice=${lattice.num_centroids}, boundary=${boundary.num_centroids}`);
  
  if (boundary.num_centroids > lattice.num_centroids) {
    console.log('→ Boundary-aware creates MORE unique centroids (finer granularity)');
  } else if (boundary.num_centroids < lattice.num_centroids) {
    console.log('→ Boundary-aware creates FEWER unique centroids (more degeneracy)');
  } else {
    console.log('→ Both methods create the same number of centroids');
  }
  
  const avgDistDiff = boundary.avg_centroid_distance - lattice.avg_centroid_distance;
  console.log(`\nAverage centroid distance: ${avgDistDiff > 0 ? 'boundary-aware > lattice-hybrid' : 'lattice-hybrid > boundary-aware'} (Δ = ${Math.abs(avgDistDiff).toFixed(4)})`);
  
  if (Math.abs(avgDistDiff) < 0.01) {
    console.log('→ Minimal difference in centroid spacing');
  }
  
  // Save results
  const outputPath = resolve(__dirname, '..', 'analysis_phase2', 'centroid_degeneracy.json');
  writeFileSync(outputPath, JSON.stringify({ analyses }, null, 2));
  console.log(`\n✓ Results saved to: ${outputPath}`);
}

main().catch(console.error);
