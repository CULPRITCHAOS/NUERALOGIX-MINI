/**
 * Noise Injection Service
 * 
 * Provides utilities for injecting controlled noise into embeddings
 * to test model robustness and stability.
 */

import { Embedding, EmbeddingMap } from '../types';

export interface NoiseConfig {
  type: 'gaussian' | 'uniform' | 'salt-pepper';
  intensity: number; // 0-1 scale
  seed?: number; // For reproducibility
}

/**
 * Simple seeded random number generator (LCG)
 */
class SeededRandom {
  private seed: number;
  
  constructor(seed: number = Date.now()) {
    this.seed = seed;
  }
  
  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }
  
  nextGaussian(): number {
    // Box-Muller transform
    const u1 = this.next();
    const u2 = this.next();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
}

/**
 * Inject Gaussian noise into embeddings
 */
export function injectGaussianNoise(
  embeddings: EmbeddingMap,
  intensity: number,
  seed?: number
): EmbeddingMap {
  const rng = new SeededRandom(seed);
  const noisyEmbeddings = new Map<string, Embedding>();
  
  embeddings.forEach((embedding, key) => {
    const noisy = embedding.map(val => {
      const noise = rng.nextGaussian() * intensity;
      return val + noise;
    });
    noisyEmbeddings.set(key, noisy);
  });
  
  return noisyEmbeddings;
}

/**
 * Inject uniform noise into embeddings
 */
export function injectUniformNoise(
  embeddings: EmbeddingMap,
  intensity: number,
  seed?: number
): EmbeddingMap {
  const rng = new SeededRandom(seed);
  const noisyEmbeddings = new Map<string, Embedding>();
  
  embeddings.forEach((embedding, key) => {
    const noisy = embedding.map(val => {
      const noise = (rng.next() - 0.5) * 2 * intensity;
      return val + noise;
    });
    noisyEmbeddings.set(key, noisy);
  });
  
  return noisyEmbeddings;
}

/**
 * Inject salt-and-pepper noise (randomly set some dimensions to extremes)
 */
export function injectSaltPepperNoise(
  embeddings: EmbeddingMap,
  intensity: number,
  seed?: number
): EmbeddingMap {
  const rng = new SeededRandom(seed);
  const noisyEmbeddings = new Map<string, Embedding>();
  
  embeddings.forEach((embedding, key) => {
    const noisy = embedding.map(val => {
      if (rng.next() < intensity) {
        // Replace with extreme value
        return rng.next() > 0.5 ? 1.0 : -1.0;
      }
      return val;
    });
    noisyEmbeddings.set(key, noisy);
  });
  
  return noisyEmbeddings;
}

/**
 * Inject noise based on configuration
 */
export function injectNoise(
  embeddings: EmbeddingMap,
  config: NoiseConfig
): EmbeddingMap {
  switch (config.type) {
    case 'gaussian':
      return injectGaussianNoise(embeddings, config.intensity, config.seed);
    case 'uniform':
      return injectUniformNoise(embeddings, config.intensity, config.seed);
    case 'salt-pepper':
      return injectSaltPepperNoise(embeddings, config.intensity, config.seed);
    default:
      return embeddings;
  }
}

/**
 * Compute Signal-to-Noise Ratio (SNR)
 */
export function computeSNR(
  original: EmbeddingMap,
  noisy: EmbeddingMap
): number {
  const items = Array.from(original.keys());
  
  let signalPower = 0;
  let noisePower = 0;
  let count = 0;
  
  items.forEach(item => {
    const origVec = original.get(item)!;
    const noisyVec = noisy.get(item)!;
    
    origVec.forEach((val, i) => {
      signalPower += val * val;
      const noise = noisyVec[i] - val;
      noisePower += noise * noise;
      count++;
    });
  });
  
  if (noisePower === 0) return Infinity;
  
  const snr = 10 * Math.log10(signalPower / noisePower);
  return snr;
}
