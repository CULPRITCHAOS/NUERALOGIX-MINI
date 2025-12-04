/**
 * Topology Analysis Service
 * 
 * Implements computational geometry and graph-based topology analysis.
 * No ML, no heuristics - pure mathematics and statistics.
 * 
 * Features:
 * - kNN graph construction
 * - Graph geodesic distances
 * - Topology indicators (cluster entropy, connected components, cycles)
 * - Boundary sharpness and density variance
 * - Topology signature vectors
 */

import { Embedding, EmbeddingMap } from '../types';
import { euclideanDistance } from './mathService';

/**
 * Topology Signature - a structural fingerprint for embeddings
 */
export interface TopologySignature {
  ridgeSharpness: number;      // 0-1, how pronounced are peaks
  geodesicStretch: number;      // How much geodesic != Euclidean
  clusterEntropy: number;       // Shannon entropy of cluster distribution
  boundaryVariance: number;     // Variance at stability boundaries
  collapseSlope: number;        // Rate of quality degradation
  neighborVolatility: number;   // Neighborhood consistency
}

/**
 * Topology Indicators - structural properties of the embedding space
 */
export interface TopologyIndicators {
  clusterEntropy: number;       // Shannon entropy of density distribution
  connectedComponents: number;  // Number of disconnected subgraphs
  cycleCount: number;           // Approximate number of loops in graph
  boundarySharpness: number;    // How well-defined are cluster boundaries
  densityVariance: number;      // Variance in local point density
}

/**
 * Graph representation using adjacency list
 */
export interface Graph {
  nodes: string[];
  edges: Map<string, Map<string, number>>; // node -> (neighbor -> weight)
}

/**
 * Build k-nearest neighbor graph from embeddings
 */
export function buildKNNGraph(
  embeddings: EmbeddingMap,
  k: number
): Graph {
  const nodes = Array.from(embeddings.keys());
  const edges = new Map<string, Map<string, number>>();
  
  nodes.forEach(node => {
    const vec = embeddings.get(node)!;
    
    // Find k nearest neighbors
    const neighbors = nodes
      .filter(other => other !== node)
      .map(other => ({
        node: other,
        dist: euclideanDistance(vec, embeddings.get(other)!)
      }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, k);
    
    // Add edges
    const nodeEdges = new Map<string, number>();
    neighbors.forEach(n => {
      nodeEdges.set(n.node, n.dist);
    });
    
    edges.set(node, nodeEdges);
  });
  
  return { nodes, edges };
}

/**
 * Compute shortest path distance between two nodes using Dijkstra's algorithm
 */
export function computeShortestPath(
  graph: Graph,
  source: string,
  target: string
): number {
  if (source === target) return 0;
  
  const distances = new Map<string, number>();
  const visited = new Set<string>();
  
  // Initialize
  graph.nodes.forEach(node => {
    distances.set(node, node === source ? 0 : Infinity);
  });
  
  // Dijkstra's algorithm
  while (visited.size < graph.nodes.length) {
    // Find unvisited node with minimum distance
    let minDist = Infinity;
    let minNode: string | null = null;
    
    graph.nodes.forEach(node => {
      if (!visited.has(node) && distances.get(node)! < minDist) {
        minDist = distances.get(node)!;
        minNode = node;
      }
    });
    
    if (minNode === null || minDist === Infinity) break;
    
    visited.add(minNode);
    
    // Early exit
    if (minNode === target) break;
    
    // Update neighbors
    const nodeEdges = graph.edges.get(minNode);
    if (nodeEdges) {
      nodeEdges.forEach((weight, neighbor) => {
        const newDist = distances.get(minNode)! + weight;
        if (newDist < distances.get(neighbor)!) {
          distances.set(neighbor, newDist);
        }
      });
    }
  }
  
  return distances.get(target) || Infinity;
}

/**
 * Compute all-pairs shortest paths (Floyd-Warshall)
 * Returns distance matrix
 */
export function computeAllPairsShortestPaths(
  graph: Graph
): Map<string, Map<string, number>> {
  const dist = new Map<string, Map<string, number>>();
  
  // Initialize
  graph.nodes.forEach(i => {
    const row = new Map<string, number>();
    graph.nodes.forEach(j => {
      if (i === j) {
        row.set(j, 0);
      } else {
        const edgeWeight = graph.edges.get(i)?.get(j);
        row.set(j, edgeWeight !== undefined ? edgeWeight : Infinity);
      }
    });
    dist.set(i, row);
  });
  
  // Floyd-Warshall
  graph.nodes.forEach(k => {
    graph.nodes.forEach(i => {
      graph.nodes.forEach(j => {
        const current = dist.get(i)!.get(j)!;
        const alternative = dist.get(i)!.get(k)! + dist.get(k)!.get(j)!;
        if (alternative < current) {
          dist.get(i)!.set(j, alternative);
        }
      });
    });
  });
  
  return dist;
}

/**
 * Compute cluster entropy (Shannon entropy of density distribution)
 */
export function computeClusterEntropy(
  embeddings: EmbeddingMap,
  k: number = 5
): number {
  const nodes = Array.from(embeddings.keys());
  const n = nodes.length;
  
  if (n < k + 1) return 0;
  
  // Compute local density for each point (1 / avg distance to k neighbors)
  const densities: number[] = [];
  
  nodes.forEach(node => {
    const vec = embeddings.get(node)!;
    const distances = nodes
      .filter(other => other !== node)
      .map(other => euclideanDistance(vec, embeddings.get(other)!))
      .sort((a, b) => a - b)
      .slice(0, k);
    
    const avgDist = distances.reduce((sum, d) => sum + d, 0) / k;
    const density = avgDist > 0 ? 1 / avgDist : 0;
    densities.push(density);
  });
  
  // Bin densities into histogram
  const numBins = Math.min(10, Math.ceil(Math.sqrt(n)));
  const minDensity = Math.min(...densities);
  const maxDensity = Math.max(...densities);
  
  // Handle edge case where all densities are identical
  if (Math.abs(maxDensity - minDensity) < 1e-10) {
    return 0; // Perfect uniformity, zero entropy
  }
  
  const binWidth = (maxDensity - minDensity) / numBins;
  
  const histogram = new Array(numBins).fill(0);
  densities.forEach(d => {
    const binIdx = Math.min(numBins - 1, Math.floor((d - minDensity) / (binWidth + 1e-10)));
    histogram[binIdx]++;
  });
  
  // Compute Shannon entropy
  let entropy = 0;
  histogram.forEach(count => {
    if (count > 0) {
      const p = count / n;
      entropy -= p * Math.log2(p);
    }
  });
  
  return entropy;
}

/**
 * Find connected components in graph
 */
export function findConnectedComponents(graph: Graph): string[][] {
  const visited = new Set<string>();
  const components: string[][] = [];
  
  function dfs(node: string, component: string[]) {
    visited.add(node);
    component.push(node);
    
    const neighbors = graph.edges.get(node);
    if (neighbors) {
      neighbors.forEach((_, neighbor) => {
        if (!visited.has(neighbor)) {
          dfs(neighbor, component);
        }
      });
    }
  }
  
  graph.nodes.forEach(node => {
    if (!visited.has(node)) {
      const component: string[] = [];
      dfs(node, component);
      components.push(component);
    }
  });
  
  return components;
}

/**
 * Approximate cycle count using cycle basis estimation
 * Uses the formula: cycles ≈ edges - nodes + components
 */
export function approximateCycleCount(graph: Graph): number {
  const components = findConnectedComponents(graph);
  const numComponents = components.length;
  const numNodes = graph.nodes.length;
  
  // Count edges (each edge counted once)
  let numEdges = 0;
  const seenEdges = new Set<string>();
  
  graph.edges.forEach((neighbors, node) => {
    neighbors.forEach((_, neighbor) => {
      const edgeKey = [node, neighbor].sort().join('-');
      if (!seenEdges.has(edgeKey)) {
        seenEdges.add(edgeKey);
        numEdges++;
      }
    });
  });
  
  // Cycle basis size
  const cycles = Math.max(0, numEdges - numNodes + numComponents);
  
  return cycles;
}

/**
 * Compute boundary sharpness
 * Measures how well-defined cluster boundaries are
 */
export function computeBoundarySharpness(
  embeddings: EmbeddingMap,
  k: number = 5
): number {
  const nodes = Array.from(embeddings.keys());
  const n = nodes.length;
  
  if (n < k + 1) return 0;
  
  let totalSharpness = 0;
  
  nodes.forEach(node => {
    const vec = embeddings.get(node)!;
    
    // Find k and k+1 nearest neighbors
    const distances = nodes
      .filter(other => other !== node)
      .map(other => euclideanDistance(vec, embeddings.get(other)!))
      .sort((a, b) => a - b);
    
    if (distances.length >= k + 1) {
      const kthDist = distances[k - 1];
      const kPlusOneDist = distances[k];
      
      // Sharpness is the relative gap between k and k+1 neighbor
      const gap = kPlusOneDist - kthDist;
      const sharpness = gap / (kthDist + 1e-10);
      
      totalSharpness += sharpness;
    }
  });
  
  return totalSharpness / n;
}

/**
 * Compute density variance
 * Measures how uniform the point distribution is
 */
export function computeDensityVariance(
  embeddings: EmbeddingMap,
  k: number = 5
): number {
  const nodes = Array.from(embeddings.keys());
  const n = nodes.length;
  
  if (n < k + 1) return 0;
  
  // Compute local density for each point
  const densities: number[] = [];
  
  nodes.forEach(node => {
    const vec = embeddings.get(node)!;
    const distances = nodes
      .filter(other => other !== node)
      .map(other => euclideanDistance(vec, embeddings.get(other)!))
      .sort((a, b) => a - b)
      .slice(0, k);
    
    const avgDist = distances.reduce((sum, d) => sum + d, 0) / k;
    const density = avgDist > 0 ? 1 / avgDist : 0;
    densities.push(density);
  });
  
  // Compute variance
  const mean = densities.reduce((sum, d) => sum + d, 0) / n;
  const variance = densities.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / n;
  
  return variance;
}

/**
 * Compute all topology indicators
 */
export function computeTopologyIndicators(
  embeddings: EmbeddingMap,
  k: number = 5
): TopologyIndicators {
  const graph = buildKNNGraph(embeddings, k);
  const components = findConnectedComponents(graph);
  
  return {
    clusterEntropy: computeClusterEntropy(embeddings, k),
    connectedComponents: components.length,
    cycleCount: approximateCycleCount(graph),
    boundarySharpness: computeBoundarySharpness(embeddings, k),
    densityVariance: computeDensityVariance(embeddings, k),
  };
}

/**
 * Compute geodesic stretch factor
 * Ratio of geodesic to Euclidean distance
 */
export function computeGeodesicStretch(
  embeddings: EmbeddingMap,
  k: number = 5,
  sampleSize: number = 20
): number {
  const nodes = Array.from(embeddings.keys());
  const n = nodes.length;
  
  if (n < k + 1) return 1.0;
  
  const graph = buildKNNGraph(embeddings, k);
  const sampledNodes = nodes.slice(0, Math.min(n, sampleSize));
  
  let totalStretch = 0;
  let pairCount = 0;
  
  for (let i = 0; i < sampledNodes.length; i++) {
    for (let j = i + 1; j < sampledNodes.length; j++) {
      const node1 = sampledNodes[i];
      const node2 = sampledNodes[j];
      
      const geoDist = computeShortestPath(graph, node1, node2);
      const eucDist = euclideanDistance(embeddings.get(node1)!, embeddings.get(node2)!);
      
      if (eucDist > 0 && geoDist < Infinity) {
        totalStretch += geoDist / eucDist;
        pairCount++;
      }
    }
  }
  
  return pairCount > 0 ? totalStretch / pairCount : 1.0;
}

/**
 * Compute neighbor volatility
 * Measures how much neighborhoods change under small perturbations
 */
export function computeNeighborVolatility(
  original: EmbeddingMap,
  perturbed: EmbeddingMap,
  k: number = 5
): number {
  const nodes = Array.from(original.keys());
  const n = nodes.length;
  
  if (n < k + 1) return 0;
  
  let totalVolatility = 0;
  
  nodes.forEach(node => {
    const origVec = original.get(node)!;
    const pertVec = perturbed.get(node)!;
    
    // Find k nearest neighbors in original
    const origNeighbors = nodes
      .filter(other => other !== node)
      .map(other => ({
        node: other,
        dist: euclideanDistance(origVec, original.get(other)!)
      }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, k)
      .map(n => n.node);
    
    // Find k nearest neighbors in perturbed
    const pertNeighbors = nodes
      .filter(other => other !== node)
      .map(other => ({
        node: other,
        dist: euclideanDistance(pertVec, perturbed.get(other)!)
      }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, k)
      .map(n => n.node);
    
    // Compute Jaccard distance (1 - Jaccard similarity)
    const intersection = origNeighbors.filter(n => pertNeighbors.includes(n)).length;
    const volatility = 1 - (intersection / k);
    
    totalVolatility += volatility;
  });
  
  return totalVolatility / n;
}

/**
 * Compute topology signature for an embedding space
 */
export function computeTopologySignature(
  embeddings: EmbeddingMap,
  options: {
    k?: number;
    sampleSize?: number;
    perturbedEmbeddings?: EmbeddingMap;
    ridgeSharpness?: number;
    collapseSlope?: number;
  } = {}
): TopologySignature {
  const k = options.k || 5;
  const sampleSize = options.sampleSize || 20;
  
  const geodesicStretch = computeGeodesicStretch(embeddings, k, sampleSize);
  const clusterEntropy = computeClusterEntropy(embeddings, k);
  const boundaryVariance = computeDensityVariance(embeddings, k);
  
  const neighborVolatility = options.perturbedEmbeddings
    ? computeNeighborVolatility(embeddings, options.perturbedEmbeddings, k)
    : 0;
  
  return {
    ridgeSharpness: options.ridgeSharpness || 0,
    geodesicStretch,
    clusterEntropy,
    boundaryVariance,
    collapseSlope: options.collapseSlope || 0,
    neighborVolatility,
  };
}
