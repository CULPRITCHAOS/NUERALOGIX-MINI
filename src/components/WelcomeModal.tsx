
import React from 'react';
import { LabIcon, ChartBarIcon, TargetIcon } from './icons';

interface WelcomeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-lab-dark-2 border border-lab-dark-3 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden">
                <div className="p-6 border-b border-lab-dark-3 flex items-center space-x-3 bg-lab-dark-1">
                    <div className="p-2 bg-lab-accent/10 rounded-lg">
                        <LabIcon className="w-8 h-8 text-lab-accent" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-lab-light">Welcome to NeuraLogix Mini Lab</h2>
                        <p className="text-sm text-gray-400">Research Sandbox for Semantic Compression</p>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto space-y-6 text-gray-300 leading-relaxed">
                    <p>
                        This lab is an interactive environment designed to test <strong>Lattice-Stabilized Diffusion</strong> concepts. 
                        It allows you to compress high-dimensional AI embeddings (768 dimensions) into low-dimensional "clusters" or "grids" 
                        to study how information is preserved or lost.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-lab-dark-1 p-4 rounded-lg border border-lab-dark-3">
                            <h3 className="text-lab-light font-semibold mb-2 flex items-center space-x-2">
                                <TargetIcon className="w-5 h-5 text-red-400" />
                                <span>The Problem</span>
                            </h3>
                            <p className="text-sm">
                                Standard compression minimizes error (Energy) but often destroys semantic relationships. 
                                Pure mathematical accuracy doesn't always mean "meaningful."
                            </p>
                        </div>
                        <div className="bg-lab-dark-1 p-4 rounded-lg border border-lab-dark-3">
                            <h3 className="text-lab-light font-semibold mb-2 flex items-center space-x-2">
                                <ChartBarIcon className="w-5 h-5 text-green-400" />
                                <span>The Metric</span>
                            </h3>
                            <p className="text-sm">
                                We introduce <strong>Semantic Efficiency</strong>: A ratio that measures how much meaning (Cosine Similarity) 
                                is retained per unit of distortion (Energy).
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-lab-light">Key Definitions</h3>
                        <ul className="space-y-3">
                            <li className="flex items-start space-x-3">
                                <span className="px-2 py-1 bg-lab-dark-3 rounded text-xs font-mono text-lab-accent whitespace-nowrap mt-0.5">LSI</span>
                                <div>
                                    <strong className="text-lab-light block">Lattice Stability Index</strong>
                                    <span className="text-sm">A unified score (0.0-1.0) combining similarity and stability. Higher is better.</span>
                                </div>
                            </li>
                            <li className="flex items-start space-x-3">
                                <span className="px-2 py-1 bg-lab-dark-3 rounded text-xs font-mono text-green-400 whitespace-nowrap mt-0.5">Efficiency</span>
                                <div>
                                    <strong className="text-lab-light block">Semantic Efficiency</strong>
                                    <span className="text-sm">Calculated as <code className="text-xs bg-black/30 px-1 rounded">LSI / Energy</code>. Peaks in this metric indicate "Resonance Points" where the compression model perfectly matches the data's natural structure.</span>
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="p-6 border-t border-lab-dark-3 bg-lab-dark-1 flex justify-end">
                    <button 
                        onClick={onClose} 
                        className="px-6 py-2.5 rounded-lg bg-lab-accent hover:bg-lab-accent-hover text-lab-dark-1 font-bold transition-all shadow-lg hover:shadow-lab-accent/20"
                    >
                        Enter the Lab
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WelcomeModal;
