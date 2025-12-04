
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { SAMPLE_TEXTS, SAMPLE_IMAGES } from './constants';
import { generateEmbeddings } from './services/embeddingService';
import { compressEmbeddings } from './services/compressionService';
import { analyzeSingleSet, analyzeCompression } from './services/analysisService';
import { ItemType, EmbeddingMap, CompressionOptions, SingleSetAnalysis, CompressionAnalysis, CompressionMethod, ExperimentPoint, SurfaceData, SurfaceMetricPoint } from './types';
import EmbeddingTable from './components/EmbeddingTable';
import AnalysisPanel from './components/AnalysisPanel';
import EmbeddingChart from './components/EmbeddingChart';
import ExperimentResults from './components/ExperimentResults';
import ContinuityAbstractionSurface from './components/ContinuityAbstractionSurface';
import ImageUploader from './components/ImageUploader';
import SettingsModal from './components/SettingsModal';
import WelcomeModal from './components/WelcomeModal';
import { LabIcon, TextIcon, ProcessIcon, ApiIcon, ResetIcon, DownloadIcon, UploadIcon, ChartBarIcon, TargetIcon, GearIcon, HelpIcon, InfoIcon } from './components/icons';

// Make Plotly available on the window object
declare global {
    interface Window {
        Plotly: any;
    }
}

const ContourPlot: React.FC<{ data: SurfaceData }> = ({ data }) => {
    const chartRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!chartRef.current || typeof window.Plotly === 'undefined') return;

        const plotData = [{
            z: data.zValues.lsi,
            x: data.stepValues,
            y: data.kValues,
            type: 'contour',
            colorscale: 'Viridis',
            contours: {
                coloring: 'lines',
                showlabels: true,
                labelfont: {
                    family: 'sans-serif',
                    size: 10,
                    color: 'white',
                },
            },
            colorbar: {
                title: 'LSI',
                titleside: 'right',
                titlefont: { color: '#edf2f7' },
                tickfont: { color: '#a0aec0' }
            },
        }];

        const layout = {
            title: { text: 'Iso-LSI Contour Map', font: { color: '#edf2f7', size: 18 } },
            xaxis: { title: 'Grid Step (Continuity)', titlefont: { color: '#a0aec0' }, tickfont: { color: '#a0aec0' }, gridcolor: '#4a5568' },
            yaxis: { title: 'K-Value (Abstraction)', titlefont: { color: '#a0aec0' }, tickfont: { color: '#a0aec0' }, gridcolor: '#4a5568' },
            autosize: true,
            margin: { l: 50, r: 50, b: 50, t: 60 },
            paper_bgcolor: 'transparent',
            plot_bgcolor: 'transparent',
            font: { color: '#edf2f7' },
        };

        window.Plotly.newPlot(chartRef.current, plotData, layout, { responsive: true });

        return () => {
            if (chartRef.current) window.Plotly.purge(chartRef.current);
        };
    }, [data]);

    return <div ref={chartRef} style={{ width: '100%', height: '500px' }}></div>;
};

const AutocalibrationPanel: React.FC<{ metrics: SurfaceMetricPoint[], onApply: (opts: {k: number, step: number}) => void }> = ({ metrics, onApply }) => {
    const maxEnergy = useMemo(() => Math.max(...metrics.map(m => m.energy), 0), [metrics]);
    const [energyCap, setEnergyCap] = useState(maxEnergy / 2);

    const optimalParams = useMemo(() => {
        const feasiblePoints = metrics.filter(m => m.energy <= energyCap);
        if (feasiblePoints.length === 0) return null;
        return feasiblePoints.reduce((best, current) => current.lsi > best.lsi ? current : best, feasiblePoints[0]);
    }, [metrics, energyCap]);
    
    return (
        <div className="bg-lab-dark-1 border border-lab-dark-3 rounded-lg p-4 mt-6">
            <h4 className="text-md font-semibold text-lab-light mb-3 flex items-center space-x-2"><TargetIcon className="w-5 h-5 text-lab-accent" /><span>Autocalibrate Optimal Parameters</span></h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div>
                    <label htmlFor="energy-cap" className="block text-sm font-medium text-gray-300">Energy (MSE) Budget: {energyCap.toFixed(4)}</label>
                    <input type="range" id="energy-cap" min="0" max={maxEnergy} step={maxEnergy/100} value={energyCap} onChange={e => setEnergyCap(parseFloat(e.target.value))} className="w-full h-2 bg-lab-dark-3 rounded-lg appearance-none cursor-pointer" />
                </div>
                {optimalParams ? (
                    <div className="bg-lab-dark-3 p-3 rounded-md text-center">
                        <p className="text-sm text-gray-400">Recommended</p>
                        <div className="flex justify-center items-baseline space-x-4">
                             <p><span className="font-bold text-lg text-lab-light">{optimalParams.k}</span> <span className="text-xs">k</span></p>
                             <p><span className="font-bold text-lg text-lab-light">{optimalParams.grid.toFixed(2)}</span> <span className="text-xs">step</span></p>
                        </div>
                        <button onClick={() => onApply({k: optimalParams.k, step: optimalParams.grid})} className="mt-2 w-full text-xs px-2 py-1 rounded bg-lab-accent hover:bg-lab-accent-hover text-lab-dark-1 font-semibold transition-colors">Apply</button>
                    </div>
                ) : (
                    <div className="bg-lab-dark-3 p-3 rounded-md text-center text-sm text-gray-400">No parameters meet budget.</div>
                )}
            </div>
        </div>
    );
};

const MetricCard: React.FC<{ title: string; value: string | number; color?: string; tooltip: string; subValue?: string }> = ({ title, value, color = "text-lab-light", tooltip, subValue }) => (
    <div className="bg-lab-dark-1 p-3 rounded-md border border-lab-dark-3 relative group transition-colors hover:border-lab-dark-3/80">
        <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-400 uppercase tracking-wider">{title}</p>
            <div className="cursor-help text-gray-600 group-hover:text-lab-accent transition-colors">
                <InfoIcon className="w-3 h-3" />
            </div>
        </div>
        <p className={`text-xl font-bold ${color}`}>{value}</p>
        {subValue && <p className="text-xs text-gray-500 mt-1">{subValue}</p>}
        
        {/* Custom Tooltip */}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 p-2 bg-black/90 text-xs text-gray-200 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 border border-gray-700">
            {tooltip}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-black/90"></div>
        </div>
    </div>
);


const App: React.FC = () => {
    const [itemType, setItemType] = useState<ItemType>('text');
    const [items, setItems] = useState<string[]>(SAMPLE_TEXTS);
    const [customText, setCustomText] = useState<string>(SAMPLE_TEXTS.join('\n'));
    const [imageItems, setImageItems] = useState<{ id: string, previewUrl: string }[]>(
        SAMPLE_IMAGES.map(url => ({ id: url, previewUrl: url }))
    );

    const [embeddings, setEmbeddings] = useState<EmbeddingMap>(new Map());
    const [compressedEmbeddings, setCompressedEmbeddings] = useState<EmbeddingMap>(new Map());
    
    const [compressionOptions, setCompressionOptions] = useState<CompressionOptions>({
        method: 'kmeans',
        k: 4,
        step: 0.25,
    });
    
    const [originalAnalysis, setOriginalAnalysis] = useState<SingleSetAnalysis | null>(null);
    const [compressedAnalysis, setCompressedAnalysis] = useState<SingleSetAnalysis | null>(null);
    const [compressionAnalysis, setCompressionAnalysis] = useState<CompressionAnalysis | null>(null);
    const [experimentResults, setExperimentResults] = useState<{ points: ExperimentPoint[], paramName: string } | null>(null);
    const [surfaceData, setSurfaceData] = useState<SurfaceData | null>(null);

    const [isEmbedding, setIsEmbedding] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [addNoise, setAddNoise] = useState(false);
    const [activeSurfaceTab, setActiveSurfaceTab] = useState('lsi');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);
    
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [customText]);

    useEffect(() => {
        const hasSeenWelcome = localStorage.getItem('neuralogix_seen_welcome');
        if (!hasSeenWelcome) {
            setIsWelcomeOpen(true);
        }
    }, []);

    const closeWelcome = () => {
        setIsWelcomeOpen(false);
        localStorage.setItem('neuralogix_seen_welcome', 'true');
    };

    // Clear embeddings when input data changes to ensure consistency
    useEffect(() => {
        setEmbeddings(new Map());
        setCompressedEmbeddings(new Map());
        setOriginalAnalysis(null);
        setCompressedAnalysis(null);
        setCompressionAnalysis(null);
        setExperimentResults(null);
        setSurfaceData(null);
        setError(null);
    }, [items, itemType, addNoise]);

    const handleGenerateEmbeddings = async () => {
        if (!itemType || items.length === 0) {
            setEmbeddings(new Map());
            return;
        }

        let itemsToEmbed = items;
        if (itemType === 'text' && addNoise) {
            itemsToEmbed = items.map(item => {
                if (Math.random() < 0.2) { // 20% chance to shuffle words
                    const words = item.split(' ');
                    for (let i = words.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [words[i], words[j]] = [words[j], words[i]];
                    }
                    return words.join(' ');
                }
                return item;
            });
        }
        
        setIsEmbedding(true);
        setError(null);
        try {
            const newEmbeddings = await generateEmbeddings(itemsToEmbed, itemType);
            setEmbeddings(newEmbeddings);
        } catch (err) {
            console.error("Embedding generation failed:", err);
            const message = err instanceof Error ? err.message : 'An unknown error occurred. See console for details.';
            setError(message);
        } finally {
            setIsEmbedding(false);
        }
    };


    useEffect(() => {
        if (embeddings.size > 0) {
            const compressed = compressEmbeddings(embeddings, compressionOptions);
            setCompressedEmbeddings(compressed);

            setOriginalAnalysis(analyzeSingleSet(embeddings));
            setCompressedAnalysis(analyzeSingleSet(compressed, true));
            setCompressionAnalysis(analyzeCompression(embeddings, compressed));
        } else {
            setCompressedEmbeddings(new Map());
            setOriginalAnalysis(null);
            setCompressedAnalysis(null);
            setCompressionAnalysis(null);
        }
    }, [embeddings, compressionOptions]);
    
    useEffect(() => {
        setExperimentResults(null);
        setSurfaceData(null);
    }, [compressionOptions.method, items, addNoise]);

    const handleItemTypeChange = (type: ItemType) => {
        setItemType(type);
        if (type === 'text') {
            setItems(customText.split('\n').filter(line => line.trim() !== ''));
        } else {
            setItems(imageItems.map(item => item.previewUrl));
        }
    };

    const handleCompressionMethodChange = (method: CompressionMethod) => {
        setCompressionOptions(prev => ({ ...prev, method }));
    };

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newText = e.target.value;
        setCustomText(newText);
        if (itemType === 'text') {
            setItems(newText.split('\n').filter(line => line.trim() !== ''));
        }
    };
    
    const handleResetText = () => {
        setCustomText(SAMPLE_TEXTS.join('\n'));
        if (itemType === 'text') {
             setItems(SAMPLE_TEXTS);
        }
    };

    const handleFiles = (files: FileList) => {
        const newImageItems = Array.from(files).map(file => {
            const id = `${file.name}-${file.lastModified}-${Math.random()}`;
            const previewUrl = URL.createObjectURL(file);
            return { id, previewUrl };
        });
        const updatedImageItems = [...newImageItems, ...imageItems];
        setImageItems(updatedImageItems);
        if (itemType === 'image') {
            setItems(updatedImageItems.map(item => item.previewUrl));
        }
    };

    const removeImage = (idToRemove: string) => {
        const itemToRemove = imageItems.find(img => img.id === idToRemove);
        if (itemToRemove && itemToRemove.previewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(itemToRemove.previewUrl);
        }
        
        const updatedImageItems = imageItems.filter(img => img.id !== idToRemove);
        setImageItems(updatedImageItems);
        if (itemType === 'image') {
            setItems(updatedImageItems.map(item => item.previewUrl));
        }
    };

    const resetImages = () => {
        imageItems.forEach(img => {
            if (img.previewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(img.previewUrl);
            }
        });
        const sampleImageItems = SAMPLE_IMAGES.map(url => ({ id: url, previewUrl: url }));
        setImageItems(sampleImageItems);
        if (itemType === 'image') {
            setItems(sampleImageItems.map(item => item.previewUrl));
        }
    };
    
    const handleRunExperiment = () => {
        setSurfaceData(null);
        const results: ExperimentPoint[] = [];

        if (compressionOptions.method === 'grid') {
            const sweepSteps = Array.from({ length: 10 }, (_, i) => (i + 1) * 0.05); // 0.05 to 0.5
            sweepSteps.forEach(step => {
                const tempOptions: CompressionOptions = { method: 'grid', step };
                const compressed = compressEmbeddings(embeddings, tempOptions);
                const compAnalysis = analyzeCompression(embeddings, compressed);
                const singleAnalysis = analyzeSingleSet(compressed, true);
                
                results.push({
                    param: step,
                    energy: compAnalysis.compressionEnergy,
                    cosine: compAnalysis.averageCosineSimilarity,
                    lsi: compAnalysis.lsi,
                    semanticEfficiency: compAnalysis.semanticEfficiency,
                    clusterCount: singleAnalysis.uniqueClusterCount,
                });
            });
            setExperimentResults({ points: results, paramName: 'Step' });
        } else { // kmeans
            const sweepK = Array.from({ length: 9 }, (_, i) => i + 2); // [2, 3, 4, 5, 6, 7, 8, 9, 10]
            sweepK.forEach(k => {
                const tempOptions: CompressionOptions = { method: 'kmeans', k };
                const compressed = compressEmbeddings(embeddings, tempOptions);
                const compAnalysis = analyzeCompression(embeddings, compressed);
                const singleAnalysis = analyzeSingleSet(compressed, true);
                
                results.push({
                    param: k,
                    energy: compAnalysis.compressionEnergy,
                    cosine: compAnalysis.averageCosineSimilarity,
                    lsi: compAnalysis.lsi,
                    semanticEfficiency: compAnalysis.semanticEfficiency,
                    clusterCount: singleAnalysis.uniqueClusterCount,
                });
            });
            setExperimentResults({ points: results, paramName: 'K Value' });
        }
    };
    
    const handleRunSurfaceExperiment = async () => {
        setIsProcessing(true);
        setExperimentResults(null);
        await new Promise(resolve => setTimeout(resolve, 0)); // Allow UI to update
    
        const kValues = Array.from({ length: 9 }, (_, i) => i + 2); // 2-10
        const stepValues = Array.from({ length: 10 }, (_, i) => (i + 1) * 0.05); // 0.05-0.50
        
        const metrics: SurfaceMetricPoint[] = [];
        const lsiZValues: number[][] = [];
        const efficiencyZValues: number[][] = [];
    
        for (const k of kValues) {
            const lsiRow: number[] = [];
            const efficiencyRow: number[] = [];
            for (const step of stepValues) {
                const tempOptions: CompressionOptions = { method: 'kmeans-grid', k, step };
                const compressed = compressEmbeddings(embeddings, tempOptions);
                const compAnalysis = analyzeCompression(embeddings, compressed);
                lsiRow.push(compAnalysis.lsi);
                efficiencyRow.push(compAnalysis.semanticEfficiency);
                metrics.push({
                    grid: step,
                    k: k,
                    lsi: compAnalysis.lsi,
                    cosine: compAnalysis.averageCosineSimilarity,
                    energy: compAnalysis.compressionEnergy,
                    semanticEfficiency: compAnalysis.semanticEfficiency,
                });
            }
            lsiZValues.push(lsiRow);
            efficiencyZValues.push(efficiencyRow);
        }
    
        setSurfaceData({ kValues, stepValues, zValues: { lsi: lsiZValues, semanticEfficiency: efficiencyZValues }, metrics });
        setIsProcessing(false);
    };

    const handleExportJson = () => {
        if (!surfaceData) return;
        const exportData = {
            run_id: new Date().toISOString(),
            grid_steps: surfaceData.stepValues,
            k_values: surfaceData.kValues,
            metrics: surfaceData.metrics,
            notes: "domain=NeuraLogix README set"
        };
    
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(exportData, null, 2))}`;
        const link = document.createElement("a");
        link.href = jsonString;
        link.download = `neurlogix_surface_run_${exportData.run_id}.json`;
        link.click();
        link.remove();
    };
    
    const handlePostToPython = () => {
        if (!surfaceData || surfaceData.metrics.length === 0) {
            console.warn("No surface data to post.");
            return;
        }
        console.log("--- SIMULATING POST to /surface ---");
        console.log("This would be the payload sent to a Python backend for further analysis.");
        console.log({
            metrics: surfaceData.metrics
        });
        alert("Simulated POST to /surface. Check the developer console for the payload.");
    };

    const getOriginalSize = () => {
        if (embeddings.size === 0) return 0;
        const vector = embeddings.values().next().value;
        if (!vector) return 0;
        return embeddings.size * vector.length * 4; // 32-bit float
    };

    const getCompressedSize = () => {
        if (compressedEmbeddings.size === 0) return 0;
        const vector = compressedEmbeddings.values().next().value;
        if (!vector) return 0;

        if (compressionOptions.method === 'kmeans') {
             return (compressionOptions.k || 4) * vector.length * 4 + compressedEmbeddings.size;
        } else { // grid - lower precision
            return compressedEmbeddings.size * vector.length * 2; // 16-bit float estimate
        }
    };

    const originalSize = useMemo(getOriginalSize, [embeddings]);
    const compressedSize = useMemo(getCompressedSize, [compressedEmbeddings, compressionOptions]);
    const compressionRatio = originalSize > 0 ? (1 - compressedSize / originalSize) * 100 : 0;

    return (
        <div className="bg-lab-dark-1 min-h-screen text-lab-light font-sans">
            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
            <WelcomeModal isOpen={isWelcomeOpen} onClose={closeWelcome} />
            
            <header className="bg-lab-dark-2/50 backdrop-blur-md sticky top-0 z-10 border-b border-lab-dark-3">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center space-x-3">
                            <LabIcon className="w-8 h-8 text-lab-accent"/>
                            <h1 className="text-xl sm:text-2xl font-bold">NeuraLogix Mini Lab</h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            <button 
                                onClick={() => setIsWelcomeOpen(true)}
                                className="flex items-center space-x-2 text-sm text-gray-300 hover:text-lab-light transition-colors p-2 rounded-full hover:bg-lab-dark-3"
                                title="Help & Info"
                            >
                                <HelpIcon className="w-6 h-6" />
                            </button>
                            <button 
                                onClick={() => setIsSettingsOpen(true)}
                                className="flex items-center space-x-2 text-sm text-gray-300 hover:text-lab-light transition-colors p-2 rounded-full hover:bg-lab-dark-3"
                                title="AI Provider Settings"
                            >
                                <GearIcon className="w-6 h-6" />
                            </button>
                            <a href="https://ai.google.dev/docs/gemini_api_overview" target="_blank" rel="noopener noreferrer" className="hidden sm:flex items-center space-x-2 text-sm text-gray-300 hover:text-lab-light transition-colors">
                                <ApiIcon className="w-5 h-5" />
                                <span>Powered by Gemini</span>
                            </a>
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
                
                {error && (
                     <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg relative animate-in fade-in slide-in-from-top-2" role="alert">
                        <p><strong className="font-bold">Error:</strong> {error}</p>
                        <button onClick={() => setError(null)} className="absolute top-0 bottom-0 right-0 px-4 py-3">
                           <span className="text-2xl">&times;</span>
                        </button>
                    </div>
                )}
                
                <section className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    <div className="relative bg-lab-dark-2 p-4 sm:p-6 rounded-lg border border-lab-dark-3 shadow-lg space-y-6">
                        {isEmbedding && (
                            <div className="absolute inset-0 bg-lab-dark-2/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
                                <div className="flex flex-col items-center space-y-4 text-lab-light">
                                    <div className="relative w-16 h-16">
                                        <div className="absolute top-0 left-0 w-full h-full border-4 border-lab-dark-3 rounded-full"></div>
                                        <div className="absolute top-0 left-0 w-full h-full border-4 border-lab-accent rounded-full animate-spin border-t-transparent"></div>
                                    </div>
                                    <span className="font-semibold tracking-wider">GENERATING EMBEDDINGS...</span>
                                </div>
                            </div>
                        )}
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-3">
                                <h3 className="text-lg font-semibold flex items-center space-x-2">1. Data Type</h3>
                                <div className="flex space-x-2">
                                    <button onClick={() => handleItemTypeChange('text')} className={`flex-1 text-center px-4 py-2 rounded-md transition-colors text-sm font-medium flex items-center justify-center space-x-2 ${itemType === 'text' ? 'bg-lab-accent text-lab-dark-1' : 'bg-lab-dark-3 hover:bg-lab-dark-3/70'}`}>
                                        <TextIcon className="w-5 h-5" />
                                        <span>Text</span>
                                    </button>
                                    <button onClick={() => handleItemTypeChange('image')} className={`flex-1 text-center px-4 py-2 rounded-md transition-colors text-sm font-medium flex items-center justify-center space-x-2 ${itemType === 'image' ? 'bg-lab-accent text-lab-dark-1' : 'bg-lab-dark-3 hover:bg-lab-dark-3/70'}`}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        <span>Images</span>
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <h3 className="text-lg font-semibold flex items-center space-x-2">2. Compression</h3>
                                <div className="flex space-x-2">
                                    <button onClick={() => handleCompressionMethodChange('kmeans')} className={`flex-1 text-center px-4 py-2 rounded-md transition-colors text-sm font-medium ${compressionOptions.method === 'kmeans' ? 'bg-lab-accent text-lab-dark-1' : 'bg-lab-dark-3 hover:bg-lab-dark-3/70'}`}>
                                        k-Means
                                    </button>
                                    <button onClick={() => handleCompressionMethodChange('grid')} className={`flex-1 text-center px-4 py-2 rounded-md transition-colors text-sm font-medium ${compressionOptions.method === 'grid' ? 'bg-lab-accent text-lab-dark-1' : 'bg-lab-dark-3 hover:bg-lab-dark-3/70'}`}>
                                        Grid
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <h3 className="text-lg font-semibold">3. Parameters</h3>
                                {compressionOptions.method === 'kmeans' ? (
                                    <div className="space-y-2">
                                        <label htmlFor="k-value" className="block text-sm font-medium text-gray-300">Clusters (k): {compressionOptions.k}</label>
                                        <input type="range" id="k-value" min="2" max="10" step="1" value={compressionOptions.k} onChange={(e) => setCompressionOptions(p => ({ ...p, k: parseInt(e.target.value, 10) }))} className="w-full h-2 bg-lab-dark-3 rounded-lg appearance-none cursor-pointer" />
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <label htmlFor="grid-step" className="block text-sm font-medium text-gray-300">Grid Step: {compressionOptions.step}</label>
                                        <input type="range" id="grid-step" min="0.05" max="0.5" step="0.05" value={compressionOptions.step} onChange={(e) => setCompressionOptions(p => ({ ...p, step: parseFloat(e.target.value) }))} className="w-full h-2 bg-lab-dark-3 rounded-lg appearance-none cursor-pointer" />
                                    </div>
                                )}
                            </div>
                        </div>
                         <div className="pt-4 border-t border-lab-dark-3 space-y-3">
                            <button onClick={handleGenerateEmbeddings} className="w-full px-4 py-3 rounded-md bg-lab-accent hover:bg-lab-accent-hover text-lab-dark-1 transition-colors font-bold flex items-center justify-center space-x-2 text-lg shadow-md hover:shadow-lg">
                                <ApiIcon className="w-6 h-6" />
                                <span>Generate Embeddings</span>
                            </button>
                            <button onClick={handleRunExperiment} disabled={embeddings.size === 0} className="w-full px-4 py-2 rounded-md bg-lab-dark-3 hover:bg-lab-dark-3/70 text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold flex items-center justify-center space-x-2">
                                <ProcessIcon className="w-5 h-5" />
                                <span>
                                    {compressionOptions.method === 'grid'
                                        ? 'Run Continuity Experiment'
                                        : 'Run K-Value Sweep'}
                                </span>
                            </button>
                        </div>
                    </div>
                     <div className="bg-lab-dark-2 p-4 sm:p-6 rounded-lg border border-lab-dark-3 shadow-lg">
                        {itemType === 'text' ? (
                            <div className="h-full flex flex-col">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="text-lg font-semibold">Live Text Input</h3>
                                    <button onClick={handleResetText} className="text-sm flex items-center space-x-1 text-gray-400 hover:text-lab-light transition-colors"><ResetIcon className="w-4 h-4" /> <span>Reset</span></button>
                                </div>
                                <textarea
                                    ref={textareaRef}
                                    value={customText}
                                    onChange={handleTextChange}
                                    className="w-full flex-grow bg-lab-dark-1 border border-lab-dark-3 rounded-md p-3 text-sm resize-none overflow-hidden font-mono focus:ring-1 focus:ring-lab-accent outline-none"
                                    placeholder="Enter text items, one per line..."
                                />
                                <div className="mt-3">
                                    <label className="flex items-center text-sm text-gray-400">
                                        <input type="checkbox" checked={addNoise} onChange={(e) => setAddNoise(e.target.checked)} className="h-4 w-4 rounded border-gray-500 text-lab-accent bg-lab-dark-3 focus:ring-lab-accent" />
                                        <span className="ml-2">Add 20% word shuffle noise (sanity test)</span>
                                    </label>
                                </div>
                            </div>
                        ) : (
                            <ImageUploader
                                images={imageItems}
                                onFilesAdded={handleFiles}
                                onRemove={removeImage}
                                onClear={resetImages}
                            />
                        )}
                    </div>
                </section>
                
                <section className="bg-lab-dark-2 p-4 sm:p-6 rounded-lg border border-lab-dark-3 shadow-lg">
                    <h3 className="text-lg font-semibold mb-4 text-lab-light">Master Experiment</h3>
                    <button onClick={handleRunSurfaceExperiment} disabled={isProcessing || embeddings.size === 0} className="w-full px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold flex items-center justify-center space-x-2">
                         {isProcessing && (
                            <svg className="animate-spin h-5 w-5 text-white mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        )}
                        <span>{isProcessing ? 'Calculating Surface Topology...' : 'Generate Continuity-Abstraction Surface'}</span>
                    </button>
                </section>

                {surfaceData && (
                    <section className="bg-lab-dark-2 p-4 sm:p-6 rounded-lg border border-lab-dark-3 shadow-lg animate-in fade-in slide-in-from-bottom-4">
                        <h3 className="text-lg font-semibold mb-2 text-lab-light">Map of Semantic Efficiency</h3>
                        <p className="text-sm text-gray-400 mb-4">
                            This surface visualizes the stability and efficiency of the compressed space. The stable ridge on the LSI plot represents the efficiency frontier — where compression achieves maximum coherence with minimal energy.
                        </p>
                        
                        <div className="mb-4 border-b border-lab-dark-3">
                            <nav className="flex -mb-px space-x-6" aria-label="Tabs">
                                <button onClick={() => setActiveSurfaceTab('lsi')} className={`shrink-0 border-b-2 px-1 pb-2 text-sm font-medium flex items-center space-x-2 ${activeSurfaceTab === 'lsi' ? 'border-lab-accent text-lab-accent' : 'border-transparent text-gray-400 hover:border-gray-500 hover:text-gray-300'}`}>
                                    <ChartBarIcon className="w-5 h-5" /><span>LSI Surface</span>
                                </button>
                                <button onClick={() => setActiveSurfaceTab('efficiency')} className={`shrink-0 border-b-2 px-1 pb-2 text-sm font-medium flex items-center space-x-2 ${activeSurfaceTab === 'efficiency' ? 'border-lab-accent text-lab-accent' : 'border-transparent text-gray-400 hover:border-gray-500 hover:text-gray-300'}`}>
                                    <ChartBarIcon className="w-5 h-5" /><span>Efficiency Surface</span>
                                </button>
                                <button onClick={() => setActiveSurfaceTab('contour')} className={`shrink-0 border-b-2 px-1 pb-2 text-sm font-medium flex items-center space-x-2 ${activeSurfaceTab === 'contour' ? 'border-lab-accent text-lab-accent' : 'border-transparent text-gray-400 hover:border-gray-500 hover:text-gray-300'}`}>
                                    <ChartBarIcon className="w-5 h-5" /><span>Contour Plot</span>
                                </button>
                            </nav>
                        </div>

                        <div>
                            {activeSurfaceTab === 'lsi' && <ContinuityAbstractionSurface kValues={surfaceData.kValues} stepValues={surfaceData.stepValues} zValues={surfaceData.zValues.lsi} titleText="Continuity-Abstraction Surface (LSI)" zAxisTitle="LSI" />}
                            {activeSurfaceTab === 'efficiency' && <ContinuityAbstractionSurface kValues={surfaceData.kValues} stepValues={surfaceData.stepValues} zValues={surfaceData.zValues.semanticEfficiency} titleText="Semantic Efficiency Surface (LSI / Energy)" zAxisTitle="Efficiency" />}
                            {activeSurfaceTab === 'contour' && <ContourPlot data={surfaceData} />}
                        </div>
                        
                        <AutocalibrationPanel metrics={surfaceData.metrics} onApply={opts => setCompressionOptions({method: 'kmeans-grid', k: opts.k, step: opts.step })} />

                        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
                            <button onClick={handleExportJson} className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-500 transition-colors font-semibold text-sm">
                                <DownloadIcon className="w-5 h-5" />
                                <span>Export Run as JSON</span>
                            </button>
                            <button onClick={handlePostToPython} className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-500 transition-colors font-semibold text-sm">
                                <UploadIcon className="w-5 h-5" />
                                <span>Simulate POST to Backend</span>
                            </button>
                        </div>
                    </section>
                )}
                
                {experimentResults && <ExperimentResults results={experimentResults.points} paramName={experimentResults.paramName} />}

                <section className="bg-lab-dark-2 p-4 sm:p-6 rounded-lg border border-lab-dark-3 shadow-lg">
                    <h3 className="text-lg font-semibold mb-4 text-lab-light">Compression Metrics</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-center">
                        <MetricCard 
                            title="Original Size" 
                            value={`${(originalSize / 1024).toFixed(2)} KB`} 
                            tooltip="Raw size of 768-dim float32 vectors." 
                        />
                        <MetricCard 
                            title="Comp. Size" 
                            value={`${(compressedSize / 1024).toFixed(2)} KB`} 
                            color="text-lab-accent"
                            tooltip="Size after dimension reduction/quantization." 
                        />
                        <MetricCard 
                            title="Reduction" 
                            value={`${compressionRatio.toFixed(1)}%`} 
                            color="text-green-400"
                            tooltip="Percentage of data volume saved." 
                        />
                        <MetricCard 
                            title="Comp. Energy" 
                            value={compressionAnalysis?.compressionEnergy.toFixed(4) ?? '...'} 
                            color="text-red-400"
                            tooltip="Mean Squared Error. Lower is better." 
                        />
                        <MetricCard 
                            title="LSI" 
                            value={compressionAnalysis?.lsi.toFixed(4) ?? '...'} 
                            color="text-purple-400"
                            tooltip="Lattice Stability Index. (Similarity / 1+Energy). Measures coherence." 
                        />
                        <MetricCard 
                            title="Efficiency" 
                            value={compressionAnalysis?.semanticEfficiency.toFixed(2) ?? '...'} 
                            color="text-green-400"
                            tooltip="Semantic Efficiency (LSI / Energy). Peak points indicate optimal compression." 
                        />
                    </div>
                    <div className="mt-4 pt-4 border-t border-lab-dark-3">
                         <div className="bg-lab-dark-1 p-4 rounded-md flex items-center justify-between">
                             <div>
                                 <p className="text-xs text-gray-400 uppercase tracking-wider">Semantic Fidelity (Cosine Similarity)</p>
                                 <p className="text-xs text-gray-500">Average angular similarity between original and compressed vectors.</p>
                             </div>
                             <p className="text-2xl font-bold text-yellow-400">{compressionAnalysis?.averageCosineSimilarity.toFixed(4) ?? '...'}</p>
                         </div>
                    </div>
                </section>
                
                <section className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    {embeddings.size > 0 ? (
                        <>
                            <AnalysisPanel title="Original Embedding Analysis" analysis={originalAnalysis} itemType={itemType} />
                            <AnalysisPanel title="Compressed Embedding Analysis" analysis={compressedAnalysis} itemType={itemType} />
                        </>
                    ) : (
                         <div className="col-span-1 xl:col-span-2 bg-lab-dark-2 p-6 rounded-lg border border-lab-dark-3 border-dashed flex flex-col items-center justify-center h-48 opacity-50">
                            <p className="text-gray-400 text-lg">Awaiting Data Generation</p>
                            <p className="text-gray-600 text-sm mt-2">Click "Generate Embeddings" to begin analysis.</p>
                        </div>
                    )}
                </section>
                
                <section className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    <EmbeddingChart title="Original Embeddings (PCA Projection)" embeddings={embeddings} itemType={itemType} />
                    <EmbeddingChart title="Compressed Embeddings (PCA Projection)" embeddings={compressedEmbeddings} itemType={itemType} />
                </section>
                
                {embeddings.size > 0 && (
                    <section className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                        <EmbeddingTable title="Original Embeddings" embeddings={embeddings} itemType={itemType} />
                        <EmbeddingTable title="Compressed Embeddings" embeddings={compressedEmbeddings} itemType={itemType} />
                    </section>
                )}

            </main>
        </div>
    );
};

export default App;
