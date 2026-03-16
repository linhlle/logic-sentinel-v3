import { queryPrompt } from "../utils/cloud_api.js";


chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

chrome.runtime.onInstalled.addListener(() => {
    console.log("Sentinel working");
});


// Phase 3: Caching
// Helper function
function updateSessionCache(url, newData) {
    // new site
    console.log("input: ", url);
    console.log("newdATA: ", newData);
    console.log("newData hits: ", newData.hits);
    if (!url) return;

    chrome.storage.local.get([url], (result) => {
        const existingData = result[url] || { summary: "", hits: []};
        const finalSummary = (newData.summary && newData.summary !== "") 
                             ? newData.summary 
                             : existingData.summary;
        let finalHits = existingData.hits;
        console.log("finalHits before: ", finalHits);

        if (newData.hits && Array.isArray(newData.hits)) {
            const newUniqueHits = newData.hits.filter(newHit => {
                return !finalHits.some(h => h.hitId === newHit.hitId);
            });

            finalHits = [...finalHits, ...newUniqueHits];
        }

        console.log("finalHits after: ", finalHits);
        const updatedData = {
            summary: finalSummary,
            hits: finalHits
        };

        chrome.storage.local.set({ [url]: updatedData }, () => {
            console.log(`%c[STORAGE_WRITE] Saving to Key: ${url}`, "color: #3fb950; font-weight: bold;");
            console.log("Data saved:", updatedData);
        });
    });
} 


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

    if (request.type === "SUMMARIZE_PAGE") {
        const tabUrl = request.url || (sender.tab ? sender.tab.url : null);

        const abstractPrompt = `Provide a concise 3-4 sentence abstract of this text. Focus on 
                                the main argument and identify the author's rhetorical tone: ${request.text}`;
        queryPrompt(abstractPrompt)
            .then(summary => {
                updateSessionCache(tabUrl, { summary: summary });
                sendResponse({ summary });
            })
            .catch(err => {
                console.error("Abstract Failure:", err);
                sendResponse({ summary: "Error: AI analysis failed." })
            });
            
        return true;
    }


    if (request.type === "BIAS_HIT_BATCH") {
        const tabUrl = request.url || (sender.tab ? sender.tab.url : null);
        console.log(`[BATCH_RECEIVED] URL: ${tabUrl} | Count: ${request.hits.length}`);
        updateSessionCache(tabUrl, { hits: request.hits })
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

    if (request.type === "ELM_AUDIT") {
        const elmPrompt = `
            Act as a Communication Professor specialized in Elaboration Likelihood Method (ELM).
            Analyze the following text for PERIPHERAL CUES: "${request.text}"

            Look for:
            1. EXPERTISE: Using titles/authority as a shortcut for logic.
            2. LIKING/SIMILARITY: Using "we/us" of moral-emotional alignment to build rapport.
            3. SCARCITY/URGENCY: Pressuring for a quick decision.
            4. SOCIAL PROOF: Claiming "everyone knows" or "it's common sense."

            RETURN ONLY a JSON array of objects. Format:
            [{
                "text": "string found",
                "cue": "EXPERTISE/LIKING/SCARCITY/SOCIAL_PROOF",
                "reason": "one sentence why"
            }]
        `;

        queryPrompt(elmPrompt)
            .then(response => {
                const jsonStart = response.indexOf('[');
                const jsonEnd = response.lastIndexOf(']') + 1;
                if (jsonStart !== -1 && jsonEnd > jsonStart) {
                    const auditData = JSON.parse(response.substring(jsonStart, jsonEnd));
                    sendResponse({ auditData });
                } else {
                    console.error("ELM_AUDIT: AI returned invalid JSON format", response);
                    sendResponse({ auditData: [] });
                }
            })
            .catch(err => sendResponse({ error: err.message }));

        return true;
    }
 
    if (request.type === "HANDSHAKE") {
        sendResponse({status: "acknowledged", timestamp: Date.now() });
        return true;
    }
});