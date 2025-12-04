/**
 * Topology Metrics Panel
 * 
 * Displays topology indicators and signature for compression analysis
 */

import React from 'react';
import { TopologyIndicators, TopologySignature } from '../services/topologyService';
import { StabilityConfidence } from '../services/stabilityConfidenceService';
import { ChartBarIcon } from './icons';

interface TopologyMetricsPanelProps {
  indicators?: TopologyIndicators | null;
  signature?: TopologySignature | null;
  confidence?: StabilityConfidence | null;
  className?: string;
}

const TopologyMetricsPanel: React.FC<TopologyMetricsPanelProps> = ({
  indicators,
  signature,
  confidence,
  className = ''
}) => {
  const hasData = indicators || signature || confidence;

  if (!hasData) {
    return (
      <div className={`bg-lab-dark-1 border border-lab-dark-3 rounded-lg p-4 ${className}`}>
        <h3 className="text-md font-semibold text-lab-light mb-3 flex items-center space-x-2">
          <ChartBarIcon className="w-5 h-5 text-lab-accent" />
          <span>Topology Metrics</span>
        </h3>
        <p className="text-gray-400 text-sm">Run topology analysis to see metrics</p>
      </div>
    );
  }

  return (
    <div className={`bg-lab-dark-1 border border-lab-dark-3 rounded-lg p-4 ${className}`}>
      <h3 className="text-md font-semibold text-lab-light mb-4 flex items-center space-x-2">
        <ChartBarIcon className="w-5 h-5 text-lab-accent" />
        <span>Topology Metrics</span>
      </h3>

      {/* Stability Confidence */}
      {confidence && (
        <div className="mb-4 p-4 bg-lab-dark-2 border border-lab-dark-3 rounded-lg">
          <h4 className="text-sm font-semibold text-lab-light mb-3">Stability Confidence</h4>
          
          <div className="mb-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-300">Overall Confidence</span>
              <span className="text-2xl font-bold text-lab-accent">
                {Math.round(confidence.confidenceScore * 100)}%
              </span>
            </div>
            <div className="bg-lab-dark-3 rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"
                style={{ width: `${confidence.confidenceScore * 100}%` }}
              />
            </div>
          </div>
          
          <p className="text-xs text-gray-400 mb-3">{confidence.details}</p>
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-400">Ridge Sharpness:</span>
              <span className="ml-1 text-blue-400 font-semibold">
                {(confidence.ridgeSharpness * 100).toFixed(0)}%
              </span>
            </div>
            <div>
              <span className="text-gray-400">Cliff Steepness:</span>
              <span className="ml-1 text-purple-400 font-semibold">
                {(confidence.cliffSteepness * 100).toFixed(0)}%
              </span>
            </div>
            <div>
              <span className="text-gray-400">Neighbor Continuity:</span>
              <span className="ml-1 text-green-400 font-semibold">
                {(confidence.neighborContinuity * 100).toFixed(0)}%
              </span>
            </div>
            <div>
              <span className="text-gray-400">Metric Consistency:</span>
              <span className="ml-1 text-yellow-400 font-semibold">
                {(confidence.metricConsistency * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Topology Indicators */}
      {indicators && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-lab-light mb-3">Topology Indicators</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-lab-dark-2 p-3 rounded-md border border-lab-dark-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-300">Cluster Entropy</span>
                <span className="text-lg font-bold text-cyan-400">
                  {indicators.clusterEntropy.toFixed(3)}
                </span>
              </div>
              <p className="text-xs text-gray-500">Shannon entropy of density distribution</p>
            </div>

            <div className="bg-lab-dark-2 p-3 rounded-md border border-lab-dark-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-300">Connected Components</span>
                <span className="text-lg font-bold text-blue-400">
                  {indicators.connectedComponents}
                </span>
              </div>
              <p className="text-xs text-gray-500">Number of disconnected subgraphs</p>
            </div>

            <div className="bg-lab-dark-2 p-3 rounded-md border border-lab-dark-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-300">Cycle Count</span>
                <span className="text-lg font-bold text-purple-400">
                  {indicators.cycleCount}
                </span>
              </div>
              <p className="text-xs text-gray-500">Approximate number of loops in graph</p>
            </div>

            <div className="bg-lab-dark-2 p-3 rounded-md border border-lab-dark-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-300">Boundary Sharpness</span>
                <span className="text-lg font-bold text-orange-400">
                  {indicators.boundarySharpness.toFixed(3)}
                </span>
              </div>
              <p className="text-xs text-gray-500">How well-defined are cluster boundaries</p>
            </div>

            <div className="bg-lab-dark-2 p-3 rounded-md border border-lab-dark-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-300">Density Variance</span>
                <span className="text-lg font-bold text-green-400">
                  {indicators.densityVariance.toFixed(4)}
                </span>
              </div>
              <p className="text-xs text-gray-500">Variance in local point density</p>
            </div>
          </div>
        </div>
      )}

      {/* Topology Signature */}
      {signature && (
        <div>
          <h4 className="text-sm font-semibold text-lab-light mb-3">Topology Signature</h4>
          <div className="grid grid-cols-1 gap-2">
            <div className="bg-lab-dark-2 p-2 rounded-md border border-lab-dark-3 flex justify-between items-center">
              <span className="text-xs text-gray-300">Ridge Sharpness</span>
              <span className="text-sm font-semibold text-blue-400">
                {signature.ridgeSharpness.toFixed(3)}
              </span>
            </div>

            <div className="bg-lab-dark-2 p-2 rounded-md border border-lab-dark-3 flex justify-between items-center">
              <span className="text-xs text-gray-300">Geodesic Stretch</span>
              <span className="text-sm font-semibold text-purple-400">
                {signature.geodesicStretch.toFixed(3)}
              </span>
            </div>

            <div className="bg-lab-dark-2 p-2 rounded-md border border-lab-dark-3 flex justify-between items-center">
              <span className="text-xs text-gray-300">Cluster Entropy</span>
              <span className="text-sm font-semibold text-cyan-400">
                {signature.clusterEntropy.toFixed(3)}
              </span>
            </div>

            <div className="bg-lab-dark-2 p-2 rounded-md border border-lab-dark-3 flex justify-between items-center">
              <span className="text-xs text-gray-300">Boundary Variance</span>
              <span className="text-sm font-semibold text-green-400">
                {signature.boundaryVariance.toFixed(4)}
              </span>
            </div>

            <div className="bg-lab-dark-2 p-2 rounded-md border border-lab-dark-3 flex justify-between items-center">
              <span className="text-xs text-gray-300">Collapse Slope</span>
              <span className="text-sm font-semibold text-orange-400">
                {signature.collapseSlope.toFixed(3)}
              </span>
            </div>

            <div className="bg-lab-dark-2 p-2 rounded-md border border-lab-dark-3 flex justify-between items-center">
              <span className="text-xs text-gray-300">Neighbor Volatility</span>
              <span className="text-sm font-semibold text-red-400">
                {signature.neighborVolatility.toFixed(3)}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 p-3 bg-lab-dark-2 border-l-4 border-lab-accent rounded">
        <p className="text-xs text-gray-400">
          <strong className="text-lab-light">Phase 3 Analysis:</strong> These metrics reveal the topological 
          structure of the embedding space. Higher confidence scores indicate more reliable stability regions.
        </p>
      </div>
    </div>
  );
};

export default TopologyMetricsPanel;
