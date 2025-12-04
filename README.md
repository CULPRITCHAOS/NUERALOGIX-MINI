# NeuraLogix Mini Lab

> **An Experimental Research Tool for Vector Embedding Compression Analysis**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tech Stack](https://img.shields.io/badge/Stack-React_|_Vite_|_Tailwind-blue)](https://reactjs.org/)
[![AI Provider](https://img.shields.io/badge/AI-Gemini_&_Ollama-purple)](https://ai.google.dev/)

NeuraLogix Mini Lab is an interactive environment for studying compression of AI vector embeddings. It generates embeddings (text or image), applies compression algorithms (grid quantization, k-means clustering), and measures the resulting distortion using multiple metrics.

**Purpose:** Educational research tool for exploring compression-quality tradeoffs  
**Not for:** Production use or publishable research without additional validation

---

## ⚠️ Validation Status

See [VERIFICATION_REPORT.md](VERIFICATION_REPORT.md) for full details.

| Feature Category | Status | Limitations |
|-----------------|--------|-------------|
| **Core Compression** | ✅ Verified | Grid quantization and k-means work as expected |
| **Basic Metrics** | ✅ Verified | Pairwise distortion, neighborhood overlap validated |
| **Structural Analysis** | ⚠️ Partial | Graph-based heuristics, not true topology |
| **Stability Heuristic** | ⚠️ Heuristic | Weighted indicator, not statistical confidence |
| **Dynamic Thresholds** | ⚠️ Experimental | Works on synthetic data, needs real-world validation |
| **Graph Path Analysis** | ❌ Limited | k-NN graphs ≠ true manifold geodesics |

**Key Limitations:**
- Structural Fingerprint is NOT a topological signature (lacks persistent homology)
- Stability Heuristic is NOT a confidence interval (it's a quality indicator)
- Graph Path Distortion uses k-NN approximations, not true geodesics
- No statistical testing, confidence intervals, or cross-validation
- Validated only on synthetic datasets, not real-world embeddings

---

## 🧪 What This Tool Measures

This lab tests compression strategies by measuring semantic structure preservation:

1.  **Lattice Stability Index (LSI):** Measures preservation of relative distances after grid quantization
2.  **Semantic Efficiency:** Ratio of cosine similarity to reconstruction error
3.  **Collision Detection:** Identifies when distinct vectors map to identical compressed coordinates

**Baseline Comparisons:**
- Scalar Quantization (4-bit, 8-bit precision reduction)
- Product Quantization (PQ with configurable subvectors)

---

### Observed Behavior

**Observation 1 - Stability Regions Exist:**  
On a mixed natural-language corpus, stable compression occurs at grid ∈ [0.05, 0.10], k ∈ [6,10], with LSI ≈ 0.61 at ~70% size reduction. Beyond grid ≥ 0.25, LSI drops toward 0, indicating a hard boundary where quantization overwhelms semantic structure.

**Observation 2 - Modality Differences:**  
Vision embeddings show higher LSI (≈0.89) at similar compression ratios, suggesting different density distributions or cluster properties compared to text embeddings.

**Interpretation:** These observations suggest compression tolerance varies by embedding modality, but require validation on diverse datasets before generalization.

See [NOVEL_FINDINGS.md](NOVEL_FINDINGS.md) for detailed experimental log.

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

### Phase 3: Structural Analysis Tools
*   **Dynamic Thresholding:**
    *   Inflection point analysis for threshold detection
    *   Standard deviation-based tier identification
    *   Adapts to dataset characteristics (experimental)
*   **Graph-Based Distortion Metrics:**
    *   Triangle Distortion Score: Triangle inequality violation detection
    *   Local Neighborhood Distortion: t-SNE-inspired preservation metric
    *   Graph Path Distortion: k-NN graph shortest paths (NOT true geodesics)
*   **Structural Indicators:**
    *   Cluster entropy (Shannon entropy of density distribution)
    *   Connected components detection (DFS on k-NN graph)
    *   Cycle counting (approximate loop detection, not exact cycle basis)
    *   Boundary sharpness (heuristic measure)
    *   Density variance (standard statistical measure)
*   **Stability Heuristic:**
    *   Weighted structural quality indicator (0-100%)
    *   **NOT a statistical confidence interval**
    *   Components: ridge sharpness, cliff steepness, neighbor continuity, metric consistency
    *   Interpretation: "72%" means 72% of quality indicators are positive
*   **Collapse Phase Detection:**
    *   Slope change detection (numerical first derivative)
    *   Curvature analysis (numerical second derivative)
    *   Heuristic phase classification (ridge → degradation → collapse)
*   **Structural Fingerprints:**
    *   Combined metric vectors for compression method comparison
    *   **NOT topological signatures** (lacks persistent homology/spectral methods)
    *   Components: ridge sharpness, graph path stretch, cluster entropy, variance, slope
*   **Synthetic Shape Testbed:**
    *   Rings, spirals, Swiss rolls, layered manifolds, clusters
    *   Known graph properties for validation
    *   Noise injection for robustness testing
*   **Noise Sensitivity Testing:**
    *   Gaussian, uniform, and salt-pepper noise injection
    *   Ridge stability verification (experimental)
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

## 🧬 Phase 3: Structural Analysis

Phase 3 adds graph-based structural analysis beyond basic distortion metrics.

### Methodology

Uses computational geometry and graph algorithms (no machine learning):
- **Dijkstra's algorithm** for k-NN graph shortest paths
- **Shannon entropy** for density distribution analysis
- **Numerical derivatives** for trend detection
- **Graph theory** (DFS) for connectivity analysis

**Important:** This is graph-based structural analysis, NOT topology in the mathematical sense (which would require persistent homology or spectral methods).

### Key Components

#### 1. Dynamic Thresholding (Experimental)

Adaptive thresholds computed from data distribution:

- **Inflection Point Analysis**: Numerical second derivative to find LSI curve breakpoints
- **Standard Deviation-Based Tiers**: Identifies performance clusters

**Limitation:** Validated only on synthetic data, not real-world embeddings. Threshold selection remains somewhat arbitrary.

#### 2. Graph-Based Distance Approximations

k-NN graph analysis for structural distortion:

- **Triangle Distortion Score**: Counts triangle inequality violations
- **Local Neighborhood Distortion**: t-SNE-inspired local distance preservation (heuristic)
- **Graph Path Distortion**: Shortest paths on k-NN graphs vs Euclidean distance

**Critical Limitation:** k-NN graph paths are NOT true manifold geodesics. This is an approximation that assumes data lies on a low-dimensional manifold, which may not be valid.

#### 3. Structural Indicators

Graph-based structural properties:

- **Cluster Entropy**: Shannon entropy of k-NN density distribution
- **Connected Components**: Disconnected subgraph count via DFS
- **Cycle Count**: Approximate (edges - nodes + components), not exact cycle basis
- **Boundary Sharpness**: k-NN distance gap heuristic
- **Density Variance**: Standard deviation of k-NN densities

#### 4. Stability Heuristic

Weighted quality indicator (NOT a statistical confidence interval):

Combines four factors:
1. **Ridge Sharpness** (0-1): Peak prominence vs neighbors
2. **Cliff Steepness** (0-1): Maximum gradient at boundaries
3. **Neighbor Continuity** (0-1): Surface smoothness (low variance)
4. **Metric Consistency** (0-1): Agreement between metrics

**Output:** Percentage + explanation  
**Interpretation:** "72%" means 72% of quality indicators are positive, NOT a probability or confidence interval

#### 5. Collapse Phase Detection (Experimental)

Numerical derivative-based trend classification:

- **Slope Change Detection**: Numerical first derivative
- **Curvature Analysis**: Numerical second derivative (three-point stencil)
- **Heuristic Classification:**
  - `ridge-to-degradation`: Gentle decline
  - `degradation-to-collapse`: Moderate decline  
  - `cliff`: Rapid collapse

**Limitation:** Uses arbitrary curvature thresholds (1.5x, 2.0x multipliers). No validation that these correspond to meaningful phase transitions.

#### 6. Structural Fingerprints

Combined metric vectors for comparison (NOT topological signatures):

```
StructuralFingerprint = {
  ridgeSharpness: 0.83,      // Peak prominence
  graphPathStretch: 1.42,    // k-NN path/Euclidean ratio
  clusterEntropy: 2.15,      // Density Shannon entropy
  boundaryVariance: 0.0032,  // Point spread variance
  collapseSlope: 0.18,       // Degradation rate
  neighborVolatility: 0.21   // Neighborhood consistency
}
```

**Use cases:** Qualitative comparison of compression methods  
**Limitation:** Not a topological signature (lacks persistent homology/spectral analysis)

#### 7. Synthetic Shape Testbed

Datasets with known graph properties for validation:

- **Rings**: 1D circular structures (detectable cycles)
- **Spirals**: 1D curves (no cycles)
- **Swiss Roll**: 2D structure in 3D space
- **Layered Manifolds**: Stacked structures (multiple components)
- **Clusters**: Gaussian blobs (discrete structure)

**Purpose:** Validate that graph algorithms correctly identify structural properties  
**Limitation:** Validation on synthetic data only; real embeddings may behave differently

#### 8. Noise Sensitivity Testing (Experimental)

Robustness testing via noise injection:

- Gaussian, uniform, or salt-pepper noise injection
- Ridge position stability measurement
- Threshold drift quantification
- Metric monotonicity verification

**Status:** Framework implemented but limited validation

### Test Results

See [VERIFICATION_REPORT.md](VERIFICATION_REPORT.md) for complete test results.

**Validated (Synthetic Data):**
- ✅ Monotonicity: Increased compression → increased distortion
- ✅ Ring detection: Cycles identified correctly
- ✅ Swiss Roll: Single component detected
- ✅ Cluster separation: Non-uniform density confirmed
- ✅ Collapse detection: Extreme compression triggers metrics
- ⚠️ Noise sensitivity: Partial validation
- ✅ Stable compression: Mild settings preserve structure

**Not Tested:**
- Real-world text/image embeddings
- Cross-validation of stability regions
- Comparison with production systems
- Statistical significance of findings

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
├── VERIFICATION_REPORT.md          # Scientific audit and validation status
├── NOVEL_FINDINGS.md               # Experimental observations log
└── README.md                       # This file
```

---

## ⚠️ Known Limitations and Proper Usage

### What This Tool Is Good For ✅

- **Educational exploration** of compression-quality tradeoffs
- **Visual analysis** of parameter space
- **Hypothesis generation** for compression research
- **Quick prototyping** of compression strategies
- **Qualitative comparison** of methods

### What This Tool Is NOT Suitable For ❌

- **Production vector database** deployment
- **Publishable research** without additional validation
- **Statistical inference** (no confidence intervals or p-values)
- **Claims about true manifold geometry** or mathematical topology
- **Critical applications** requiring quality guarantees

### Critical Warnings ⚠️

1. **Not True Topology:** Graph-based analysis ≠ topological data analysis (would need persistent homology)
2. **Not True Geodesics:** k-NN graph paths ≠ manifold geodesics (approximation may be poor)
3. **Not Statistical Confidence:** Stability heuristic is a quality indicator, not a confidence interval
4. **Limited Validation:** Tested on synthetic data only, not real-world embeddings
5. **Heuristic Thresholds:** Many constants chosen empirically without theoretical justification

### Recommendations

- **Always** validate findings on multiple datasets
- **Cross-check** stability regions with domain knowledge
- **Treat** heuristic scores as exploratory signals, not ground truth
- **Compare** results with production baselines (Pinecone, Milvus, Faiss)
- **Read** [VERIFICATION_REPORT.md](VERIFICATION_REPORT.md) before drawing conclusions

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

*   Validation on real-world datasets
*   Statistical rigor improvements (confidence intervals, hypothesis tests)
*   True topological analysis (persistent homology, spectral methods)
*   New distortion metrics with theoretical grounding
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
