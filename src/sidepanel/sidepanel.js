
document.addEventListener('DOMContentLoaded', () => {
    const statusBadge = document.getElementById('connection-status');
    const log = document.getElementById('audit-stream');
    const scanBtn = document.getElementById('scan-btn');
    const summaryText = document.getElementById('summary-text');
    const meter = document.getElementById('intensity-meter');
    const refreshBtn = document.getElementById('refresh-btn');

    // Phase 3: Initial load: check cache
    setTimeout(() => {
        chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
            console.log(`%c[STORAGE_READ] Attempting to Load Key: ${tabs[0]?.url}`, "color: #58a6ff; font-weight: bold;");
            if (!tabs[0] || !tabs[0].url || tabs[0].url.startsWith('chrome://')) {
                console.warn("Sentinel: Bridge inactive on this system page.");
                return;
            }
            const url = tabs[0].url;
            chrome.storage.local.get([url], (result) => {
                const cached = result[url];
                console.log("Sentinel: Cache data ", cached);

                if (cached) {
                    if (cached.summary && cached.summary !== "") {
                        summaryText.innerText = cached.summary;
                        summaryText.style.display = "block";
                        scanBtn.style.display = "none";
                    }

                    if (cached.hits && cached.hits.length > 0) {
                        const restoreMsg = document.createElement('p');
                        restoreMsg.className = "system-msg";
                        restoreMsg.innerText = `> Session restored: ${cached.hits.length} findings.`;
                        log.appendChild(restoreMsg);

                        cached.hits.forEach(hit => renderHitToUI(hit));
                    }
                } else {
                    console.warn("No match found in storage for this URL.");
                }
            })
        });
    }, 100);

    // Phase 3: Refresh button logic
    if (refreshBtn) {
        refreshBtn.onclick = () => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                const url = tabs[0].url;
                chrome.storage.local.remove([url], () => {
                    location.reload();
                });
            });
        };
    }

    // Phase 3
    function renderHitToUI(message) {
        const entryContainer = document.createElement('div');
        entryContainer.className = "hit-entry";
        
        let borderColor = "#58a6ff"; 
        if (message.severity === "HIGH") borderColor = "#f85149"; 
        if (message.severity === "ELM") borderColor = "#a371f7";  

        entryContainer.style.display = "flex";
        entryContainer.style.justifyContent = "space-between";
        entryContainer.style.alignItems = "center";
        entryContainer.style.padding = "4px 8px";
        entryContainer.style.marginBottom = "6px";
        entryContainer.style.borderLeft = `2px solid ${borderColor}`;
        entryContainer.style.background = "rgba(255, 255, 255, 0.05)";

        // Label / Scroll Trigger
        const label = document.createElement('button');
        label.style.background = "none"; label.style.border = "none"; label.style.color = "inherit";
        label.style.cursor = "pointer"; label.style.textAlign = "left"; label.style.flexGrow = "1";
        label.innerHTML = `<span style="color: #8b949e; font-size: 0.7rem;">[${message.severity}]</span> <strong style="color: #c9d1d9;">${message.word.toUpperCase()}</strong>`;
        
        label.onclick = () => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                chrome.tabs.sendMessage(tabs[0].id, { type: "SCROLL_TO_HIT", hitId: message.hitId });
            });
        };

        const verifyBtn = document.createElement('button');
        verifyBtn.innerText = "Verify";
        verifyBtn.className = "verify-btn"; 
        verifyBtn.onclick = () => {
            const query = `verify: ${message.sentence}`;
            window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank');
        };

        entryContainer.appendChild(label);
        entryContainer.appendChild(verifyBtn);
        log.appendChild(entryContainer);

        log.scrollTop = log.scrollHeight;
        const increment = message.severity === "HIGH" ? 10 : 5;
        const currentWidth = parseFloat(meter.style.width) || 0;
        meter.style.width = Math.min(currentWidth + increment, 100) + "%";
    }


    // Phase 3
    chrome.runtime.onMessage.addListener((message) => {
        if (message.type === "BIAS_HIT_BATCH") {
            message.hits.forEach(hit => {
                renderHitToUI(hit);
            });
        }
    });

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
            const activeTab = tabs[0];
            const currentUrl = activeTab.url;
        
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
                    text: result.text.substring(0, 5000),
                    url: currentUrl 
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