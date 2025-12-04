import React, { useEffect, useRef } from 'react';
import { SurfaceData, SurfaceMetricPoint } from '../types';
import { detectRidgeLine } from '../services/stabilityBoundaryService';

// Make Plotly available on the window object
declare global {
    interface Window {
        Plotly: any;
    }
}

interface ContinuityAbstractionSurfaceProps {
    kValues: number[];
    stepValues: number[];
    zValues: number[][];
    titleText: string;
    zAxisTitle: string;
    metrics?: SurfaceMetricPoint[];
    showRidge?: boolean;
}

const ContinuityAbstractionSurface: React.FC<ContinuityAbstractionSurfaceProps> = ({ 
    kValues, 
    stepValues, 
    zValues, 
    titleText, 
    zAxisTitle,
    metrics,
    showRidge = true
}) => {
    const chartRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!chartRef.current || typeof window.Plotly === 'undefined') {
            return;
        }

        const plotData: any[] = [{
            z: zValues,
            x: stepValues,
            y: kValues,
            type: 'surface',
            colorscale: zAxisTitle === 'LSI' ? [
                [0, '#f56565'],
                [0.65, '#f56565'],
                [0.65, '#ecc94b'],
                [0.80, '#ecc94b'],
                [0.80, '#48bb78'],
                [1.0, '#48bb78'],
            ] : 'Viridis',
            cmin: zAxisTitle === 'LSI' ? 0.5 : undefined,
            cmax: zAxisTitle === 'LSI' ? 1.0 : undefined,
            colorbar: {
                title: zAxisTitle,
                titleside: 'right',
                titlefont: { color: '#edf2f7' },
                tickfont: { color: '#a0aec0' }
            },
            contours: zAxisTitle === 'LSI' ? {
                z: {
                  show: true,
                  usecolormap: true,
                  highlightcolor: "white",
                  highlightwidth: 2,
                  project: { z: true },
                  // Draw lines at the critical thresholds
                  start: 0.65,
                  end: 0.8,
                  size: 0.15, 
                }
            } : {}
        }];

        // Add ridge line overlay if metrics are available
        if (showRidge && metrics && metrics.length > 0 && zAxisTitle === 'LSI') {
            const ridgeLine = detectRidgeLine(metrics, 'lsi');
            
            if (ridgeLine.length > 0) {
                // Add ridge line as a 3D scatter trace
                plotData.push({
                    x: ridgeLine.map(p => p.grid),
                    y: ridgeLine.map(p => p.k),
                    z: ridgeLine.map(p => p.lsi),
                    mode: 'lines+markers',
                    type: 'scatter3d',
                    name: 'Ridge Line',
                    line: {
                        color: '#60A5FA',
                        width: 6,
                    },
                    marker: {
                        color: '#3B82F6',
                        size: 6,
                        symbol: 'circle',
                    },
                    hovertemplate: 'Ridge: Grid=%{x:.3f}, K=%{y}, LSI=%{z:.3f}<extra></extra>',
                });
            }
        }

        const layout = {
            title: {
                text: titleText,
                font: {
                    color: '#edf2f7',
                    size: 18
                }
            },
            autosize: true,
            margin: { l: 10, r: 10, b: 20, t: 50 }, // Tighter margins for mobile
            scene: {
                xaxis: { 
                    title: 'Grid (Step)', 
                    titlefont: { color: '#a0aec0', size: 10 }, 
                    tickfont: { color: '#a0aec0', size: 10 },
                    gridcolor: '#4a5568'
                },
                yaxis: { 
                    title: 'K (Abs)', 
                    titlefont: { color: '#a0aec0', size: 10 }, 
                    tickfont: { color: '#a0aec0', size: 10 },
                    gridcolor: '#4a5568'
                },
                zaxis: { 
                    title: zAxisTitle, 
                    titlefont: { color: '#a0aec0', size: 10 }, 
                    tickfont: { color: '#a0aec0', size: 10 },
                    gridcolor: '#4a5568',
                    range: zAxisTitle === 'LSI' ? [0.5, 1.0] : undefined
                }
            },
            paper_bgcolor: 'transparent',
            plot_bgcolor: 'transparent',
            font: {
                color: '#edf2f7'
            },
            showlegend: showRidge && metrics && metrics.length > 0,
            legend: {
                x: 0.02,
                y: 0.98,
                bgcolor: 'rgba(26, 32, 44, 0.8)',
                bordercolor: '#4a5568',
                borderwidth: 1,
            }
        };

        window.Plotly.newPlot(chartRef.current, plotData, layout, { responsive: true });

        // Cleanup
        return () => {
            if (chartRef.current) {
                window.Plotly.purge(chartRef.current);
            }
        };

    }, [kValues, stepValues, zValues, titleText, zAxisTitle, metrics, showRidge]);

    return (
        <div className="bg-lab-dark-2 rounded-lg overflow-hidden">
            <div ref={chartRef} className="w-full h-[300px] sm:h-[500px]"></div>
        </div>
    );
};

export default ContinuityAbstractionSurface;