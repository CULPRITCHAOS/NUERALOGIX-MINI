import React, { useState, useEffect } from 'react';
import { aiService, AIConfig } from '../services/aiService';
import { ApiIcon, WarningIcon } from './icons';
import { OllamaProvider } from '../services/providers/OllamaProvider';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
    const [config, setConfig] = useState<AIConfig>(aiService.getConfig());
    const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [testMessage, setTestMessage] = useState('');
    const [isHttps, setIsHttps] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setConfig(aiService.getConfig());
            setTestStatus('idle');
            setTestMessage('');
            setIsHttps(window.location.protocol === 'https:');
        }
    }, [isOpen]);

    const handleSave = () => {
        aiService.saveConfig(config);
        onClose();
    };

    const handleTestConnection = async () => {
        setTestStatus('testing');
        setTestMessage('Connecting to Ollama...');
        
        const tempProvider = new OllamaProvider(
            config.ollama.endpoint,
            config.ollama.embeddingModel,
            config.ollama.visionModel
        );

        const success = await tempProvider.testConnection();

        if (success) {
            setTestStatus('success');
            setTestMessage('Connection successful!');
        } else {
            setTestStatus('error');
            setTestMessage('Failed to connect. Check CORS/Server.');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-lab-dark-2 border border-lab-dark-3 rounded-lg shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-lab-dark-3 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-lab-light flex items-center space-x-2">
                        <ApiIcon className="w-6 h-6 text-lab-accent" />
                        <span>AI Provider Settings</span>
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
                </div>
                
                <div className="p-6 space-y-6 overflow-y-auto flex-grow">
                    {/* Provider Selection */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-300">Active Provider</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                onClick={() => setConfig({ ...config, providerId: 'google' })}
                                className={`p-3 rounded-md border flex flex-col items-center space-y-2 transition-colors ${config.providerId === 'google' ? 'bg-lab-accent/20 border-lab-accent text-lab-accent' : 'bg-lab-dark-1 border-lab-dark-3 text-gray-400 hover:border-gray-500'}`}
                            >
                                <span className="font-semibold">Google Gemini</span>
                                <span className="text-xs opacity-75">Cloud (Fast)</span>
                            </button>
                            <button 
                                onClick={() => setConfig({ ...config, providerId: 'ollama' })}
                                className={`p-3 rounded-md border flex flex-col items-center space-y-2 transition-colors ${config.providerId === 'ollama' ? 'bg-lab-accent/20 border-lab-accent text-lab-accent' : 'bg-lab-dark-1 border-lab-dark-3 text-gray-400 hover:border-gray-500'}`}
                            >
                                <span className="font-semibold">Ollama</span>
                                <span className="text-xs opacity-75">Local (Private)</span>
                            </button>
                        </div>
                    </div>

                    {/* Google Settings (Read Only) */}
                    {config.providerId === 'google' && (
                        <div className="bg-lab-dark-1 p-4 rounded-md border border-lab-dark-3 text-sm text-gray-400">
                            <p className="flex items-start space-x-2">
                                <span className="text-green-400 font-bold">✓</span>
                                <span>Using API Key from system environment.</span>
                            </p>
                        </div>
                    )}

                    {/* Ollama Settings */}
                    {config.providerId === 'ollama' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                            {isHttps && (
                                <div className="bg-red-900/20 border border-red-700/50 p-3 rounded text-xs text-red-200/80 flex items-start space-x-2">
                                    <WarningIcon className="w-4 h-4 shrink-0 mt-0.5" />
                                    <div>
                                        <strong>Mixed Content Warning:</strong>
                                        <p>You are viewing this app via HTTPS. Browsers will block requests to a local HTTP Ollama server. To use Ollama, either run this app locally (http://localhost:5173) or configure Ollama with SSL.</p>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-1">
                                <label className="block text-xs font-medium text-gray-400 uppercase">Base URL</label>
                                <input 
                                    type="text" 
                                    value={config.ollama.endpoint}
                                    onChange={(e) => setConfig({ ...config, ollama: { ...config.ollama, endpoint: e.target.value } })}
                                    placeholder="http://localhost:11434"
                                    className="w-full bg-lab-dark-1 border border-lab-dark-3 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-lab-accent focus:border-lab-accent outline-none"
                                />
                                <p className="text-xs text-gray-500">Ensure `OLLAMA_ORIGINS="*"` is set when running `ollama serve`.</p>
                            </div>
                            <div className="space-y-1">
                                <label className="block text-xs font-medium text-gray-400 uppercase">Embedding Model</label>
                                <input 
                                    type="text" 
                                    value={config.ollama.embeddingModel}
                                    onChange={(e) => setConfig({ ...config, ollama: { ...config.ollama, embeddingModel: e.target.value } })}
                                    placeholder="nomic-embed-text"
                                    className="w-full bg-lab-dark-1 border border-lab-dark-3 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-lab-accent focus:border-lab-accent outline-none"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="block text-xs font-medium text-gray-400 uppercase">Vision Model (Optional)</label>
                                <input 
                                    type="text" 
                                    value={config.ollama.visionModel}
                                    onChange={(e) => setConfig({ ...config, ollama: { ...config.ollama, visionModel: e.target.value } })}
                                    placeholder="llava"
                                    className="w-full bg-lab-dark-1 border border-lab-dark-3 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-lab-accent focus:border-lab-accent outline-none"
                                />
                                <p className="text-xs text-gray-500">Required only for embedding images.</p>
                            </div>
                            
                            <div className="pt-2">
                                <button 
                                    onClick={handleTestConnection} 
                                    className="text-xs px-3 py-2 rounded bg-lab-dark-3 hover:bg-lab-dark-3/80 transition-colors text-gray-200 w-full flex justify-center items-center space-x-2"
                                >
                                    <span>Test Connection</span>
                                </button>
                                {testStatus !== 'idle' && (
                                    <p className={`mt-2 text-xs text-center ${testStatus === 'success' ? 'text-green-400' : testStatus === 'error' ? 'text-red-400' : 'text-gray-400'}`}>
                                        {testMessage}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                    
                    <div className="bg-yellow-900/20 border border-yellow-700/50 p-3 rounded text-xs text-yellow-200/80 flex items-start space-x-2">
                        <WarningIcon className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>Changing providers or models will invalidate current results. You will need to regenerate embeddings.</span>
                    </div>

                </div>

                <div className="p-4 border-t border-lab-dark-3 flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 rounded text-sm font-medium text-gray-400 hover:text-white transition-colors">Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 rounded text-sm font-medium bg-lab-accent text-lab-dark-1 hover:bg-lab-accent-hover transition-colors shadow-md">Save Changes</button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;