import { EmbeddingMap, SingleSetAnalysis, CompressionAnalysis, PairwiseDistance, Embedding } from '../types';
import { euclideanDistance, cosineSimilarity, meanSquaredError } from './mathService';

export const analyzeSingleSet = (embeddings: EmbeddingMap, checkForCollisions: boolean = false): SingleSetAnalysis => {
    const items = Array.from(embeddings.keys());
    const vectors = Array.from(embeddings.values());

    const vectorSet = new Set(vectors.map(v => JSON.stringify(v)));
    const uniqueClusterCount = vectorSet.size;

    if (vectors.length < 2) {
        return {
            averageDistance: 0,
            closestPair: null,
            farthestPair: null,
            uniqueClusterCount,
        };
    }

    let totalDistance = 0;
    let closestPair: PairwiseDistance = { pair: ['', ''], distance: Infinity };
    let farthestPair: PairwiseDistance = { pair: ['', ''], distance: -Infinity };
    let pairCount = 0;

    for (let i = 0; i < vectors.length; i++) {
        for (let j = i + 1; j < vectors.length; j++) {
            const distance = euclideanDistance(vectors[i], vectors[j]);
            totalDistance += distance;
            pairCount++;

            if (distance < closestPair.distance) {
                closestPair = { pair: [items[i], items[j]], distance };
            }
            if (distance > farthestPair.distance) {
                farthestPair = { pair: [items[i], items[j]], distance };
            }
        }
    }
    
    const collisions = new Map<string, string[]>();
    if (checkForCollisions) {
        const vectorMap = new Map<string, string[]>();
        items.forEach((item, i) => {
            const vectorKey = vectors[i].map(v => v.toFixed(5)).join(',');
            if (!vectorMap.has(vectorKey)) {
                vectorMap.set(vectorKey, []);
            }
            vectorMap.get(vectorKey)!.push(item);
        });

        for (const [key, mappedItems] of vectorMap.entries()) {
            if (mappedItems.length > 1) {
                collisions.set(key, mappedItems);
            }
        }
    }

    return {
        averageDistance: pairCount > 0 ? totalDistance / pairCount : 0,
        closestPair,
        farthestPair,
        uniqueClusterCount,
        collisions: collisions.size > 0 ? collisions : undefined,
    };
};


export const analyzeCompression = (original: EmbeddingMap, compressed: EmbeddingMap): CompressionAnalysis => {
    let totalCosineSimilarity = 0;
    let totalEnergy = 0;
    let count = 0;

    for (const [item, originalVector] of original.entries()) {
        const compressedVector = compressed.get(item);
        if (compressedVector) {
            totalCosineSimilarity += cosineSimilarity(originalVector, compressedVector);
            totalEnergy += meanSquaredError(originalVector, compressedVector);
            count++;
        }
    }

    const averageCosineSimilarity = count > 0 ? totalCosineSimilarity / count : 0;
    const compressionEnergy = count > 0 ? totalEnergy / count : 0;
    const lsi = averageCosineSimilarity / (1 + compressionEnergy);
    // Add a small epsilon to avoid division by zero
    const semanticEfficiency = lsi / (compressionEnergy + 1e-9);

    return {
        averageCosineSimilarity,
        compressionEnergy,
        lsi,
        semanticEfficiency,
    };
};