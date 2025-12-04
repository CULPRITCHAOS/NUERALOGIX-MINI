
import { EmbeddingProvider } from './providers/types';
import { GoogleProvider } from './providers/GoogleProvider';
import { OllamaProvider } from './providers/OllamaProvider';

const STORAGE_KEY = 'neuralogix_ai_config';

export interface AIConfig {
    providerId: 'google' | 'ollama';
    ollama: {
        endpoint: string;
        embeddingModel: string;
        visionModel: string;
    };
}

const DEFAULT_CONFIG: AIConfig = {
    providerId: 'google',
    ollama: {
        endpoint: 'http://localhost:11434',
        embeddingModel: 'nomic-embed-text',
        visionModel: 'llava'
    }
};

class AIService {
    private config: AIConfig;
    private activeProvider: EmbeddingProvider | null = null;

    constructor() {
        this.config = this.loadConfig();
    }

    private loadConfig(): AIConfig {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
            }
        } catch (e) {
            console.error("Failed to load AI config", e);
        }
        return DEFAULT_CONFIG;
    }

    saveConfig(newConfig: AIConfig) {
        this.config = newConfig;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
        this.activeProvider = null; // Force recreation
    }

    getConfig(): AIConfig {
        return this.config;
    }

    getActiveProvider(): EmbeddingProvider {
        if (this.activeProvider) {
            return this.activeProvider;
        }

        if (this.config.providerId === 'ollama') {
            this.activeProvider = new OllamaProvider(
                this.config.ollama.endpoint,
                this.config.ollama.embeddingModel,
                this.config.ollama.visionModel
            );
        } else {
            // Default to Google
            this.activeProvider = new GoogleProvider();
        }

        return this.activeProvider;
    }
}

export const aiService = new AIService();
