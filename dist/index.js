import express from "express";
import multer, { MulterError } from "multer";
const upload = multer({
    dest: "uploads/",
    limits: {
        fileSize: 1024 * 1024 * 5, // Limit file size to 5 MB
    },
    fileFilter: (req, file, cb) => {
        // Validate file types here
        if (file.mimetype.startsWith("image/")) {
            cb(null, true); // Accept the file
        }
        else {
            cb(new Error("Only images are allowed")); // Reject the file
        }
    },
});
const app = express();
const PORT = process.env.PORT || 7000;
app.post("/upload", upload.array("files"), (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).send("No files were uploaded.");
    }
    console.log("Files uploaded:", req.files);
    res.status(200).send("Files uploaded successfully");
});
// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    if (err instanceof MulterError) {
        res.status(400).send("File upload error: " + err.message);
    }
    else {
        res.status(500).send("Something went wrong!");
    }
});
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
