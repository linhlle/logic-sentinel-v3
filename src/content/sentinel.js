/* 

*/

const BIAS_PATTERN = /\b(obviously|clearly|definitely|unquestionably|everyone knows|it's simple|factually|plainly|never|of course)\b/gi;

const RHETORICAL_ANCHORS = [
    "everyone knows", "it is widely agreed", "no one can deny",
    "obviously", "clearly", "unquestionably", "of course",
    "common sense", "it's simple", "plainly"
];

// #1: Scanner 
function rhetoricScanner() {
    const treeWalker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;

    while (node = treeWalker.nextNode()) {
        const text = node.textContent.toLowerCase();
       
        // Phrasal check
        RHETORICAL_ANCHORS.forEach(phrase => {
            if (text.includes(phrase) && !node.parentElement.classList.contains('sentinel-hit')) {
                processHit(node, phrase);
            }
        });

        // Keyword check
        BIAS_PATTERN.lastIndex = 0;
        let match;
        while ((match = BIAS_PATTERN.exec(text)) != null) {
            if (!node.parentElement.classList.contains('sentinel-hit')) {
                processHit(node, match[0]);
            }
        }
        // if (BIAS_PATTERN.test(text) && !node.parentElement.classList.contains('sentinel-hit')) {
        //     const matches = text.match(BIAS_PATTERN);
        //     if (matches) {
        //         matches.forEach(word => {
        //             chrome.runtime.sendMessage({ type: "BIAS_HIT", word: word });
        //         });
        //         highlightNode(node);
        //     }
        // }
    }
}

// #3: Logic: Severity n Communication
function processHit(node, word) {
    const sentence = getSentenceFromNode(node, word);
    // If it contains evidence words, it's actually LESS suspicious (LOW severity)
    const hasEvidence = /because|due to|source|study|evidence|data/i.test(sentence);
    const severity = !hasEvidence ? "HIGH" : "LOW";

    chrome.runtime.sendMessage({
        type: "BIAS_HIT",
        word: word,
        severity: severity
    });

    highlightNode(node); 
}

// #4: Helper
function getSentenceFromNode(node, phrase) {
    const fullText = node.textContent;
    const idx = fullText.toLowerCase().indexOf(phrase);
    const start = Math.max(0, fullText.lastIndexOf('.', idx) + 1);
    const end = fullText.indexOf('.', idx);
    return fullText.substring(start, end !== -1 ? end : fullText.length);
}

// #2: Visual highlighter
function highlightNode(node) {
    const span = document.createElement('span');
    span.className = 'sentinel-hit';
    span.style.backgroundColor = "rgba(88, 166, 255, 0.2)";
    span.style.borderBottom = "2px solid #58a6ff";

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

// Listen for the Side Panel's request for text
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "GET_TEXT_FOR_SUMMARY") {
        console.log("Sentinel: Extracting page content for Layer 0...");

        // #1
        rhetoricScanner();
        
        // #2
        sendResponse({ text: getCleanText() });

        // #3: Observe for changes in the page's content (new content like scrolling sth)
        const observer = new MutationObserver(() => rhetoricScanner());
        observer.observe(document.body, { childList: true, subtree: true });
    }

    return true; 
});

