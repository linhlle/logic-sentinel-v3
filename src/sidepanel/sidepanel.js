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
                    text: result.text.substring(0, 2000) 
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
});