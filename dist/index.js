import dotenv from "dotenv";
dotenv.config();
import express from "express";
import multer from "multer";
import cors from "cors";
import OpenAI from "openai";
import { v4 as uuidv4 } from "uuid";
import { uploadToS3 } from "./uploads3.js";
import { PORT, PROMPT } from "./constant.js";
import { client } from "./MongoDbsetup.js";
const corsOptions = {
    origin: "http://localhost:3000",
};
const app = express();
const upload = multer(); // Using multer's default memory storage
app.use(cors(corsOptions)); // This will enable all CORS requests. For production, configure this properly.
const openai = new OpenAI({
    organization: process.env.OPENAI_ORGANISATION,
    apiKey: process.env.OPENAI_API_KEY,
});
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
app.post("/upload", upload.array("images"), async (req, res) => {
    if (!req.files || (Array.isArray(req.files) && req.files.length === 0)) {
        return res.status(400).send("No files were uploaded.");
    }
    const files = req.files;
    const uploadPromises = files.map((file) => uploadToS3(file));
    try {
        const results = await Promise.all(uploadPromises);
        const allPromise = results.map(async (url) => {
            const response = await openai.chat.completions.create({
                model: "gpt-4-vision-preview",
                temperature: 0,
                messages: [
                    {
                        role: "system",
                        content: "the system only speaks in JSON. Do not generate output that isn’t in properly formatted JSON.",
                    },
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: PROMPT,
                            },
                            {
                                type: "image_url",
                                image_url: {
                                    url: url,
                                },
                            },
                        ],
                    },
                ],
            });
            const stringArray = response.choices[0].message.content.split("json");
            const jsonString = stringArray.join("");
            const trimmedString = jsonString.replace(/`|\n/g, "");
            const jsonData = JSON.parse(trimmedString);
            return { jsonData, url, id: uuidv4() };
        });
        const data = await Promise.all(allPromise)
            .then((results) => {
            // Process API call results
            return results;
        })
            .catch((error) => {
            console.error("Error:", error);
        });
        if (data) {
            try {
                await client.connect();
                console.log("Connected successfully to MongoDB");
                const database = client.db("Cluster0"); // Replace with your database name
                const collection = database.collection("image_metadata");
                const allPromises = data.map(async (item) => {
                    const data = await openai.embeddings.create({
                        model: "text-embedding-3-small",
                        input: item.jsonData.description,
                        encoding_format: "float",
                    });
                    const document = {
                        subjects: item.jsonData.subjects,
                        attributes: item.jsonData.attributes,
                        themes: item.jsonData.themes,
                        contexts: item.jsonData.contexts,
                        description: item.jsonData.description,
                        image_url: item.url,
                        id: item.id,
                        embeddings: data.data[0].embedding,
                    };
                    console.log(document.description);
                    return collection.insertOne(document);
                });
                const insertedRecords = await Promise.all(allPromises);
                console.log("records inserted");
                res.status(200).send("data inserted");
            }
            catch (error) {
                console.log("Error", error);
            }
        }
    }
    catch (error) {
        console.error("Upload error:", error);
        res.status(500).send({ message: error.message });
    }
});
app.get("/search", async (req, res) => {
    try {
        await client.connect();
        console.log("Connected successfully to MongoDB");
        const database = client.db("Cluster0"); // Replace with your database name
        const collection = database.collection("image_metadata");
        const queryString = req.query.query;
        const queryVector = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: queryString,
            encoding_format: "float",
        });
        const query = queryVector.data[0].embedding;
        const agg = [
            {
                $vectorSearch: {
                    index: "PlotSemanticSearch",
                    path: "embeddings",
                    queryVector: query,
                    numCandidates: 100,
                    limit: 100,
                },
            },
            {
                $project: {
                    _id: 0,
                    image_url: 1,
                    description: 1,
                    score: {
                        $meta: "vectorSearchScore",
                    },
                },
            },
        ];
        const result = await collection.aggregate(agg).toArray();
        const scoreThreshold = 65;
        res.status(200).send({
            data: result
                .filter((item) => item.score * 100 > scoreThreshold)
                .sort((a, b) => b.score - a.score),
        });
    }
    catch (error) {
        console.log(error);
    }
    // Perform some operation with searchString. Here, we just echo it back.
});
// Function to construct array literal
function constructArrayLiteral(array) {
    return `{${array.map((item) => `"${item}"`).join(",")}}`;
}
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
