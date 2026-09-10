# A.P AI V3.1

A mobile-friendly ChatGPT-style local AI website with no OpenAI API key.

This version is adjusted for phones: it uses an ONNX/Transformers.js model and tries browser-compatible WASM first, with WebGPU as a fallback.

The first run downloads the model from Hugging Face. Internet is required for that first download; afterward the browser may cache model files.

Deploy as a static GitHub Pages site with `index.html`, `style.css`, and `app.js` in the repository root.
