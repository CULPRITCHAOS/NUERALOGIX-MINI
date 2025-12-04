/**
 * Experiment Runner Panel
 * 
 * UI for running validation experiments and exporting results
 */

import React, { useState } from 'react';
import { EmbeddingMap } from '../types';
import { runExperiment, exportToCSV, saveExperimentResult } from '../experiments/experimentRunner';
import { VALIDATION_EXPERIMENTS, ExperimentConfig, ExperimentResult } from '../experiments/types';
import { ProcessIcon, DownloadIcon } from './icons';

interface ExperimentRunnerPanelProps {
  embeddings: EmbeddingMap | null;
  className?: string;
}

const ExperimentRunnerPanel: React.FC<ExperimentRunnerPanelProps> = ({ 
  embeddings, 
  className = '' 
}) => {
  const [selectedExperiment, setSelectedExperiment] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [currentResult, setCurrentResult] = useState<ExperimentResult | null>(null);
  const [progress, setProgress] = useState<string>('');

  const handleRunExperiment = async () => {
    if (!embeddings || !selectedExperiment) return;

    const config = VALIDATION_EXPERIMENTS.find(e => e.id === selectedExperiment);
    if (!config) return;

    setIsRunning(true);
    setProgress('Initializing experiment...');
    setCurrentResult(null);

    try {
      // Subsample embeddings if needed
      const items = Array.from(embeddings.keys());
      const sampleSize = config.sampleSize || items.length;
      const sampledItems = items.slice(0, Math.min(sampleSize, items.length));
      const sampledEmbeddings = new Map(
        sampledItems.map(item => [item, embeddings.get(item)!])
      );

      setProgress(`Running ${config.name}...`);
      const result = await runExperiment(config, sampledEmbeddings);
      
      setCurrentResult(result);
      setProgress('Experiment completed!');
    } catch (error) {
      console.error('Experiment error:', error);
      setProgress(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleExportJSON = () => {
    if (!currentResult) return;
    
    const json = saveExperimentResult(currentResult);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `experiment-${currentResult.metadata.experimentId}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    if (!currentResult) return;
    
    const csv = exportToCSV(currentResult);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `experiment-${currentResult.metadata.experimentId}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`bg-lab-dark-1 border border-lab-dark-3 rounded-lg p-4 ${className}`}>
      <h3 className="text-md font-semibold text-lab-light mb-4 flex items-center space-x-2">
        <ProcessIcon className="w-5 h-5 text-lab-accent" />
        <span>Validation Experiments</span>
      </h3>

      {/* Experiment Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Select Validation Experiment:
        </label>
        <select
          value={selectedExperiment}
          onChange={(e) => setSelectedExperiment(e.target.value)}
          className="w-full px-3 py-2 bg-lab-dark-2 border border-lab-dark-3 rounded text-lab-light focus:outline-none focus:border-lab-accent"
          disabled={isRunning}
        >
          <option value="">-- Choose an experiment --</option>
          {VALIDATION_EXPERIMENTS.map(exp => (
            <option key={exp.id} value={exp.id}>
              {exp.name}
            </option>
          ))}
        </select>
        
        {selectedExperiment && (
          <p className="mt-2 text-xs text-gray-400">
            {VALIDATION_EXPERIMENTS.find(e => e.id === selectedExperiment)?.description}
          </p>
        )}
      </div>

      {/* Run Button */}
      <button
        onClick={handleRunExperiment}
        disabled={!embeddings || !selectedExperiment || isRunning}
        className="w-full mb-4 px-4 py-2 bg-lab-accent text-white rounded font-medium hover:bg-opacity-90 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
      >
        {isRunning ? 'Running...' : 'Run Experiment'}
      </button>

      {/* Progress */}
      {progress && (
        <div className={`mb-4 p-3 rounded ${
          progress.includes('Error') 
            ? 'bg-red-900 bg-opacity-20 border border-red-700 text-red-300' 
            : 'bg-blue-900 bg-opacity-20 border border-blue-700 text-blue-300'
        }`}>
          <p className="text-sm">{progress}</p>
        </div>
      )}

      {/* Results Summary */}
      {currentResult && (
        <div className="space-y-4">
          <div className="bg-lab-dark-2 p-4 rounded border border-lab-dark-3">
            <h4 className="text-sm font-semibold text-lab-light mb-3">Experiment Summary</h4>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-400">Total Points:</p>
                <p className="text-lab-light font-medium">{currentResult.summary.totalPoints}</p>
              </div>
              
              <div>
                <p className="text-gray-400">Stability Score:</p>
                <p className="text-lab-light font-medium">
                  {currentResult.summary.stabilityScore.toFixed(3)}
                </p>
              </div>

              {currentResult.summary.bestPoint && (
                <>
                  <div>
                    <p className="text-gray-400">Best LSI:</p>
                    <p className="text-lab-light font-medium">
                      {currentResult.summary.bestPoint.metrics.lsi?.toFixed(3) || 'N/A'}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-gray-400">Best Config:</p>
                    <p className="text-lab-light font-medium text-xs">
                      Grid={currentResult.summary.bestPoint.grid?.toFixed(2)}, 
                      K={currentResult.summary.bestPoint.k}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Boundary Detection Results */}
          {currentResult.boundaries && (
            <div className="bg-lab-dark-2 p-4 rounded border border-lab-dark-3">
              <h4 className="text-sm font-semibold text-lab-light mb-3">Boundary Detection</h4>
              
              <div className="space-y-2 text-sm">
                {currentResult.boundaries.zones && (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-green-900 bg-opacity-30 p-2 rounded border border-green-700">
                      <p className="text-xs text-gray-400">Stable</p>
                      <p className="text-green-300 font-bold">
                        {currentResult.boundaries.zones.stable.length}
                      </p>
                    </div>
                    
                    <div className="bg-orange-900 bg-opacity-30 p-2 rounded border border-orange-700">
                      <p className="text-xs text-gray-400">Degradation</p>
                      <p className="text-orange-300 font-bold">
                        {currentResult.boundaries.zones.degradation.length}
                      </p>
                    </div>
                    
                    <div className="bg-red-900 bg-opacity-30 p-2 rounded border border-red-700">
                      <p className="text-xs text-gray-400">Collapse</p>
                      <p className="text-red-300 font-bold">
                        {currentResult.boundaries.zones.collapse.length}
                      </p>
                    </div>
                  </div>
                )}

                {currentResult.boundaries.collapseThreshold && (
                  <div className="mt-2 p-2 bg-red-900 bg-opacity-20 rounded border-l-4 border-red-500">
                    <p className="text-xs text-red-300">
                      Collapse at Grid={currentResult.boundaries.collapseThreshold.grid.toFixed(3)}, 
                      K={currentResult.boundaries.collapseThreshold.k}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Export Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleExportJSON}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
            >
              <DownloadIcon className="w-4 h-4" />
              <span>Export JSON</span>
            </button>
            
            <button
              onClick={handleExportCSV}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded font-medium hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
            >
              <DownloadIcon className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      )}

      {!currentResult && !isRunning && (
        <div className="p-4 bg-lab-dark-2 border-l-4 border-lab-accent rounded">
          <p className="text-xs text-gray-400">
            <strong className="text-lab-light">Validation Experiments</strong> systematically test 
            stability boundaries and compression behavior. Results can be exported for reproducibility.
          </p>
        </div>
      )}
    </div>
  );
};

export default ExperimentRunnerPanel;
