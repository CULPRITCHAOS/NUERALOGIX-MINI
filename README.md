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
*   Node.js (v18+)
*   API Key for Google Gemini (Optional, but recommended)
*   Ollama (Optional, for local AI)

### 1. Clone and Install
```bash
git clone https://github.com/your-username/neuralogix-mini-lab.git
cd neuralogix-mini-lab
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root directory:
```env
# Required for Google Provider
API_KEY=your_google_gemini_api_key_here
```

### 3. Run Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🏠 Using Local AI (Ollama)

You can run this lab entirely offline using Ollama.

1.  **Install Ollama** from [ollama.com](https://ollama.com).
2.  **Pull Models:**
    ```bash
    ollama pull nomic-embed-text  # For Text Embeddings
    ollama pull llava             # For Vision/Image Description
    ```
3.  **Enable CORS:**
    By default, browser security blocks websites from talking to local servers. You must run Ollama with CORS enabled.
    
    *Mac/Linux:*
    ```bash
    OLLAMA_ORIGINS="*" ollama serve
    ```
    
    *Windows (PowerShell):*
    ```powershell
    $env:OLLAMA_ORIGINS="*"; ollama serve
    ```
4.  **Connect in App:**
    Open the Lab settings (Gear Icon), select **Ollama**, and click "Test Connection".

---

## 📱 Mobile / LAN Access

To access the lab from your phone (on the same Wi-Fi):

1.  **Run with Host flag:**
    ```bash
    npm run dev -- --host
    ```
2.  **Check Terminal:** Note the Network URL (e.g., `http://192.168.1.5:5173`).
3.  **Phone Setup:**
    *   Open that URL on your phone.
    *   If using Ollama, go to Settings.
    *   Change Base URL from `localhost` to your computer's IP (e.g., `http://192.168.1.5:11434`).

---

## 📊 Understanding the Charts

### 1. PCA Projection (Scatter Plot)
A 2D simplification of the 768-dimensional space.
*   **Dots:** Data points (Concepts).
*   **Colors:** In the compressed view, dots snap to a grid.
*   **Goal:** Keep the "shape" of the cluster similar between Original and Compressed.

### 2. Continuity-Abstraction Surface (3D Map)
This is the master control for the research.
*   **X-Axis (Grid Step):** How coarse the lattice is.
*   **Y-Axis (K-Value):** How aggressively we group concepts.
*   **Z-Axis (Height):** The **LSI** score.
*   **Ridge Line:** The green peaks represent the most efficient compression settings.

---

## 🤝 Contributing

This is a research project. We welcome contributions regarding:
*   New mathematical metrics for semantic fidelity.
*   Support for additional Vector Stores (Pinecone, Milvus).
*   Visualization improvements.

## 📄 License

MIT License.
