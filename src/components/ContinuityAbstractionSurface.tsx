import React, { useEffect, useRef } from 'react';
import { SurfaceData } from '../types';

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
}

const ContinuityAbstractionSurface: React.FC<ContinuityAbstractionSurfaceProps> = ({ kValues, stepValues, zValues, titleText, zAxisTitle }) => {
    const chartRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!chartRef.current || typeof window.Plotly === 'undefined') {
            return;
        }

        const plotData = [{
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
            }
        };

        window.Plotly.newPlot(chartRef.current, plotData, layout, { responsive: true });

        // Cleanup
        return () => {
            if (chartRef.current) {
                window.Plotly.purge(chartRef.current);
            }
        };

    }, [kValues, stepValues, zValues, titleText, zAxisTitle]);

    return (
        <div className="bg-lab-dark-2 rounded-lg overflow-hidden">
            <div ref={chartRef} className="w-full h-[300px] sm:h-[500px]"></div>
        </div>
    );
};

export default ContinuityAbstractionSurface;