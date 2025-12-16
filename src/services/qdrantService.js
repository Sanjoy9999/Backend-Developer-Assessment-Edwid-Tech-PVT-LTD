import axios from "axios";

const QDRANT_URL = process.env.QDRANT_URL;
const COLLECTION_NAME = "news";

// Initialize collection
const initCollection = async () => {
  const maxRetries = 10;
  const retryDelay = 3000; // 3 seconds

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await axios.get(`${QDRANT_URL}/collections/${COLLECTION_NAME}`);
      console.log(`✅ Qdrant collection '${COLLECTION_NAME}' exists`);
      return; // Success, exit function
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log(
          `⚠️ Collection '${COLLECTION_NAME}' not found. Creating...`
        );
        try {
          await axios.put(`${QDRANT_URL}/collections/${COLLECTION_NAME}`, {
            vectors: {
              size: 384, // This is for cosine and MiniLM-L6-v2(This is a sentence transformer model of Hugging Face). This is a 384-dim vector.Dim means dimension of the vector.
              distance: "Cosine", // Cosine distance for similarity search.Cosine means we care about the angle between vectors rather than their magnitude.
            },
          });
          console.log(`✅ Qdrant collection '${COLLECTION_NAME}' created`);
          return; // Success, exit function
        } catch (createError) {
          console.error(
            `❌ Failed to create collection (Attempt ${attempt}/${maxRetries}):`,
            createError.message
          );
        }
      } else {
        console.error(
          `❌ Qdrant connection failed (Attempt ${attempt}/${maxRetries}):`,
          error.message
        );
      }

      if (attempt < maxRetries) {
        console.log(`⏳ Retrying in ${retryDelay / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      } else {
        console.error(
          "❌ Could not connect to Qdrant after multiple attempts."
        );
        // We might not want to crash the whole server, but functionality will be limited
      }
    }
  }
};

const upsertPoints = async (points) => {
  // Qdrant expects points in a specific format
  // points: [{ id, vector, payload }]
  await axios.put(
    `${QDRANT_URL}/collections/${COLLECTION_NAME}/points?wait=true`,
    {
      points,
    }
  );
};

const searchPoints = async (vector, limit = 5) => {
  const response = await axios.post(
    `${QDRANT_URL}/collections/${COLLECTION_NAME}/points/search`,
    {
      vector,
      limit,
      with_payload: true,
    }
  );
  return response.data.result;
};

export { initCollection, upsertPoints, searchPoints };
