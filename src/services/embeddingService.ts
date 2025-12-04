
import { EmbeddingMap, ItemType } from '../types';
import { EmbeddingInput } from './providers/types';
import { aiService } from './aiService';

const fetchBlob = async (url: string): Promise<Blob> => {
    // Strategy 1: Direct Fetch with Cache Busting
    // We append a timestamp to bypass browser caches that might hold opaque (CORB-blocked) responses.
    const cacheBuster = `cb=${Date.now()}`;
    const separator = url.includes('?') ? '&' : '?';
    const safeUrl = `${url}${separator}${cacheBuster}`;

    try {
        const response = await fetch(safeUrl, { 
            mode: 'cors', 
            credentials: 'omit',
        });
        if (!response.ok) {
            throw new Error(`Direct fetch failed: ${response.status} ${response.statusText}`);
        }
        return await response.blob();
    } catch (directError) {
        console.warn(`Direct fetch failed for ${url}, attempting Proxy fallback...`);
        
        // Strategy 2: CORS Proxy
        // If direct fetch is blocked by CORS or network policies, use a public proxy.
        try {
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
            const response = await fetch(proxyUrl);
            if (!response.ok) {
                throw new Error(`Proxy fetch failed: ${response.status} ${response.statusText}`);
            }
            return await response.blob();
        } catch (proxyError) {
            // If both fail, throw to trigger the item-level fallback
            throw new Error(`All fetch attempts failed for ${url}`);
        }
    }
};

export const generateEmbeddings = async (items: string[], type: ItemType): Promise<EmbeddingMap> => {
    const provider = aiService.getActiveProvider();
    console.log(`Using AI Provider: ${provider.name} (${provider.id})`);

    const inputs: EmbeddingInput[] = [];

    // Helper function to process a single item safely
    const processItem = async (item: string): Promise<EmbeddingInput> => {
        if (type === 'image') {
            try {
                const blob = await fetchBlob(item);
                return { id: item, content: blob, type: 'image' };
            } catch (e) {
                console.error(`Failed to load image: ${item}. Falling back to text placeholder.`);
                // CRITICAL: Do not crash the entire batch if one image fails.
                // Fallback to treating it as a text item so the experiment can proceed.
                return { id: item, content: `[Missing Image: ${item}]`, type: 'text' };
            }
        }
        return { id: item, content: item, type: 'text' };
    };

    // BATCH PROCESSING
    // We download images in small chunks to avoid triggering rate limiters (429) 
    // on the source server (Unsplash) or the Proxy.
    const BATCH_SIZE = 5;
    
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
        const batch = items.slice(i, i + BATCH_SIZE);
        const batchPromises = batch.map(processItem);
        
        // Wait for this batch to finish before starting the next
        const batchResults = await Promise.all(batchPromises);
        inputs.push(...batchResults);

        // Small delay between batches to be polite to servers
        if (type === 'image' && i + BATCH_SIZE < items.length) {
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    }

    if (inputs.length === 0) {
        return new Map();
    }

    // Generate actual embeddings via the provider
    // The provider handles its own rate limiting for the AI API
    const embeddingOutputs = await provider.generateEmbeddings(inputs);

    const embeddings = new Map<string, number[]>();
    for (const output of embeddingOutputs) {
        embeddings.set(output.id, output.vector);
    }
    
    return embeddings;
};
