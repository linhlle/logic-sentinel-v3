document.addEventListener('DOMContentLoaded', () => {
    const statusBadge = document.getElementById('connection-status');
    const log = document.getElementById('audit-stream');

    chrome.runtime.sendMessage({ type: "HANDSHAKE" }, (response) => {
        if (chrome.runtime.lastError) {
            statusBadge.innerText = "CONNECTION_FAILED";
            statusBadge.style.color = "#f85149";
            console.error(chrome.runTime.error);
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
});