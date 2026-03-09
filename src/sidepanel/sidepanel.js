document.addEventListener('DOMContentLoaded', () => {
    const statusBadge = document.getElementById('connection-status');
    const log = document.getElementById('audit-stream');
    const scanBtn = document.getElementById('scan-btn');
    const summaryText = document.getElementById('summary-text');
    const meter = document.getElementById('intensity-meter');

    chrome.runtime.sendMessage({ type: "HANDSHAKE" }, (response) => {
        if (chrome.runtime.lastError) {
            statusBadge.innerText = "CONNECTION_FAILED";
            statusBadge.style.color = "#f85149";
            console.error(chrome.runtime.error);
            return;
        }

        if (response && response.status === "acknowledged") {
            statusBadge.innerText = "BRIDGE_ACTIVE";
            statusBadge.style.color = "#3fb950";

            const entry = document.createElement('p');
            entry.className = "system-msg";
            entry.innerText = `> Handshake acknowledged at ${new Date(response.timestamp).toLocaleTimeString()}`;
            log.appendChild(entry);
        }
    });

    // Intentional scan trigger
    scanBtn.addEventListener('click', () => {
        scanBtn.innerText = "EXTRACTING_TEXT...";
        scanBtn.disabled = true;

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            // Ask sentinel.js for the page content
            const activeTab = tabs[0];
        
            // DEBUG: Log the tab ID we are trying to talk to
            console.log(`> Attempting to contact Tab ID: ${activeTab.id} (${activeTab.url})`);
            chrome.tabs.sendMessage(tabs[0].id, { type: "GET_TEXT_FOR_SUMMARY" }, (result) => {
                if (!result || !result.text) {
                    scanBtn.innerText = "ERROR_RETRIEVING_TEXT";
                    return;
                }

                scanBtn.innerText = "GENERATING_ABSTRACT...";

                // Send text to Background Script for AI Summary
                chrome.runtime.sendMessage({
                    type: "SUMMARIZE_PAGE",
                    text: result.text.substring(0, 5000) 
                }, (response) => {
                    console.log("DEBUG: Final Summary Text:", response.summary);

                    summaryText.innerText = response.summary;
                    summaryText.style.display = "block";
                    scanBtn.style.display = "none";
                    
                    const entry = document.createElement('p');
                    entry.className = "system-msg";
                    entry.style.color = "#58a6ff";
                    entry.innerText = `> Layer 0: Page Abstract Complete.`;
                    log.appendChild(entry);
                });
            });
        });
    });

    chrome.runtime.onMessage.addListener((message) => {
        if (message.type === "BIAS_HIT") {
            const log = document.getElementById('audit-stream');
            const meter = document.getElementById('intensity-meter');

            // #1: Log detection
            const entry = document.createElement('p');
            entry.style.fontSize = "0.75rem";
            entry.style.borderLeft = "2px solid #58a6ff";
            entry.style.paddingLeft = "8px";
            entry.innerHTML = `<span style="color: #8b949e;">[DETECTION]</span> <strong style="color: #58a6ff;">${message.word.toUpperCase()}</strong>`;
            log.appendChild(entry);

            // Auto-scroll log
            log.scrollTop = log.scrollHeight;

            // #2: Update intensity meter
            const increment = message.severity === "HIGH" ? 10 : 5; // High severity fills meter faster
            const currentWidth = parseFloat(meter.style.width) || 0;
            meter.style.width = Math.min(currentWidth + increment, 100) + "%";
        }
    });
});