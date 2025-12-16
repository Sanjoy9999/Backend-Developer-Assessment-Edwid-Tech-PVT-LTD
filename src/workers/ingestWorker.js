import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { fileURLToPath } from "url";
import { getEmbedding } from "../services/embeddingService.js";
import { upsertPoints } from "../services/qdrantService.js";

// For __dirname in ES6 modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const processIngestion = async (overrideData = null) => {
  let newsData;

  if (overrideData && Array.isArray(overrideData) && overrideData.length > 0) {
    console.log("[Worker] Using data from request body.");
    newsData = overrideData;
  } else {
    // Fallback to file
    const filePath = path.join(__dirname, "../../mock-data/news.json");
    if (!fs.existsSync(filePath)) {
      throw new Error("News data file not found");
    }
    newsData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  }
  const points = [];

  console.log(`[Worker] Processing ${newsData.length} articles...`);

  for (const article of newsData) {
    const content = `${article.title}: ${article.content}`;
    const vector = await getEmbedding(content);

    points.push({
      id: uuidv4(),
      vector: vector,
      payload: {
        title: article.title,
        content: article.content,
        source: article.source,
        text: content,
      },
    });

    // Rate limiting helper
    await new Promise((r) => setTimeout(r, 100));
  }

  await upsertPoints(points);
  console.log(`[Worker] Successfully ingested ${points.length} chunks.`);
  return points.length;
};

export { processIngestion };
