
import React, { useEffect, useRef } from 'react';
import { EmbeddingMap, ItemType, Embedding } from '../types';
import { pca } from '../services/mathService';
import { Chart, registerables } from 'chart.js';
import { InfoIcon } from './icons';
Chart.register(...registerables);

interface EmbeddingChartProps {
    title: string;
    embeddings: EmbeddingMap;
    itemType: ItemType | null;
}

const EmbeddingChart: React.FC<EmbeddingChartProps> = ({ title, embeddings, itemType }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartRef = useRef<Chart | null>(null);

    // Explicitly typed `vectors` and `items` to resolve potential type inference issues from Map iterators.
    const vectors: Embedding[] = Array.from(embeddings.values());
    const items: string[] = Array.from(embeddings.keys());

    useEffect(() => {
        if (!canvasRef.current || vectors.length === 0) return;

        // Destroy previous chart instance if it exists
        if (chartRef.current) {
            chartRef.current.destroy();
        }

        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        const projectedPoints = pca(vectors);

        const data = {
            labels: items.map((item, index) => 
                itemType === 'image' 
                ? `Image ${index + 1}` 
                : item.split(' ').slice(0, 3).join(' ')
            ),
            datasets: [{
                label: 'Embeddings',
                data: projectedPoints,
                backgroundColor: 'rgba(56, 178, 172, 0.7)',
                borderColor: 'rgba(79, 209, 197, 1)',
                borderWidth: 1,
                pointRadius: 5,
                pointHoverRadius: 8,
            }],
        };

        chartRef.current = new Chart(ctx, {
            type: 'scatter',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false,
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.chart.data.labels?.[context.dataIndex] || '';
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { color: '#a0aec0' }
                    },
                    y: {
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { color: '#a0aec0' }
                    }
                }
            }
        });

        // Cleanup function
        return () => {
            if (chartRef.current) {
                chartRef.current.destroy();
            }
        };
    }, [embeddings, itemType]); // Rerun effect if embeddings change

    if (vectors.length === 0) {
        return (
            <div className="bg-lab-dark-2 p-4 sm:p-6 rounded-lg border border-lab-dark-3 shadow-lg h-full flex flex-col">
                <h3 className="text-lg font-semibold mb-4 text-lab-light">{title}</h3>
                <div className="flex-grow flex flex-col items-center justify-center bg-lab-dark-1 rounded-md border border-lab-dark-3/50 min-h-[200px] opacity-60">
                    <div className="w-12 h-12 rounded-full bg-lab-dark-3 flex items-center justify-center mb-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    </div>
                    <p className="text-gray-400 text-sm font-mono">Awaiting Input Vector Data</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-lab-dark-2 p-4 sm:p-6 rounded-lg border border-lab-dark-3 shadow-lg">
            <h3 className="text-lg font-semibold mb-4 text-lab-light">{title}</h3>
            <div className="flex items-start space-x-2 text-xs text-gray-400 mb-3 p-2 bg-lab-dark-1 rounded-md border border-lab-dark-3/50">
                <InfoIcon className="w-4 h-4 mt-0.5 flex-shrink-0 text-lab-accent" />
                <p>PCA projections are a simplified 2D view and can appear deceptively smooth. Trust the quantitative metrics (LSI, Cosine, Energy) for rigorous analysis.</p>
            </div>
            <div className="relative h-80 bg-lab-dark-1 rounded-md p-2">
                <canvas ref={canvasRef}></canvas>
            </div>
        </div>
    );
};

export default EmbeddingChart;
