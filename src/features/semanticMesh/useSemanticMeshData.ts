// src/features/semanticMesh/useSemanticMeshData.ts

import { useEffect, useState } from 'react';
import { ColorMetric, QuantizationMode, SemanticMesh, SemanticMeshDataset } from './types';

interface UseSemanticMeshOptions {
  datasetId: string; // e.g. 'mini_sts_e8_v1'
}

export interface SemanticMeshViewState {
  mode: QuantizationMode;
  colorMetric: ColorMetric;
  pointSize: number;
  showEdges: boolean;
}

export function useSemanticMeshData(
  options: UseSemanticMeshOptions,
  view: SemanticMeshViewState
) {
  const { datasetId } = options;
  const [dataset, setDataset] = useState<SemanticMeshDataset | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    // For now: static file under /public/semantic_mesh/
    fetch(`/semantic_mesh/${datasetId}.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load dataset ${datasetId}`);
        return res.json();
      })
      .then((json: SemanticMeshDataset) => {
        setDataset(json);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message ?? 'Failed to load semantic mesh dataset');
        setLoading(false);
      });
  }, [datasetId]);

  const currentMesh: SemanticMesh | null = dataset ? dataset[view.mode] ?? null : null;

  return {
    dataset,
    currentMesh,
    loading,
    error,
  };
}
