# NeuraLogix Mini Lab 🔬

> **A High-Dimensional Topology Research Sandbox**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tech Stack](https://img.shields.io/badge/Stack-React_|_Vite_|_Tailwind-blue)](https://reactjs.org/)
[![AI Provider](https://img.shields.io/badge/AI-Gemini_&_Ollama-purple)](https://ai.google.dev/)

NeuraLogix Mini Lab is an interactive environment for studying the topology of AI vector embeddings. It allows researchers to generate embeddings (Text or Image), apply different compression algorithms ("Cluster-based" vs. "Lattice-based"), and visualize the resulting semantic distortion.

The tool is designed to identify the **"Efficiency Frontier"**—the specific compression parameters where data size is minimized while semantic meaning remains intact.

---

## 🧪 The Science: What are we testing?

Most vector databases compress data using Scalar Quantization (reducing precision). This lab tests a different hypothesis based on **Lattice Theory**:

1.  **Semantic Efficiency:** A custom metric calculated as `Cosine Similarity / (1 + Mean Squared Error)`. It finds the "sweet spot" where the compression grid aligns perfectly with the data's natural clusters.
2.  **Lattice Stability Index (LSI):** Measures how well the relative distances between "concepts" (e.g., Cat vs. Dog) are preserved after snapping them to a rigid grid.
3.  **Vector Collisions:** When two distinct concepts map to the exact same coordinate in compressed space, a "collision" occurs. This lab visually flags these catastrophic failures.

---

### Some Results 

On a mixed natural-language corpus, NeuraLogix-Mini achieves stable compression in the regime grid ∈ [0.05, 0.10], k ∈ [6,10], with LSI ≈ 0.61 and cosine ≈ 0.61 at ~70% size reduction. Beyond grid ≥ 0.25, LSI collapses toward 0 across all k, indicating a hard stability boundary where lattice quantization overwhelms semantic structure.

Running the identical grid/k sweep on an image corpus reveals the same ridge and boundary, but at higher absolute LSI (≈0.89) and semanticEfficiency (≈3,000), suggesting that vision embeddings admit more aggressive compression before topological failure while still sharing the same continuity–abstraction landscape.

"For an image dataset of N items, NeuraLogix-Mini achieved ~73% compression with LSI≈0.89 and cosine≈0.89 at grid=0.05, k=10; beyond grid≥0.25, LSI collapses, establishing a clear stability boundary."

---

## 🚀 Features

### Phase 1: Core Compression & Visualization
*   **Multi-Modal Analysis:** Embed **Text** (with noise injection) or **Images** (via Vision models).
*   **Dual AI Engine:**
    *   ☁️ **Google Gemini:** High-speed, high-quality embeddings via the Cloud.
    *   🏠 **Ollama (Local):** Privacy-focused, offline embeddings running on your own hardware.
*   **3D Topology Surface:** A dynamic 3D plot visualizing the trade-off between Continuity (Grid Step) and Abstraction (K-Means Clusters).
*   **Collision Detection:** Automatically detects and lists items that have lost their distinctiveness.
*   **Mobile Lab:** Fully responsive design allowing you to control the experiment from a phone while running the compute on a laptop.

### Phase 2: Semantic Stability Engine 🆕
*   **Baseline Compression Comparison:** 
    *   Scalar Quantization (4-bit, 8-bit)
    *   Product Quantization (PQ) with configurable subvectors
    *   Side-by-side performance comparison with lattice-based methods
*   **Advanced Distortion Analytics:**
    *   Pairwise distance distortion measurement
    *   k-NN neighborhood overlap preservation
    *   Collapse ratio tracking (points beyond tolerance)
    *   Cluster drift scoring
    *   Local density change detection
    *   Triangle distortion score (geodesic proxy)
*   **Stability Boundary Detection:**
    *   Automatic ridge line detection (local maxima in parameter space)
    *   Collapse cliff identification (where LSI → 0)
    *   Three-zone classification: Stable / Degradation / Collapse
    *   Visual heatmap with overlay annotations
*   **Validation Experiment Pipeline:**
    *   Pre-configured validation experiments
    *   Batch parameter sweep execution
    *   JSON/CSV export for reproducibility
    *   Metadata tracking and result persistence
*   **Scientific Export Tools:**
    *   Replayable experiment configurations
    *   Structured data export (JSON, CSV)
    *   Complete metadata preservation

### Phase 3: Topological Collapse Engine 🚀🆕
*   **Dynamic Thresholding:**
    *   Inflection point analysis for automatic threshold detection
    *   Standard deviation clustering for natural tier identification
    *   No more hardcoded constants—adapts to each dataset
*   **Advanced Geodesic Metrics:**
    *   Triangle Distortion Score: Triangle inequality violations
    *   t-SNE Geodesic Distortion: Local neighborhood preservation
    *   Graph Geodesic Distortion: True manifold distance analysis via k-NN graphs
*   **Topology Analysis:**
    *   Cluster entropy (Shannon entropy of density distribution)
    *   Connected components detection
    *   Cycle counting (loop detection in graphs)
    *   Boundary sharpness measurement
    *   Density variance analysis
*   **Stability Confidence Scoring:**
    *   **"I'm 72% confident this region is real"**
    *   Ridge sharpness analysis
    *   Cliff steepness measurement
    *   Neighbor continuity scoring
    *   Metric consistency validation
*   **Collapse Phase Detection:**
    *   Slope change detection (first derivative)
    *   Curvature analysis (second derivative)
    *   Phase transition identification (ridge → degradation → collapse)
    *   No thresholds—physics-style analysis
*   **Topology Signature Vectors:**
    *   Structural fingerprints for each compression method
    *   Enables method comparison and dataset characterization
    *   Includes: ridge sharpness, geodesic stretch, cluster entropy, boundary variance, collapse slope, neighbor volatility
*   **Synthetic Shape Testbed:**
    *   Rings, spirals, Swiss rolls, layered manifolds
    *   Known topology for validation
    *   Noise injection for robustness testing
*   **Noise Sensitivity Testing:**
    *   Gaussian, uniform, and salt-pepper noise injection
    *   Ridge stability verification
    *   Threshold drift detection
    *   Metric monotonicity validation

---

## 🛠️ Installation & Setup

### Prerequisites

*   **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
*   **npm** (comes with Node.js) or **yarn**
*   **API Key for Google Gemini** (Optional, but recommended) - [Get API Key](https://ai.google.dev/)
*   **Ollama** (Optional, for local AI) - [Download](https://ollama.com)

### 1. Clone the Repository

```bash
git clone https://github.com/CULPRITCHAOS/NUERALOGIX-MINI.git
cd NUERALOGIX-MINI
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory by copying the example:

```bash
cp .env.example .env
```

Then edit `.env` and add your Google Gemini API key:

```env
# Required for Google Gemini Provider
# Note: VITE_ prefix is required for Vite to expose the variable to the client
VITE_GEMINI_API_KEY=your_google_gemini_api_key_here
```

> **Note:** If you only plan to use Ollama (local AI), you can skip the API key configuration.

### 4. Run Development Server

```bash
npm run dev
```

Open your browser and navigate to `http://localhost:5173`

### 5. Build for Production

```bash
npm run build
```

The production-ready files will be generated in the `dist/` directory.

### 6. Preview Production Build

```bash
npm run preview
```

---

## 🏠 Using Local AI (Ollama)

You can run this lab entirely offline using Ollama for privacy-focused, local embeddings.

### Step 1: Install Ollama

Download and install Ollama from [ollama.com](https://ollama.com).

### Step 2: Pull Required Models

```bash
# For Text Embeddings
ollama pull nomic-embed-text

# For Vision/Image Description
ollama pull llava
```

### Step 3: Enable CORS

By default, browser security blocks websites from communicating with local servers. You must run Ollama with CORS enabled.

**Mac/Linux:**
```bash
OLLAMA_ORIGINS="*" ollama serve
```

**Windows (PowerShell):**
```powershell
$env:OLLAMA_ORIGINS="*"; ollama serve
```

**Windows (Command Prompt):**
```cmd
set OLLAMA_ORIGINS=* && ollama serve
```

### Step 4: Connect in the App

1. Open the Lab in your browser
2. Click the **Settings** icon (Gear Icon)
3. Select **Ollama** as your AI Provider
4. Click **"Test Connection"** to verify it's working

---

## 📱 Mobile / LAN Access

To access the lab from your phone or another device on the same Wi-Fi network:

### Step 1: Run with Host Flag

```bash
npm run dev -- --host
```

### Step 2: Note the Network URL

Check your terminal for the Network URL (e.g., `http://192.168.1.5:5173`)

### Step 3: Configure on Mobile Device

1. Open that URL on your phone or device
2. If using Ollama, go to **Settings**
3. Change **Base URL** from `localhost` to your computer's IP (e.g., `http://192.168.1.5:11434`)
4. Click **"Test Connection"**

---

## 🎯 How to Use Phase 2 Features

### Running Validation Experiments

1. **Generate embeddings** for your dataset (Text or Image)
2. Scroll to the **"Validation Experiments"** panel
3. Select one of the pre-configured experiments:
   - **Stability Region Existence**: Tests for stable compression zones
   - **Aggressive Grid Forcing Failure**: Demonstrates collapse under extreme settings
   - **Modality Comparison**: Compares text vs. vision embedding behavior
4. Click **"Run Experiment"** to execute the batch sweep
5. Export results as **JSON** or **CSV** for external analysis

### Comparing Compression Methods

1. After generating embeddings, navigate to **"Compression Method Comparison"**
2. Select compression methods to compare (mix of NeuraLogix lattice methods and baselines)
3. Click **"Run Comparison"** to execute all methods
4. Review the comparison table showing LSI, cosine similarity, kNN overlap, and collapse ratio
5. The best-performing method is automatically highlighted

### Analyzing Distortion Metrics

The **Distortion Metrics Panel** automatically computes six complementary metrics whenever you compress embeddings:

- **Lower is better**: Pairwise Distortion, Collapse Ratio, Cluster Drift, Density Change, Geodesic Distortion
- **Higher is better**: Neighborhood Overlap (aim for >90%)

Use these metrics to understand **where** and **how** compression fails, not just that it fails.

### Stability Zone Visualization

After running the **"Continuity-Abstraction Surface"** sweep:

1. The **Stability Heatmap** automatically appears
2. Three zones are color-coded:
   - 🟢 **Green (Stable)**: LSI ≥ 0.5 - Safe compression range
   - 🟠 **Orange (Degradation)**: 0.2 ≤ LSI < 0.5 - Quality loss acceptable for some use cases
   - 🔴 **Red (Collapse)**: LSI < 0.2 - Semantic structure destroyed
3. The **blue ridge line** shows optimal parameters across grid steps
4. **Red ✕** markers indicate the collapse cliff where all configurations fail

### Ridge Line Overlay on 3D Surface

The LSI surface plot now includes an **automatic ridge line overlay** (blue line):

- Ridge points are **local maxima** of LSI for each grid step
- Follow the ridge to find the efficiency frontier
- Peaks indicate parameter combinations with best quality/compression tradeoff

---

## 🔬 Phase 2: Scientific Methodology

Phase 2 transforms NeuraLogix from a visualization tool into a rigorous scientific experimentation platform. The focus is on **measurable structure deformation** and **boundary detection**.

### Distortion Metrics

NeuraLogix Phase 2 implements six complementary distortion metrics to capture different aspects of semantic collapse:

1. **Pairwise Distance Distortion**: Measures average relative change in distances between all point pairs. Lower values indicate better distance preservation.

2. **Neighborhood Overlap**: Computes Jaccard similarity of k-nearest neighbors before and after compression. Values close to 1.0 indicate strong topological preservation.

3. **Collapse Ratio**: Fraction of points that moved beyond tolerance threshold (ε). Detects catastrophic local failures even when global metrics look acceptable.

4. **Cluster Drift Score**: Normalized displacement of the data centroid. Measures whether compression introduces systematic bias.

5. **Local Density Change**: Tracks changes in average k-NN distances per point. Reveals whether compression artificially densifies or spreads the space.

6. **Geodesic Distortion**: Uses triangle inequality violations as a proxy for geodesic path distortion. Critical for understanding manifold deformation.

### Stability Boundary Detection

The system automatically identifies three regions in parameter space:

- **Stable Zone** (LSI ≥ 0.5): Compression preserves semantic structure with minimal distortion
- **Degradation Zone** (0.2 ≤ LSI < 0.5): Noticeable quality loss but usable compression
- **Collapse Zone** (LSI < 0.2): Semantic structure has collapsed; compression unusable

The **ridge line** represents local maxima of LSI across grid steps—the efficiency frontier where compression achieves optimal quality/size tradeoff.

### Validation Experiments

Three pre-configured validation experiments verify the scientific rigor of the platform:

1. **Stability Region Existence**: Proves that a stable compression region exists in parameter space
2. **Aggressive Grid Forcing Failure**: Demonstrates failure modes under extreme compression
3. **Modality Comparison**: Shows different stability thresholds between text and vision embeddings

All experiments are **deterministic** and **reproducible** with complete metadata tracking.

### Compression Baseline Comparison

Phase 2 includes standard compression baselines for scientific comparison:

- **Scalar Quantization**: Reduces precision uniformly across all dimensions (4-bit, 8-bit)
- **Product Quantization (PQ)**: Splits vectors into subvectors and quantizes each separately (8×256, 16×256)

These baselines allow objective evaluation of whether lattice-based methods offer advantages in specific regimes.

---

## 🧬 Phase 3: Topology Laboratory

Phase 3 elevates NeuraLogix from **metric analysis** to **topology analysis**. Instead of just measuring numeric degradation, Phase 3 reveals the **topological structure** of embedding spaces and detects **phase transitions** in compression quality.

### Core Philosophy: No ML, No Heuristics

Phase 3 uses pure mathematics, statistics, and computational geometry:
- **Dijkstra's algorithm** for geodesic distances
- **Shannon entropy** for cluster analysis  
- **Numerical derivatives** for phase detection
- **Graph theory** for connectivity analysis

### Key Features

#### 1. Dynamic Thresholding

Replaces hardcoded LSI thresholds (0.5, 0.2) with **adaptive thresholds** computed for each dataset:

- **Inflection Point Analysis**: Uses second derivative to find natural breakpoints in LSI curves
- **Standard Deviation Clustering**: Identifies performance tiers based on data distribution

**Result**: Thresholds adapt to your data instead of using one-size-fits-all values.

#### 2. Graph-Based Geodesic Analysis

True manifold distance measurement via k-nearest neighbor graphs:

- **Triangle Distortion Score**: Triangle inequality violations (proxy for geodesic distortion)
- **t-SNE Geodesic Distortion**: Local neighborhood preservation (inspired by t-SNE)
- **Graph Geodesic Distortion**: Shortest path distances on k-NN graphs compared to Euclidean distances

**Why it matters**: Reveals whether compression breaks the manifold structure, not just point positions.

#### 3. Topology Indicators

Structural properties of the embedding space:

- **Cluster Entropy**: Shannon entropy of density distribution
- **Connected Components**: Number of disconnected subgraphs  
- **Cycle Count**: Approximate loop detection
- **Boundary Sharpness**: How well-defined are cluster boundaries
- **Density Variance**: Uniformity of point distribution

#### 4. Stability Confidence Score

The system now says: **"I'm 72% confident this region is real."**

Combines four factors:
1. **Ridge Sharpness** (0-1): How pronounced is the peak?
2. **Cliff Steepness** (0-1): How rapidly does LSI drop?
3. **Neighbor Continuity** (0-1): Is the surface smooth?
4. **Metric Consistency** (0-1): Do different metrics agree?

**Output**: Confidence percentage + human-readable explanation

#### 5. Collapse Phase Detection

Physics-style **phase transition** detection instead of thresholds:

- **Slope Change Detection**: First derivative of LSI curve
- **Curvature Analysis**: Second derivative (three-point stencil)
- **Transition Classification**:
  - `ridge-to-degradation`: Gentle decline
  - `degradation-to-collapse`: Moderate decline  
  - `cliff`: Rapid collapse

**Advantage**: Detects phase transitions automatically without arbitrary cutoffs.

#### 6. Topology Signature Vectors

A **structural fingerprint** for each compression run:

```
TopologySignature = {
  ridgeSharpness: 0.83,      // Peak prominence
  geodesicStretch: 1.42,     // Manifold distortion
  clusterEntropy: 2.15,      // Density distribution
  boundaryVariance: 0.0032,  // Point spread
  collapseSlope: 0.18,       // Degradation rate
  neighborVolatility: 0.21   // Neighborhood stability
}
```

**Use cases**:
- Compare compression methods
- Fingerprint datasets
- Detect model style

#### 7. Synthetic Shape Testbed

Generate datasets with **known topology** for validation:

- **Rings**: 1D circular manifolds (one loop)
- **Spirals**: 1D helical curves (no loops)
- **Swiss Roll**: 2D manifold in 3D (classic benchmark)
- **Layered Manifolds**: Stacked 2D planes (multiple components)
- **Clusters**: Gaussian clusters (discrete structure)

**Purpose**: Verify metrics correctly identify known topological structures.

#### 8. Noise Sensitivity Testing

Tests whether your results are **robust**:

- Inject Gaussian, uniform, or salt-pepper noise
- Verify ridge positions remain stable
- Check threshold drift is minimal
- Confirm metric monotonicity

**Critical**: If noise breaks the ridge → model is not robust.

### Validation Experiments

Phase 3 adds two new validation experiments:

1. **val-004-noise-sensitivity**: Tests robustness under controlled noise injection
2. **val-005-topology-analysis**: Comprehensive topology indicators and geodesic analysis

---

## 📊 Understanding the Charts

### 1. PCA Projection (Scatter Plot)

A 2D simplification of the 768-dimensional embedding space.

*   **Dots:** Data points representing concepts
*   **Colors:** In compressed view, dots snap to a grid
*   **Goal:** Preserve the overall "shape" of clusters between Original and Compressed views

### 2. Continuity-Abstraction Surface (3D Map)

The master control for compression research.

*   **X-Axis (Grid Step):** How coarse the lattice quantization is
*   **Y-Axis (K-Value):** Number of clusters (level of abstraction)
*   **Z-Axis (Height):** Lattice Stability Index (LSI) score
*   **Ridge Line:** Green peaks represent the most efficient compression settings

---

## 📁 Project Structure

```
NUERALOGIX-MINI/
├── .github/
│   └── workflows/
│       └── deploy.yml              # GitHub Pages deployment
├── src/
│   ├── components/                 # React components
│   │   ├── AnalysisPanel.tsx
│   │   ├── ContinuityAbstractionSurface.tsx  # 3D surface with ridge overlay
│   │   ├── EmbeddingChart.tsx
│   │   ├── EmbeddingTable.tsx
│   │   ├── ExperimentResults.tsx
│   │   ├── ImageUploader.tsx
│   │   ├── SettingsModal.tsx
│   │   ├── WelcomeModal.tsx
│   │   ├── DistortionMetricsPanel.tsx      # Phase 2: Distortion analytics UI
│   │   ├── CompressionComparisonPanel.tsx  # Phase 2: Baseline comparison UI
│   │   ├── StabilityHeatmapPanel.tsx       # Phase 2: Stability zones visualization
│   │   ├── ExperimentRunnerPanel.tsx       # Phase 2: Validation experiments UI
│   │   ├── TopologyMetricsPanel.tsx        # Phase 3: Topology indicators & confidence UI
│   │   └── icons.tsx
│   ├── services/                   # Core business logic
│   │   ├── providers/
│   │   │   ├── GoogleProvider.ts
│   │   │   ├── OllamaProvider.ts
│   │   │   └── types.ts
│   │   ├── aiService.ts
│   │   ├── analysisService.ts
│   │   ├── compressionService.ts
│   │   ├── embeddingService.ts
│   │   ├── mathService.ts
│   │   ├── baselineCompressionService.ts   # Phase 2: Scalar/PQ baselines
│   │   ├── distortionService.ts            # Phase 2/3: Distortion & geodesic metrics
│   │   ├── stabilityBoundaryService.ts     # Phase 2/3: Dynamic thresholds & ridge detection
│   │   ├── stabilityConfidenceService.ts   # Phase 3: Confidence scoring
│   │   ├── topologyService.ts              # Phase 3: Graph geodesics & topology indicators
│   │   ├── collapsePhaseService.ts         # Phase 3: Phase transition detection
│   │   ├── syntheticDataService.ts         # Phase 3: Synthetic shape datasets
│   │   └── noiseService.ts                 # Phase 3: Noise injection & SNR
│   ├── experiments/                # Phase 2: Experiment pipeline
│   │   ├── types.ts                # Experiment configuration types
│   │   └── experimentRunner.ts     # Batch sweep execution & export
│   ├── data/                       # Phase 2: Persistent storage
│   │   ├── runs/                   # Experiment run data
│   │   ├── experiments/            # Experiment configurations
│   │   └── results/                # Exported results
│   ├── features/                   # Feature modules
│   │   └── semanticMesh/           # Semantic mesh visualization
│   ├── App.tsx                     # Main application component
│   ├── constants.ts                # App-wide constants
│   ├── index.css                   # Global styles
│   ├── index.tsx                   # Application entry point
│   └── types.ts                    # TypeScript type definitions
├── .env.example                    # Environment variables template
├── .gitignore                      # Git ignore rules
├── index.html                      # HTML template
├── package.json                    # npm dependencies and scripts
├── tsconfig.json                   # TypeScript configuration
├── vite.config.ts                  # Vite build configuration
├── PHASE2_IMPLEMENTATION.md        # Phase 2 technical documentation
├── PHASE3_IMPLEMENTATION.md        # Phase 3 technical documentation
└── README.md                       # This file
```

---

## 🧑‍💻 Development

### Available Scripts

*   `npm run dev` - Start development server
*   `npm run build` - Build for production
*   `npm run preview` - Preview production build locally

### Technologies Used

*   **React 19** - UI framework
*   **TypeScript** - Type safety
*   **Vite** - Build tool and dev server
*   **Tailwind CSS** - Utility-first CSS framework
*   **Chart.js** - 2D charting library
*   **Plotly.js** - 3D visualization library
*   **Google Generative AI SDK** - Gemini API integration

---

## 🤝 Contributing

This is a research project. We welcome contributions regarding:

*   New mathematical metrics for semantic fidelity
*   Support for additional Vector Stores (Pinecone, Milvus, etc.)
*   Visualization improvements
*   Performance optimizations
*   Bug fixes and documentation improvements

### How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

MIT License

Copyright (c) 2025 Robert Culp (CULPRITCHAOS)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

**Commercial use beyond prototyping or research requires explicit written permission from the author.**

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

---

## 🙏 Acknowledgments

*   Google AI for the Gemini API
*   Ollama team for local AI capabilities
*   The open-source community for the amazing tools and libraries

---

## 📞 Support

For issues, questions, or suggestions:

*   **GitHub Issues:** [Create an issue](https://github.com/CULPRITCHAOS/NUERALOGIX-MINI/issues)
*   **Author:** Robert Culp (CULPRITCHAOS)

---

**Happy Researching! 🔬✨**
