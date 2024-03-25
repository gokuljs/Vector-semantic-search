import dotenv from "dotenv";
dotenv.config();
import express, { Request, Response } from "express";
import multer from "multer";
import cors from "cors";

import { pool } from "./dbSetup.js";
import { createTableAndTrigger } from "./setupImageUploadTable.js";
import OpenAI from "openai";
import { uuid } from "uuidv4";
import { uploadToS3 } from "./uploads3.js";

const app = express();
const upload = multer(); // Using multer's default memory storage
app.use(cors()); // This will enable all CORS requests. For production, configure this properly.
createTableAndTrigger();

const openai = new OpenAI({
  organization: process.env.OPENAI_ORGANISATION,
  apiKey: process.env.OPENAI_API_KEY,
});

const PROMPT = `
Analyzing image data to identify subjects, themes, contexts, and description (complete inDetail description of the message) of the message categorizing them accordingly and give it to me in a stringified object so that i can easily parse the output.
For Example: this format just returns an object without any text
{
  "subjects": ["dog"],
  "attributes": ["black", "running"],
  "themes": ["adventure"],
  "contexts": ["outdoors", "park"],
  "description" :"In detail description of the message"
}
`;

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
      const insertPromises = results.map((url) =>
        pool.query(
          "INSERT INTO image_uploads (image_url) VALUES ($1) RETURNING *",
          [url]
        )
      );
      const insertedRecords = await Promise.all(insertPromises);
      res.status(200).send(insertedRecords.map((record) => record.rows[0]));
      const allPromise = results.map(async (url) => {
        const response = await openai.chat.completions.create({
          model: "gpt-4-vision-preview",
          temperature: 0,
          messages: [
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
        const stringArray = (
          response.choices[0].message.content as string
        ).split("json");
        const jsonString = stringArray.join("");
        const trimmedString = jsonString.replace(/`|\n/g, "");
        const jsonData = JSON.parse(trimmedString);
        return { jsonData, url, id: uuid() };
      });
      const data = await Promise.all(allPromise)
        .then((results) => {
          // Process API call results
          return results;
        })
        .catch((error) => {
          console.error("Error:", error);
        });
      data &&
        data.forEach((data) => {
          const jsonData = data.jsonData;
          const url = data.url;
          const description = jsonData.description;
          const subjects = jsonData.subjects;
          const attributes = jsonData.attributes;
          const themes = jsonData.themes;
          const contexts = jsonData.contexts;
          const id = data.id;
          const subjectsLiteral = constructArrayLiteral(subjects);
          const attributesLiteral = constructArrayLiteral(attributes);
          const themesLiteral = constructArrayLiteral(themes);
          const contextsLiteral = constructArrayLiteral(contexts);
          // SQL statement to insert data into the table
          const insertQuery = `INSERT INTO image_metadata (id, subjects, attributes, themes, contexts, description, url) 
      VALUES ($1, $2, $3, $4, $5, $6,$7)`;
          pool.query(
            insertQuery,
            [
              id,
              subjectsLiteral,
              attributesLiteral,
              themesLiteral,
              contextsLiteral,
              description,
              url,
            ],
            (err, res) => {
              if (err) {
                console.error("Error executing query", err);
              } else {
                console.log("Data inserted successfully");
              }
            }
          );
        });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).send("Error uploading files.");
    }
  }
);

// Function to construct array literal
function constructArrayLiteral(array: string[]) {
  return `{${array.map((item) => `"${item}"`).join(",")}}`;
}

const port = process.env.PORT || 2000;
app.listen(port, () => console.log(`Server running on port ${port}`));
