/**
 * Stability Heatmap Panel
 * 
 * Visualizes stability zones and ridge lines in parameter space
 */

import React, { useEffect, useRef } from 'react';
import { SurfaceData } from '../types';
import { computeStabilityBoundary, RidgePoint, StabilityZone } from '../services/stabilityBoundaryService';

interface StabilityHeatmapPanelProps {
  data: SurfaceData | null;
  className?: string;
}

// Make Plotly available on the window object
declare global {
  interface Window {
    Plotly: any;
  }
}

const StabilityHeatmapPanel: React.FC<StabilityHeatmapPanelProps> = ({ data, className = '' }) => {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || !data || typeof window.Plotly === 'undefined') return;

    const boundary = computeStabilityBoundary(data.metrics);

    // Create zone classification matrix
    const zoneMatrix: number[][] = [];
    const gridValues = [...new Set(data.metrics.map(m => m.grid))].sort((a, b) => a - b);
    const kValues = [...new Set(data.metrics.map(m => m.k))].sort((a, b) => a - b);

    // Create lookup for quick access
    const pointLookup = new Map<string, number>();
    data.metrics.forEach(m => {
      pointLookup.set(`${m.grid},${m.k}`, m.lsi);
    });

    // Build zone matrix (0 = collapse, 1 = degradation, 2 = stable)
    kValues.forEach((k) => {
      const row: number[] = [];
      gridValues.forEach((grid) => {
        const lsi = pointLookup.get(`${grid},${k}`) || 0;
        let zone = 0;
        if (lsi >= 0.5) zone = 2; // stable
        else if (lsi >= 0.2) zone = 1; // degradation
        row.push(zone);
      });
      zoneMatrix.push(row);
    });

    // Prepare trace data
    const traces: any[] = [
      {
        z: zoneMatrix,
        x: gridValues,
        y: kValues,
        type: 'heatmap',
        colorscale: [
          [0, '#EF4444'],      // Red for collapse
          [0.5, '#F59E0B'],    // Orange for degradation
          [1, '#10B981']       // Green for stable
        ],
        showscale: false,
        hovertemplate: 'Grid: %{x:.3f}<br>K: %{y}<br>Zone: %{z}<extra></extra>',
      }
    ];

    // Add ridge line overlay
    if (boundary.ridgeLine.length > 0) {
      traces.push({
        x: boundary.ridgeLine.map(p => p.grid),
        y: boundary.ridgeLine.map(p => p.k),
        mode: 'lines+markers',
        type: 'scatter',
        name: 'Ridge Line',
        line: {
          color: '#3B82F6',
          width: 3,
        },
        marker: {
          color: '#60A5FA',
          size: 8,
          symbol: 'circle',
        },
        hovertemplate: 'Ridge: Grid=%{x:.3f}, K=%{y}, LSI=%{text}<extra></extra>',
        text: boundary.ridgeLine.map(p => p.lsi.toFixed(3)),
      });
    }

    // Add collapse threshold marker
    if (boundary.collapseThreshold) {
      traces.push({
        x: [boundary.collapseThreshold.grid],
        y: [boundary.collapseThreshold.k],
        mode: 'markers',
        type: 'scatter',
        name: 'Collapse Cliff',
        marker: {
          color: '#DC2626',
          size: 15,
          symbol: 'x',
          line: { color: 'white', width: 2 },
        },
        hovertemplate: 'Collapse Threshold<br>Grid: %{x:.3f}<br>K: %{y}<extra></extra>',
      });
    }

    const layout = {
      title: {
        text: 'Stability Zone Heatmap with Ridge Detection',
        font: { color: '#edf2f7', size: 16 }
      },
      xaxis: {
        title: 'Grid Step (Continuity)',
        titlefont: { color: '#a0aec0' },
        tickfont: { color: '#a0aec0' },
        gridcolor: '#4a5568'
      },
      yaxis: {
        title: 'K-Value (Abstraction)',
        titlefont: { color: '#a0aec0' },
        tickfont: { color: '#a0aec0' },
        gridcolor: '#4a5568'
      },
      autosize: true,
      margin: { l: 50, r: 50, b: 50, t: 60 },
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      font: { color: '#edf2f7' },
      showlegend: true,
      legend: {
        x: 1.02,
        y: 1,
        bgcolor: 'rgba(26, 32, 44, 0.8)',
        bordercolor: '#4a5568',
        borderwidth: 1,
      },
    };

    window.Plotly.newPlot(chartRef.current, traces, layout, { responsive: true });

    return () => {
      if (chartRef.current) window.Plotly.purge(chartRef.current);
    };
  }, [data]);

  if (!data) {
    return (
      <div className={`bg-lab-dark-1 border border-lab-dark-3 rounded-lg p-4 ${className}`}>
        <h3 className="text-md font-semibold text-lab-light mb-3">Stability Heatmap</h3>
        <p className="text-gray-400 text-sm">Run a parameter sweep to see stability zones</p>
      </div>
    );
  }

  const boundary = computeStabilityBoundary(data.metrics);

  return (
    <div className={`bg-lab-dark-1 border border-lab-dark-3 rounded-lg p-4 ${className}`}>
      <h3 className="text-md font-semibold text-lab-light mb-4">Stability Heatmap</h3>
      
      <div ref={chartRef} style={{ width: '100%', height: '500px' }}></div>

      {/* Legend */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-2">
        <div className="flex items-center space-x-2 bg-green-900 bg-opacity-30 p-2 rounded border border-green-700">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <div>
            <p className="text-sm font-medium text-green-300">Stable Zone</p>
            <p className="text-xs text-gray-400">{boundary.zones.stable.length} points (LSI ≥ 0.5)</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 bg-orange-900 bg-opacity-30 p-2 rounded border border-orange-700">
          <div className="w-4 h-4 bg-orange-500 rounded"></div>
          <div>
            <p className="text-sm font-medium text-orange-300">Degradation Zone</p>
            <p className="text-xs text-gray-400">{boundary.zones.degradation.length} points (0.2 ≤ LSI &lt; 0.5)</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 bg-red-900 bg-opacity-30 p-2 rounded border border-red-700">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <div>
            <p className="text-sm font-medium text-red-300">Collapse Zone</p>
            <p className="text-xs text-gray-400">{boundary.zones.collapse.length} points (LSI &lt; 0.2)</p>
          </div>
        </div>
      </div>

      {boundary.collapseThreshold && (
        <div className="mt-4 p-3 bg-red-900 bg-opacity-20 border-l-4 border-red-500 rounded">
          <p className="text-sm text-red-300 font-medium">
            ⚠️ Collapse Cliff Detected at Grid = {boundary.collapseThreshold.grid.toFixed(3)}, K = {boundary.collapseThreshold.k}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Beyond this threshold, all configurations show LSI &lt; 0.1, indicating catastrophic semantic collapse.
          </p>
        </div>
      )}
    </div>
  );
};

export default StabilityHeatmapPanel;
