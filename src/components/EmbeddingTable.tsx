

import React from 'react';
import { EmbeddingMap, ItemType } from '../types';

interface EmbeddingTableProps {
    title: string;
    embeddings: EmbeddingMap;
    itemType: ItemType | null;
}

const EmbeddingTable: React.FC<EmbeddingTableProps> = ({ title, embeddings, itemType }) => {
    const formatVector = (vector: number[]): string => {
        return `[${vector.map(n => n.toFixed(3)).join(', ')}]`;
    };

    const renderItem = (item: string) => {
        if (itemType === 'image') {
            return <img src={item} alt={item} className="w-12 h-12 object-cover rounded-md" />;
        }
        return <span className="text-sm text-gray-300 break-all">{item}</span>;
    };

    return (
        <div className="bg-lab-dark-2 p-4 sm:p-6 rounded-lg border border-lab-dark-3 shadow-lg">
            <h3 className="text-lg font-semibold mb-4 text-lab-light">{title}</h3>
            <div className="overflow-auto max-h-96">
                <table className="w-full text-left text-sm">
                    <thead className="bg-lab-dark-3/50 text-gray-300 uppercase tracking-wider sticky top-0">
                        <tr>
                            <th className="p-3">Item</th>
                            <th className="p-3">Vector</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-lab-dark-3">
                        {Array.from(embeddings.entries()).map(([item, vector], index) => (
                            <tr key={item + index} className="hover:bg-lab-dark-3/30">
                                <td className="p-3 align-middle w-1/3">{renderItem(item)}</td>
                                <td className="p-3 align-middle font-mono text-lab-accent">{formatVector(vector)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default EmbeddingTable;