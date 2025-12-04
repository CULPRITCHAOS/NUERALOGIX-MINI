// src/features/semanticMesh/SemanticMeshPanel.tsx

import React, { useState } from 'react';
import { MeshScene } from './MeshScene';
import { MeshControls } from './MeshControls';
import { useSemanticMeshData, SemanticMeshViewState } from './useSemanticMeshData';
import { QuantizationMode, ColorMetric } from './types';

interface SemanticMeshPanelProps {
  datasetId: string; // let you swap datasets later
}

export const SemanticMeshPanel: React.FC<SemanticMeshPanelProps> = ({ datasetId }) => {
  const [view, setView] = useState<SemanticMeshViewState>({
    mode: 'e8_harmonic' as QuantizationMode,
    colorMetric: 'lsi' as ColorMetric,
    pointSize: 1.5,
    showEdges: false,
  });

  const { currentMesh, loading, error } = useSemanticMeshData({ datasetId }, view);

  return (
    <div className="semantic-mesh-panel bg-lab-dark-2 rounded-lg border border-lab-dark-3 shadow-lg overflow-hidden">
      <div className="mesh-header bg-lab-dark-1 border-b border-lab-dark-3 p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-bold text-lab-light mb-2">Semantic Mesh</h2>
        <p className="subtitle text-sm text-gray-400">
          3D view of embedding space — compare FP16, OPQ, E8 snap, and E8 + harmonics.
        </p>
      </div>

      <div className="mesh-layout grid grid-cols-1 lg:grid-cols-4 gap-0">
        <div className="mesh-sidebar bg-lab-dark-1 p-4 sm:p-6 border-b lg:border-b-0 lg:border-r border-lab-dark-3 space-y-6">
          <MeshControls
            mode={view.mode}
            onModeChange={(mode) => setView((v) => ({ ...v, mode }))}
            colorMetric={view.colorMetric}
            onColorMetricChange={(colorMetric) => setView((v) => ({ ...v, colorMetric }))}
            pointSize={view.pointSize}
            onPointSizeChange={(pointSize) => setView((v) => ({ ...v, pointSize }))}
            showEdges={view.showEdges}
            onShowEdgesChange={(showEdges) => setView((v) => ({ ...v, showEdges }))}
          />

          {loading && (
            <div className="status bg-lab-dark-2 p-3 rounded-md border border-lab-dark-3">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-lab-accent border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm text-gray-300">Loading dataset…</span>
              </div>
            </div>
          )}
          
          {error && (
            <div className="status error bg-red-900/30 border border-red-700 p-3 rounded-md">
              <p className="text-sm text-red-300">Error: {error}</p>
            </div>
          )}
          
          {currentMesh && !loading && !error && (
            <div className="status bg-lab-dark-2 p-3 rounded-md border border-lab-dark-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Mode:</span>
                <span className="text-lab-light font-semibold">{currentMesh.quantizationMode}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Projection:</span>
                <span className="text-lab-light font-semibold">{currentMesh.projectionName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Points:</span>
                <span className="text-lab-light font-semibold">{currentMesh.points.length}</span>
              </div>
            </div>
          )}
        </div>

        <div className="mesh-canvas lg:col-span-3 bg-lab-dark-2" style={{ height: '600px' }}>
          {!loading && !error && currentMesh && (
            <MeshScene
              mesh={currentMesh}
              colorMetric={view.colorMetric}
              pointSize={view.pointSize}
              showEdges={view.showEdges}
            />
          )}
          {!loading && !error && !currentMesh && (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">No data available for this mode</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
