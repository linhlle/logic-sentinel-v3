chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

chrome.runtime.onInstalled.addListener(() => {
    console.log("Sentinel working");
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "HANDSHAKE") {
        sendResponse({status: "acknowledged", timestamp: Date.now() });
    }
    return true;
});