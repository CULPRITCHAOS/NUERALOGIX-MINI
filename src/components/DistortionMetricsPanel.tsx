/**
 * Distortion Metrics Panel
 * 
 * Displays detailed distortion metrics for compression analysis
 */

import React from 'react';
import { DistortionMetrics } from '../services/distortionService';
import { ChartBarIcon } from './icons';

interface DistortionMetricsPanelProps {
  metrics: DistortionMetrics | null;
  className?: string;
}

const DistortionMetricsPanel: React.FC<DistortionMetricsPanelProps> = ({ metrics, className = '' }) => {
  if (!metrics) {
    return (
      <div className={`bg-lab-dark-1 border border-lab-dark-3 rounded-lg p-4 ${className}`}>
        <h3 className="text-md font-semibold text-lab-light mb-3 flex items-center space-x-2">
          <ChartBarIcon className="w-5 h-5 text-lab-accent" />
          <span>Distortion Metrics</span>
        </h3>
        <p className="text-gray-400 text-sm">Run compression to see distortion metrics</p>
      </div>
    );
  }

  const metricItems = [
    {
      label: 'Pairwise Distance Distortion',
      value: metrics.pairwiseDistanceDistortion,
      description: 'Average relative change in pairwise distances',
      format: (v: number) => v.toFixed(4),
      color: 'text-blue-400',
    },
    {
      label: 'Neighborhood Overlap',
      value: metrics.neighborhoodOverlap,
      description: 'Fraction of k-nearest neighbors preserved',
      format: (v: number) => `${(v * 100).toFixed(1)}%`,
      color: 'text-green-400',
      inverse: true, // Higher is better
    },
    {
      label: 'Collapse Ratio',
      value: metrics.collapseRatio,
      description: 'Fraction of points moved beyond tolerance',
      format: (v: number) => `${(v * 100).toFixed(1)}%`,
      color: 'text-red-400',
    },
    {
      label: 'Cluster Drift Score',
      value: metrics.clusterDriftScore,
      description: 'Normalized centroid displacement',
      format: (v: number) => v.toFixed(4),
      color: 'text-yellow-400',
    },
    {
      label: 'Local Density Change',
      value: metrics.localDensityChange,
      description: 'Change in k-NN distances',
      format: (v: number) => v.toFixed(4),
      color: 'text-purple-400',
    },
    {
      label: 'Geodesic Distortion',
      value: metrics.geodesicDistortion,
      description: 'Triangle inequality violations',
      format: (v: number) => `${(v * 100).toFixed(2)}%`,
      color: 'text-orange-400',
    },
  ];

  return (
    <div className={`bg-lab-dark-1 border border-lab-dark-3 rounded-lg p-4 ${className}`}>
      <h3 className="text-md font-semibold text-lab-light mb-4 flex items-center space-x-2">
        <ChartBarIcon className="w-5 h-5 text-lab-accent" />
        <span>Distortion Metrics</span>
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {metricItems.map((item, index) => (
          <div key={index} className="bg-lab-dark-2 p-3 rounded-md border border-lab-dark-3">
            <div className="flex justify-between items-start mb-1">
              <span className="text-sm font-medium text-gray-300">{item.label}</span>
              <span className={`text-lg font-bold ${item.color}`}>
                {item.format(item.value)}
              </span>
            </div>
            <p className="text-xs text-gray-500">{item.description}</p>
            
            {/* Visual indicator */}
            <div className="mt-2 bg-lab-dark-3 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full ${item.inverse ? 'bg-green-500' : 'bg-red-500'}`}
                style={{
                  width: `${Math.min(100, (item.inverse ? item.value : (1 - item.value)) * 100)}%`,
                  opacity: 0.6,
                }}
              />
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 p-3 bg-lab-dark-2 border-l-4 border-lab-accent rounded">
        <p className="text-xs text-gray-400">
          <strong className="text-lab-light">Interpretation:</strong> Lower distortion values indicate better preservation 
          of the original topology. Neighborhood Overlap should be high (close to 100%).
        </p>
      </div>
    </div>
  );
};

export default DistortionMetricsPanel;
