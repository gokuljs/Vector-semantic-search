import { PutObjectCommand } from "@aws-sdk/client-s3";
import s3Client from "./s3Client.js";

export const uploadToS3 = async (
  file: Express.Multer.File
): Promise<string> => {
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
