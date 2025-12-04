
import { EmbeddingProvider, EmbeddingInput, EmbeddingOutput } from './types';
import { EMBEDDING_DIMENSION } from '../../constants';

export class OllamaProvider implements EmbeddingProvider {
    id = 'ollama';
    name = 'Ollama (Local)';
    endpoint: string;
    embeddingModel: string;
    visionModel: string;

    constructor(endpoint: string, embeddingModel: string, visionModel: string) {
        this.endpoint = endpoint.replace(/\/$/, ''); // Remove trailing slash
        this.embeddingModel = embeddingModel;
        this.visionModel = visionModel;
    }

    private async fetchOllama(path: string, body: any) {
        const response = await fetch(`${this.endpoint}${path}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Ollama API Error (${response.status}): ${errorText}`);
        }

        return response.json();
    }

    async generateEmbeddings(items: EmbeddingInput[]): Promise<EmbeddingOutput[]> {
        const results: EmbeddingOutput[] = [];

        for (const item of items) {
            try {
                let textToEmbed = '';

                if (item.type === 'text') {
                    textToEmbed = item.content as string;
                } else if (item.type === 'image') {
                    // Image flow: 1. Describe with Vision Model -> 2. Embed text
                    if (!this.visionModel) {
                        console.warn(`Skipping image ${item.id}: No vision model configured for Ollama.`);
                        results.push({ id: item.id, vector: new Array(EMBEDDING_DIMENSION).fill(0) });
                        continue;
                    }

                    const blob = item.content as Blob;
                    const base64 = await this.blobToBase64(blob);

                    const chatResponse = await this.fetchOllama('/api/generate', {
                        model: this.visionModel,
                        prompt: "Describe this image in detail for semantic embedding generation. Be descriptive but concise.",
                        images: [base64],
                        stream: false
                    });

                    textToEmbed = chatResponse.response;
                }

                // Embed the text (either original text or image description)
                const embedResponse = await this.fetchOllama('/api/embeddings', {
                    model: this.embeddingModel,
                    prompt: textToEmbed,
                });

                if (!embedResponse.embedding) {
                     throw new Error("Ollama returned no embedding");
                }

                results.push({ id: item.id, vector: embedResponse.embedding });

            } catch (error) {
                console.error(`Failed to process item ${item.id} with Ollama:`, error);
                // Return zero vector on failure to keep the UI stable
                results.push({ id: item.id, vector: new Array(EMBEDDING_DIMENSION).fill(0) });
            }
        }

        return results;
    }

    private blobToBase64(blob: Blob): Promise<string> {
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
    }
    
    async testConnection(): Promise<boolean> {
        try {
            const response = await fetch(`${this.endpoint}/api/tags`);
            return response.ok;
        } catch (e) {
            console.error("Ollama connection test failed:", e);
            return false;
        }
    }
}
