import { queryPrompt } from "../utils/cloud_api.js";


chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

chrome.runtime.onInstalled.addListener(() => {
    console.log("Sentinel working");
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "SUMMARIZE_PAGE") {
        const abstractPrompt = `Provide a concise 3-4 sentence abstract of this text. Focus on 
                                the main argument and identify the author's rhetorical tone: ${request.text}`;
        queryPrompt(abstractPrompt)
            .then(summary => sendResponse({ summary }))
            .catch(err => {
                console.error("Abstract Failure:", err);
                sendResponse({ summary: "Error: AI analysis failed." })
            });
            
        return true;
    }

    // Phase 2
    if (request.type === "DECONSTRUCT_CLAIM") {
        const socraticPrompt = `
            TASK: Act as a sharp Socratic Professor. 
            INPUT: "${request.sentence}"
            CONSTRAINT: Output ONLY ONE question (under 20 words) to verify the logic. No intro.
        `;

        queryPrompt(socraticPrompt)
            .then(question => {
                const cleanQuestion = question.replace(/^["']|["']$/g, '').trim();
                sendResponse({ question: cleanQuestion });
            })
            .catch(err => {
                console.error("Deconstruction Failure:", err);
                sendResponse({ question: "LOGIC_ENGINE_UNAVAILABLE" });
            });        
        return true;
    }

    if (request.type === "HANDSHAKE") {
        sendResponse({status: "acknowledged", timestamp: Date.now() });
    }
});