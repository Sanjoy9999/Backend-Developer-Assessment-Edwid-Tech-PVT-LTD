// LLM Service using @google/generative-ai (ES6 compatible)
import { GoogleGenerativeAI } from "@google/generative-ai";

const generateAnswer = async (context, query) => {
  try {
    // Initialize client
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

    // Use standard model "gemini-flash-latest" which is available
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const prompt = `
    You are a helpful news assistant. Use the following news context to answer the user's question.
    If the answer is not in the context, say "I don't have enough information."
    
    Context:
    ${context}
    
    Question: ${query}
    
    Answer:
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return text;
  } catch (error) {
    console.error("❌ Gemini Error:", error);
    return "I encountered an error generating the response.";
  }
};

export { generateAnswer };
