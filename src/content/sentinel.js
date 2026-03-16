/* 

*/

const BIAS_PATTERN = /\b(obviously|clearly|definitely|unquestionably|everyone knows|it's simple|factually|plainly|never|of course)\b/gi;

const RHETORICAL_ANCHORS = [
    "everyone knows", "it is widely agreed", "no one can deny",
    "obviously", "clearly", "unquestionably", "of course",
    "common sense", "it's simple", "plainly"
];

let hitCounter = 0;
let tooltipElement = null;

// #1: Scanner 
function rhetoricScanner() {
    const mainContent = document.querySelector('article') || document.body;
    const treeWalker = document.createTreeWalker(mainContent, NodeFilter.SHOW_TEXT);
    let node;
    const nodesToProcess = [];
    const scannerBatch = [];

    while (node = treeWalker.nextNode()) {
        const text = node.textContent.toLowerCase();
        const parent = node.parentElement;

        // Ignore ads
        const isAd = parent.closest('.ad, .advertisement, .sponsored, aside, nav, footer, .ob-widget');
        if (isAd) continue;

        // Ignore code-heavy tags and rescanning highlights
        if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(parent.tagName) || 
            parent.classList.contains('sentinel-hit')) continue;


        RHETORICAL_ANCHORS.forEach(phrase => {
            if (text.includes(phrase)) {
                nodesToProcess.push({ node, word: phrase });
            } 
        });

        // Check Keywords
  
        BIAS_PATTERN.lastIndex = 0;
        let match;
        while ((match = BIAS_PATTERN.exec(text)) !== null) {
            const dup = nodesToProcess.some(item => item.node === node && item.word === match[0]);
            if (!dup) {
                nodesToProcess.push({ node, word: match[0] });
            }
        }

    }

    nodesToProcess.forEach(item => {
        if (item.node.parentNode) {
            const hitData = processHit(item.node, item.word);
            if (hitData) scannerBatch.push(hitData);
        }
    });

    if (scannerBatch.length > 0) {
        chrome.runtime.sendMessage({
            type: "BIAS_HIT_BATCH",
            hits: scannerBatch
        });
    }
       
}

// Phase 2.5: ELM 
async function performELMAudit() {
    console.log("Sentinel: Starting ELM Strategy Audit...");
    const bodyCopy = document.querySelector('article') || document.body;
    const pageText = bodyCopy.innerText.substring(0, 10000);

    chrome.runtime.sendMessage({
        type: "ELM_AUDIT",
        text: pageText
    },
    (response) => {
        if (response.error) {
            console.error("ELM Audit Error:", response.error);
            return;
        }

        if (response && response.auditData && response.auditData.length > 0) {
            console.log("Sentinel: ELM Strategies Detected:", response.auditData.length);
            response.auditData.forEach(hit => {
                applyELMHighlight(hit.text, hit.cue, hit.reason);
            });
        } else {
            console.log("Sentinel: No Peripheral Cues detected in this segment.");
        }
    });
}

// Phase 2.5: Helper function for performELMAudit
function applyELMHighlight(exactText, cueType, reason) {
    const treeWalker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while (node = treeWalker.nextNode()) {
        if (node.textContent.includes(exactText) && exactText.length > 3) {
            const parent = node.parentNode;
            
            if (parent.classList.contains('sentinel-hit') || ['SCRIPT', 'STYLE'].includes(parent.tagName)) continue;

            const span = document.createElement('span');
            span.className = 'sentinel-hit elm-hit';
            span.style.borderBottom = "2px solid #a371f7";
            span.style.backgroundColor = "rgba(163, 113, 247, 0.1)";
            span.style.cursor = "help";

            span.onmouseenter = (e) => {
                const rect = e.target.getBoundingClientRect();
                tooltipElement.style.display = 'block';
                tooltipElement.style.top = `${rect.bottom + window.scrollY + 5}px`;
                tooltipElement.style.left = `${rect.left + window.scrollX}px`;
                tooltipElement.innerHTML = `
                    <div style="color: #a371f7; font-weight: bold;">[ELM] ${cueType}</div>
                    <div style="margin-top:4px;">${reason}</div>
                `;
            };
            span.onmouseleave = () => { tooltipElement.style.display = 'none'; };

            const origText = node.textContent;
            const parts = origText.split(exactText);
            
            if (parts.length > 1) {
                const fragment = document.createDocumentFragment();
                fragment.appendChild(document.createTextNode(parts[0]));
                span.textContent = exactText;
                fragment.appendChild(span);
                fragment.appendChild(document.createTextNode(parts.slice(1).join(exactText)));
                
                parent.replaceChild(fragment, node);
            }
        }
    }
}


// #3: Logic: Severity n Communication
function processHit(node, word) {
    const sentence = getSentenceFromNode(node, word);
    const hitId = `sentinel-hit-${hitCounter++}`;

    const hasEvidence = /because|due to|source|study|evidence|data/i.test(sentence);
    const severity = !hasEvidence ? "HIGH" : "LOW";

    highlightNode(node, hitId, severity, word); 

    // chrome.runtime.sendMessage({
    //     type: "BIAS_HIT",
    //     word: word,
    //     severity: severity,
    //     hitId: hitId,
    //     sentence: sentence
    // });
    return {
        word: word,
        severity: severity,
        hitId: hitId,
        sentence: sentence
    };

}

// #4: Helper
function getSentenceFromNode(node, phrase) {
    const fullText = node.textContent;
    const idx = fullText.toLowerCase().indexOf(phrase);
    const start = Math.max(0, fullText.lastIndexOf('.', idx) + 1);
    const end = fullText.indexOf('.', idx);
    return fullText.substring(start, end !== -1 ? end : fullText.length).trim();
}

// #2: Visual highlighter
function highlightNode(node, hitId, severity, word) {
    const span = document.createElement('span');
    span.id = hitId;
    span.className = 'sentinel-hit';
    span.style.backgroundColor = "rgba(88, 166, 255, 0.2)";
    span.style.borderBottom = "2px solid #58a6ff";
    span.style.cursor = "help";

    // Phase 2: Hover logic
    span.onmouseenter = (e) => {
        const rect = e.target.getBoundingClientRect();
        tooltipElement.style.display = 'block';
        tooltipElement.style.top = `${rect.bottom + window.scrollY + 5}px`;
        tooltipElement.style.left = `${rect.left + window.scrollX}px`;
        
        const type = severity === "HIGH" ? "NAKED ASSERTION" : "SUPPORTED CLAIM";
        tooltipElement.innerHTML = `
            <div class="severity-${severity.toLowerCase()}">[${severity}] ${type}</div>
            <div style="margin-top:4px;">"${word}" found. Likely rhetorical pressure.</div>
            <button id="deconstruct-trigger" class="deconstruct-btn">AI_DECONSTRUCT_LOGIC</button>
            <div id="ai-output" class="ai-response" style="display:none;"></div>        
        `;

        const container = document.getElementById('sentinel-tooltip-container');
        const shadow = container.shadowRoot;
        const btn = shadow.getElementById('deconstruct-trigger');
        const output = shadow.getElementById('ai-output');
        
        btn.onclick = (event) => {
            event.stopPropagation();
            btn.innerText = "THINKING...";
            btn.disabled = true;

            // Get the fresh sentence context
            const sentence = getSentenceFromNode(node, word);

            chrome.runtime.sendMessage({
                type: "DECONSTRUCT_CLAIM",
                sentence: sentence 
            }, (response) => {
                btn.style.display = 'none';
                output.style.display = 'block';
                output.innerText = `> ${response.question}`;
            });
        };

    };


    span.onmouseleave = (e) => {
        const container = document.getElementById('sentinel-tooltip-container');
        setTimeout(() => {
            if (!container.matches(':hover') && !span.matches(':hover')) {
                tooltipElement.style.display = 'none';
            }
        }, 100);    
    };

    const parent = node.parentNode;
    if (parent) {
        parent.replaceChild(span, node);
        span.appendChild(node);
    }

}

// #3: Clean text
function getCleanText() {
    return document.body.innerText.replace(/\s+/g, ' ').trim();
}

// #4: Phase 2: Tooltip
function createTooltip() {
    const container = document.createElement('div');
    container.id = 'sentinel-tooltip-container';
    document.body.appendChild(container);

    const shadow = container.attachShadow({ mode: 'open' });
    const tooltip = document.createElement('div');
    tooltip.id = 'sentinel-tooltip';
    
    const style = document.createElement('style');
    style.textContent = `
        #sentinel-tooltip {
            position: absolute;
            background: #161b22;
            color: #c9d1d9;
            border: 1px solid #30363d; /* Subtler border */
            padding: 12px;
            border-radius: 6px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            font-size: 12px;
            z-index: 2147483647;
            display: none;
            pointer-events: auto;
            box-shadow: 0 8px 24px rgba(0,0,0,0.5);
            max-width: 280px;
        }
        .deconstruct-btn {
            margin-top: 10px;
            background: #238636;
            color: #ffffff;
            border: 1px solid rgba(240,246,252,0.1);
            padding: 6px 12px;
            border-radius: 6px;
            cursor: pointer;
            width: 100%;
            font-weight: 600;
            font-size: 11px;
            font-family: monospace;
            transition: 0.2s;
        }
        .deconstruct-btn:hover { background: #2ea043; }
        .deconstruct-btn:disabled { background: #161b22; color: #8b949e; cursor: wait; }
        
        .ai-response {
            margin-top: 10px;
            padding: 8px;
            background: rgba(88, 166, 255, 0.1);
            border-radius: 4px;
            color: #79c0ff;
            font-style: italic;
            border-left: 2px solid #58a6ff;
        }

        .severity-high { color: #f85149; font-weight: bold; }
        .severity-low { color: #58a6ff; font-weight: bold; }
    `;

    shadow.appendChild(style);
    shadow.appendChild(tooltip);
    tooltipElement = tooltip;
}

// Initialize tooltip on load
createTooltip();


// Listen for the Side Panel's request for text
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "GET_TEXT_FOR_SUMMARY") {
        console.log("Sentinel: Extracting page content for Layer 0...");

        // #1
        rhetoricScanner();
        const pageContent = getCleanText();
        sendResponse({ text: pageContent });

        // 2.5
        performELMAudit();

        // #3: Observe for changes in the page's content (new content like scrolling sth)
        const observer = new MutationObserver(() => rhetoricScanner());
        observer.observe(document.body, { childList: true, subtree: true });
    }

    if (request.type === "SCROLL_TO_HIT") {
        console.log("scroll to hit");
        const element = document.getElementById(request.hitId);
        console.log("hit element: ", element)
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Flash
            element.style.backgroundColor = "rgba(255, 255, 0, 0.5)";
            setTimeout(() => { element.style.backgroundColor = "rgba(88, 166, 255, 0.2)"; }, 2000);
        }
    }

    return true; 
});

