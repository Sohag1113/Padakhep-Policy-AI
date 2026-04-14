import { GoogleGenAI } from "@google/genai";
import { PolicyDocument } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function askPolicyQuestion(question: string, policies: PolicyDocument[]) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  // Combine policy contents for context
  // In a real app with many docs, we would use vector search (RAG)
  // For this demo, we'll combine the most relevant or all if small
  const context = policies.map(p => `Policy: ${p.name}\nContent: ${p.content}`).join("\n\n---\n\n");

  const systemInstruction = `
    You are the Padakhep Policy Assistant. 
    Your job is to answer employee questions based ONLY on the provided company policies.
    
    Guidelines:
    1. If the answer is in the policies, provide a clear and concise answer.
    2. If the user asks in Bangla, respond in Bangla. If they ask in English, respond in English.
    3. If the answer is NOT in the policies, politely state that you don't have information on that topic and suggest they contact HR.
    4. Do not make up information or use outside knowledge.
    5. Maintain a professional and helpful tone.
    6. If multiple policies are relevant, mention them.
    7. The policies might be in Bangla or English; you should be able to understand and reference both.
  `;

  const prompt = `
    Context Policies:
    ${context}

    User Question: ${question}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction,
      },
    });

    return response.text || "I'm sorry, I couldn't generate an answer.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to get an answer from the AI assistant.");
  }
}
