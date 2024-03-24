import { S3Client } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
dotenv.config();

// Initialize S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY!, // Changed from AWS_ACCESS_KEY to AWS_ACCESS_KEY_ID
    secretAccessKey: process.env.AWS_SECRET_KEY!, // Ensure this matches your .env or environment variable
  },
});

export default s3Client;
