import React from 'react';
import { SingleSetAnalysis, ItemType } from '../types';

interface AnalysisPanelProps {
    title: string;
    analysis: SingleSetAnalysis | null;
    itemType: ItemType | null;
}

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ title, analysis, itemType }) => {
    if (!analysis) {
        return null;
    }

    const formatDistance = (d: number) => d.toFixed(4);

    const renderItem = (item: string, small: boolean = false) => {
        if (itemType === 'image' && item) {
            const sizeClass = small ? "w-6 h-6" : "w-8 h-8";
            return <img src={item} alt={item} className={`${sizeClass} object-cover rounded-sm inline-block mx-1`} />;
        }
        const sizeClass = small ? "px-1.5 py-0.5 text-xs" : "px-2 py-1";
        return <span className={`text-lab-accent font-mono bg-lab-dark-3/50 ${sizeClass} rounded-md mx-1 whitespace-nowrap`}>{item}</span>;
    };

    const { averageDistance, closestPair, farthestPair, collisions, uniqueClusterCount } = analysis;

    const hasCollisions = collisions && collisions.size > 0;

    return (
        <div className="bg-lab-dark-2 p-4 sm:p-6 rounded-lg border border-lab-dark-3 shadow-lg">
            <h3 className="text-lg font-semibold mb-4 text-lab-light">{title}</h3>
            <div className="space-y-4 text-gray-300">
                <div className="flex justify-between items-center">
                    <span className="font-medium">Average Pairwise Distance:</span>
                    <span className="font-mono text-xl text-lab-accent">{formatDistance(averageDistance)}</span>
                </div>
                 <div className="flex justify-between items-center">
                    <span className="font-medium">Unique Cluster Count:</span>
                    <span className="font-mono text-xl text-lab-light">{uniqueClusterCount}</span>
                </div>
                {closestPair && closestPair.pair[0] && (
                    <div className="p-3 bg-lab-dark-1 rounded-md border border-lab-dark-3">
                        <h4 className="text-md font-semibold text-green-400 mb-2">Closest Pair</h4>
                        <div className="flex flex-wrap items-center justify-between">
                            <div className="flex items-center">
                                {renderItem(closestPair.pair[0])}
                                <span className="mx-2 text-gray-400">↔</span>
                                {renderItem(closestPair.pair[1])}
                            </div>
                            <span className="font-mono text-lg text-green-400 mt-2 sm:mt-0">
                                {formatDistance(closestPair.distance)}
                            </span>
                        </div>
                    </div>
                )}
                {farthestPair && farthestPair.pair[0] && (
                     <div className="p-3 bg-lab-dark-1 rounded-md border border-lab-dark-3">
                        <h4 className="text-md font-semibold text-red-400 mb-2">Farthest Pair</h4>
                         <div className="flex flex-wrap items-center justify-between">
                             <div className="flex items-center">
                                {renderItem(farthestPair.pair[0])}
                                 <span className="mx-2 text-gray-400">↔</span>
                                {renderItem(farthestPair.pair[1])}
                             </div>
                             <span className="font-mono text-lg text-red-400 mt-2 sm:mt-0">
                                {formatDistance(farthestPair.distance)}
                             </span>
                         </div>
                     </div>
                )}
                {hasCollisions && (
                    <div className="p-3 bg-lab-dark-1 rounded-md border border-lab-dark-3">
                        <h4 className="text-md font-semibold text-yellow-400 mb-2">Collisions</h4>
                        <div className="space-y-2">
                           {Array.from(collisions.entries()).map(([vector, items]) => (
                               <div key={vector} className="flex flex-wrap items-center bg-lab-dark-3/40 p-2 rounded">
                                   <span className="mr-2 text-gray-400 text-xs">Items:</span>
                                   {items.map(item => renderItem(item, true))}
                               </div>
                           ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AnalysisPanel;