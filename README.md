# A.P AI V3

A ChatGPT-style local AI web app with no OpenAI API key.

## Important
The browser downloads a small Hugging Face model the first time it runs. This is NOT an OpenAI API. The model runs in the browser when supported by the device/browser.

## Run locally
Because `app.js` uses ES modules, open the folder through a local web server rather than `file://`.

Easy options:
- VS Code + Live Server
- Python: `python -m http.server 8000`
Then open `http://localhost:8000`.

## Deploy
This is a static website. Upload the three files (`index.html`, `style.css`, `app.js`) to GitHub and enable GitHub Pages, or deploy the folder to a static hosting service.

## Mobile
Chrome/Edge are recommended. The first model download can be large and may take time. Browser/device support varies.

## Files
- index.html — interface
- style.css — design
- app.js — local AI, voice input, chat history
