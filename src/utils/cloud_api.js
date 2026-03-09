import { AI_CONFIG } from "./config.js";

export async function getSummary(text) {
    const prompt = `Provide a 3-4 sentences summary of the following text, focusing on its main argument and rhetorical tone: ${text}`;

    try {
        const response = await fetch(`${AI_CONFIG.MODEL_URL}?key=${AI_CONFIG.API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();

        if (data.error) {
            console.error("Gemini API Error:", data.error.message);
            return `AI Error: ${data.error.message}`;
        }

        if (!data.candidates || data.candidates.length === 0) {
            console.error("No candidates returned. Full Response:", data);
            return "The AI declined to summarize this content.";
        }

        return data.candidates[0].content.parts[0].text;
    } catch (e) {
        console.error("AI Summary error: ", e);
        return "Unable to generate summary at this time.";
    }
}
