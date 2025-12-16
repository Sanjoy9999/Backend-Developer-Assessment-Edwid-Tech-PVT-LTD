import { getEmbedding } from "../services/embeddingService.js";
import { searchPoints } from "../services/qdrantService.js";
import { generateAnswer } from "../services/llmService.js";
import { pool } from "../db/postgres.js";
import { client } from "../services/redisService.js";

const chat = async (req, res, next) => {
  try {
    const { session_id, query } = req.body;

    if (!session_id || !query) {
      return res
        .status(400)
        .json({ error: "session_id and query are required" });
    }

    const startTime = Date.now();

    // 1. Get embedding for user query
    console.log("Generating embedding...");
    const queryVector = await getEmbedding(query);

    // 2. Search Qdrant for relevant context
    console.log("Searching Qdrant...");
    const searchResults = await searchPoints(queryVector, 3);

    // Format context
    const context = searchResults.map((r) => r.payload.text).join("\n\n");
    console.log(`Found ${searchResults.length} relevant context chunks.`);

    // 3. Get recent chat history from Redis (Short-term memory)
    const historyList = await client.lRange(session_id, 0, 4); // Last 5 messages
    const history = historyList ? historyList.reverse().join("\n") : "";

    // 4. Generate Answer with Gemini
    const fullContext = `
      Previous Conversation:
      ${history}
      
      Relevant News:
      ${context}
    `;

    console.log("Asking Gemini...");
    const answer = await generateAnswer(fullContext, query);

    // 5. Store Interaction in Postgres
    const responseTime = Date.now() - startTime;
    await pool.query(
      "INSERT INTO interactions (session_id, user_query, llm_response, response_time) VALUES ($1, $2, $3, $4)",
      [session_id, query, answer, responseTime]
    );

    // 6. Update Redis History
    // Format: "User: ... \n AI: ..."
    const interactionString = `User: ${query}\nAI: ${answer}`;
    await client.lPush(session_id, interactionString);
    await client.lTrim(session_id, 0, 4); // Keep only last 5

    res.json({
      answer: answer,
      sources: searchResults.map((r) => ({
        title: r.payload.title,
        source: r.payload.source,
      })),
      sessionId: session_id,
    });
  } catch (error) {
    next(error);
  }
};

export { chat };
