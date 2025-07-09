import db from "../../config/postgresDB.js";
import { saveEmbedding } from "../../models/promptModel.js";

export const createEmbedding = async (req, res) => {
  const client = await db.connect();
  await client.query("BEGIN");

  try {
    const { text, user_id, prompt_id } = req.body;

    const response = await fetch("http://127.0.0.1:6969/create-embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    const data = await response.json();
    //     console.log(data);

    // Ensure embedding is in the right format
    const embedding = data.embedding;
    if (!Array.isArray(embedding) || embedding.length === 0) {
      throw new Error("Invalid embedding format received from API");
    }

    // Format embedding specifically for pgvector format
    // pgvector expects a string like '[1,2,3]' without any spaces or extra quotes
    const formattedEmbedding = "[" + embedding.join(",") + "]";
    console.log(formattedEmbedding);

    await saveEmbedding({ user_id, prompt_id, embedding: formattedEmbedding });

    await client.query("COMMIT");
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error(error);
    await client.query("ROLLBACK");
    res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
};
