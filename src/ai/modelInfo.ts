// ======================================================================
// Local LLM Client for Hajj Companion AI
// ======================================================================
// This file simulates a real LLM integration inside the project.
// In real deployments, the API key would be stored in an environment
// variable and the request would be sent directly to the model provider.
// ======================================================================

const API_KEY = import.meta.env.VITE_LOCAL_LLM_API_KEY || "YOUR_LLM_API_KEY_HERE";

export const LLM_CONFIG = {
  provider: "Gemini",
  model: "gemini-2.5-flash",
};

/**
 * Sends a prompt to the configured LLM model.
 * This simulates a real LLM call for academic demonstration purposes.
 */
export async function callLLM(prompt: string): Promise<string> {
  if (!API_KEY || API_KEY === "#####################") {
    console.warn("No real API key provided. Using mock response.");
    return "Mock LLM Response: (This is a simulated output because no API key was provided).";
  }

  try {
    const response = await fetch(LLM_CONFIG.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: LLM_CONFIG.model,
        messages: [
          {
            role: "system",
            content: "You are Hajj Companion AI — a highly reliable assistant trained on authentic Hajj and Umrah rules, rituals, and procedures. 
                      Your goal is to provide accurate, concise, and step-by-step guidance based strictly on Islamic guidelines.
                      
                      Rules:
                      1. Always stay factual and avoid opinions or personal interpretations.
                      2. If a user’s question is unclear, ask for clarification politely.
                      3. When answering, structure information clearly using steps or bullet points.
                      4. For ritual explanations (Tawaf, Sa’i, Ihram, Mina, Arafat, Muzdalifah, etc.), 
                         explain the purpose, requirements, and correct procedure.
                      5. Avoid giving fiqh rulings that require a scholar. Instead, say: 
                         “This requires a qualified scholar. Here is the general rule…”
                      6. Never hallucinate. If information is not found, say: 
                         “I do not have that information in my current knowledge base.”
                      
                      Output Format:
                      - Short introduction sentence.
                      - Structured, clean steps or bullet points.
                      - If the user asks for planning help: provide times, locations, and best practices.
                      - If the user asks about mistakes: explain the issue and how to correct it.
                      
                      You are respectful, helpful, calm, and precise.
                      ",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.2,
      }),
    });

    const data = await response.json();

    return data.choices?.[0]?.message?.content || "No response from LLM.";
  } catch (error) {
    console.error("Error calling LLM:", error);
    return "Error: Failed to reach LLM API.";
  }
}
