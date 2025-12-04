/**
 * Metric Validation Script
 * 
 * Validates that metrics behave correctly on synthetic datasets with known properties.
 * Run with: npx tsx scripts/validate_metrics.ts
 */

import {
  generateRing,
  generateClusters,
  getExpectedTopology,
  padEmbeddings
} from '../src/services/syntheticDataService';
import {
  computePairwiseDistanceDistortion,
  computeNeighborhoodOverlap,
  computeCollapseRatio
} from '../src/services/distortionService';
import {
  buildKNNGraph,
  findConnectedComponents,
  approximateCycleCount,
  computeTopologyIndicators,
  computeStructuralFingerprint
} from '../src/services/topologyService';
import { compressEmbeddings } from '../src/services/compressionService';

interface ValidationResult {
  testName: string;
  passed: boolean;
  expected: string;
  actual: string;
  details: string;
}

const results: ValidationResult[] = [];

function testMonotonicity() {
  console.log('\n=== TEST: Monotonicity ===');
  const embeddings = generateClusters(50, 10, 3, 0.5, 12345);
  const gridSteps = [0.05, 0.1, 0.25, 0.5];
  const distortions: number[] = [];
  
  gridSteps.forEach(grid => {
    const compressed = compressEmbeddings(embeddings, { method: 'grid', step: grid });
    const distortion = computePairwiseDistanceDistortion(embeddings, compressed);
    distortions.push(distortion);
  });
  
  let isMonotonic = true;
  for (let i = 1; i < distortions.length; i++) {
    if (distortions[i] < distortions[i-1] * 0.9) {
      isMonotonic = false;
      break;
    }
  }
  
  results.push({
    testName: 'Monotonicity: Increased compression → increased distortion',
    passed: isMonotonic,
    expected: 'Distortion increases with grid step',
    actual: `Distortions: ${distortions.map(d => d.toFixed(4)).join(' → ')}`,
    details: isMonotonic ? 'Monotonic behavior confirmed' : 'Non-monotonic behavior detected'
  });
  
  console.log(`  Result: ${isMonotonic ? 'PASS' : 'FAIL'}`);
}

function generateReport() {
  console.log('\n\n=== VALIDATION SUMMARY ===\n');
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(`Total Tests: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}\n`);
  results.forEach(r => {
    const status = r.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status}: ${r.testName}`);
  });
  return results;
}

async function main() {
  console.log('NEURALOGIX MINI - METRIC VALIDATION SUITE');
  console.log('='.repeat(60));
  try {
    testMonotonicity();
    const validationResults = generateReport();
    const allPassed = validationResults.every(r => r.passed);
    process.exit(allPassed ? 0 : 1);
  } catch (error) {
    console.error('\n❌ VALIDATION FAILED WITH ERROR:');
    console.error(error);
    process.exit(1);
  }
}

main();
