// src/features/semanticMesh/types.ts

export type QuantizationMode = 'fp16' | 'opq' | 'e8_snap' | 'e8_harmonic';

export type ColorMetric =
  | 'lsi'
  | 'energy'
  | 'collision_score'
  | 'cluster_id'
  | 'density'
  | 'none';

export interface SemanticPoint {
  id: string;
  // 3D coordinates after projection
  x: number;
  y: number;
  z: number;

  // Original embedding index (for linking back to text/image/etc)
  index: number;

  // Metrics from NeuraLogix core
  lsi: number;
  energy: number;
  collision_score: number;
  cluster_id: number;
  density: number;

  // Optional label / preview (for tooltip)
  label?: string;
}

export interface SemanticMesh {
  // All points for the current quantization mode
  points: SemanticPoint[];

  // Optional edges (kNN graph) for drawing lines / mesh
  edges?: [number, number][]; // indices into `points` array

  // Global summary stats (handy for legends)
  stats: {
    lsi_min: number;
    lsi_max: number;
    energy_min: number;
    energy_max: number;
    density_min: number;
    density_max: number;
  };

  // Metadata for UI
  quantizationMode: QuantizationMode;
  projectionName: string;     // 'pca3', 'umap3', 'e8_harmonic_projection', etc.
}

export interface SemanticMeshDataset {
  // All modes, same underlying dataset
  fp16: SemanticMesh;
  opq?: SemanticMesh;
  e8_snap?: SemanticMesh;
  e8_harmonic?: SemanticMesh;
}
