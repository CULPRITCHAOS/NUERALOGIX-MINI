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

*   **Multi-Modal Analysis:** Embed **Text** (with noise injection) or **Images** (via Vision models).
*   **Dual AI Engine:**
    *   ☁️ **Google Gemini:** High-speed, high-quality embeddings via the Cloud.
    *   🏠 **Ollama (Local):** Privacy-focused, offline embeddings running on your own hardware.
*   **3D Topology Surface:** A dynamic 3D plot visualizing the trade-off between Continuity (Grid Step) and Abstraction (K-Means Clusters).
*   **Collision Detection:** Automatically detects and lists items that have lost their distinctiveness.
*   **Mobile Lab:** Fully responsive design allowing you to control the experiment from a phone while running the compute on a laptop.

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
│       └── deploy.yml          # GitHub Pages deployment
├── src/
│   ├── components/             # React components
│   │   ├── AnalysisPanel.tsx
│   │   ├── ContinuityAbstractionSurface.tsx
│   │   ├── EmbeddingChart.tsx
│   │   ├── EmbeddingTable.tsx
│   │   ├── ExperimentResults.tsx
│   │   ├── ImageUploader.tsx
│   │   ├── SettingsModal.tsx
│   │   ├── WelcomeModal.tsx
│   │   └── icons.tsx
│   ├── services/               # Core business logic
│   │   ├── providers/
│   │   │   ├── GoogleProvider.ts
│   │   │   ├── OllamaProvider.ts
│   │   │   └── types.ts
│   │   ├── aiService.ts
│   │   ├── analysisService.ts
│   │   ├── compressionService.ts
│   │   ├── embeddingService.ts
│   │   └── mathService.ts
│   ├── App.tsx                 # Main application component
│   ├── constants.ts            # App-wide constants
│   ├── index.css               # Global styles
│   ├── index.tsx               # Application entry point
│   └── types.ts                # TypeScript type definitions
├── .env.example                # Environment variables template
├── .gitignore                  # Git ignore rules
├── index.html                  # HTML template
├── package.json                # npm dependencies and scripts
├── tsconfig.json               # TypeScript configuration
├── vite.config.ts              # Vite build configuration
└── README.md                   # This file
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
