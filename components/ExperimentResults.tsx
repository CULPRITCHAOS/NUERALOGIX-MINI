
import React, { useEffect, useRef, useMemo } from 'react';
import { ExperimentPoint } from '../types';
import { Chart, registerables } from 'chart.js';
import { InfoIcon, WarningIcon } from './icons';
Chart.register(...registerables);

interface ExperimentResultsProps {
    results: ExperimentPoint[];
    paramName: string;
}

const ChartCard: React.FC<{ title: string; data: number[]; labels: string[]; color: string; }> = ({ title, data, labels, color }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartRef = useRef<Chart | null>(null);

    useEffect(() => {
        if (!canvasRef.current) return;
        if (chartRef.current) chartRef.current.destroy();

        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        chartRef.current = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: title,
                    data,
                    borderColor: color,
                    backgroundColor: `${color}33`, // semi-transparent fill
                    tension: 0.2,
                    fill: true,
                    pointBackgroundColor: color,
                    pointRadius: 4,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: {
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { color: '#a0aec0', font: { size: 10 } }
                    },
                    y: {
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { color: '#a0aec0', font: { size: 10 } }
                    }
                }
            }
        });

        return () => {
            if (chartRef.current) chartRef.current.destroy();
        };
    }, [data, labels, title, color]);

    return (
        <div className="bg-lab-dark-1 p-3 rounded-lg border border-lab-dark-3">
            <h4 className="text-sm font-semibold mb-2 text-center text-gray-300">{title}</h4>
            <div className="relative h-40">
                <canvas ref={canvasRef}></canvas>
            </div>
        </div>
    );
};


const ExperimentResults: React.FC<ExperimentResultsProps> = ({ results, paramName }) => {

    const handleExportCsv = () => {
        const headerParam = paramName.toLowerCase().replace(' ', '_');
        const headers = `${headerParam},energy,cosine,lsi,semantic_efficiency,cluster_count`;
        const rows = results.map(r => `${r.param},${r.energy},${r.cosine},${r.lsi},${r.semanticEfficiency},${r.clusterCount}`);
        const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "compression_experiment.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const isStep = paramName === 'Step';
    const labels = results.map(r => r.param.toFixed(isStep ? 2 : 0));

    // --- Automated Analysis Logic ---
    const analysis = useMemo(() => {
        if (results.length < 3) return null;
        
        // Find Max Efficiency
        const maxEff = results.reduce((prev, current) => (prev.semanticEfficiency > current.semanticEfficiency) ? prev : current);
        
        // Find "Dips" (Local Minima in Efficiency) where prev > curr < next
        const dips: ExperimentPoint[] = [];
        for(let i=1; i < results.length - 1; i++) {
            const prev = results[i-1];
            const curr = results[i];
            const next = results[i+1];
            if (curr.semanticEfficiency < prev.semanticEfficiency && curr.semanticEfficiency < next.semanticEfficiency) {
                dips.push(curr);
            }
        }

        return { maxEff, dips };
    }, [results]);

    return (
        <section className="bg-lab-dark-2 p-4 sm:p-6 rounded-lg border border-lab-dark-3 shadow-lg space-y-6">
            <div className="flex justify-between items-center border-b border-lab-dark-3 pb-4">
                 <div>
                     <h3 className="text-lg font-semibold text-lab-light">{isStep ? 'Continuity Experiment' : 'K-Value Sweep'} Results</h3>
                     <p className="text-xs text-gray-400 mt-1">Analyzing stability across parameter space</p>
                 </div>
                 <button onClick={handleExportCsv} className="px-3 py-1.5 text-xs font-semibold text-lab-dark-1 bg-lab-light/90 hover:bg-lab-light rounded-md transition-colors flex items-center space-x-2">
                     <span>Export CSV</span>
                 </button>
            </div>

            {/* Automated Insight Panel */}
            {analysis && (
                <div className="bg-lab-dark-1 rounded-md p-4 border border-lab-dark-3">
                    <h4 className="text-sm font-bold text-lab-light mb-2 flex items-center space-x-2">
                        <InfoIcon className="w-4 h-4 text-lab-accent" />
                        <span>Automated Insight</span>
                    </h4>
                    <div className="space-y-2 text-sm text-gray-300">
                        <p>
                            <span className="text-green-400 font-semibold">Optimal Configuration:</span> The system achieved peak Semantic Efficiency 
                            of <strong>{analysis.maxEff.semanticEfficiency.toFixed(0)}</strong> at <strong>{paramName} = {analysis.maxEff.param}</strong>.
                        </p>
                        {analysis.dips.length > 0 && (
                            <p className="flex items-start space-x-2">
                                <WarningIcon className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
                                <span>
                                    <strong>Inefficiency Detected:</strong> A local drop in efficiency was observed at 
                                    <strong> {paramName} = {analysis.dips.map(d => d.param).join(', ')}</strong>. 
                                    This "valley" typically indicates a topological mismatch where the compression grid forces a split in a natural data cluster.
                                </span>
                            </p>
                        )}
                    </div>
                </div>
            )}
           
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-lab-dark-3/50 text-gray-300 uppercase tracking-wider text-xs">
                            <tr>
                                <th className="p-2">{paramName}</th>
                                <th className="p-2">Energy</th>
                                <th className="p-2">Cosine</th>
                                <th className="p-2">Efficiency</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-lab-dark-3 font-mono">
                            {results.map(r => (
                                <tr key={r.param} className={`hover:bg-lab-dark-3/30 transition-colors ${analysis?.maxEff.param === r.param ? 'bg-green-900/20' : ''}`}>
                                    <td className="p-2 text-lab-light font-bold">{r.param.toFixed(isStep ? 2 : 0)}</td>
                                    <td className="p-2 text-red-400">{r.energy.toFixed(5)}</td>
                                    <td className="p-2 text-yellow-400">{r.cosine.toFixed(4)}</td>
                                    <td className="p-2 text-green-400 font-bold">{r.semanticEfficiency.toFixed(1)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <ChartCard title={`Energy (Lower is Better)`} data={results.map(r => r.energy)} labels={labels} color="#f56565" />
                    <ChartCard title={`Efficiency (Higher is Better)`} data={results.map(r => r.semanticEfficiency)} labels={labels} color="#48bb78" />
                </div>
            </div>
        </section>
    );
};

export default ExperimentResults;
