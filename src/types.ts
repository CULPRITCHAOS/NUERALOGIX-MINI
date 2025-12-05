export type Embedding = number[];

export type EmbeddingMap = Map<string, Embedding>;

export type ItemType = 'text' | 'image';

export type CompressionMethod = 'grid' | 'kmeans' | 'kmeans-grid' | 'boundary-aware';

export interface CompressionOptions {
    method: CompressionMethod;
    step?: number;
    k?: number;
    boundaryAwareMode?: boolean; // Toggle for boundary-aware treatment
}

export interface CompressionResult {
    compressed: EmbeddingMap;
    centroids: Embedding[];
}

export interface PairwiseDistance {
    pair: [string, string];
    distance: number;
}

export interface SingleSetAnalysis {
    averageDistance: number;
    closestPair: PairwiseDistance | null;
    farthestPair: PairwiseDistance | null;
    uniqueClusterCount: number;
    collisions?: Map<string, string[]>; // Vector string -> items
}

export interface CompressionAnalysis {
    averageCosineSimilarity: number;
    compressionEnergy: number; // Mean Squared Error
    lsi: number; // Lattice Stability Index
    semanticEfficiency: number; // LSI / Energy
}

export interface ExperimentPoint {
    param: number;
    energy: number;
    cosine: number;
    lsi: number;
    semanticEfficiency: number;
    clusterCount: number;
}

export interface SurfaceMetricPoint {
    grid: number;
    k: number;
    lsi: number;
    cosine: number;
    energy: number;
    semanticEfficiency: number;
}

export interface SurfaceData {
    kValues: number[];
    stepValues: number[];
    zValues: {
        lsi: number[][];
        semanticEfficiency: number[][];
    };
    metrics: SurfaceMetricPoint[]; // Full data for export
}