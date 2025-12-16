import axios from "axios";

export const getEmbedding = async (text) => {
  if (!process.env.HF_API_KEY) {
    throw new Error("HF_API_KEY is not set in environment variables");
  }

  try {
    // Using HuggingFace Router API (required for new tokens)
    // Using BAAI/bge-small-en-v1.5 which is optimized for embeddings
    const response = await axios({
      method: "POST",
      url: "https://router.huggingface.co/hf-inference/models/BAAI/bge-small-en-v1.5",
      headers: {
        Authorization: `Bearer ${process.env.HF_API_KEY}`,
        "Content-Type": "application/json",
      },
      data: {
        inputs: text,
      },
      timeout: 60000,// Means 60 seconds
    });

    // Check for errors
    if (response.data.error) {
      throw new Error(response.data.error);
    }

    // The response is the embedding array directly
    // For single input, it returns array of 384 numbers
    let embedding = response.data;

    // If nested array, extract first element
    if (Array.isArray(embedding) && Array.isArray(embedding[0])) {
      embedding = embedding[0];
    }

    // Verify size (384 for bge-small-en-v1.5)
    if (!Array.isArray(embedding) || embedding.length !== 384) {
      console.error("❌ Unexpected embedding format:");
      console.error("  Type:", typeof embedding);
      console.error("  Is Array:", Array.isArray(embedding));
      console.error(
        "  Length:",
        Array.isArray(embedding) ? embedding.length : "N/A"
      );
      console.error(
        "  Sample:",
        JSON.stringify(response.data).substring(0, 200)
      );
      throw new Error(
        `Invalid embedding size: expected 384, got ${
          Array.isArray(embedding) ? embedding.length : "not an array"
        }`
      );
    }

    console.log("✅ Generated embedding vector (size:", embedding.length, ")");
    return embedding;
  } catch (error) {
    console.error("❌ HuggingFace API Error:");
    if (error.response) {
      console.error("  Status:", error.response.status);
      console.error("  Data:", JSON.stringify(error.response.data));

      // Specific error messages
      if (error.response.status === 503) {
        console.error("  → Model is loading, please retry in a few seconds");
      } else if (error.response.status === 401) {
        console.error("  → Invalid API key");
      }
    } else {
      console.error("  Message:", error.message);
    }
    throw new Error(`Failed to generate embedding: ${error.message}`);
  }
};


