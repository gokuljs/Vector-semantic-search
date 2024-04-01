import dotenv from "dotenv";
dotenv.config();
import express, { Request, Response } from "express";
import multer from "multer";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import { uploadToS3 } from "./uploads3.js";
import { PORT, PROMPT } from "./constant.js";
import { client } from "./MongoDbsetup.js";
import openai from "./openAiSetup.js";
import { openAiVisionApi } from "./openAIVisionAPi.js";
import { openAiEmbeddings } from "./openAiEmbeddingsApi.js";
import { vectorQuerySchema } from "./vectorQuerySchema.js";

const corsOptions = {
  origin: "http://localhost:3000",
};

const app = express();
const upload = multer(); // Using multer's default memory storage
app.use(cors(corsOptions)); // This will enable all CORS requests. For production, configure this properly.
// Create a MongoClient with a MongoClientOptions object to set the Stable API version

app.post(
  "/upload",
  upload.array("images"),
  async (req: Request, res: Response) => {
    if (!req.files || (Array.isArray(req.files) && req.files.length === 0)) {
      return res.status(400).send("No files were uploaded.");
    }
    const files = req.files as Express.Multer.File[];
    const uploadPromises = files.map((file) => uploadToS3(file));
    try {
      const results = await Promise.all(uploadPromises);
      const allPromise = results.map(async (url) => {
        const response = await openAiVisionApi(url, PROMPT);
        const stringArray = (
          response.choices[0].message.content as string
        ).split("json");
        const jsonString = stringArray.join("");
        const trimmedString = jsonString.replace(/`|\n/g, "");

        const jsonData = JSON.parse(trimmedString);
        return { jsonData, url, id: uuidv4() };
      });
      const data = await Promise.all(allPromise);
      if (data) {
        await client.connect();
        console.log("Connected successfully to MongoDB");
        const database = client.db("Cluster0"); // Replace with your database name
        const collection = database.collection("image_metadata");
        const allPromises = data.map(async (item) => {
          const data = await openAiEmbeddings(item.jsonData.description);
          const document = {
            subjects: item.jsonData.subjects, // Populate array as needed
            attributes: item.jsonData.attributes,
            themes: item.jsonData.themes,
            contexts: item.jsonData.contexts,
            description: item.jsonData.description,
            image_url: item.url,
            id: item.id,
            embeddings: data.data[0].embedding,
          };
          return collection.insertOne(document);
        });
        const insertedRecords = await Promise.all(allPromises);
        console.log("records inserted");
        res.status(200).send("data inserted");
      }
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).send({ message: (error as Error).message });
    }
  }
);

app.get("/search", async (req, res) => {
  try {
    await client.connect();
    console.log("Connected successfully to MongoDB");
    const database = client.db("Cluster0"); // Replace with your database name
    const collection = database.collection("image_metadata");
    const queryString = req.query.query as string;
    const queryVector = await openAiEmbeddings(queryString);
    const query = queryVector.data[0].embedding;
    const result = await collection
      .aggregate(vectorQuerySchema(query))
      .toArray();
    const scoreThreshold = 65;
    res.status(200).send({
      data: result
        .filter((item) => item.score * 100 > scoreThreshold)
        .sort((a, b) => b.score - a.score),
    });
  } catch (error) {
    console.log(error);
  }
  // Perform some operation with searchString. Here, we just echo it back.
});

// Function to construct array literal
function constructArrayLiteral(array: string[]) {
  return `{${array.map((item) => `"${item}"`).join(",")}}`;
}

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
