import { GoogleGenAI, GenerateContentResponse, EmbedContentResponse } from "@google/genai";
import { EmbeddingProvider, EmbeddingInput, EmbeddingOutput } from './types';
import { EMBEDDING_DIMENSION } from '../../constants';

const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64data = reader.result as string;
            // remove the prefix e.g., 'data:image/jpeg;base64,'
            resolve(base64data.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

// Simple exponential backoff for rate limits
const retry = async <T>(fn: () => Promise<T>, retries = 3, delayMs = 500): Promise<T> => {
    try {
        return await fn();
    } catch (error: any) {
        if (retries <= 0) throw error;
        // Retry on 429 (Too Many Requests) or 503 (Service Unavailable)
        if (error?.status === 429 || error?.status === 503 || error?.message?.includes('429') || error?.message?.includes('503')) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
            return retry(fn, retries - 1, delayMs * 2);
        }
        throw error;
    }
};

export class GoogleProvider implements EmbeddingProvider {
    id = 'google-gemini';
    name = 'Google Gemini';

    constructor() {
        // Constructor is empty.
    }

    async generateEmbeddings(items: EmbeddingInput[]): Promise<EmbeddingOutput[]> {
        if (!process.env.API_KEY) {
            throw new Error("API_KEY environment variable not set.");
        }
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        // Separate items by type
        const textItems = items.filter(i => i.type === 'text');
        const imageItems = items.filter(i => i.type === 'image');

        const results: EmbeddingOutput[] = [];

        // --- PROCESS IMAGES ---
        // 1. Generate captions using a Flash model
        // 2. Embed the captions
        const imagePromises = imageItems.map(async (item) => {
            try {
                // Use a local variable to ensure TypeScript narrows the type correctly for the closure
                const content = item.content;
                if (!(content instanceof Blob)) throw new Error("Invalid image content");
                
                const base64Data = await blobToBase64(content);

                // Get Description
                const captionResponse = await retry<GenerateContentResponse>(() => ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: {
                        parts: [
                            { inlineData: { mimeType: content.type, data: base64Data } },
                            { text: "Describe this image in detail for semantic embedding generation." }
                        ]
                    }
                }));

                const textDescription = captionResponse.text || "An image";

                // Embed Description
                // Cast to any to handle SDK versions returning 'embeddings' (plural) vs 'embedding' (singular)
                const embedResponse = await retry<any>(() => ai.models.embedContent({
                    model: 'text-embedding-004',
                    contents: { parts: [{ text: textDescription }] }
                }));

                // Check both locations for the vector
                const vector = embedResponse.embedding?.values || embedResponse.embeddings?.[0]?.values;
                
                if (!vector) {
                    const keys = Object.keys(embedResponse || {});
                    throw new Error(`API returned no vector for image description. Available keys: ${keys.join(', ')}`);
                }

                return { id: item.id, vector };
            } catch (error) {
                console.error(`Failed to process image ${item.id}`, error);
                return { id: item.id, vector: new Array(EMBEDDING_DIMENSION).fill(0) };
            }
        });

        // --- PROCESS TEXT ---
        // We use a concurrency pool to process text items in parallel, respecting rate limits.
        // We avoid batchEmbedContents for now due to previous stability issues reported.
        const processTextItem = async (item: EmbeddingInput): Promise<EmbeddingOutput> => {
            try {
                const textContent = item.content as string;
                
                // Cast to any to handle SDK versions returning 'embeddings' (plural) vs 'embedding' (singular)
                const embedResponse = await retry<any>(() => ai.models.embedContent({
                    model: 'text-embedding-004',
                    contents: { parts: [{ text: textContent }] }
                }));

                // Check both singular and plural locations for the vector
                const vector = embedResponse.embedding?.values || embedResponse.embeddings?.[0]?.values;

                if (!vector) {
                    // Helper for debugging: inspect what keys are actually returned
                    const keys = Object.keys(embedResponse || {});
                    throw new Error(`API returned no vector. Available keys: ${keys.join(', ')}`);
                }

                return { id: item.id, vector };
            } catch (error) {
                console.error(`Failed to process text ${item.id}`, error);
                return { id: item.id, vector: new Array(EMBEDDING_DIMENSION).fill(0) };
            }
        };

        const CONCURRENT_LIMIT = 10; // Conservative limit for text-embedding-004
        const textResults: EmbeddingOutput[] = [];

        for (let i = 0; i < textItems.length; i += CONCURRENT_LIMIT) {
            const chunk = textItems.slice(i, i + CONCURRENT_LIMIT);
            const chunkPromises = chunk.map(processTextItem);
            const chunkData = await Promise.all(chunkPromises);
            textResults.push(...chunkData);
            
            // Small delay to prevent burst rate limiting
            if (i + CONCURRENT_LIMIT < textItems.length) {
                await new Promise(r => setTimeout(r, 100));
            }
        }

        // Wait for images to finish
        const imageResults = await Promise.all(imagePromises);

        return [...textResults, ...imageResults];
    }
}
