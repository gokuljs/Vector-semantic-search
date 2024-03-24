import express from "express";
import multer from "multer";
import cors from "cors";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import s3Client from "./s3Client.js";
import dotenv from "dotenv";
dotenv.config();
const app = express();
const upload = multer(); // Using multer's default memory storage
app.use(cors()); // This will enable all CORS requests. For production, configure this properly.
app.post("/upload", upload.array("images"), async (req, res) => {
    if (!req.files || (Array.isArray(req.files) && req.files.length === 0)) {
        // If no files are uploaded, send a 400 Bad Request response
        return res.status(400).send("No files were uploaded.");
    }
    const files = req.files;
    const uploadPromises = files.map((file) => uploadToS3(file));
    try {
        const results = await Promise.all(uploadPromises);
        console.log(results);
        res.json({ message: "Files uploaded successfully", urls: results });
    }
    catch (error) {
        console.error("Upload error:", error);
        res.status(500).send("Error uploading files.");
    }
});
const uploadToS3 = async (file) => {
    const key = `${Date.now()}_${file.originalname}`;
    const command = new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: key,
        Body: file.buffer,
    });
    await s3Client.send(command);
    return getSignedUrl(s3Client, command, { expiresIn: 3600 }); // Generates a signed URL for accessing the object; adjust expiresIn as needed
};
const port = process.env.PORT || 2000;
app.listen(port, () => console.log(`Server running on port ${port}`));
