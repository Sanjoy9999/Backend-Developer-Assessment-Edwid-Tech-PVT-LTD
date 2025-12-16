import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const connectDB = async () => {
  const maxRetries = Number.parseInt(process.env.PG_MAX_RETRIES ?? "15", 10);
  const retryDelayMs = Number.parseInt(
    process.env.PG_RETRY_DELAY_MS ?? "5000",
    10
  );

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Pool will create connections lazily; a simple query is the safest readiness check.
      await pool.query("SELECT 1;");
      console.log("✅ Connected to PostgreSQL");

      await pool.query(`
        CREATE TABLE IF NOT EXISTS interactions (
          id SERIAL PRIMARY KEY,
          session_id VARCHAR(100),
          user_query TEXT,
          llm_response TEXT,
          response_time INT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log("✅ Interactions table ready");
      return;
    } catch (err) {
      const attemptsLeft = maxRetries - attempt;
      console.log(
        `⚠️ PostgreSQL not ready, retrying (${attemptsLeft} attempts left)...`
      );
      console.log(`   Reason: ${err?.message ?? String(err)}`);

      if (attempt < maxRetries) {
        await new Promise((res) => setTimeout(res, retryDelayMs));
      }
    }
  }

  console.error(
    "❌ Could not connect to PostgreSQL after multiple attempts. Check DATABASE_URL and container health."
  );
  process.exit(1);
};

export { pool, connectDB };
