# 🛡️ Logic Sentinel (v3.0)
**An Intelligent Rhetorical Audit Tool for Chrome**

Logic Sentinel is a browser extension designed to protect users from Rhetorical Pressure in digital media. It uses **Gemini 2.5 Flash** to provide high-level content abstracts and a custom-built **Sentinel Engine** to detect and deconstruct logical fallacies, unearned authority, and biased framing in real-time.

---

## 🏗️ System Architecture
The extension utilizes a "Triangle of Communication" architecture to ensure low-latency performance and robust data extraction:

1. **Layer 0 (The Abstract):** Scrapes DOM content via `sentinel.js`, processes text via `service_worker.js`, and utilizes the Gemini 2.5 Flash API for semantic analysis.
2. **Layer 1 (The Sentinel):** A multi-threaded auditing engine that uses Regex and Phrasal Proximity checks to identify rhetorical anchors.
3. **Interactive Navigation:** A two-way message bridge allowing users to teleport to specific detections on the webpage directly from the side panel.

[Image of Chrome extension architecture diagram showing the interaction between side panel, background script, and content script]

---

## 🚀 Key Features
* **Dual-Layer Summary:** Generates factual abstracts while identifying the author's rhetorical tone.
* **Rhetorical Anchor Detection:** Flags phrases like "Obviously," "No one can deny," and "Every student knows."
* **Contextual Severity Engine:** Automatically distinguishes between backed claims and "Naked Assertions" by scanning surrounding sentence structures for evidence markers.
* **Teleport Navigation:** Click any detection in the audit stream to scroll the browser directly to the highlighted source.
* **One-Click Cross-Reference:** Instantly launch a Google Search to verify specific high-severity claims.

---

## 🛠️ Tech Stack
* **Frontend:** HTML5, CSS3 (GitHub Dark Theme aesthetic), Vanilla JavaScript.
* **Core Logic:** Chrome Extension API (Manifest v3), MutationObserver API, TreeWalker API.
* **AI Engine:** Google Gemini 2.5 Flash API.
* **Project Structure:** Modularized into `content`, `background`, `utils`, and `sidepanel` for scalability.

---

## 📂 Project Structure
```text
logic-sentinel-v3/
├── manifest.json         # Extension configuration & permissions
├── main.css              # Global styles
├── src/
│   ├── background/
│   │   └── service_worker.js  # Orchestrates API calls & messaging
│   ├── content/
│   │   ├── sentinel.js        # DOM Scraper & Rhetorical Engine
│   │   └── styles.css         # Highlighting & Tooltip styles
│   ├── sidepanel/
│   │   ├── index.html         # Main UI Dashboard
│   │   └── sidepanel.js       # UI logic & navigation handlers
│   └── utils/
│       ├── cloud_api.js       # Gemini API interface
│       └── config.js          # API Key (Excluded in production)
└── icons/                # Branding assets