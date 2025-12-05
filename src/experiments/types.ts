/**
 * Experiment Type Definitions
 * 
 * Defines the structure of experiments for systematic testing
 */

import { ItemType } from '../types';
import { BaselineMethod } from '../services/baselineCompressionService';

export type EmbeddingModel = 'gemini' | 'ollama-text' | 'ollama-vision';
export type DatasetType = 'text' | 'image' | 'mixed';
export type CompressionStrategy = 
  | 'lattice-grid' 
  | 'lattice-kmeans' 
  | 'lattice-hybrid'
  | 'boundary-aware'
  | BaselineMethod;

export interface ExperimentConfig {
  id: string;
  name: string;
  description: string;
  
  // Data configuration
  embeddingModel: EmbeddingModel;
  datasetType: DatasetType;
  sampleSize?: number;
  
  // Compression configuration
  compressionStrategy: CompressionStrategy;
  
  // Parameter sweep ranges
  gridRange?: { min: number; max: number; steps: number };
  kRange?: { min: number; max: number; steps: number };
  
  // Metrics to compute
  metrics: MetricType[];
  
  // Stability detection options
  detectBoundaries?: boolean;
  detectRidge?: boolean;
  
  // Reproducibility
  seed?: number;
}

export type MetricType = 
  | 'lsi'
  | 'cosine'
  | 'energy'
  | 'semanticEfficiency'
  | 'pairwiseDistortion'
  | 'neighborhoodOverlap'
  | 'collapseRatio'
  | 'clusterDrift'
  | 'densityChange'
  | 'geodesicDistortion'
  // Phase 3: Topology metrics
  | 'triangleDistortionScore'
  | 'approxGeodesicDistortionTSNE'
  | 'graphGeodesicDistortion'
  | 'clusterEntropy'
  | 'connectedComponents'
  | 'cycleCount'
  | 'boundarySharpness'
  | 'densityVariance'
  | 'geodesicStretch'
  | 'stabilityConfidence'
  // Boundary geometry metrics
  | 'mse_global'
  | 'mse_boundary'
  | 'mse_bulk'
  | 'delta_boundary';

export interface ExperimentMetadata {
  experimentId: string;
  name: string;
  timestamp: string;
  model: EmbeddingModel;
  strategy: CompressionStrategy;
  datasetType: DatasetType;
  sampleSize: number;
  parameters: {
    gridRange?: { min: number; max: number; steps: number };
    kRange?: { min: number; max: number; steps: number };
  };
}

export interface ExperimentPoint {
  grid?: number;
  k?: number;
  metrics: {
    [key in MetricType]?: number;
  };
}

export interface ExperimentResult {
  metadata: ExperimentMetadata;
  points: ExperimentPoint[];
  boundaries?: {
    ridgeLine?: Array<{ grid: number; k: number; lsi: number }>;
    collapseThreshold?: { grid: number; k: number };
    zones?: {
      stable: Array<{ grid: number; k: number }>;
      degradation: Array<{ grid: number; k: number }>;
      collapse: Array<{ grid: number; k: number }>;
    };
  };
  summary: {
    totalPoints: number;
    bestPoint: ExperimentPoint | null;
    stabilityScore: number;
  };
}

/**
 * Pre-defined validation experiments
 */
export const VALIDATION_EXPERIMENTS: ExperimentConfig[] = [
  {
    id: 'val-001-stability-region',
    name: 'Stability Region Existence',
    description: 'Tests for evidence that a stable compression region exists in parameter space',
    embeddingModel: 'gemini',
    datasetType: 'text',
    sampleSize: 50,
    compressionStrategy: 'lattice-hybrid',
    gridRange: { min: 0.01, max: 0.5, steps: 10 },
    kRange: { min: 3, max: 15, steps: 5 },
    metrics: ['lsi', 'cosine', 'energy', 'semanticEfficiency', 'neighborhoodOverlap'],
    detectBoundaries: true,
    detectRidge: true,
  },
  {
    id: 'val-002-aggressive-failure',
    name: 'Aggressive Grid Forcing Failure',
    description: 'Demonstrates failure under aggressive grid forcing',
    embeddingModel: 'gemini',
    datasetType: 'text',
    sampleSize: 50,
    compressionStrategy: 'lattice-grid',
    gridRange: { min: 0.5, max: 2.0, steps: 8 },
    kRange: { min: 2, max: 5, steps: 3 },
    metrics: ['lsi', 'collapseRatio', 'pairwiseDistortion', 'geodesicDistortion'],
    detectBoundaries: true,
  },
  {
    id: 'val-003-modality-comparison',
    name: 'Text vs Vision Embeddings',
    description: 'Shows different stability thresholds between text and vision embeddings',
    embeddingModel: 'gemini',
    datasetType: 'mixed',
    sampleSize: 40,
    compressionStrategy: 'lattice-hybrid',
    gridRange: { min: 0.02, max: 0.3, steps: 8 },
    kRange: { min: 5, max: 12, steps: 4 },
    metrics: ['lsi', 'semanticEfficiency', 'neighborhoodOverlap', 'clusterDrift'],
    detectBoundaries: true,
    detectRidge: true,
  },
  {
    id: 'val-004-noise-sensitivity',
    name: 'Noise Sensitivity Test',
    description: 'Injects noise into embeddings and verifies ridge stability, threshold drift, and metric monotonicity',
    embeddingModel: 'gemini',
    datasetType: 'text',
    sampleSize: 40,
    compressionStrategy: 'lattice-hybrid',
    gridRange: { min: 0.05, max: 0.3, steps: 8 },
    kRange: { min: 5, max: 12, steps: 4 },
    metrics: ['lsi', 'neighborhoodOverlap', 'pairwiseDistortion', 'collapseRatio'],
    detectBoundaries: true,
    detectRidge: true,
    seed: 42, // For reproducibility
  },
  {
    id: 'val-005-topology-analysis',
    name: 'Topology Structure Analysis',
    description: 'Analyzes topological structure preservation using graph geodesics and topology indicators',
    embeddingModel: 'gemini',
    datasetType: 'text',
    sampleSize: 50,
    compressionStrategy: 'lattice-hybrid',
    gridRange: { min: 0.05, max: 0.4, steps: 10 },
    kRange: { min: 5, max: 12, steps: 4 },
    metrics: [
      'lsi',
      'graphGeodesicDistortion',
      'clusterEntropy',
      'connectedComponents',
      'boundarySharpness',
      'geodesicStretch',
      'stabilityConfidence'
    ],
    detectBoundaries: true,
    detectRidge: true,
  },
  {
    id: 'val-006-boundary-geometry',
    name: 'Boundary Geometry Analysis',
    description: 'Measures boundary vs bulk error to detect whether boundary vectors degrade earlier than bulk under compression',
    embeddingModel: 'gemini',
    datasetType: 'text',
    sampleSize: 50,
    compressionStrategy: 'lattice-hybrid',
    gridRange: { min: 0.01, max: 0.5, steps: 15 },
    kRange: { min: 3, max: 15, steps: 5 },
    metrics: [
      'lsi',
      'mse_global',
      'mse_boundary',
      'mse_bulk',
      'delta_boundary'
    ],
    detectBoundaries: true,
    detectRidge: true,
  },
];
