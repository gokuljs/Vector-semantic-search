import express, { Request, Response, NextFunction } from "express";
import multer, { MulterError } from "multer";
import cors from "cors";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import s3Client from "./s3Client.js";
import dotenv from "dotenv";
import { pool } from "./dbSetup.js";
import { createTableAndTrigger } from "./setupImageUploadTable.js";
import OpenAI from "openai";
import { uuid } from "uuidv4";

dotenv.config();

const app = express();
const upload = multer(); // Using multer's default memory storage
app.use(cors()); // This will enable all CORS requests. For production, configure this properly.
createTableAndTrigger();

const openai = new OpenAI({
  organization: process.env.OPENAI_ORGANISATION,
  apiKey: process.env.OPENAI_API_KEY,
});

const PROMPT = `
Analyzing image data to identify subjects, themes, and contexts, categorizing them accordingly and give it to me in a stringified object so that i can easily parse the output.
For Example: this format just returns an object without any text
{
  "subjects": ["dog"],
  "attributes": ["black", "running"],
  "themes": ["adventure"],
  "contexts": ["outdoors", "park"]
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
      console.log(results);
      const allPromise = results.map(async (url) => {
        const response = await openai.chat.completions.create({
          model: "gpt-4-vision-preview",
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
      Promise.all(allPromise)
        .then((results) => {
          // Process API call results
          console.log(results);
        })
        .catch((error) => {
          console.error("Error:", error);
        });
      console.log(allPromise);
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).send("Error uploading files.");
    }
  }
);

const uploadToS3 = async (file: Express.Multer.File): Promise<string> => {
  const key = `${Date.now()}_${file.originalname}`;
  const bucketName = process.env.AWS_S3_BUCKET_NAME; // Ensure your bucket name is in the environment variables
  const region = process.env.AWS_REGION; // Ensure your AWS region is in the environment variables
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: key,
    Body: file.buffer,
  });
  await s3Client.send(command);
  const url = `https://${bucketName}.s3.${region}.amazonaws.com/${encodeURIComponent(
    key
  )}`;
  return url;
};

const port = process.env.PORT || 2000;
app.listen(port, () => console.log(`Server running on port ${port}`));
