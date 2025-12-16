import { pool } from "../db/postgres.js";
import { client } from "../services/redisService.js";

const getHistory = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    // Get long-term history from Postgres
    const result = await pool.query(
      "SELECT * FROM interactions WHERE session_id = $1 ORDER BY created_at ASC",
      [sessionId]
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

const clearHistory = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    // Clear from Redis
    await client.del(sessionId);

   
    await pool.query("DELETE FROM interactions WHERE session_id = $1", [
      sessionId,
    ]);

    res.json({ message: "History cleared" });
  } catch (error) {
    next(error);
  }
};

export { getHistory, clearHistory };
