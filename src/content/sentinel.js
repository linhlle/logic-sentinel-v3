/* 

*/

const BIAS_PATTERN = /\b(obviously|clearly|definitely|unquestionably|everyone knows|it's simple|factually|plainly|never|of course)\b/gi;

const RHETORICAL_ANCHORS = [
    "everyone knows", "it is widely agreed", "no one can deny",
    "obviously", "clearly", "unquestionably", "of course",
    "common sense", "it's simple", "plainly"
];

let hitCounter = 0;

// #1: Scanner 
function rhetoricScanner() {
    const mainContent = document.querySelector('article') || document.body;
    const treeWalker = document.createTreeWalker(mainContent, NodeFilter.SHOW_TEXT);
    let node;
    const nodesToProcess = [];

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
            processHit(item.node, item.word);
        }
    });
       
        // Phrasal check
        // RHETORICAL_ANCHORS.forEach(phrase => {
        //     if (text.includes(phrase) && !node.parentElement.classList.contains('sentinel-hit')) {
        //         processHit(node, phrase);
        //     }
        // });

        // // Keyword check
        // BIAS_PATTERN.lastIndex = 0;
        // let match;
        // while ((match = BIAS_PATTERN.exec(text)) != null) {
        //     if (!parent.classList.contains('sentinel-hit')) {
        //         processHit(node, match[0]);
        //     }
        // }
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

// #3: Logic: Severity n Communication
function processHit(node, word) {
    const sentence = getSentenceFromNode(node, word);
    const hitId = `sentinel-hit-${hitCounter++}`;

    const hasEvidence = /because|due to|source|study|evidence|data/i.test(sentence);
    const severity = !hasEvidence ? "HIGH" : "LOW";

    highlightNode(node, hitId); 

    chrome.runtime.sendMessage({
        type: "BIAS_HIT",
        word: word,
        severity: severity,
        hitId: hitId,
        sentence: sentence
    });

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
function highlightNode(node, hitId) {
    const span = document.createElement('span');
    span.id = hitId;
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

