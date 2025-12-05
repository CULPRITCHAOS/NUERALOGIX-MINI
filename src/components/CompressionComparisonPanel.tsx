/**
 * Compression Comparison Panel
 * 
 * Compares different compression methods side by side
 */

import React, { useState, useEffect } from 'react';
import { EmbeddingMap } from '../types';
import { BASELINE_METHODS, BaselineMethod } from '../services/baselineCompressionService';
import { compressEmbeddings } from '../services/compressionService';
import { analyzeCompression } from '../services/analysisService';
import { computeAllDistortionMetrics } from '../services/distortionService';
import { TargetIcon } from './icons';

interface CompressionMethod {
  id: string;
  name: string;
  type: 'baseline' | 'lattice';
  config: any;
}

interface ComparisonResult {
  method: string;
  lsi: number;
  cosine: number;
  energy: number;
  semanticEfficiency: number;
  neighborhoodOverlap: number;
  collapseRatio: number;
}

interface CompressionComparisonPanelProps {
  embeddings: EmbeddingMap | null;
  className?: string;
}

const CompressionComparisonPanel: React.FC<CompressionComparisonPanelProps> = ({ 
  embeddings, 
  className = '' 
}) => {
  const [results, setResults] = useState<ComparisonResult[]>([]);
  const [isComparing, setIsComparing] = useState(false);
  const [selectedMethods, setSelectedMethods] = useState<string[]>([
    'lattice-hybrid',
    'scalar-8bit',
    'pq-8x256'
  ]);

  const availableMethods: CompressionMethod[] = [
    { id: 'lattice-hybrid', name: 'NeuraLogix Hybrid', type: 'lattice', config: { method: 'kmeans-grid', step: 0.1, k: 8 } },
    { id: 'lattice-grid', name: 'NeuraLogix Grid', type: 'lattice', config: { method: 'grid', step: 0.1 } },
    { id: 'lattice-kmeans', name: 'NeuraLogix K-Means', type: 'lattice', config: { method: 'kmeans', k: 8 } },
    { id: 'scalar-8bit', name: 'Scalar 8-bit', type: 'baseline', config: {} },
    { id: 'scalar-4bit', name: 'Scalar 4-bit', type: 'baseline', config: {} },
    { id: 'pq-8x256', name: 'PQ 8×256', type: 'baseline', config: {} },
    { id: 'pq-16x256', name: 'PQ 16×256', type: 'baseline', config: {} },
  ];

  const runComparison = async () => {
    if (!embeddings || embeddings.size === 0) return;
    
    setIsComparing(true);
    const comparisonResults: ComparisonResult[] = [];

    for (const methodId of selectedMethods) {
      const method = availableMethods.find(m => m.id === methodId);
      if (!method) continue;

      try {
        let compressed: EmbeddingMap;
        
        if (method.type === 'baseline') {
          const baselineMethod = methodId as BaselineMethod;
          compressed = BASELINE_METHODS[baselineMethod](embeddings);
        } else {
          const result = compressEmbeddings(embeddings, method.config);
          compressed = result.compressed;
        }

        const basicMetrics = analyzeCompression(embeddings, compressed);
        const distortionMetrics = computeAllDistortionMetrics(embeddings, compressed);

        comparisonResults.push({
          method: method.name,
          lsi: basicMetrics.lsi,
          cosine: basicMetrics.averageCosineSimilarity,
          energy: basicMetrics.compressionEnergy,
          semanticEfficiency: basicMetrics.semanticEfficiency,
          neighborhoodOverlap: distortionMetrics.neighborhoodOverlap,
          collapseRatio: distortionMetrics.collapseRatio,
        });
      } catch (error) {
        console.error(`Error comparing ${method.name}:`, error);
      }
    }

    setResults(comparisonResults);
    setIsComparing(false);
  };

  const toggleMethod = (methodId: string) => {
    setSelectedMethods(prev => 
      prev.includes(methodId) 
        ? prev.filter(id => id !== methodId)
        : [...prev, methodId]
    );
  };

  return (
    <div className={`bg-lab-dark-1 border border-lab-dark-3 rounded-lg p-4 ${className}`}>
      <h3 className="text-md font-semibold text-lab-light mb-4 flex items-center space-x-2">
        <TargetIcon className="w-5 h-5 text-lab-accent" />
        <span>Compression Method Comparison</span>
      </h3>

      {/* Method Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Select Methods to Compare:
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {availableMethods.map(method => (
            <button
              key={method.id}
              onClick={() => toggleMethod(method.id)}
              className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                selectedMethods.includes(method.id)
                  ? 'bg-lab-accent text-white'
                  : 'bg-lab-dark-2 text-gray-400 hover:bg-lab-dark-3'
              }`}
            >
              {method.name}
            </button>
          ))}
        </div>
      </div>

      {/* Run Button */}
      <button
        onClick={runComparison}
        disabled={!embeddings || selectedMethods.length === 0 || isComparing}
        className="w-full mb-4 px-4 py-2 bg-lab-accent text-white rounded font-medium hover:bg-opacity-90 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
      >
        {isComparing ? 'Comparing...' : 'Run Comparison'}
      </button>

      {/* Results Table */}
      {results.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-lab-dark-3">
                <th className="text-left py-2 px-2 text-gray-400 font-medium">Method</th>
                <th className="text-right py-2 px-2 text-gray-400 font-medium">LSI</th>
                <th className="text-right py-2 px-2 text-gray-400 font-medium">Cosine</th>
                <th className="text-right py-2 px-2 text-gray-400 font-medium">Energy</th>
                <th className="text-right py-2 px-2 text-gray-400 font-medium">kNN Overlap</th>
                <th className="text-right py-2 px-2 text-gray-400 font-medium">Collapse %</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result, index) => {
                const bestLSI = Math.max(...results.map(r => r.lsi));
                const isBest = result.lsi === bestLSI;
                
                return (
                  <tr 
                    key={index} 
                    className={`border-b border-lab-dark-3 ${isBest ? 'bg-green-900 bg-opacity-20' : ''}`}
                  >
                    <td className="py-2 px-2 text-lab-light font-medium">
                      {result.method}
                      {isBest && <span className="ml-2 text-xs text-green-400">★ Best</span>}
                    </td>
                    <td className="py-2 px-2 text-right text-lab-light">{result.lsi.toFixed(3)}</td>
                    <td className="py-2 px-2 text-right text-gray-300">{result.cosine.toFixed(3)}</td>
                    <td className="py-2 px-2 text-right text-gray-300">{result.energy.toFixed(4)}</td>
                    <td className="py-2 px-2 text-right text-gray-300">
                      {(result.neighborhoodOverlap * 100).toFixed(1)}%
                    </td>
                    <td className="py-2 px-2 text-right text-gray-300">
                      {(result.collapseRatio * 100).toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-4 p-3 bg-lab-dark-2 border-l-4 border-lab-accent rounded">
          <p className="text-xs text-gray-400">
            <strong className="text-lab-light">Best Method:</strong> {
              results.reduce((best, current) => current.lsi > best.lsi ? current : best).method
            } achieves highest LSI with {
              (results.reduce((best, current) => current.lsi > best.lsi ? current : best).neighborhoodOverlap * 100).toFixed(1)
            }% neighborhood preservation.
          </p>
        </div>
      )}
    </div>
  );
};

export default CompressionComparisonPanel;
