// Listen for the Side Panel's request for text
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "GET_TEXT_FOR_SUMMARY") {
        console.log("Sentinel: Extracting page content for Layer 0...");
        
        const pageText = document.body.innerText.replace(/\s+/g, ' ').trim();
        sendResponse({ text: pageText });
    }
    return true; 
});