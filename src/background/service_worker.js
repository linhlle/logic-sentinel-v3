import { getSummary } from "../utils/cloud_api.js";


chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

chrome.runtime.onInstalled.addListener(() => {
    console.log("Sentinel working");
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "SUMMARIZE_PAGE") {
        getSummary(request.text)
            .then(summary => sendResponse({ summary }))
            .catch(err => sendResponse({ summary: "Error: AI analysis failed." }));
        return true;
    }

    if (request.type === "HANDSHAKE") {
        sendResponse({status: "acknowledged", timestamp: Date.now() });
    }
});