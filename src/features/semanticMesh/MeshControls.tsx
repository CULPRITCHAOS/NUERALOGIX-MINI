// src/features/semanticMesh/MeshControls.tsx

import React from 'react';
import { ColorMetric, QuantizationMode } from './types';

interface MeshControlsProps {
  mode: QuantizationMode;
  onModeChange: (mode: QuantizationMode) => void;

  colorMetric: ColorMetric;
  onColorMetricChange: (metric: ColorMetric) => void;

  pointSize: number;
  onPointSizeChange: (size: number) => void;

  showEdges: boolean;
  onShowEdgesChange: (value: boolean) => void;
}

export const MeshControls: React.FC<MeshControlsProps> = ({
  mode,
  onModeChange,
  colorMetric,
  onColorMetricChange,
  pointSize,
  onPointSizeChange,
  showEdges,
  onShowEdgesChange,
}) => {
  return (
    <div className="mesh-controls space-y-4">
      <div className="control-row">
        <label className="block text-sm font-medium text-gray-300 mb-2">Quantization mode</label>
        <select 
          value={mode} 
          onChange={(e) => onModeChange(e.target.value as QuantizationMode)}
          className="w-full bg-lab-dark-3 border border-lab-dark-3 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-lab-accent outline-none"
        >
          <option value="fp16">FP16 (baseline)</option>
          <option value="opq">OPQ</option>
          <option value="e8_snap">E8 Snap</option>
          <option value="e8_harmonic">E8 + Harmonic</option>
        </select>
      </div>

      <div className="control-row">
        <label className="block text-sm font-medium text-gray-300 mb-2">Color by</label>
        <select
          value={colorMetric}
          onChange={(e) => onColorMetricChange(e.target.value as ColorMetric)}
          className="w-full bg-lab-dark-3 border border-lab-dark-3 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-lab-accent outline-none"
        >
          <option value="none">None</option>
          <option value="lsi">LSI</option>
          <option value="energy">Energy</option>
          <option value="collision_score">Collision score</option>
          <option value="cluster_id">Cluster</option>
          <option value="density">Density</option>
        </select>
      </div>

      <div className="control-row">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Point size: {pointSize.toFixed(1)}
        </label>
        <input
          type="range"
          min={0.5}
          max={5}
          step={0.5}
          value={pointSize}
          onChange={(e) => onPointSizeChange(Number(e.target.value))}
          className="w-full h-2 bg-lab-dark-3 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      <div className="control-row">
        <label className="flex items-center text-sm text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            checked={showEdges}
            onChange={(e) => onShowEdgesChange(e.target.checked)}
            className="h-4 w-4 rounded border-gray-500 text-lab-accent bg-lab-dark-3 focus:ring-lab-accent mr-2"
          />
          <span>Show edges / kNN graph</span>
        </label>
      </div>
    </div>
  );
};
