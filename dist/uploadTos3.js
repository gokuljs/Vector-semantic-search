"use strict";
const uploadToS3 = async (file) => {
    const key = `${Date.now()}_${file.originalname}`;
    const command = new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: key,
        Body: file.buffer,
    });
    await s3Client.send(command);
    return getSignedUrl(s3Client, command, { expiresIn: 3600 });
}; // Generates a signed URL for accessing the object; adjust expiresIn as needed
