import { AI_CONFIG } from "./config.js";

export async function queryPrompt(prompt) {

    try {
        const response = await fetch(`${AI_CONFIG.MODEL_URL}?key=${AI_CONFIG.API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.2,
                    topK: 1,
                    topP: 1
                }
            })
        });

        const data = await response.json();

        if (data.error) {
            console.error("Gemini API Error:", data.error.message);
            throw new Error(data.error.message); 
        }

        if (!data.candidates || data.candidates.length === 0) {
            console.error("No candidates returned. Full Response:", data);
            return "NO_INFERENCE_GENERATED";
        }

        return data.candidates[0].content.parts[0].text;
    } catch (e) {
        console.error("Internal Inference Error: ", e);
        throw e;
    }
}
